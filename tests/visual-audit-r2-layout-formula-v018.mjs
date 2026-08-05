import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir='visual-audit-r2-layout-formula-v018';
const viewports=[[1735,865],[1790,896],[1920,1080],[1440,900]];
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];

function fraction(box,w,h){
  if(!box||box.width<=0||box.height<=0)return 0;
  const vw=Math.max(0,Math.min(box.x+box.width,w)-Math.max(0,box.x));
  const vh=Math.max(0,Math.min(box.y+box.height,h)-Math.max(0,box.y));
  return vw*vh/(box.width*box.height);
}

async function chooseModules(page,names){
  await page.locator('.rfw-left-handle').click();
  await page.waitForSelector('.rfw-left-drawer.is-open');
  const labels=page.locator('.rfw-module-selector label');
  for(let i=0;i<await labels.count();i++){
    const label=labels.nth(i);
    const text=(await label.textContent())||'';
    const input=label.locator('input');
    if(await input.isChecked()&&!names.some(name=>text.includes(name)))await label.click();
  }
  for(const name of names){
    const label=labels.filter({hasText:name}).first();
    if(!await label.count())throw new Error(`missing module selector: ${name}`);
    const input=label.locator('input');
    if(!await input.isChecked())await label.click();
  }
  const close=page.locator('.rfw-left-drawer button').filter({hasText:'关闭'}).first();
  if(await close.count())await close.click();
  else await page.locator('.rfw-left-handle').click();
  await page.waitForTimeout(900);
}

for(const [width,height] of viewports){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const result={width,height,errors:[],assertions:[],layout:null,formula:null,canvasText:null};
  page.on('console',m=>{if(m.type()==='error')result.errors.push(`console: ${m.text()}`)});
  page.on('pageerror',e=>result.errors.push(`page: ${e.message}`));
  try{
    await page.goto('http://127.0.0.1:8000/#model:plane-mirror',{waitUntil:'networkidle'});
    await page.waitForSelector('.rfw-page[data-model-id="plane-mirror"]',{timeout:20000});
    await page.waitForFunction(()=>[...document.styleSheets].some(sheet=>String(sheet.href||'').includes('r2-layout-formula-v018.css')));
    await chooseModules(page,['有限镜面','从图到公式']);
    await page.waitForFunction(()=>document.querySelectorAll('[data-module-id="derivation"] mjx-container[display="true"]').length>=3,{timeout:15000});

    const workspace=page.locator('.rfw-workspace');
    await workspace.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
    await page.waitForTimeout(700);

    result.layout=await page.evaluate(()=>{
      const box=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}:null};
      return{
        workspace:box('.rfw-workspace'),
        primary:box('.rfw-primary-card'),
        analysis:box('.rfw-analysis-column'),
        observable:box('[data-module-id="observable"]'),
        derivation:box('[data-module-id="derivation"]'),
        leftHandle:box('.rfw-left-handle'),
        rightHandle:box('.rfw-right-handle'),
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        columns:getComputedStyle(document.querySelector('.rfw-workspace')).gridTemplateColumns,
        boardRows:getComputedStyle(document.querySelector('.rfw-board')).gridTemplateRows
      };
    });

    if(result.layout.overflow>2)result.assertions.push(`horizontal overflow ${result.layout.overflow}px`);
    const wide=width>=1600&&height>=760;
    if(wide){
      if(!result.layout.primary||!result.layout.analysis)result.assertions.push('missing primary/analysis boxes');
      else{
        if(result.layout.analysis.x<result.layout.primary.right+10)result.assertions.push('analysis is not to the right of primary');
        if(result.layout.analysis.width<598)result.assertions.push(`analysis width ${result.layout.analysis.width}px < 598px`);
        if(result.layout.primary.width<995)result.assertions.push(`primary width ${result.layout.primary.width}px < 995px`);
      }
      for(const [name,box] of Object.entries({primary:result.layout.primary,observable:result.layout.observable,derivation:result.layout.derivation})){
        const f=fraction(box,width,height);
        if(f<.995)result.assertions.push(`${name} not simultaneously visible: ${f.toFixed(4)}`);
      }
      if(result.layout.leftHandle&&result.layout.primary&&result.layout.leftHandle.right>result.layout.primary.x-1)result.assertions.push('left handle overlaps primary');
      if(result.layout.rightHandle&&result.layout.analysis&&result.layout.rightHandle.x<result.layout.analysis.right+1)result.assertions.push('right handle overlaps analysis');
    }else{
      if(!result.layout.primary||!result.layout.analysis||result.layout.analysis.y<result.layout.primary.bottom+10)result.assertions.push('narrow layout should remain vertical');
    }

    result.formula=await page.evaluate(()=>{
      const nodes=[...document.querySelectorAll('[data-module-id="derivation"] mjx-container[display="true"]')];
      const cards=[...document.querySelectorAll('[data-module-id="derivation"] .rfw-derivation-list article')];
      const explanations=[...document.querySelectorAll('[data-module-id="derivation"] .rfw-derivation-list p')];
      return{
        count:nodes.length,
        sizes:nodes.map(node=>parseFloat(getComputedStyle(node).fontSize||0)),
        boxes:nodes.map(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}}),
        explanationSizes:explanations.map(node=>parseFloat(getComputedStyle(node).fontSize||0)),
        cardOverflow:cards.map(card=>({scrollHeight:card.scrollHeight,clientHeight:card.clientHeight,scrollWidth:card.scrollWidth,clientWidth:card.clientWidth}))
      };
    });
    if(result.formula.count<3)result.assertions.push(`formula count ${result.formula.count} < 3`);
    if(Math.min(...result.formula.sizes)<22)result.assertions.push(`MathJax formula too small: ${Math.min(...result.formula.sizes).toFixed(2)}px < 22px`);
    if(Math.min(...result.formula.explanationSizes)<12)result.assertions.push(`formula explanation too small: ${Math.min(...result.formula.explanationSizes).toFixed(2)}px < 12px`);
    for(const card of result.formula.cardOverflow){
      if(card.scrollHeight>card.clientHeight+2||card.scrollWidth>card.clientWidth+2)result.assertions.push(`formula card overflow ${JSON.stringify(card)}`);
    }

    result.canvasText=await page.evaluate(()=>window.R2CanvasTextAuditV016?.getMetrics?.()||null);
    if(wide){
      for(const key of ['main','observable']){
        const labels=result.canvasText?.[key]?.labels||[];
        if(!labels.length){result.assertions.push(`missing actual canvas labels: ${key}`);continue;}
        const minimum=Math.min(...labels.map(item=>item.effectivePx));
        if(minimum<15.8)result.assertions.push(`${key} actual text ${minimum.toFixed(2)}px < 15.8px`);
      }
    }

    await page.screenshot({path:`${outDir}/r2-${width}x${height}-same-screen-formula.png`,fullPage:false});
  }catch(error){
    result.errors.push(`audit: ${error?.stack||error}`);
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-failure.png`,fullPage:false}).catch(()=>{});
  }finally{
    results.push(result);
    await page.close();
  }
}

await browser.close();
await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
if(results.some(result=>result.errors.length||result.assertions.length))process.exit(1);
