import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-r3-v017';
const viewports = [[2560,1440],[1920,1080],[1735,865],[1440,900],[1366,768]];
await fs.mkdir(outDir,{recursive:true});
const browser = await chromium.launch({headless:true});
const results = [];

const analysisRules = [
  ['.rfw-analysis-head h2',24,'analysis heading'],
  ['.rfw-analysis-head p',14,'analysis description'],
  ['.rfw-analysis-head output',12,'analysis counter'],
  ['.rfw-module-head>div>span',11,'module eyebrow'],
  ['.rfw-module-head h3',20,'module title'],
  ['.rfw-module-head p',13,'module subtitle'],
  ['.rfw-module-actions button',11,'module action'],
  ['.rfw-module-guide summary',13,'module guide summary'],
  ['.rfw-module-guide p',12.5,'module guide copy'],
  ['.rfw-module-guide b',11,'module guide label'],
  ['.rfw-derivation-list article>i',12,'derivation step number'],
  ['.rfw-derivation-list p',14,'derivation explanation'],
  ['.rfw-checks span',12.5,'check label'],
  ['.rfw-checks b',16,'check result'],
  ['.rfw-checks p',13.5,'check explanation'],
  ['.rfw-boundary b',14,'boundary heading'],
  ['.rfw-boundary p',13.5,'boundary explanation']
];

const drawerRules = [
  ['.rfw-right-drawer header span',11,'drawer eyebrow'],
  ['.rfw-right-drawer h2',24,'drawer title'],
  ['.rfw-right-drawer header button',12,'drawer header action'],
  ['.rfw-right-drawer .rfw-reset',13,'drawer reset'],
  ['.rfw-right-drawer .rfw-control b',14,'control label'],
  ['.rfw-right-drawer .rfw-control output',13,'control value'],
  ['.rfw-right-drawer .rfw-control select',13,'control select'],
  ['.rfw-right-drawer .rfw-model-presets button',13,'preset button'],
  ['.rfw-right-drawer .rfw-full-metrics span',12.5,'metric label'],
  ['.rfw-right-drawer .rfw-full-metrics b',15,'metric value'],
  ['.rfw-right-drawer .rfw-status',13.5,'drawer status']
];

async function auditRules(page,rules){
  return page.evaluate(ruleList=>ruleList.flatMap(([selector,min,label])=>{
    const nodes=[...document.querySelectorAll(selector)].filter(node=>{
      const s=getComputedStyle(node),r=node.getBoundingClientRect();
      return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0;
    });
    if(!nodes.length)return [{selector,label,min,size:null,text:'<missing>'}];
    return nodes.map(node=>({selector,label,min,size:parseFloat(getComputedStyle(node).fontSize),text:(node.textContent||'').trim().replace(/\s+/g,' ').slice(0,120)}));
  }),rules);
}

async function auditLeafFloor(page,rootSelector,floor){
  return page.evaluate(({rootSelector,floor})=>{
    const root=document.querySelector(rootSelector);
    if(!root)return [{text:'<missing root>',size:null,tag:'ROOT'}];
    return [...root.querySelectorAll('*')].filter(node=>{
      if(node.children.length!==0)return false;
      if(/^(SCRIPT|STYLE|CANVAS|SVG|PATH|INPUT|OPTION)$/i.test(node.tagName))return false;
      if(node.tagName.toLowerCase().startsWith('mjx-'))return false;
      const text=(node.textContent||'').trim();
      const s=getComputedStyle(node),r=node.getBoundingClientRect();
      return text&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0&&parseFloat(s.fontSize)<floor;
    }).map(node=>({text:(node.textContent||'').trim().replace(/\s+/g,' ').slice(0,120),size:parseFloat(getComputedStyle(node).fontSize),tag:node.tagName,className:node.className||''}));
  },{rootSelector,floor});
}

for(const [width,height] of viewports){
  const record={width,height,failures:[],analysis:[],analysisLeafFailures:[],drawer:[],drawerLeafFailures:[]};
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  try{
    await page.goto('http://127.0.0.1:8000/#model:spherical-mirror',{waitUntil:'networkidle'});
    await page.waitForSelector('.rfw-page[data-model-id="spherical-mirror"][data-legibility-version="018"]',{timeout:20000});
    await page.waitForSelector('.rfw-analysis-column',{timeout:10000});
    await page.waitForTimeout(900);

    await page.locator('.rfw-analysis-column').evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
    await page.waitForTimeout(300);
    record.analysis=await auditRules(page,analysisRules);
    record.analysisLeafFailures=await auditLeafFloor(page,'.rfw-analysis-column',11.5);
    for(const item of record.analysis){
      if(item.size===null)record.failures.push(`missing ${item.label}: ${item.selector}`);
      else if(item.size+0.05<item.min)record.failures.push(`${item.label} ${item.size}px < ${item.min}px: ${item.text}`);
    }
    for(const item of record.analysisLeafFailures)record.failures.push(`analysis leaf ${item.size}px < 11.5px: ${item.text}`);
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-06-analysis-typography.png`,fullPage:false});

    await page.locator('.rfw-right-handle').click({force:true});
    await page.waitForSelector('.rfw-right-drawer.is-open',{timeout:10000});
    await page.waitForTimeout(350);
    record.drawer=await auditRules(page,drawerRules);
    record.drawerLeafFailures=await auditLeafFloor(page,'.rfw-right-drawer',11.5);
    for(const item of record.drawer){
      if(item.size===null)record.failures.push(`missing ${item.label}: ${item.selector}`);
      else if(item.size+0.05<item.min)record.failures.push(`${item.label} ${item.size}px < ${item.min}px: ${item.text}`);
    }
    for(const item of record.drawerLeafFailures)record.failures.push(`drawer leaf ${item.size}px < 11.5px: ${item.text}`);
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-07-drawer-typography.png`,fullPage:false});
  }catch(error){
    record.failures.push(error?.stack||String(error));
    await page.screenshot({path:`${outDir}/r3-${width}x${height}-98-typography-failure.png`,fullPage:false}).catch(()=>{});
  }finally{
    results.push(record);
    await page.close();
  }
}

await fs.writeFile(`${outDir}/right-typography-metrics.json`,JSON.stringify(results,null,2));
await browser.close();
console.log(JSON.stringify(results,null,2));
if(results.some(result=>result.failures.length))process.exit(1);
