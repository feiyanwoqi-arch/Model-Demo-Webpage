import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = 'https://feiyanwoqi-arch.github.io/Model-Demo-Webpage/';
const outDir = 'live-pages-r2-v015';
const maxAttempts = 24;
const waitBetweenAttemptsMs = 15000;
await fs.mkdir(outDir, { recursive: true });

const expectedScripts = [
  'assets/js/r2-visual-refinement-v015.js',
  'assets/js/r2-mechanism-sync-v015.js',
  'assets/js/r2-render-stability-v015.js',
  'assets/js/r2-interval-clarity-v015.js'
];
const expectedStyles = [
  'assets/css/r2-visual-refinement-v015.css',
  'assets/css/r2-drawer-position-v015.css'
];

const browser = await chromium.launch({ headless: true });
const history = [];
let finalResult = null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function dragLogical(page, canvas, start, end) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error('live main canvas has no bounding box');
  const map = point => ({
    x: box.x + point.x / 1080 * box.width,
    y: box.y + point.y / 675 * box.height
  });
  const a = map(start);
  const b = map(end);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 18 });
  await page.mouse.up();
}

async function canvasInkRatio(locator) {
  return locator.evaluate(canvas => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.width || !canvas.height) return 0;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const step = Math.max(6, Math.round(Math.min(canvas.width, canvas.height) / 70));
    let ink = 0;
    let total = 0;
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const index = (y * canvas.width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];
        total += 1;
        if (a > 12 && !(r > 246 && g > 246 && b > 246)) ink += 1;
      }
    }
    return total ? ink / total : 0;
  });
}

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const cacheKey = `${Date.now()}-${attempt}`;
  const url = `${baseUrl}?live_r2_v015=${cacheKey}#model:plane-mirror`;
  const page = await browser.newPage({ viewport: { width: 1735, height: 865 }, deviceScaleFactor: 1 });
  const record = {
    attempt,
    url,
    loadedAt: new Date().toISOString(),
    scripts: [],
    styles: [],
    missingScripts: [],
    missingStyles: [],
    errors: [],
    assertions: []
  };
  page.on('console', message => { if (message.type() === 'error') record.errors.push(`console: ${message.text()}`); });
  page.on('pageerror', error => record.errors.push(`page: ${error.message}`));

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    record.httpStatus = response?.status() ?? null;
    await page.waitForTimeout(1300);

    const resources = await page.evaluate(() => ({
      scripts: Array.from(document.scripts, node => node.src).filter(Boolean),
      styles: Array.from(document.querySelectorAll('link[rel="stylesheet"]'), node => node.href).filter(Boolean),
      title: document.title,
      bodyText: document.body.innerText.slice(0, 500)
    }));
    record.scripts = resources.scripts;
    record.styles = resources.styles;
    record.title = resources.title;
    record.missingScripts = expectedScripts.filter(path => !resources.scripts.some(src => src.includes(path)));
    record.missingStyles = expectedStyles.filter(path => !resources.styles.some(src => src.includes(path)));

    if (record.httpStatus !== 200) record.assertions.push(`HTTP status ${record.httpStatus}`);
    if (record.missingScripts.length) record.assertions.push(`stale scripts: ${record.missingScripts.join(', ')}`);
    if (record.missingStyles.length) record.assertions.push(`stale styles: ${record.missingStyles.join(', ')}`);

    if (!record.missingScripts.length && !record.missingStyles.length) {
      await page.waitForSelector('.rfw-page[data-model-id="plane-mirror"] #rfwMainCanvas', { timeout: 20000 });
      await page.waitForTimeout(1800);

      const layout = await page.evaluate(() => {
        const primary = document.querySelector('.rfw-primary-card')?.getBoundingClientRect();
        const analysis = document.querySelector('.rfw-analysis-column')?.getBoundingClientRect();
        return {
          appClass: document.querySelector('.app')?.className || '',
          viewClass: document.querySelector('#view')?.className || '',
          pageModel: document.querySelector('.rfw-page')?.dataset.modelId || '',
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          widthUsage: primary && analysis ? (analysis.right - primary.left) / innerWidth : 0
        };
      });
      record.layout = layout;
      if (!layout.appClass.includes('r2-v015-active')) record.assertions.push(`missing app runtime class: ${layout.appClass}`);
      if (!layout.viewClass.includes('r2-v015-mounted')) record.assertions.push(`missing view runtime class: ${layout.viewClass}`);
      if (layout.pageModel !== 'plane-mirror') record.assertions.push(`wrong model ${layout.pageModel}`);
      if (layout.horizontalOverflow > 2) record.assertions.push(`horizontal overflow ${layout.horizontalOverflow}px`);
      if (layout.widthUsage < .88) record.assertions.push(`live width use ${(layout.widthUsage * 100).toFixed(1)}%`);

      const canvas = page.locator('#rfwMainCanvas');
      record.initialInkRatio = await canvasInkRatio(canvas);
      if (record.initialInkRatio < .002) record.assertions.push(`blank live canvas ${record.initialInkRatio.toFixed(5)}`);

      record.before = {
        distance: await page.locator('[data-rfw-output="distance"]').textContent(),
        height: await page.locator('[data-rfw-output="height"]').textContent()
      };
      await dragLogical(page, canvas, { x: 330, y: 395 }, { x: 280, y: 350 });
      await page.waitForTimeout(600);
      record.after = {
        distance: await page.locator('[data-rfw-output="distance"]').textContent(),
        height: await page.locator('[data-rfw-output="height"]').textContent()
      };
      if (Math.abs(parseFloat(record.after.distance) - 320) > 2) record.assertions.push(`live object distance ${record.after.distance}`);
      if (Math.abs(parseFloat(record.after.height) - 195) > 2) record.assertions.push(`live object height ${record.after.height}`);

      await page.screenshot({ path: `${outDir}/r2-live-1735x865-main.png`, fullPage: false });
      await page.locator('.rfw-right-handle').click();
      await page.waitForSelector('.rfw-right-drawer.is-open');
      await page.waitForTimeout(280);
      const drawer = await page.locator('.rfw-right-drawer').boundingBox();
      record.rightDrawer = drawer;
      if (!drawer || drawer.x < 0 || drawer.x + drawer.width > 1735 || drawer.y < 0 || drawer.y + drawer.height > 865) {
        record.assertions.push('live right drawer is clipped');
      }
      await page.screenshot({ path: `${outDir}/r2-live-1735x865-parameters.png`, fullPage: false });
    }
  } catch (error) {
    record.errors.push(`audit: ${error?.stack || error}`);
  } finally {
    history.push(record);
    await page.close();
  }

  const staleOnly = record.assertions.length > 0 && record.assertions.every(item => item.startsWith('stale '));
  if (!record.errors.length && !record.assertions.length) {
    finalResult = record;
    break;
  }
  if (attempt < maxAttempts && (staleOnly || record.httpStatus !== 200)) {
    await sleep(waitBetweenAttemptsMs);
    continue;
  }
  if (attempt < maxAttempts && record.missingScripts.length + record.missingStyles.length > 0) {
    await sleep(waitBetweenAttemptsMs);
    continue;
  }
  break;
}

await fs.writeFile(`${outDir}/metrics.json`, JSON.stringify({ finalResult, history }, null, 2));
await browser.close();

if (!finalResult) {
  console.error(JSON.stringify(history, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(finalResult, null, 2));
