import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-r2-wide-formula-v018';
const viewports = [[1920,1080],[1790,896],[1735,865]];
await fs.mkdir(outDir,{recursive:true});
const browser = await chromium.launch({headless:true});
const results=[];

async function focusWorkspace(page){
  await page.evaluate(()=>{
    const workspace=document.querySelector('.rfw-workspace');
    const topbar=document.querySelector('.topbar');
    if(!workspace)return;
    const y=workspace.getBoundingClientRect().top+scrollY-(topbar?.offsetHeight||0)-6;
    scrollTo({top:Math.max(0,y),behavior:'instant'});
  });
  await page.waitForTimeout(700);
}

function visibleFraction(box,w,h){
  if(!box||box.width<=0||box.height<=0)return 0;
  const vw=Math.max(0,Math.min(box.x+box.width,w)-Math.max(box.x,0));
  const vh=Math.max(0,Math.min(box.y+box.height,h)-Math.max(box.y,0));
  return vw*vh/(box.width*box.height);
}

for(const [width,height] of viewports){
  const record={width,height,errors:[],assertions:[],layout:null,formula:null};
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='error')record.errors.push(`console: ${m.text()}`)});
  page.on('pageerror',e=>record.errors.push(`page: ${e.message}`));
  try{
    await page.goto('http://127.0.0.1:8000/#model:plane-mirror',{waitUntil:'networkidle'});
    await page.waitForSelector('.rfw-page[data-model-id="plane-mirror"] .rfw-workspace',{timeout:20000});
    await page.waitForFunction(()=>document.querySelectorAll('mjx-container').length>0,{timeout:20000});
    await page.waitForTimeout(1000);
    await focusWorkspace(page);

    record.layout=await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}:null};
      const workspace=document.querySelector('.rfw-workspace');
      return{
        workspace:rect('.rfw-workspace'),
        primary:rect('.rfw-primary-column'),
        analysis:rect('.rfw-analysis-column'),
        mechanism:rect('[data-module-id="observable"]'),
        formula:rect('[data-module-id="derivation"]'),
        columns:getComputedStyle(workspace).gridTemplateColumns,
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
      };
    });

    const {primary,analysis}=record.layout;
    if(!primary||!analysis)record.assertions.push('missing primary or analysis column');
    else{
      if(analysis.x<primary.right+12)record.assertions.push(`analysis is not to the right: primary right ${primary.right}, analysis x ${analysis.x}`);
      if(Math.abs(analysis.y-primary.y)>24)record.assertions.push(`columns not top-aligned: ${primary.y} vs ${analysis.y}`);
      if(primary.width<850)record.assertions.push(`primary too narrow ${primary.width}px`);
      if(analysis.width<600)record.assertions.push(`analysis too narrow ${analysis.width}px`);
      if(visibleFraction(analysis,width,height)<.82)record.assertions.push(`analysis column insufficiently visible ${visibleFraction(analysis,width,height).toFixed(3)}`);
    }
    if(record.layout.overflow>2)record.assertions.push(`horizontal overflow ${record.layout.overflow}px`);

    const formulaModule=page.locator('[data-module-id="derivation"]');
    if(await formulaModule.count()===0)record.assertions.push('derivation module missing');
    else{
      await formulaModule.evaluate(node=>node.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'}));
      await page.waitForTimeout(500);
      record.formula=await formulaModule.evaluate(module=>{
        const moduleRect=module.getBoundingClientRect();
        const formulas=[...module.querySelectorAll('mjx-container')].filter(node=>{
          const r=node.getBoundingClientRect();
          return r.width>0&&r.height>0;
        }).map(node=>{
          const r=node.getBoundingClientRect();
          return{
            text:(node.textContent||'').trim(),
            fontSize:parseFloat(getComputedStyle(node).fontSize),
            x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,
            leftSafety:r.left-moduleRect.left,
            rightSafety:moduleRect.right-r.right,
            topSafety:r.top-moduleRect.top,
            bottomSafety:moduleRect.bottom-r.bottom
          };
        });
        const steps=[...module.querySelectorAll('.rfw-step')].map(node=>{
          const r=node.getBoundingClientRect();
          return{height:r.height,fontSize:parseFloat(getComputedStyle(node).fontSize)};
        });
        return{module:{x:moduleRect.x,y:moduleRect.y,width:moduleRect.width,height:moduleRect.height,right:moduleRect.right,bottom:moduleRect.bottom},formulas,steps};
      });
      if((record.formula.formulas?.length||0)<3)record.assertions.push(`captured too few formulas ${record.formula.formulas?.length||0}`);
      for(const formula of record.formula.formulas||[]){
        if(formula.fontSize<22)record.assertions.push(`formula too small ${formula.fontSize}px: ${formula.text}`);
        if(formula.leftSafety<8||formula.rightSafety<8||formula.topSafety<8||formula.bottomSafety<8){
          record.assertions.push(`formula unsafe bounds ${JSON.stringify(formula)}`);
        }
      }
      for(const step of record.formula.steps||[]){
        if(step.height<62)record.assertions.push(`formula step too short ${step.height}px`);
      }
    }

    await page.screenshot({path:`${outDir}/r2-${width}x${height}-wide-formula.png`,fullPage:false});
  }catch(error){
    record.errors.push(`audit: ${error?.stack||error}`);
    await page.screenshot({path:`${outDir}/r2-${width}x${height}-failure.png`,fullPage:false}).catch(()=>{});
  }finally{
    results.push(record);
    await page.close();
  }
}

await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2));
await browser.close();
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length||r.assertions.length))process.exit(1);
