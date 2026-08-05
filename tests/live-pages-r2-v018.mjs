import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir='live-pages-r2-v018';
const baseUrl='https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/';
const requiredResources=[
  'assets/css/r2-legibility-v016.css',
  'assets/css/r2-wide-sync-formula-v018.css',
  'assets/js/r2-legibility-v016.js',
  'assets/js/r2-canvas-text-audit-v016.js'
];
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1790,height:896},deviceScaleFactor:1});
const result={url:null,attempts:0,httpStatus:null,errors:[],assertions:[],resources:{},layout:null,formula:null,drag:null};
page.on('console',m=>{if(m.type()==='error')result.errors.push(`console: ${m.text()}`)});
page.on('pageerror',e=>result.errors.push(`page: ${e.message}`));

async function focusWorkspace(){
  await page.evaluate(()=>{
    const workspace=document.querySelector('.rfw-workspace');
    const topbar=document.querySelector('.topbar');
    if(!workspace)return;
    const y=workspace.getBoundingClientRect().top+scrollY-(topbar?.offsetHeight||0)-6;
    scrollTo({top:Math.max(0,y),behavior:'instant'});
  });
  await page.waitForTimeout(700);
}
async function dragLogical(locator,start,end){
  const box=await locator.boundingBox();
  if(!box)throw new Error('public main canvas has no box');
  const map=p=>({x:box.x+p.x/1080*box.width,y:box.y+p.y/675*box.height});
  const a=map(start),b=map(end);
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:18});await page.mouse.up();
}

try{
  let ready=false;
  for(let attempt=1;attempt<=30;attempt++){
    result.attempts=attempt;
    const url=`${baseUrl}?r2v018=${Date.now()}-${attempt}`;
    const response=await page.goto(url,{waitUntil:'networkidle',timeout:60000});
    result.httpStatus=response?.status()||null;
    const html=await page.content();
    result.resources=Object.fromEntries(requiredResources.map(resource=>[resource,html.includes(resource)]));
    if(result.httpStatus===200&&Object.values(result.resources).every(Boolean)){ready=true;break;}
    await page.waitForTimeout(20000);
  }
  if(!ready)throw new Error(`public deployment did not expose v0.18 resources: ${JSON.stringify(result.resources)}`);

  result.url=`${baseUrl}?r2v018=${Date.now()}#model:plane-mirror`;
  await page.goto(result.url,{waitUntil:'networkidle',timeout:60000});
  await page.waitForSelector('.rfw-page[data-model-id="plane-mirror"] .rfw-workspace',{timeout:30000});
  await page.waitForFunction(()=>document.querySelectorAll('mjx-container').length>0,{timeout:30000});
  await page.waitForTimeout(1800);
  await focusWorkspace();

  result.layout=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}:null};
    const workspace=document.querySelector('.rfw-workspace');
    return{
      primary:rect('.rfw-primary-column'),
      analysis:rect('.rfw-analysis-column'),
      mechanism:rect('[data-module-id="observable"]'),
      formula:rect('[data-module-id="derivation"]'),
      columns:getComputedStyle(workspace).gridTemplateColumns,
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
    };
  });
  const {primary,analysis}=result.layout;
  if(!primary||!analysis)result.assertions.push('public primary or analysis missing');
  else{
    if(analysis.x<primary.right+12)result.assertions.push(`public R2 still vertical: primary right ${primary.right}, analysis x ${analysis.x}`);
    if(Math.abs(analysis.y-primary.y)>24)result.assertions.push(`public columns not top-aligned ${primary.y}/${analysis.y}`);
    if(primary.width<850)result.assertions.push(`public primary too narrow ${primary.width}px`);
    if(analysis.width<600)result.assertions.push(`public analysis too narrow ${analysis.width}px`);
  }
  if(result.layout.overflow>2)result.assertions.push(`public horizontal overflow ${result.layout.overflow}px`);

  const formulaModule=page.locator('[data-module-id="derivation"]');
  result.formula=await formulaModule.evaluate(module=>{
    const mr=module.getBoundingClientRect();
    const formulas=[...module.querySelectorAll('mjx-container')].filter(node=>{
      const r=node.getBoundingClientRect();return r.width>0&&r.height>0;
    }).map(node=>{
      const r=node.getBoundingClientRect();
      return{text:(node.textContent||'').trim(),fontSize:parseFloat(getComputedStyle(node).fontSize),x:r.x,y:r.y,width:r.width,height:r.height,leftSafety:r.left-mr.left,rightSafety:mr.right-r.right,topSafety:r.top-mr.top,bottomSafety:mr.bottom-r.bottom};
    });
    return{module:{x:mr.x,y:mr.y,width:mr.width,height:mr.height},formulas};
  });
  if((result.formula.formulas?.length||0)<3)result.assertions.push(`public captured too few formulas ${result.formula.formulas?.length||0}`);
  for(const formula of result.formula.formulas||[]){
    if(formula.fontSize<22)result.assertions.push(`public formula too small ${formula.fontSize}px: ${formula.text}`);
    if(formula.leftSafety<8||formula.rightSafety<8||formula.topSafety<8||formula.bottomSafety<8)result.assertions.push(`public formula clipped: ${formula.text}`);
  }

  await page.screenshot({path:`${outDir}/r2-live-1790x896-wide-formula.png`,fullPage:false});

  const main=page.locator('#rfwMainCanvas');
  result.drag={before:{distance:await page.locator('[data-rfw-output="distance"]').textContent(),height:await page.locator('[data-rfw-output="height"]').textContent()}};
  await dragLogical(main,{x:330,y:395},{x:280,y:350});
  await page.waitForTimeout(700);
  result.drag.after={distance:await page.locator('[data-rfw-output="distance"]').textContent(),height:await page.locator('[data-rfw-output="height"]').textContent()};
  if(Math.abs(parseFloat(result.drag.after.distance)-320)>2)result.assertions.push(`public distance drag ${result.drag.after.distance}`);
  if(Math.abs(parseFloat(result.drag.after.height)-195)>2)result.assertions.push(`public height drag ${result.drag.after.height}`);
}catch(error){
  result.errors.push(`audit: ${error?.stack||error}`);
  await page.screenshot({path:`${outDir}/r2-live-1790x896-failure.png`,fullPage:false}).catch(()=>{});
}finally{
  await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(result,null,2));
  await browser.close();
}
console.log(JSON.stringify(result,null,2));
if(result.errors.length||result.assertions.length)process.exit(1);
