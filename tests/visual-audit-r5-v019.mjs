import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir='visual-audit-r5-v019';
const viewports=[[2560,1440],[1920,1080],[1735,865],[1440,900],[1366,768]];
await fs.mkdir(outDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];

const visibleFraction=(b,w,h)=>{if(!b||b.width<=0||b.height<=0)return 0;const x=Math.max(0,Math.min(b.x+b.width,w)-Math.max(0,b.x));const y=Math.max(0,Math.min(b.y+b.height,h)-Math.max(0,b.y));return x*y/(b.width*b.height)};
async function center(page,selector){await page.locator(selector).evaluate(n=>n.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));await page.waitForTimeout(250)}
async function dragLogical(page,canvas,start,end){const b=await canvas.boundingBox();if(!b)throw new Error('missing canvas box');const p=q=>({x:b.x+q.x/1080*b.width,y:b.y+q.y/675*b.height});const a=p(start),z=p(end);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(z.x,z.y,{steps:20});await page.mouse.up();}
async function setParam(page,key,value){await page.locator(`[data-r5-param="${key}"]`).evaluate((n,v)=>{n.value=String(v);n.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function fontAudit(page,rootSelector,floor){return page.evaluate(({rootSelector,floor})=>{const root=document.querySelector(rootSelector);if(!root)return[{text:'<missing root>',size:null,selector:rootSelector}];return[...root.querySelectorAll('*')].filter(n=>{if(n.children.length||/^(SCRIPT|STYLE|CANVAS|SVG|PATH|INPUT|OPTION)$/i.test(n.tagName)||n.tagName.toLowerCase().startsWith('mjx-')||n.closest('mjx-container'))return false;const s=getComputedStyle(n),r=n.getBoundingClientRect(),text=(n.textContent||'').trim();return text&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0&&parseFloat(s.fontSize)<floor;}).map(n=>({text:(n.textContent||'').trim().replace(/\s+/g,' ').slice(0,100),size:parseFloat(getComputedStyle(n).fontSize),tag:n.tagName,className:n.className||''}));},{rootSelector,floor});}
async function elementShot(page,selector,path){await center(page,selector);await page.locator(selector).screenshot({path});}

for(const [width,height] of viewports){
  const r={width,height,errors:[],assertions:[],layout:null,states:{},fontFailures:{},canvasText:[]};
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('console',m=>{if(m.type()==='error')r.errors.push(`console: ${m.text()}`)});page.on('pageerror',e=>r.errors.push(`page: ${e.message}`));
  try{
    await page.goto('http://127.0.0.1:8000/#model:total-internal',{waitUntil:'networkidle'});
    await page.waitForSelector('.tir-page[data-legibility-version="019"]',{timeout:20000});
    await page.waitForTimeout(1100);
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`${outDir}/r5-${width}x${height}-00-overview.png`,fullPage:false});

    r.layout=await page.evaluate(()=>{const rect=s=>{const n=document.querySelector(s);if(!n)return null;const b=n.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right}};const css=s=>{const n=document.querySelector(s);return n?getComputedStyle(n):null};const main=document.querySelector('#r5MainCanvas');const mod=document.querySelector('[data-r5-canvas="transition"]');return{app:document.querySelector('.app')?.className||'',overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,primary:rect('.tir-primary'),analysis:rect('.tir-analysis'),main:rect('#r5MainCanvas'),transition:rect('[data-r5-canvas="transition"]'),mainScale:main?main.getBoundingClientRect().width/1080:0,moduleScale:mod?mod.getBoundingClientRect().width/720:0,edgeWriting:css('.tir-left-handle')?.writingMode||'',analysisTitle:parseFloat(css('.tir-analysis h2')?.fontSize||0),moduleTitle:parseFloat(css('.tir-module h3')?.fontSize||0),moduleCopy:parseFloat(css('.tir-module>header p')?.fontSize||0)};});
    if(!r.layout.app.includes('r5-v019-active'))r.assertions.push('missing R5 active class');
    if(r.layout.overflow>2)r.assertions.push(`horizontal overflow ${r.layout.overflow}px`);
    if(r.layout.edgeWriting.startsWith('vertical'))r.assertions.push('edge controls are vertical');
    if(Math.abs((r.layout.main?.width||0)/(r.layout.main?.height||1)-1080/675)>.025)r.assertions.push('main canvas aspect ratio distorted');
    if(Math.abs((r.layout.transition?.width||0)/(r.layout.transition?.height||1)-720/290)>.03)r.assertions.push('module canvas aspect ratio distorted');
    if(r.layout.mainScale<.66)r.assertions.push(`main scale too small ${r.layout.mainScale}`);
    if(r.layout.moduleScale<.62)r.assertions.push(`module scale too small ${r.layout.moduleScale}`);
    if(r.layout.analysisTitle<26)r.assertions.push(`analysis title ${r.layout.analysisTitle}px`);
    if(r.layout.moduleTitle<20)r.assertions.push(`module title ${r.layout.moduleTitle}px`);
    if(r.layout.moduleCopy<13)r.assertions.push(`module copy ${r.layout.moduleCopy}px`);
    if(width>=1880){if(Math.abs(r.layout.primary.y-r.layout.analysis.y)>25)r.assertions.push('wide layout not synchronized');if(r.layout.primary.bottom>height+4||r.layout.analysis.bottom>height+4)r.assertions.push('wide workspace exceeds first viewport');}

    await elementShot(page,'#r5MainCanvas',`${outDir}/r5-${width}x${height}-01-main-default.png`);
    r.states.default=await page.evaluate(()=>({state:window.R5TIRWorkbenchV019.getState(),out:window.R5TIRWorkbenchV019.lastOutput,regime:document.querySelector('.tir-page')?.dataset.r5Regime}));
    if(r.states.default.regime!=='tir')r.assertions.push(`default regime ${r.states.default.regime}`);
    if(!(r.states.default.out.depth>0&&r.states.default.out.probeAmplitude>0&&r.states.default.out.probeAmplitude<1))r.assertions.push('default evanescent metrics invalid');

    const main=page.locator('#r5MainCanvas');
    await center(page,'#r5MainCanvas');
    await dragLogical(page,main,{x:539,y:545},{x:605,y:611});await page.waitForTimeout(450);
    r.states.below=await page.evaluate(()=>({angle:document.querySelector('[data-r5-output="angle"]')?.textContent,regime:document.querySelector('.tir-page')?.dataset.r5Regime,T:window.R5TIRWorkbenchV019.lastOutput.T}));
    if(r.states.below.regime!=='transmission')r.assertions.push(`drag below critical failed: ${JSON.stringify(r.states.below)}`);
    await elementShot(page,'#r5MainCanvas',`${outDir}/r5-${width}x${height}-02-below-critical.png`);

    await dragLogical(page,main,{x:605,y:611},{x:521,y:517});await page.waitForTimeout(450);
    r.states.tir=await page.evaluate(()=>({angle:document.querySelector('[data-r5-output="angle"]')?.textContent,regime:document.querySelector('.tir-page')?.dataset.r5Regime,depth:Number(document.querySelector('.tir-page')?.dataset.r5Depth)}));
    if(r.states.tir.regime!=='tir')r.assertions.push(`drag into TIR failed: ${JSON.stringify(r.states.tir)}`);
    await elementShot(page,'#r5MainCanvas',`${outDir}/r5-${width}x${height}-03-tir-dragged.png`);

    await dragLogical(page,main,{x:960,y:320},{x:960,y:205});await page.waitForTimeout(350);
    r.states.probe=await page.evaluate(()=>({depth:document.querySelector('[data-r5-output="probeDepth"]')?.textContent,amp:Number(document.querySelector('.tir-page')?.dataset.r5ProbeAmplitude)}));
    if(parseFloat(r.states.probe.depth)<700||!(r.states.probe.amp<.5))r.assertions.push(`probe drag failed: ${JSON.stringify(r.states.probe)}`);
    await elementShot(page,'#r5MainCanvas',`${outDir}/r5-${width}x${height}-04-probe-deep.png`);

    await elementShot(page,'[data-module-id="transition"]',`${outDir}/r5-${width}x${height}-05-transition.png`);
    await elementShot(page,'[data-module-id="decay"]',`${outDir}/r5-${width}x${height}-06-decay.png`);

    const text=await page.evaluate(()=>window.R5TIRWorkbenchV019.getTextAudit());
    const scales={main:r.layout.mainScale,transition:r.layout.moduleScale,decay:r.layout.moduleScale};
    for(const name of ['main','transition','decay'])for(const item of text[name]||[]){const effective=item.size*scales[name];r.canvasText.push({name,label:item.label,effective});const core=/全反射|倏逝|临界|探针|传播|反射|折射|穿透|能流|法向|当前状态|介质/.test(item.label);const floor=core?14:12.5;if(effective+0.05<floor)r.assertions.push(`${name} text too small ${item.label}: ${effective.toFixed(2)}px`);}

    await page.locator('.tir-left-handle').evaluate(n=>n.click());await page.waitForSelector('.tir-left-drawer.is-open');await page.locator('[data-r5-preset="proof"]').evaluate(n=>n.click());await page.locator('.tir-left-drawer [data-r5-close]').evaluate(n=>n.click());await page.waitForTimeout(600);
    await elementShot(page,'[data-module-id="derivation"]',`${outDir}/r5-${width}x${height}-07-derivation.png`);
    await elementShot(page,'[data-module-id="validation"]',`${outDir}/r5-${width}x${height}-08-validation.png`);
    const mathError=await page.locator('.mjx-merror').count()||await page.getByText('Math input error',{exact:true}).count();if(mathError)r.assertions.push(`MathJax input errors ${mathError}`);const eqSizes=await page.evaluate(()=>[...document.querySelectorAll('.tir-hero-eq mjx-container,.tir-eq mjx-container')].map(n=>parseFloat(getComputedStyle(n).fontSize)));if(!eqSizes.length||Math.min(...eqSizes)<17)r.assertions.push(`formula display too small or missing: ${JSON.stringify(eqSizes)}`);const proofOverflow=await page.evaluate(()=>[...document.querySelectorAll('[data-module-id="derivation"] .tir-module-html,[data-module-id="validation"] .tir-module-html')].map(n=>({scroll:n.scrollHeight,client:n.clientHeight})));if(proofOverflow.some(x=>x.scroll>x.client+3))r.assertions.push(`proof module content clipped: ${JSON.stringify(proofOverflow)}`);r.fontFailures.analysis=await fontAudit(page,'.tir-analysis',13);for(const f of r.fontFailures.analysis)r.assertions.push(`analysis font ${f.size}px: ${f.text}`);

    await page.locator('.tir-right-handle').evaluate(n=>n.click());await page.waitForSelector('.tir-right-drawer.is-open');await page.waitForTimeout(300);
    const drawer=await page.locator('.tir-right-drawer').boundingBox();if(!drawer||visibleFraction(drawer,width,height)<.99)r.assertions.push('parameter drawer not visible');
    r.fontFailures.drawer=await fontAudit(page,'.tir-right-drawer',13);for(const f of r.fontFailures.drawer)r.assertions.push(`drawer font ${f.size}px: ${f.text}`);
    await page.screenshot({path:`${outDir}/r5-${width}x${height}-09-drawer-top.png`,fullPage:false});
    await page.locator('.tir-right-drawer').evaluate(n=>n.scrollTop=n.scrollHeight);await page.waitForTimeout(250);await page.screenshot({path:`${outDir}/r5-${width}x${height}-10-drawer-bottom.png`,fullPage:false});
    await page.locator('.tir-right-drawer [data-r5-close]').evaluate(n=>n.click());

    await setParam(page,'n1',1.2);await setParam(page,'n2',1.45);await setParam(page,'angle',65);await page.waitForTimeout(350);
    r.states.invalid=await page.evaluate(()=>({regime:document.querySelector('.tir-page')?.dataset.r5Regime,critical:document.querySelector('[data-r5-metric="critical"]')?.textContent}));
    if(r.states.invalid.regime!=='no-tir'||!r.states.invalid.critical.includes('不存在'))r.assertions.push(`invalid index order state failed: ${JSON.stringify(r.states.invalid)}`);
    await elementShot(page,'#r5MainCanvas',`${outDir}/r5-${width}x${height}-11-no-critical-angle.png`);

  }catch(error){r.errors.push(error?.stack||String(error));await page.screenshot({path:`${outDir}/r5-${width}x${height}-99-failure.png`,fullPage:false}).catch(()=>{});}finally{results.push(r);await page.close();}
}
await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify(results,null,2));
await browser.close();
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.errors.length||r.assertions.length))process.exit(1);
