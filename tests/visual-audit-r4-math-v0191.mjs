import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-r4-math-v0191';
await fs.mkdir(outDir,{recursive:true});
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1735,height:865},deviceScaleFactor:1});
const failures = [];

try {
  await page.goto('http://127.0.0.1:8000/#model:fresnel-brewster',{waitUntil:'networkidle'});
  await page.waitForSelector('.r4w-page[data-r4-formula-repair="true"]',{timeout:20000});
  await page.locator('.r4w-drawer-handle').click();
  await page.waitForSelector('.r4w-drawer.is-open');
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => ({
    mathErrors: document.querySelectorAll('mjx-merror').length,
    visibleErrorText: document.querySelector('.r4w-page')?.innerText.includes('Math input error') || false,
    coreMath: document.querySelectorAll('.r4w-core mjx-container').length,
    drawerMath: document.querySelectorAll('.r4w-formulas mjx-container').length,
    repair: document.querySelector('.r4w-page')?.dataset.r4FormulaRepair || null,
    sourceBackslashes: document.querySelector('.r4w-formulas')?.textContent.includes('\\frac') || false
  }));

  if(result.repair!=='true')failures.push('formula repair marker missing');
  if(result.mathErrors!==0)failures.push(`MathJax rendered ${result.mathErrors} error nodes`);
  if(result.visibleErrorText)failures.push('visible Math input error text remains');
  if(result.coreMath!==1)failures.push(`expected 1 core formula, found ${result.coreMath}`);
  if(result.drawerMath!==3)failures.push(`expected 3 drawer formulas, found ${result.drawerMath}`);
  if(result.sourceBackslashes)failures.push('raw LaTeX source remains visible after typesetting');

  await page.screenshot({path:`${outDir}/r4-math-1735x865.png`,fullPage:false});
  await fs.writeFile(`${outDir}/metrics.json`,JSON.stringify({result,failures},null,2));
  console.log(JSON.stringify({result,failures},null,2));
} finally {
  await browser.close();
}

if(failures.length)process.exit(1);
