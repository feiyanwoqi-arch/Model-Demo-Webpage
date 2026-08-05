import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir='visual-audit-r2-all-canvas-text-v016';
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];

for(const [width,height] of [[1735,865],[1366,768]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const record={width,height,errors:[],assertions:[],metrics:null};
  page.on('console',m=>{if(m.type()==='error')record.errors.push(`console: ${m.text()}`)});
  page.on('pageerror',e=>record.errors.push(`page: ${e.message}`));
  try{
    await page.goto('http://127.0.0.1:8000/#model:plane-mirror',{waitUntil:'networkidle'});
    await page.waitForSelector('.rfw-page[data-model-id="plane-mirror"][data-legibility-version="016"]',{timeout:20000});
    await page.waitForTimeout(2200);
    record.metrics=await page.evaluate(()=>window.R2CanvasTextAuditV016?.getMetrics?.()||null);
    if(!record.metrics){
      record.assertions.push('missing all-canvas text instrumentation');
    }else{
      for(const key of ['main','mechanism','observable']){
        const canvas=record.metrics[key];
        if(!canvas){record.assertions.push(`missing active canvas metrics: ${key}`);continue;}
        if((canvas.labels?.length||0)<5)record.assertions.push(`${key} captured too few labels: ${canvas.labels?.length||0}`);
        for(const label of canvas.labels||[]){
          if(label.effectivePx+.05<14){
            record.assertions.push(`${key} actual text too small: ${label.label} ${label.effectivePx.toFixed(2)}px`);
          }
          const safety=Math.max(12,.75*label.effectivePx);
          for(const side of ['left','right','top','bottom']){
            if(label.marginsPx[side]+.2<safety){
              record.assertions.push(`${key} actual text unsafe ${side}: ${label.label} ${label.marginsPx[side].toFixed(2)}px < ${safety.toFixed(2)}px`);
            }
          }
        }
      }
    }
    await page.locator('#rfwMainCanvas').evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
    await page.waitForTimeout(350);
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-main-all-text.png`,fullPage:false});
    await page.locator('[data-module-id="mechanism"]').evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
    await page.waitForTimeout(350);
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-modules-all-text.png`,fullPage:false});
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
