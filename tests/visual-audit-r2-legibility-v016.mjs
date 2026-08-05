import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-r2-legibility-v016';
const viewports = [[2560,1440],[1920,1080],[1735,865],[1440,900],[1366,768]];
await fs.mkdir(outDir,{recursive:true});
const browser = await chromium.launch({headless:true});
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
async function dragLogical(page,canvas,start,end){
  const box=await canvas.boundingBox();
  if(!box)throw new Error('main canvas has no box');
  const map=p=>({x:box.x+p.x/1080*box.width,y:box.y+p.y/675*box.height});
  const a=map(start),b=map(end);
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:18});await page.mouse.up();
}
async function canvasInkRatio(locator){
  return locator.evaluate(canvas=>{
    const ctx=canvas.getContext('2d');if(!ctx||!canvas.width||!canvas.height)return 0;
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const step=Math.max(6,Math.round(Math.min(canvas.width,canvas.height)/70));
    let ink=0,total=0;
    for(let y=0;y<canvas.height;y+=step){for(let x=0;x<canvas.width;x+=step){
      const i=(y*canvas.width+x)*4,r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      total++;if(a>12&&!(r>246&&g>246&&b>246))ink++;
    }}
    return total?ink/total:0;
  });
}
function validateLabels(record,metrics){
  for(const [canvasKey,canvas] of Object.entries(metrics||{})){
    if(!canvas?.rect||canvas.rect.width<1||canvas.rect.height<1)continue;
    for(const label of canvas.labels||[]){
      const minimum=label.role==='status'?18:label.role==='core'?16:14;
      if(label.effectivePx+0.05<minimum){
        record.assertions.push(`${canvasKey} label too small: ${label.label} ${label.effectivePx.toFixed(2)}px < ${minimum}px`);
      }
      const safety=Math.max(12,.75*label.effectivePx);
      for(const side of ['left','right','top','bottom']){
        if(label.marginsPx[side]+.2<safety){
          record.assertions.push(`${canvasKey} label unsafe ${side}: ${label.label} margin ${label.marginsPx[side].toFixed(2)}px < ${safety.toFixed(2)}px`);
        }
      }
    }
  }
}
async function requireFullyVisible(record,page,selector,width,height,name){
  await center(page,selector);
  const box=await page.locator(selector).boundingBox();
  const fraction=visibleFraction(box,width,height);
  const bottomSafety=box?height-(box.y+box.height):-1;
  if(!box||fraction<.995)record.assertions.push(`${name} not fully visible: ${fraction.toFixed(4)}`);
  if(box&&(box.x<-1||box.x+box.width>width+1||box.y<-1))record.assertions.push(`${name} crosses viewport edge`);
  if(bottomSafety<16)record.assertions.push(`${name} bottom safety ${bottomSafety.toFixed(1)}px < 16px`);
  return {box,fraction,bottomSafety};
}

for(const [width,height] of viewports){
  const record={width,height,errors:[],assertions:[],sections:{},metrics:null,dom:null,before:null,after:null};
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='error')record.errors.push(`console: ${m.text()}`)});
  page.on('pageerror',e=>record.errors.push(`page: ${e.message}`));
  try{
    await page.goto('http://127.0.0.1:8000/#model:plane-mirror',{waitUntil:'networkidle'});
    await page.waitForSelector('.rfw-page[data-model-id="plane-mirror"][data-legibility-version="016"]',{timeout:20000});
    await page.waitForTimeout(1800);

    const layout=await page.evaluate(()=>{
      const primary=document.querySelector('.rfw-primary-card')?.getBoundingClientRect();
      const analysis=document.querySelector('.rfw-analysis-column')?.getBoundingClientRect();
      const style=node=>node?getComputedStyle(node):null;
      const moduleTitle=document.querySelector('.rfw-module-head h3');
      const moduleCopy=document.querySelector('.rfw-module-head p');
      const liveLabel=document.querySelector('.rfw-live-strip span');
      const liveValue=document.querySelector('.rfw-live-strip b');
      return{
        primary:{top:primary?.top,bottom:primary?.bottom,left:primary?.left,right:primary?.right,width:primary?.width},
        analysis:{top:analysis?.top,bottom:analysis?.bottom,left:analysis?.left,right:analysis?.right,width:analysis?.width},
        workspaceColumns:style(document.querySelector('.rfw-workspace'))?.gridTemplateColumns,
        boardColumns:style(document.querySelector('.rfw-board'))?.gridTemplateColumns,
        fontSizes:{
          moduleTitle:parseFloat(style(moduleTitle)?.fontSize||0),
          moduleCopy:parseFloat(style(moduleCopy)?.fontSize||0),
          liveLabel:parseFloat(style(liveLabel)?.fontSize||0),
          liveValue:parseFloat(style(liveValue)?.fontSize||0)
        },
        horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
      };
    });
    record.dom=layout;
    if(layout.horizontalOverflow>2)record.assertions.push(`horizontal overflow ${layout.horizontalOverflow}px`);
    if((layout.primary?.width||0)<width*.88)record.assertions.push(`primary workbench too narrow ${layout.primary?.width||0}px`);
    if((layout.analysis?.top||0)<(layout.primary?.bottom||0)+10)record.assertions.push('analysis is still compressed beside/over the primary workbench');
    if(layout.fontSizes.moduleTitle<20)record.assertions.push(`module title ${layout.fontSizes.moduleTitle}px < 20px`);
    if(layout.fontSizes.moduleCopy<14)record.assertions.push(`module copy ${layout.fontSizes.moduleCopy}px < 14px`);
    if(layout.fontSizes.liveLabel<13)record.assertions.push(`live label ${layout.fontSizes.liveLabel}px < 13px`);
    if(layout.fontSizes.liveValue<18)record.assertions.push(`live value ${layout.fontSizes.liveValue}px < 18px`);

    record.sections.mainCanvas=await requireFullyVisible(record,page,'#rfwMainCanvas',width,height,'main canvas');
    const mainCanvas=page.locator('#rfwMainCanvas');
    record.mainInk=await canvasInkRatio(mainCanvas);
    if(record.mainInk<.002)record.assertions.push(`main canvas blank ${record.mainInk.toFixed(5)}`);
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-01-main-readable.png`,fullPage:false});

    record.before={
      distance:await page.locator('[data-rfw-output="distance"]').textContent(),
      height:await page.locator('[data-rfw-output="height"]').textContent()
    };
    await dragLogical(page,mainCanvas,{x:330,y:395},{x:280,y:350});
    await page.waitForTimeout(650);
    record.after={
      distance:await page.locator('[data-rfw-output="distance"]').textContent(),
      height:await page.locator('[data-rfw-output="height"]').textContent()
    };
    if(Math.abs(parseFloat(record.after.distance)-320)>2)record.assertions.push(`object drag distance ${record.after.distance}`);
    if(Math.abs(parseFloat(record.after.height)-195)>2)record.assertions.push(`object drag height ${record.after.height}`);

    record.sections.mechanism=await requireFullyVisible(record,page,'[data-module-id="mechanism"]',width,height,'mechanism module');
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-02-mechanism-readable.png`,fullPage:false});
    record.sections.observable=await requireFullyVisible(record,page,'[data-module-id="observable"]',width,height,'observable module');
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-03-observable-readable.png`,fullPage:false});

    record.metrics=await page.evaluate(()=>window.R2LegibilityV016?.getMetrics?.()||null);
    if(!record.metrics)record.assertions.push('missing R2 legibility metrics');
    else validateLabels(record,record.metrics);

    await page.locator('.rfw-right-handle').click();
    await page.waitForSelector('.rfw-right-drawer.is-open');
    await page.waitForTimeout(320);
    const drawer=await page.locator('.rfw-right-drawer').boundingBox();
    const fraction=visibleFraction(drawer,width,height);
    if(!drawer||fraction<.995)record.assertions.push(`parameter drawer not fully visible ${fraction.toFixed(4)}`);
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-04-parameters-readable.png`,fullPage:false});
  }catch(error){
    record.errors.push(`audit: ${error?.stack||error}`);
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-99-failure.png`,fullPage:false}).catch(()=>{});
  }finally{
    results.push(record);await page.close();
  }
}
await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2));
await browser.close();
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length||r.assertions.length))process.exit(1);
