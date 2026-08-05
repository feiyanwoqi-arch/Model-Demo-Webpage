import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir='visual-audit-reflection-v018';
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
const scenarios=[
  {id:'reflection-law',output:'angle',start:{x:394,y:198},end:{x:337,y:256}},
  {id:'plane-mirror',output:'distance',start:{x:330,y:395},end:{x:280,y:355}},
  {id:'spherical-mirror',output:'do',start:{x:590,y:240},end:{x:520,y:205}}
];

function visibleFraction(box,width,height){
  if(!box||box.width<=0||box.height<=0)return 0;
  const w=Math.max(0,Math.min(box.x+box.width,width)-Math.max(0,box.x));
  const h=Math.max(0,Math.min(box.y+box.height,height)-Math.max(0,box.y));
  return w*h/(box.width*box.height);
}
async function dragLogical(page,start,end){
  const canvas=page.locator('#rfwMainCanvas');
  const box=await canvas.boundingBox();
  if(!box)throw new Error('main canvas has no box');
  const map=p=>({x:box.x+p.x/1080*box.width,y:box.y+p.y/675*box.height});
  const a=map(start),b=map(end);
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:16});await page.mouse.up();
}

for(const scenario of scenarios){
  const width=1735,height=865;
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const record={scenario:scenario.id,errors:[],assertions:[],layout:null,before:null,after:null};
  page.on('console',m=>{if(m.type()==='error')record.errors.push(`console: ${m.text()}`)});
  page.on('pageerror',e=>record.errors.push(`page: ${e.message}`));
  try{
    await page.goto(`http://127.0.0.1:8000/#model:${scenario.id}`,{waitUntil:'networkidle'});
    await page.waitForSelector(`.rfw-page[data-model-id="${scenario.id}"] .rfw-primary-card`,{timeout:20000});
    await page.waitForTimeout(1200);
    const workspace=page.locator('.rfw-workspace');
    await workspace.evaluate(node=>node.scrollIntoView({block:scenario.id==='plane-mirror'?'center':'start',inline:'nearest',behavior:'instant'}));
    await page.waitForTimeout(500);

    record.layout=await page.evaluate(()=>{
      const box=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}:null};
      return{
        primary:box('.rfw-primary-card'),analysis:box('.rfw-analysis-column'),
        mechanism:box('[data-module-id="mechanism"]'),observable:box('[data-module-id="observable"]'),
        mechanismCanvas:box('[data-module-id="mechanism"] canvas'),observableCanvas:box('[data-module-id="observable"] canvas'),
        boardCount:document.querySelector('.rfw-board')?.dataset.count||'',
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
      };
    });
    if(record.layout.overflow>2)record.assertions.push(`horizontal overflow ${record.layout.overflow}px`);
    if(record.layout.boardCount!=='2')record.assertions.push(`expected two modules, got ${record.layout.boardCount}`);
    if((record.layout.mechanismCanvas?.width||0)<500)record.assertions.push(`mechanism canvas too narrow ${record.layout.mechanismCanvas?.width||0}px`);
    if((record.layout.observableCanvas?.width||0)<500)record.assertions.push(`observable canvas too narrow ${record.layout.observableCanvas?.width||0}px`);

    if(scenario.id==='plane-mirror'){
      const {primary,analysis,mechanism,observable}=record.layout;
      for(const [name,box] of Object.entries({primary,mechanism,observable})){
        if(visibleFraction(box,width,height)<.995)record.assertions.push(`${name} not fully visible in restored workbench`);
      }
      if(!primary||!analysis||analysis.x<primary.right+10)record.assertions.push('analysis is not to the right of primary');
      if((analysis?.width||0)<598)record.assertions.push(`analysis width ${analysis?.width||0}px`);
      if(mechanism&&observable&&(Math.abs(mechanism.x-observable.x)>3||observable.y<mechanism.bottom+8))record.assertions.push('analysis modules are not stacked in one right column');
    }else if(scenario.id==='spherical-mirror'){
      if(!record.layout.primary||!record.layout.analysis||record.layout.analysis.y<record.layout.primary.bottom+10)record.assertions.push('spherical analysis must follow primary');
    }

    const beforeMechanism=await page.locator('[data-module-id="mechanism"] canvas').evaluate(c=>c.toDataURL());
    const beforeObservable=await page.locator('[data-module-id="observable"] canvas').evaluate(c=>c.toDataURL());
    record.before=await page.locator(`[data-rfw-output="${scenario.output}"]`).textContent();
    await dragLogical(page,scenario.start,scenario.end);
    await page.waitForTimeout(750);
    record.after=await page.locator(`[data-rfw-output="${scenario.output}"]`).textContent();
    const afterMechanism=await page.locator('[data-module-id="mechanism"] canvas').evaluate(c=>c.toDataURL());
    const afterObservable=await page.locator('[data-module-id="observable"] canvas').evaluate(c=>c.toDataURL());
    if(record.after===record.before)record.assertions.push(`drag did not change ${scenario.output}`);
    if(afterMechanism===beforeMechanism)record.assertions.push('mechanism module did not redraw');
    if(afterObservable===beforeObservable)record.assertions.push('observable module did not redraw');

    await page.screenshot({path:`${outDir}/${scenario.id}-1735x865.png`,fullPage:false});

    await page.locator('.rfw-left-handle').click();await page.waitForSelector('.rfw-left-drawer.is-open');
    const moduleCount=await page.locator('.rfw-left-drawer .rfw-module-selector input').count();
    if(moduleCount<5)record.assertions.push(`too few selectable modules ${moduleCount}`);
    await page.locator('.rfw-left-drawer [data-rfw-close]').click();
    await page.locator('.rfw-right-handle').click();await page.waitForSelector('.rfw-right-drawer.is-open');
    const controlCount=await page.locator('.rfw-right-drawer [data-rfw-param]').count();
    if(controlCount<4)record.assertions.push(`too few controls ${controlCount}`);
  }catch(error){
    record.errors.push(`audit: ${error?.stack||error}`);
  }finally{
    results.push(record);await page.close();
  }
}

await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2));
await browser.close();
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length||r.assertions.length))process.exit(1);
