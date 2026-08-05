import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir='visual-audit-r3-v017';
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
  await page.waitForTimeout(350);
}
async function fullyVisible(record,page,selector,width,height,name){
  await center(page,selector);
  const box=await page.locator(selector).boundingBox();
  const fraction=visibleFraction(box,width,height);
  const bottomSafety=box?height-(box.y+box.height):-1;
  if(!box||fraction<.995)record.assertions.push(`${name} not fully visible: ${fraction.toFixed(4)}`);
  if(box&&(box.x<-1||box.x+box.width>width+1||box.y<-1))record.assertions.push(`${name} crosses viewport edge`);
  if(bottomSafety<12)record.assertions.push(`${name} bottom safety ${bottomSafety.toFixed(1)}px < 12px`);
  return {box,fraction,bottomSafety};
}
async function dragLogical(page,canvas,start,end){
  const box=await canvas.boundingBox();
  if(!box)throw new Error('main canvas has no box');
  const map=p=>({x:box.x+p.x/1080*box.width,y:box.y+p.y/675*box.height});
  const a=map(start),b=map(end);
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:18});await page.mouse.up();
}
async function setParam(page,key,value){
  await page.locator(`[data-rfw-param="${key}"]`).evaluate((node,next)=>{
    node.value=String(next);
    node.dispatchEvent(new Event('input',{bubbles:true}));
    node.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
}
function auditCoreText(record,metrics,names){
  const core=/近轴|球差|物体|镜|焦点|像面|入射|反射|法线|物距|实像|虚像|光斑|同焦/;
  for(const name of names){
    const canvas=metrics?.[name];
    if(!canvas){record.assertions.push(`missing text metrics for ${name}`);continue;}
    for(const item of canvas.labels||[]){
      if(core.test(item.label)&&item.effectivePx+0.05<12){
        record.assertions.push(`${name} core text too small: ${item.label} ${item.effectivePx.toFixed(2)}px`);
      }
      if(item.marginsPx.left<-1||item.marginsPx.right<-1||item.marginsPx.top<-1||item.marginsPx.bottom<-1){
        record.assertions.push(`${name} label outside canvas: ${item.label}`);
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
    await page.waitForSelector('.rfw-page[data-model-id="spherical-mirror"][data-legibility-version="018"]',{timeout:20000});
    await page.waitForTimeout(1200);

    await page.evaluate(()=>window.scrollTo(0,0));
    await page.waitForTimeout(250);
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-00-overview.png`,fullPage:false});

    record.layout=await page.evaluate(()=>{
      const rect=s=>document.querySelector(s)?.getBoundingClientRect();
      const style=s=>{const n=document.querySelector(s);return n?getComputedStyle(n):null};
      const main=document.querySelector('#rfwMainCanvas');
      const module=document.querySelector('[data-module-id="mechanism"] canvas');
      const primary=rect('.rfw-primary-card'),analysis=rect('.rfw-analysis-column');
      const left=rect('.rfw-left-handle'),right=rect('.rfw-right-handle');
      return{
        appClass:document.querySelector('.app')?.className||'',
        primary:primary&&{top:primary.top,bottom:primary.bottom,left:primary.left,right:primary.right,width:primary.width,height:primary.height},
        analysis:analysis&&{top:analysis.top,bottom:analysis.bottom,left:analysis.left,right:analysis.right,width:analysis.width,height:analysis.height},
        horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        mainScale:main?main.getBoundingClientRect().width/1080:0,
        moduleScale:module?module.getBoundingClientRect().width/720:0,
        railWritingMode:style('.rfw-left-handle')?.writingMode||'',
        leftRail:left&&{width:left.width,height:left.height},
        rightRail:right&&{width:right.width,height:right.height},
        moduleTitle:parseFloat(style('.rfw-module-head h3')?.fontSize||0),
        moduleCopy:parseFloat(style('.rfw-module-head p')?.fontSize||0)
      };
    });
    if(!record.layout.appClass.includes('r3-v017-active'))record.assertions.push(`missing R3 runtime class: ${record.layout.appClass}`);
    if(record.layout.horizontalOverflow>2)record.assertions.push(`horizontal overflow ${record.layout.horizontalOverflow}px`);
    if(record.layout.railWritingMode.startsWith('vertical'))record.assertions.push(`edge rail still vertical: ${record.layout.railWritingMode}`);
    if((record.layout.leftRail?.height||999)>62||(record.layout.rightRail?.height||999)>62)record.assertions.push('edge rail remains oversized');
    if(record.layout.mainScale<.72||record.layout.mainScale>1.48)record.assertions.push(`main canvas scale ${record.layout.mainScale.toFixed(2)} outside readable range`);
    if(record.layout.moduleScale<.58||record.layout.moduleScale>1.35)record.assertions.push(`module canvas scale ${record.layout.moduleScale.toFixed(2)} outside readable range`);
    if(record.layout.moduleTitle<16)record.assertions.push(`module title ${record.layout.moduleTitle}px < 16px`);
    if(record.layout.moduleCopy<10)record.assertions.push(`module copy ${record.layout.moduleCopy}px < 10px`);
    if(width>=1880){
      if(Math.abs((record.layout.analysis?.top||0)-(record.layout.primary?.top||0))>24)record.assertions.push('wide layout is not synchronized side-by-side');
      if((record.layout.primary?.bottom||Infinity)>height+4||(record.layout.analysis?.bottom||Infinity)>height+4)record.assertions.push('wide synchronized workspace exceeds first viewport');
    }else if((record.layout.analysis?.top||0)<(record.layout.primary?.bottom||0)+8){
      record.assertions.push('stacked analysis overlaps primary workbench');
    }

    record.sections.main=await fullyVisible(record,page,'#rfwMainCanvas',width,height,'main canvas');
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-01-main.png`,fullPage:false});

    const main=page.locator('#rfwMainCanvas');
    record.before={
      distance:await page.locator('[data-rfw-output="do"]').textContent(),
      height:await page.locator('[data-rfw-output="height"]').textContent(),
      aperture:await page.locator('[data-rfw-output="aperture"]').textContent(),
      blur:Number(await page.locator('.rfw-page').getAttribute('data-r3-blur'))
    };
    if(Math.abs(parseFloat(record.before.height)-60)>2)record.assertions.push(`default object height ${record.before.height}`);
    if(Math.abs(parseFloat(record.before.aperture)-18)>2)record.assertions.push(`default aperture ${record.before.aperture}`);
    if(!(record.before.blur<12))record.assertions.push(`default teaching state blur ${record.before.blur}`);
    await dragLogical(page,main,{x:560,y:300},{x:490,y:215});
    await page.waitForTimeout(600);
    record.after={
      distance:await page.locator('[data-rfw-output="do"]').textContent(),
      height:await page.locator('[data-rfw-output="height"]').textContent(),
      dragDistance:await page.locator('.rfw-page').getAttribute('data-r3-drag-distance'),
      dragHeight:await page.locator('.rfw-page').getAttribute('data-r3-drag-height')
    };
    if(Math.abs(parseFloat(record.after.distance)-330)>3)record.assertions.push(`object drag distance ${record.after.distance}`);
    if(Math.abs(parseFloat(record.after.height)-145)>3)record.assertions.push(`object drag height ${record.after.height}`);

    record.sections.mechanism=await fullyVisible(record,page,'[data-module-id="mechanism"]',width,height,'mechanism module');
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-02-mechanism.png`,fullPage:false});
    record.sections.observable=await fullyVisible(record,page,'[data-module-id="observable"]',width,height,'observable module');
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-03-observable.png`,fullPage:false});

    record.metrics=await page.evaluate(()=>window.R2CanvasTextAuditV016?.getMetrics?.()||null);
    if(!record.metrics)record.assertions.push('missing all-canvas text metrics');
    else auditCoreText(record,record.metrics,['main','mechanism','observable']);

    await setParam(page,'aperture',0.9);await page.waitForTimeout(500);
    record.states.largeAperture=await page.evaluate(()=>({blur:Number(document.querySelector('.rfw-page')?.dataset.r3Blur),status:document.querySelector('#rfwStatus')?.textContent||''}));
    if(!(record.states.largeAperture.blur>1))record.assertions.push(`large aperture blur not visible: ${record.states.largeAperture.blur}`);
    await center(page,'#rfwMainCanvas');
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-04-large-aperture.png`,fullPage:false});

    await setParam(page,'type','convex');await page.waitForTimeout(500);
    record.states.convex={status:await page.locator('#rfwStatus').textContent(),image:await page.locator('.rfw-live-strip').textContent()};
    if(!record.states.convex.status.includes('虚像'))record.assertions.push('convex state does not report virtual image');

    await page.locator('.rfw-right-handle').click();
    await page.waitForSelector('.rfw-right-drawer.is-open');await page.waitForTimeout(300);
    const drawer=await page.locator('.rfw-right-drawer').boundingBox();
    const fraction=visibleFraction(drawer,width,height);
    if(!drawer||fraction<.995)record.assertions.push(`parameter drawer not fully visible ${fraction.toFixed(4)}`);
    const canvasAfterDrawer=await main.boundingBox();
    if(!canvasAfterDrawer||visibleFraction(canvasAfterDrawer,width,height)<.95)record.assertions.push('main canvas is obscured after opening parameter drawer');
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-05-parameters.png`,fullPage:false});
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
