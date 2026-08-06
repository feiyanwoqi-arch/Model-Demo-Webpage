import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-r4-v019';
const viewports = [[2560,1440],[1920,1080],[1735,865],[1440,900],[1366,768]];
await fs.mkdir(outDir,{recursive:true});
const browser = await chromium.launch({headless:true});
const results = [];

function fraction(box,width,height){
  if(!box||box.width<=0||box.height<=0)return 0;
  const visibleWidth=Math.max(0,Math.min(width,box.x+box.width)-Math.max(0,box.x));
  const visibleHeight=Math.max(0,Math.min(height,box.y+box.height)-Math.max(0,box.y));
  return visibleWidth*visibleHeight/(box.width*box.height);
}
async function dragLogical(page,canvas,start,end,width=1080,height=560){
  const box=await canvas.boundingBox();
  if(!box)throw new Error('canvas has no bounding box');
  const map=point=>({x:box.x+point.x/width*box.width,y:box.y+point.y/height*box.height});
  const a=map(start),b=map(end);
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:20});await page.mouse.up();
}
async function setRange(page,key,value){
  await page.locator(`[data-r4-param="${key}"]`).first().evaluate((node,next)=>{
    node.value=String(next);node.dispatchEvent(new Event('input',{bubbles:true}));
  },value);
}

for(const [width,height] of viewports){
  const record={width,height,errors:[],assertions:[],layout:null,states:{}};
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('console',message=>{if(message.type()==='error')record.errors.push(`console: ${message.text()}`)});
  page.on('pageerror',error=>record.errors.push(`page: ${error.message}`));
  try{
    await page.goto('http://127.0.0.1:8000/#model:fresnel-brewster',{waitUntil:'networkidle'});
    await page.waitForSelector('.r4w-page[data-model-id="fresnel-brewster"][data-version="019"]',{timeout:20000});
    await page.waitForTimeout(900);
    await page.screenshot({path:`${outDir}/r4-${width}x${height}-00-overview.png`,fullPage:false});

    record.layout=await page.evaluate(()=>{
      const rect=selector=>{const node=document.querySelector(selector);if(!node)return null;const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
      return{
        root:rect('.r4w-page'),main:rect('.r4w-main-card'),a:rect('[data-r4-slot="A"]'),b:rect('[data-r4-slot="B"]'),
        overflowX:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        version:document.querySelector('.r4w-page')?.dataset.version,
        mainCanvas:rect('#r4wMainCanvas')
      };
    });
    if(record.layout.version!=='019')record.assertions.push(`wrong version ${record.layout.version}`);
    if(record.layout.overflowX>2)record.assertions.push(`horizontal overflow ${record.layout.overflowX}px`);
    if(width>=1500){
      for(const key of ['main','a','b']){
        const visible=fraction(record.layout[key],width,height);
        if(visible<.94)record.assertions.push(`${key} visible fraction ${visible.toFixed(3)} < .94`);
      }
      if(Math.abs(record.layout.main.y-record.layout.a.y)>28)record.assertions.push('main and synchronized analysis do not start together');
    }

    const main=page.locator('#r4wMainCanvas');
    const before=Number(await page.locator('.r4w-page').getAttribute('data-angle'));
    await dragLogical(page,main,{x:224,y:134},{x:187,y:190});
    await page.waitForTimeout(300);
    const after=Number(await page.locator('.r4w-page').getAttribute('data-angle'));
    record.states.directDrag={before,after};
    if(!(after>before+8))record.assertions.push(`direct source drag failed: ${before} -> ${after}`);

    const curveCanvas=page.locator('[data-r4-slot="A"] canvas');
    await dragLogical(page,curveCanvas,{x:410,y:100},{x:520,y:100},720,250);
    await page.waitForTimeout(250);
    const curveAngle=Number(await page.locator('.r4w-page').getAttribute('data-angle'));
    record.states.curveDrag=curveAngle;
    if(!(curveAngle>60))record.assertions.push(`curve angle drag failed: ${curveAngle}`);

    await page.locator('.r4w-drawer-handle').click();
    await page.waitForSelector('.r4w-drawer.is-open');
    await page.locator('[data-r4-preset="1"]').click();
    await page.waitForTimeout(350);
    record.states.brewster={
      delta:Number(await page.locator('.r4w-page').getAttribute('data-brewster-delta')),
      reflectance:Number(await page.locator('.r4w-page').getAttribute('data-mixed-reflectance')),
      status:await page.locator('#r4wStatus').textContent()
    };
    if(record.states.brewster.delta>.01)record.assertions.push(`Brewster preset delta ${record.states.brewster.delta}`);
    if(record.states.brewster.reflectance>1e-6)record.assertions.push(`p reflectance at Brewster ${record.states.brewster.reflectance}`);
    if(!record.states.brewster.status.includes('布儒斯特'))record.assertions.push('Brewster status missing');
    await page.screenshot({path:`${outDir}/r4-${width}x${height}-01-brewster.png`,fullPage:false});

    await setRange(page,'n1',1.52);await setRange(page,'n2',1);await setRange(page,'angle',48);
    await page.waitForTimeout(350);
    record.states.tir={
      tir:await page.locator('.r4w-page').getAttribute('data-tir'),
      residual:Number(await page.locator('.r4w-page').getAttribute('data-energy-residual')),
      status:await page.locator('#r4wStatus').textContent()
    };
    if(record.states.tir.tir!=='true')record.assertions.push('TIR boundary state not detected');
    if(record.states.tir.residual>1e-10)record.assertions.push(`energy residual ${record.states.tir.residual}`);
    if(!record.states.tir.status.includes('R5'))record.assertions.push('R4/R5 boundary handoff missing');

    await page.locator('[data-r4-slot-select="A"]').last().selectOption('boundary');
    await page.locator('[data-r4-slot-select="B"]').last().selectOption('apparatus');
    await page.locator('[data-r4-close]').click();
    await page.waitForTimeout(300);
    if(await page.locator('[data-r4-slot="A"]').getAttribute('data-module')!=='boundary')record.assertions.push('slot A did not switch to boundary view');
    if(await page.locator('[data-r4-slot="B"]').getAttribute('data-module')!=='apparatus')record.assertions.push('slot B did not switch to apparatus view');
    await page.screenshot({path:`${outDir}/r4-${width}x${height}-02-boundary-apparatus.png`,fullPage:false});
  }catch(error){
    record.errors.push(`audit: ${error?.stack||error}`);
    await page.screenshot({path:`${outDir}/r4-${width}x${height}-99-failure.png`,fullPage:false}).catch(()=>{});
  }finally{
    results.push(record);await page.close();
  }
}
await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2));
await browser.close();
console.log(JSON.stringify(results,null,2));
if(results.some(result=>result.errors.length||result.assertions.length))process.exit(1);
