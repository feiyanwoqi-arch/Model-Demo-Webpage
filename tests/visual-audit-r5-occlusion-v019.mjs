import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir='visual-audit-r5-occlusion-v019';
const viewports=[[2560,1440],[1920,1080],[1735,865],[1440,900],[1366,768]];
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];

const visible=n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0;};
async function setParam(page,key,value){
  await page.locator(`[data-r5-param="${key}"]`).evaluate((node,next)=>{node.value=String(next);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);
}
async function openModules(page){
  await page.locator('.tir-left-handle').evaluate(n=>n.click());
  await page.waitForSelector('.tir-left-drawer.is-open');
}
async function usePreset(page,name){
  await page.locator(`.tir-left-drawer [data-r5-preset="${name}"]`).evaluate(n=>n.click());
  await page.waitForTimeout(450);
  await page.locator('.tir-left-drawer [data-r5-close]').evaluate(n=>n.click());
  await page.waitForTimeout(350);
}
async function containment(page,cardSelector,canvasSelector){
  return page.evaluate(({cardSelector,canvasSelector})=>{
    const card=document.querySelector(cardSelector),canvas=document.querySelector(canvasSelector),wrap=canvas?.parentElement;
    if(!card||!canvas||!wrap)return null;
    const c=card.getBoundingClientRect(),v=canvas.getBoundingClientRect(),w=wrap.getBoundingClientRect();
    return {card:{top:c.top,bottom:c.bottom,left:c.left,right:c.right},canvas:{top:v.top,bottom:v.bottom,left:v.left,right:v.right},wrap:{top:w.top,bottom:w.bottom,left:w.left,right:w.right},scroll:{height:wrap.scrollHeight,client:wrap.clientHeight}};
  },{cardSelector,canvasSelector});
}
function checkContainment(record,label,box,tolerance=2){
  if(!box){record.failures.push(`${label} missing`);return;}
  if(box.canvas.top<box.wrap.top-tolerance||box.canvas.bottom>box.wrap.bottom+tolerance||box.canvas.left<box.wrap.left-tolerance||box.canvas.right>box.wrap.right+tolerance)record.failures.push(`${label} canvas escapes its wrap: ${JSON.stringify(box)}`);
  if(box.wrap.top<box.card.top-tolerance||box.wrap.bottom>box.card.bottom+tolerance)record.failures.push(`${label} wrap escapes its card: ${JSON.stringify(box)}`);
  if(box.scroll.height>box.scroll.client+3)record.failures.push(`${label} wrap clips intrinsic content: ${JSON.stringify(box.scroll)}`);
}
async function fontFloor(page,rootSelector,floor){
  return page.evaluate(({rootSelector,floor})=>{
    const root=document.querySelector(rootSelector);if(!root)return [{text:'<missing root>',size:null}];
    return [...root.querySelectorAll('*')].filter(n=>{
      if(n.children.length||/^(SCRIPT|STYLE|CANVAS|SVG|PATH|INPUT|OPTION)$/i.test(n.tagName)||n.closest('mjx-container'))return false;
      const t=(n.textContent||'').trim(),s=getComputedStyle(n),r=n.getBoundingClientRect();return t&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0&&parseFloat(s.fontSize)<floor;
    }).map(n=>({text:(n.textContent||'').trim().replace(/\s+/g,' ').slice(0,100),size:parseFloat(getComputedStyle(n).fontSize),tag:n.tagName}));
  },{rootSelector,floor});
}

for(const [width,height] of viewports){
  const record={width,height,failures:[],containment:{},fonts:{},states:{}};
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('pageerror',e=>record.failures.push(`page: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')record.failures.push(`console: ${m.text()}`);});
  try{
    await page.goto('http://127.0.0.1:8000/#model:total-internal',{waitUntil:'networkidle'});
    await page.waitForSelector('.tir-page[data-legibility-version="019"]',{timeout:20000});
    await page.waitForTimeout(1100);
    if(await page.locator('.mjx-merror').count()||await page.getByText('Math input error',{exact:true}).count())record.failures.push('MathJax input error remains');

    record.containment.main=await page.evaluate(()=>{
      const canvas=document.querySelector('#r5MainCanvas'),wrap=document.querySelector('.tir-main-canvas-wrap'),guide=document.querySelector('.tir-primary-guide'),live=document.querySelector('.tir-live-strip');
      if(!canvas||!wrap||!guide||!live)return null;
      const c=canvas.getBoundingClientRect(),w=wrap.getBoundingClientRect(),g=guide.getBoundingClientRect(),l=live.getBoundingClientRect();
      return {canvas:{top:c.top,bottom:c.bottom,left:c.left,right:c.right},wrap:{top:w.top,bottom:w.bottom,left:w.left,right:w.right},guideBottom:g.bottom,liveTop:l.top};
    });
    const main=record.containment.main;
    if(!main)record.failures.push('main containment metrics missing');
    else{
      if(main.canvas.top<main.wrap.top-2||main.canvas.bottom>main.wrap.bottom+2)record.failures.push(`main canvas escapes wrap: ${JSON.stringify(main)}`);
      if(main.canvas.top<main.guideBottom-1)record.failures.push(`main canvas lies under guide: ${JSON.stringify(main)}`);
      if(main.canvas.bottom>main.liveTop+1)record.failures.push(`main canvas lies under live strip: ${JSON.stringify(main)}`);
    }
    record.containment.transition=await containment(page,'[data-module-id="transition"]','[data-r5-canvas="transition"]');
    record.containment.decay=await containment(page,'[data-module-id="decay"]','[data-r5-canvas="decay"]');
    checkContainment(record,'transition',record.containment.transition);
    checkContainment(record,'decay',record.containment.decay);
    await page.screenshot({path:`${outDir}/r5-${width}x${height}-00-overview.png`,fullPage:false});
    await page.locator('#r5MainCanvas').scrollIntoViewIfNeeded();
    await page.locator('#r5MainCanvas').screenshot({path:`${outDir}/r5-${width}x${height}-01-main.png`});
    await page.locator('[data-module-id="transition"]').scrollIntoViewIfNeeded();
    await page.locator('[data-module-id="transition"]').screenshot({path:`${outDir}/r5-${width}x${height}-02-transition.png`});
    await page.locator('[data-module-id="decay"]').scrollIntoViewIfNeeded();
    await page.locator('[data-module-id="decay"]').screenshot({path:`${outDir}/r5-${width}x${height}-03-decay.png`});

    await openModules(page);
    record.fonts.leftDrawer=await fontFloor(page,'.tir-left-drawer',13);
    if(record.fonts.leftDrawer.length)record.failures.push(`left drawer small text: ${JSON.stringify(record.fonts.leftDrawer)}`);
    await page.screenshot({path:`${outDir}/r5-${width}x${height}-04-module-drawer.png`,fullPage:false});
    await usePreset(page,'apparatus');
    await setParam(page,'gap',100);
    await page.waitForTimeout(450);
    record.states.near=await page.evaluate(()=>window.R5TIRWorkbenchV019.lastOutput?.coupling);
    record.containment.apparatus=await containment(page,'[data-module-id="apparatus"]','[data-r5-canvas="apparatus"]');
    checkContainment(record,'apparatus',record.containment.apparatus);
    await page.locator('[data-module-id="apparatus"]').scrollIntoViewIfNeeded();
    await page.locator('[data-module-id="apparatus"]').screenshot({path:`${outDir}/r5-${width}x${height}-05-apparatus-near.png`});
    await setParam(page,'gap',1200);
    await page.waitForTimeout(450);
    record.states.far=await page.evaluate(()=>window.R5TIRWorkbenchV019.lastOutput?.coupling);
    if(!(record.states.near>record.states.far*5))record.failures.push(`FTIR gap response too weak: ${JSON.stringify(record.states)}`);
    await page.locator('[data-module-id="apparatus"]').screenshot({path:`${outDir}/r5-${width}x${height}-06-apparatus-far.png`});

    const audit=await page.evaluate(()=>window.R5TIRWorkbenchV019.getTextAudit());
    const apparatusAudit=audit?.apparatus||[];
    const apparatusCanvas=await page.locator('[data-r5-canvas="apparatus"]').boundingBox();
    const scale=apparatusCanvas?apparatusCanvas.width/720:0;
    const small=apparatusAudit.filter(x=>x.size*scale<14-0.05);
    if(!apparatusAudit.length)record.failures.push('apparatus canvas text audit missing');
    if(small.length)record.failures.push(`apparatus canvas text below 14px: ${JSON.stringify(small)}`);
  }catch(error){
    record.failures.push(error?.stack||String(error));
    await page.screenshot({path:`${outDir}/r5-${width}x${height}-99-failure.png`,fullPage:false}).catch(()=>{});
  }finally{
    results.push(record);await page.close();
  }
}
await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2));
await browser.close();
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.failures.length))process.exit(1);
