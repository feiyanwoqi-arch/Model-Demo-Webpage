import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir='live-pages-r2-v016';
const baseUrl='https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/';
const requiredResources=[
  'assets/css/r2-legibility-v016.css',
  'assets/css/r2-legibility-gutters-v016.css',
  'assets/js/r2-legibility-v016.js',
  'assets/js/r2-main-legibility-patch-v016.js',
  'assets/js/r2-canvas-text-audit-v016.js',
  'assets/js/r2-main-final-redraw-v016.js'
];
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1735,height:865},deviceScaleFactor:1});
const result={url:null,attempts:0,httpStatus:null,errors:[],assertions:[],resources:{},layout:null,textMetrics:null,drag:{before:null,after:null},sections:{},drawer:null};
page.on('console',m=>{if(m.type()==='error')result.errors.push(`console: ${m.text()}`)});
page.on('pageerror',e=>result.errors.push(`page: ${e.message}`));

function visibleFraction(box,width,height){
  if(!box||box.width<=0||box.height<=0)return 0;
  const w=Math.max(0,Math.min(box.x+box.width,width)-Math.max(box.x,0));
  const h=Math.max(0,Math.min(box.y+box.height,height)-Math.max(box.y,0));
  return w*h/(box.width*box.height);
}
async function center(selector){
  await page.locator(selector).evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await page.waitForTimeout(500);
}
async function section(selector,name){
  await center(selector);
  const box=await page.locator(selector).boundingBox();
  const fraction=visibleFraction(box,1735,865);
  const bottomSafety=box?865-(box.y+box.height):-1;
  result.sections[name]={box,fraction,bottomSafety};
  if(!box||fraction<.995)result.assertions.push(`${name} not fully visible ${fraction.toFixed(4)}`);
  if(bottomSafety<16)result.assertions.push(`${name} bottom safety ${bottomSafety.toFixed(1)}px`);
}
async function dragLogical(locator,start,end){
  const box=await locator.boundingBox();
  if(!box)throw new Error('public main canvas has no box');
  const map=p=>({x:box.x+p.x/1080*box.width,y:box.y+p.y/675*box.height});
  const a=map(start),b=map(end);
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:18});await page.mouse.up();
}
function validateAllText(metrics){
  for(const key of ['main','mechanism','observable']){
    const canvas=metrics?.[key];
    if(!canvas){result.assertions.push(`missing public canvas text metrics: ${key}`);continue;}
    if((canvas.labels?.length||0)<5)result.assertions.push(`${key} captured too few public labels`);
    for(const label of canvas.labels||[]){
      if(label.effectivePx+.05<14)result.assertions.push(`${key} public text too small: ${label.label} ${label.effectivePx.toFixed(2)}px`);
      const safety=Math.max(12,.75*label.effectivePx);
      for(const side of ['left','right','top','bottom']){
        if(label.marginsPx[side]+.2<safety){
          result.assertions.push(`${key} public text unsafe ${side}: ${label.label} ${label.marginsPx[side].toFixed(2)}px`);
        }
      }
    }
  }
}

try{
  let ready=false;
  for(let attempt=1;attempt<=30;attempt++){
    result.attempts=attempt;
    const url=`${baseUrl}?r2v016=${Date.now()}-${attempt}`;
    const response=await page.goto(url,{waitUntil:'networkidle',timeout:60000});
    result.httpStatus=response?.status()||null;
    const html=await page.content();
    result.resources=Object.fromEntries(requiredResources.map(resource=>[resource,html.includes(resource)]));
    if(result.httpStatus===200&&Object.values(result.resources).every(Boolean)){ready=true;break;}
    await page.waitForTimeout(20000);
  }
  if(!ready)throw new Error(`public deployment did not expose all v0.16 resources: ${JSON.stringify(result.resources)}`);

  result.url=`${baseUrl}?r2v016=${Date.now()}#model:plane-mirror`;
  await page.goto(result.url,{waitUntil:'networkidle',timeout:60000});
  await page.waitForSelector('.rfw-page[data-model-id="plane-mirror"][data-legibility-version="016"]',{timeout:30000});
  await page.waitForTimeout(2400);

  result.layout=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}:null};
    return{
      primary:rect('.rfw-primary-card'),
      analysis:rect('.rfw-analysis-column'),
      mechanism:rect('[data-module-id="mechanism"]'),
      observable:rect('[data-module-id="observable"]'),
      leftHandle:rect('.rfw-left-handle'),
      rightHandle:rect('.rfw-right-handle'),
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      appClass:document.querySelector('.app')?.className||'',
      viewClass:document.querySelector('#view')?.className||''
    };
  });
  if(result.layout.overflow>2)result.assertions.push(`public horizontal overflow ${result.layout.overflow}px`);
  if((result.layout.primary?.width||0)<1735*.88)result.assertions.push(`public primary too narrow ${result.layout.primary?.width||0}px`);
  if((result.layout.analysis?.y||0)<(result.layout.primary?.bottom||0)+10)result.assertions.push('public analysis is not below primary');
  if(result.layout.leftHandle&&result.layout.primary&&result.layout.leftHandle.right>result.layout.primary.x-2)result.assertions.push('public left edge handle overlaps content');
  if(result.layout.rightHandle&&result.layout.primary&&result.layout.rightHandle.x<result.layout.primary.right+2)result.assertions.push('public right edge handle overlaps content');

  await section('#rfwMainCanvas','mainCanvas');
  await page.screenshot({path:`${outDir}/r2-live-1735x865-01-main.png`,fullPage:false});
  const main=page.locator('#rfwMainCanvas');
  result.drag.before={
    distance:await page.locator('[data-rfw-output="distance"]').textContent(),
    height:await page.locator('[data-rfw-output="height"]').textContent()
  };
  await dragLogical(main,{x:330,y:395},{x:280,y:350});
  await page.waitForTimeout(800);
  result.drag.after={
    distance:await page.locator('[data-rfw-output="distance"]').textContent(),
    height:await page.locator('[data-rfw-output="height"]').textContent()
  };
  if(Math.abs(parseFloat(result.drag.after.distance)-320)>2)result.assertions.push(`public distance drag ${result.drag.after.distance}`);
  if(Math.abs(parseFloat(result.drag.after.height)-195)>2)result.assertions.push(`public height drag ${result.drag.after.height}`);

  await section('[data-module-id="mechanism"]','mechanism');
  await page.screenshot({path:`${outDir}/r2-live-1735x865-02-mechanism.png`,fullPage:false});
  await section('[data-module-id="observable"]','observable');
  await page.screenshot({path:`${outDir}/r2-live-1735x865-03-observable.png`,fullPage:false});

  result.textMetrics=await page.evaluate(()=>window.R2CanvasTextAuditV016?.getMetrics?.()||null);
  validateAllText(result.textMetrics);

  await page.locator('.rfw-right-handle').click();
  await page.waitForSelector('.rfw-right-drawer.is-open');
  await page.waitForTimeout(350);
  result.drawer=await page.locator('.rfw-right-drawer').boundingBox();
  const drawerFraction=visibleFraction(result.drawer,1735,865);
  if(!result.drawer||drawerFraction<.995)result.assertions.push(`public drawer not fully visible ${drawerFraction.toFixed(4)}`);
  await page.screenshot({path:`${outDir}/r2-live-1735x865-04-parameters.png`,fullPage:false});
}catch(error){
  result.errors.push(`audit: ${error?.stack||error}`);
  await page.screenshot({path:`${outDir}/r2-live-1735x865-99-failure.png`,fullPage:false}).catch(()=>{});
}finally{
  await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(result,null,2));
  await browser.close();
}
console.log(JSON.stringify(result,null,2));
if(result.errors.length||result.assertions.length)process.exit(1);
