import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir='visual-audit-r5-strict-v019';
const viewports=[[2560,1440],[1920,1080],[1735,865],[1440,900],[1366,768]];
const CORE=/全反射|倏逝|临界|探针|传播|反射|折射|穿透|能流|法向|当前状态|介质|波数|耦合/;
const CONCLUSION=/全反射：|当前折射率顺序|临界状态|传播折射波仍存在|传播解 →|倏逝场的空间衰减|受抑全反射/;

await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];

function floorFor(label){return CONCLUSION.test(label)?18:CORE.test(label)?16:14;}

async function inspectCanvas(page,key,selector){
  return page.evaluate(({key,selector})=>{
    const canvas=document.querySelector(selector);
    const audit=window.R5TIRWorkbenchV019?.getTextAudit?.()?.[key]||[];
    if(!canvas)return {missing:true,items:[],scale:0,overlaps:[],cropped:[]};
    const rect=canvas.getBoundingClientRect();
    const scale=Math.min(rect.width/canvas.width,rect.height/canvas.height);
    const ctx=canvas.getContext('2d');
    const boxes=audit.map(item=>{
      ctx.save();
      ctx.font=`800 ${item.size}px Inter,"Microsoft YaHei",sans-serif`;
      const m=ctx.measureText(item.label);
      ctx.restore();
      const left=item.align==='center'?item.x-m.width/2:item.align==='right'?item.x-m.width:item.x;
      const right=left+m.width;
      const ascent=m.actualBoundingBoxAscent||item.size*.78;
      const descent=m.actualBoundingBoxDescent||item.size*.22;
      return {...item,left,right,top:item.y-ascent,bottom:item.y+descent};
    });
    const cropped=boxes.filter(b=>b.left<-1||b.right>canvas.width+1||b.top<-1||b.bottom>canvas.height+1).map(b=>({label:b.label,left:b.left,right:b.right,top:b.top,bottom:b.bottom}));
    const overlapPairs=[
      ['传播解 → 临界点 → 倏逝解','切向波数守恒；kz² 跨过 0'],
      ['受抑全反射：第二介质进入倏逝场','耦合量级 ∝ e⁻²κg'],
      ['实线＝传播波','紫色波列＝倏逝场（法向平均能流 0）']
    ];
    const overlaps=[];
    for(const [a,b] of overlapPairs){
      const A=boxes.find(x=>x.label===a),B=boxes.find(x=>x.label===b);
      if(!A||!B)continue;
      const xOverlap=Math.min(A.right,B.right)-Math.max(A.left,B.left);
      const yOverlap=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top);
      if(xOverlap>1&&yOverlap>1)overlaps.push({a,b,xOverlap,yOverlap,A:{left:A.left,right:A.right,top:A.top,bottom:A.bottom},B:{left:B.left,right:B.right,top:B.top,bottom:B.bottom}});
    }
    return {missing:false,scale,items:audit,overlaps,cropped,width:rect.width,height:rect.height};
  },{key,selector});
}

async function openApparatus(page){
  await page.locator('.tir-left-handle').evaluate(n=>n.click());
  await page.waitForSelector('.tir-left-drawer.is-open');
  await page.locator('[data-r5-preset="apparatus"]').evaluate(n=>n.click());
  await page.locator('.tir-left-drawer [data-r5-close]').evaluate(n=>n.click());
  await page.waitForTimeout(700);
}

for(const [width,height] of viewports){
  const record={width,height,failures:[],runtime:null,canvases:{}};
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('pageerror',e=>record.failures.push(`page: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')record.failures.push(`console: ${m.text()}`);});
  try{
    await page.goto('http://127.0.0.1:8000/#model:total-internal',{waitUntil:'networkidle'});
    await page.waitForSelector('.tir-page[data-legibility-version="019"]',{timeout:20000});
    await page.waitForFunction(()=>document.querySelector('.tir-page')?.dataset.r5CanvasTypography==='0196',{timeout:10000});
    await page.waitForTimeout(1200);
    record.runtime=await page.evaluate(()=>({
      marker:document.querySelector('.tir-page')?.dataset.r5CanvasTypography||'',
      fit:document.querySelector('.tir-page')?.dataset.r5CanvasFit||'',
      typography:window.R5CanvasTypographyV019?.version||''
    }));
    if(record.runtime.marker!=='0196'||record.runtime.typography!=='0.19.6')record.failures.push(`typography runtime missing: ${JSON.stringify(record.runtime)}`);
    if(record.runtime.fit!=='019')record.failures.push(`canvas fit runtime missing: ${JSON.stringify(record.runtime)}`);

    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`${outDir}/r5-strict-${width}x${height}-00-overview.png`,fullPage:false});

    for(const [key,selector] of [['main','#r5MainCanvas'],['transition','[data-r5-canvas="transition"]'],['decay','[data-r5-canvas="decay"]']]){
      const audit=await inspectCanvas(page,key,selector);
      record.canvases[key]=audit;
      if(audit.missing||!audit.items.length)record.failures.push(`${key} text audit missing`);
      for(const item of audit.items){
        const effective=item.size*audit.scale;
        const floor=floorFor(item.label);
        if(effective+0.05<floor)record.failures.push(`${key} ${item.label} ${effective.toFixed(2)}px < ${floor}px`);
      }
      if(audit.cropped.length)record.failures.push(`${key} text cropped: ${JSON.stringify(audit.cropped)}`);
      if(audit.overlaps.length)record.failures.push(`${key} label overlap: ${JSON.stringify(audit.overlaps)}`);
    }

    await page.locator('#r5MainCanvas').scrollIntoViewIfNeeded();
    await page.locator('#r5MainCanvas').screenshot({path:`${outDir}/r5-strict-${width}x${height}-01-main.png`});
    await page.locator('[data-module-id="transition"]').scrollIntoViewIfNeeded();
    await page.locator('[data-module-id="transition"]').screenshot({path:`${outDir}/r5-strict-${width}x${height}-02-transition.png`});
    await page.locator('[data-module-id="decay"]').scrollIntoViewIfNeeded();
    await page.locator('[data-module-id="decay"]').screenshot({path:`${outDir}/r5-strict-${width}x${height}-03-decay.png`});

    await openApparatus(page);
    const apparatus=await inspectCanvas(page,'apparatus','[data-r5-canvas="apparatus"]');
    record.canvases.apparatus=apparatus;
    if(apparatus.missing||!apparatus.items.length)record.failures.push('apparatus text audit missing');
    for(const item of apparatus.items){
      const effective=item.size*apparatus.scale;
      const floor=floorFor(item.label);
      if(effective+0.05<floor)record.failures.push(`apparatus ${item.label} ${effective.toFixed(2)}px < ${floor}px`);
    }
    if(apparatus.cropped.length)record.failures.push(`apparatus text cropped: ${JSON.stringify(apparatus.cropped)}`);
    if(apparatus.overlaps.length)record.failures.push(`apparatus label overlap: ${JSON.stringify(apparatus.overlaps)}`);
    await page.locator('[data-module-id="apparatus"]').scrollIntoViewIfNeeded();
    await page.locator('[data-module-id="apparatus"]').screenshot({path:`${outDir}/r5-strict-${width}x${height}-04-apparatus.png`});
  }catch(error){
    record.failures.push(error?.stack||String(error));
    await page.screenshot({path:`${outDir}/r5-strict-${width}x${height}-99-failure.png`,fullPage:false}).catch(()=>{});
  }finally{
    results.push(record);
    await page.close();
  }
}

await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2));
await browser.close();
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.failures.length))process.exit(1);
