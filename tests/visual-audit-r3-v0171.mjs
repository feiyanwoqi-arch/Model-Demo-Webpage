import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir='visual-audit-r3-v0171';
const viewports=[[2560,1440],[1920,1080],[1735,865],[1440,900],[1366,768]];
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];

function visibleFraction(box,width,height){
  if(!box||box.width<=0||box.height<=0)return 0;
  const w=Math.max(0,Math.min(box.x+box.width,width)-Math.max(box.x,0));
  const h=Math.max(0,Math.min(box.y+box.height,height)-Math.max(box.y,0));
  return w*h/(box.width*box.height);
}
async function center(page,selector){
  await page.locator(selector).evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await page.waitForTimeout(450);
}
async function fullyVisible(record,page,selector,width,height,name){
  await center(page,selector);
  const box=await page.locator(selector).boundingBox();
  const fraction=visibleFraction(box,width,height);
  const bottomSafety=box?height-(box.y+box.height):-1;
  if(!box||fraction<.995)record.assertions.push(`${name} not fully visible: ${fraction.toFixed(4)}`);
  if(box&&(box.x<-1||box.x+box.width>width+1||box.y<-1))record.assertions.push(`${name} crosses viewport edge`);
  if(bottomSafety<16)record.assertions.push(`${name} bottom safety ${bottomSafety.toFixed(1)}px < 16px`);
  return {box,fraction,bottomSafety};
}
async function dragLogical(page,canvas,start,end){
  const box=await canvas.boundingBox();
  if(!box)throw new Error('main canvas has no box');
  const map=p=>({x:box.x+p.x/1080*box.width,y:box.y+p.y/675*box.height});
  const a=map(start),b=map(end);
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:20});await page.mouse.up();
}
function auditText(record,metrics,names){
  for(const name of names){
    const canvas=metrics?.[name];
    if(!canvas){record.assertions.push(`missing text metrics for ${name}`);continue;}
    for(const item of canvas.labels||[]){
      if(item.effectivePx+0.05<14)record.assertions.push(`${name} text too small: ${item.label} ${item.effectivePx.toFixed(2)}px`);
      const safety=Math.max(12,.75*item.effectivePx);
      for(const side of ['left','right','top','bottom']){
        if(item.marginsPx[side]+.3<safety)record.assertions.push(`${name} unsafe ${side}: ${item.label} ${item.marginsPx[side].toFixed(2)}px < ${safety.toFixed(2)}px`);
      }
      if(/球差|近轴|物体|镜|焦点|像|物距|实线|虚线|光束|反射/.test(item.label)&&item.effectivePx+0.05<16){
        record.assertions.push(`${name} core text too small: ${item.label} ${item.effectivePx.toFixed(2)}px`);
      }
    }
  }
}

for(const [width,height] of viewports){
  const record={width,height,errors:[],assertions:[],sections:{},before:null,after:null,metrics:null,layout:null,states:{}};
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='error')record.errors.push(`console: ${m.text()}`)});
  page.on('pageerror',e=>record.errors.push(`page: ${e.message}`));
  try{
    await page.goto('http://127.0.0.1:8000/#model:spherical-mirror',{waitUntil:'networkidle'});
    await page.waitForSelector('.rfw-page[data-model-id="spherical-mirror"][data-legibility-version="017"]',{timeout:20000});
    await page.waitForTimeout(1800);

    record.layout=await page.evaluate(()=>{
      const rect=s=>document.querySelector(s)?.getBoundingClientRect();
      const primary=rect('.rfw-primary-card'),analysis=rect('.rfw-analysis-column');
      const style=s=>{const n=document.querySelector(s);return n?getComputedStyle(n):null};
      return{
        appClass:document.querySelector('.app')?.className||'',
        primary:primary&&{top:primary.top,bottom:primary.bottom,left:primary.left,right:primary.right,width:primary.width},
        analysis:analysis&&{top:analysis.top,bottom:analysis.bottom,left:analysis.left,right:analysis.right,width:analysis.width},
        horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        moduleTitle:parseFloat(style('.rfw-module-head h3')?.fontSize||0),
        moduleCopy:parseFloat(style('.rfw-module-head p')?.fontSize||0),
        liveValue:parseFloat(style('.rfw-live-strip b')?.fontSize||0)
      };
    });
    if(!record.layout.appClass.includes('r3-v017-active'))record.assertions.push(`missing R3 runtime class: ${record.layout.appClass}`);
    if(record.layout.horizontalOverflow>2)record.assertions.push(`horizontal overflow ${record.layout.horizontalOverflow}px`);
    if((record.layout.primary?.width||0)<width*.78)record.assertions.push(`primary workbench too narrow ${record.layout.primary?.width||0}px`);
    if((record.layout.analysis?.top||0)<(record.layout.primary?.bottom||0)+10)record.assertions.push('analysis remains beside or overlaps primary workbench');
    if(record.layout.moduleTitle<20)record.assertions.push(`module title ${record.layout.moduleTitle}px < 20px`);
    if(record.layout.moduleCopy<14)record.assertions.push(`module copy ${record.layout.moduleCopy}px < 14px`);
    if(record.layout.liveValue<18)record.assertions.push(`live value ${record.layout.liveValue}px < 18px`);

    record.sections.main=await fullyVisible(record,page,'#rfwMainCanvas',width,height,'main canvas');
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-01-main.png`,fullPage:false});

    const main=page.locator('#rfwMainCanvas');
    record.before={
      distance:await page.locator('[data-rfw-output="do"]').textContent(),
      height:await page.locator('[data-rfw-output="height"]').textContent()
    };
    await dragLogical(page,main,{x:590,y:240},{x:520,y:205});
    await page.waitForTimeout(800);
    record.after={
      distance:await page.locator('[data-rfw-output="do"]').textContent(),
      height:await page.locator('[data-rfw-output="height"]').textContent()
    };
    if(Math.abs(parseFloat(record.after.distance)-310)>3)record.assertions.push(`object drag distance ${record.after.distance}`);
    if(Math.abs(parseFloat(record.after.height)-145)>3)record.assertions.push(`object drag height ${record.after.height}`);
    if(record.after.distance===record.before.distance||record.after.height===record.before.height)record.assertions.push('object drag did not change both distance and height');

    record.sections.mechanism=await fullyVisible(record,page,'[data-module-id="mechanism"]',width,height,'mechanism module');
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-02-mechanism.png`,fullPage:false});
    record.sections.observable=await fullyVisible(record,page,'[data-module-id="observable"]',width,height,'observable module');
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-03-observable.png`,fullPage:false});

    record.metrics=await page.evaluate(()=>window.R2CanvasTextAuditV016?.getMetrics?.()||null);
    if(!record.metrics)record.assertions.push('missing all-canvas text metrics');
    else auditText(record,record.metrics,['main','mechanism','observable']);

    await page.locator('.rfw-right-handle').click();
    await page.waitForSelector('.rfw-right-drawer.is-open');
    await page.waitForTimeout(350);
    const drawer=await page.locator('.rfw-right-drawer').boundingBox();
    const drawerFraction=visibleFraction(drawer,width,height);
    if(!drawer||drawerFraction<.995)record.assertions.push(`parameter drawer not fully visible ${drawerFraction.toFixed(4)}`);

    const aperture=page.locator('.rfw-right-drawer [data-rfw-param="aperture"]');
    await aperture.fill('0.9');await aperture.dispatchEvent('input');await page.waitForTimeout(650);
    record.states.largeAperture=await page.evaluate(()=>({blur:Number(document.querySelector('.rfw-page')?.dataset.r3Blur),status:document.querySelector('#rfwStatus')?.textContent||''}));
    if(!(record.states.largeAperture.blur>1))record.assertions.push(`large aperture blur not visible: ${record.states.largeAperture.blur}`);

    const type=page.locator('.rfw-right-drawer [data-rfw-param="type"]');
    await type.selectOption('convex');await page.waitForTimeout(650);
    record.states.convex={status:await page.locator('#rfwStatus').textContent(),image:await page.locator('.rfw-live-strip').textContent()};
    if(!record.states.convex.status.includes('虚像'))record.assertions.push('convex state does not report virtual image');
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-04-parameters-and-states.png`,fullPage:false});
  }catch(error){
    record.errors.push(`audit: ${error?.stack||error}`);
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-99-failure.png`,fullPage:false}).catch(()=>{});
  }finally{
    results.push(record);await page.close();
  }
}
await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2));
await browser.close();
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length||r.assertions.length))process.exit(1);
