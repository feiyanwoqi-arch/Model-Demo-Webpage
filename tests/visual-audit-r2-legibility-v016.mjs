import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir='visual-audit-r2-legibility-v016';
const viewports=[[2560,1440],[1920,1080],[1735,865],[1440,900],[1366,768]];
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];

function visibleFraction(box,w,h){
  if(!box||box.width<=0||box.height<=0)return 0;
  const vw=Math.max(0,Math.min(box.x+box.width,w)-Math.max(box.x,0));
  const vh=Math.max(0,Math.min(box.y+box.height,h)-Math.max(box.y,0));
  return vw*vh/(box.width*box.height);
}
async function center(page,selector){
  await page.locator(selector).evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await page.waitForTimeout(500);
}
async function dragLogical(page,canvas,start,end){
  const box=await canvas.boundingBox();if(!box)throw new Error('main canvas has no box');
  const map=p=>({x:box.x+p.x/1080*box.width,y:box.y+p.y/675*box.height});const a=map(start),b=map(end);
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:18});await page.mouse.up();
}
async function requireVisible(record,page,selector,w,h,name){
  await center(page,selector);const box=await page.locator(selector).boundingBox();const fraction=visibleFraction(box,w,h);const bottom=box?h-(box.y+box.height):-1;
  if(!box||fraction<.995)record.assertions.push(`${name} not fully visible ${fraction.toFixed(4)}`);
  if(bottom<16)record.assertions.push(`${name} bottom safety ${bottom.toFixed(1)}px`);
  return{box,fraction,bottomSafety:bottom};
}
function validateLabels(record,metrics){
  for(const [canvasKey,canvas] of Object.entries(metrics||{})){
    if(!canvas?.rect||canvas.rect.width<1||canvas.rect.height<1)continue;
    for(const label of canvas.labels||[]){
      const min=label.role==='status'?18:label.role==='core'?16:14;
      if(label.effectivePx+.05<min)record.assertions.push(`${canvasKey} label too small ${label.label} ${label.effectivePx.toFixed(2)}px`);
      const safety=Math.max(12,.75*label.effectivePx);
      for(const side of ['left','right','top','bottom'])if(label.marginsPx[side]+.2<safety)record.assertions.push(`${canvasKey} unsafe ${side} ${label.label}`);
    }
  }
}

for(const [width,height] of viewports){
  const record={width,height,errors:[],assertions:[],layout:null,sections:{},metrics:null,before:null,after:null};
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='error')record.errors.push(`console: ${m.text()}`)});page.on('pageerror',e=>record.errors.push(`page: ${e.message}`));
  try{
    await page.goto('http://127.0.0.1:8000/#model:plane-mirror',{waitUntil:'networkidle'});
    await page.waitForSelector('.rfw-page[data-model-id="plane-mirror"][data-legibility-version="016"]',{timeout:20000});
    await page.waitForTimeout(1800);
    record.layout=await page.evaluate(()=>{
      const rect=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}:null};
      const fs=s=>parseFloat(getComputedStyle(document.querySelector(s)).fontSize);
      return{primary:rect('.rfw-primary-card'),analysis:rect('.rfw-analysis-column'),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,fontSizes:{moduleTitle:fs('.rfw-module-head h3'),moduleCopy:fs('.rfw-module-head p'),liveLabel:fs('.rfw-live-strip span'),liveValue:fs('.rfw-live-strip b')}};
    });
    const {primary,analysis}=record.layout;
    if(record.layout.overflow>2)record.assertions.push(`horizontal overflow ${record.layout.overflow}px`);
    if(width>=1600&&height>=760){
      if(!primary||!analysis||analysis.x<primary.right+12)record.assertions.push('wide R2 is not side by side');
      if((primary?.width||0)<850)record.assertions.push(`wide primary too narrow ${primary?.width||0}px`);
      if((analysis?.width||0)<600)record.assertions.push(`wide analysis too narrow ${analysis?.width||0}px`);
      if(primary&&analysis&&Math.abs(primary.y-analysis.y)>24)record.assertions.push('wide columns not top aligned');
    }else{
      if((primary?.width||0)<width*.88)record.assertions.push(`vertical primary too narrow ${primary?.width||0}px`);
      if((analysis?.y||0)<(primary?.bottom||0)+10)record.assertions.push('medium R2 did not use vertical flow');
    }
    if(record.layout.fontSizes.moduleTitle<20)record.assertions.push('module title below 20px');
    if(record.layout.fontSizes.moduleCopy<14)record.assertions.push('module copy below 14px');
    if(record.layout.fontSizes.liveLabel<13)record.assertions.push('live label below 13px');
    if(record.layout.fontSizes.liveValue<18)record.assertions.push('live value below 18px');

    record.sections.main=await requireVisible(record,page,'#rfwMainCanvas',width,height,'main canvas');
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-01-main.png`,fullPage:false});
    const main=page.locator('#rfwMainCanvas');record.before={distance:await page.locator('[data-rfw-output="distance"]').textContent(),height:await page.locator('[data-rfw-output="height"]').textContent()};
    await dragLogical(page,main,{x:330,y:395},{x:280,y:350});await page.waitForTimeout(650);
    record.after={distance:await page.locator('[data-rfw-output="distance"]').textContent(),height:await page.locator('[data-rfw-output="height"]').textContent()};
    if(Math.abs(parseFloat(record.after.distance)-320)>2)record.assertions.push(`object drag distance ${record.after.distance}`);
    if(Math.abs(parseFloat(record.after.height)-195)>2)record.assertions.push(`object drag height ${record.after.height}`);

    record.sections.mechanism=await requireVisible(record,page,'[data-module-id="mechanism"]',width,height,'mechanism');
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-02-mechanism.png`,fullPage:false});
    record.sections.observable=await requireVisible(record,page,'[data-module-id="observable"]',width,height,'observable');
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-03-observable.png`,fullPage:false});
    record.metrics=await page.evaluate(()=>window.R2LegibilityV016?.getMetrics?.()||null);
    if(!record.metrics)record.assertions.push('missing R2 legibility metrics');else validateLabels(record,record.metrics);

    await page.locator('.rfw-right-handle').click();await page.waitForSelector('.rfw-right-drawer.is-open');await page.waitForTimeout(400);
    const drawer=await page.locator('.rfw-right-drawer').boundingBox();if(!drawer||visibleFraction(drawer,width,height)<.995)record.assertions.push('parameter drawer not fully visible');
  }catch(error){record.errors.push(`audit: ${error?.stack||error}`);await page.screenshot({path:`${outDir}/r2-${width}x${height}-99-failure.png`,fullPage:false}).catch(()=>{});}
  finally{results.push(record);await page.close();}
}
await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2));await browser.close();console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length||r.assertions.length))process.exit(1);
