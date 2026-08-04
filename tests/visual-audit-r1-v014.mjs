import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-r1-v014';
const viewports = [[2560, 1440], [1920, 1080], [1735, 865], [1440, 900], [1366, 768]];
const moduleAspect = 720 / 260;
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

function visibleFraction(box, width, height) {
  if (!box || box.width <= 0 || box.height <= 0) return 0;
  const w = Math.max(0, Math.min(box.x + box.width, width) - Math.max(box.x, 0));
  const h = Math.max(0, Math.min(box.y + box.height, height) - Math.max(box.y, 0));
  return (w * h) / (box.width * box.height);
}

function rayPoint(angle, radius, outward = false) {
  const theta = angle * Math.PI / 180;
  const sign = outward ? 1 : -1;
  return { x: 570 + sign * radius * Math.sin(theta), y: 420 - radius * Math.cos(theta) };
}

async function dragLogical(page, canvas, start, end) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error('main canvas has no bounding box');
  const map = point => ({ x: box.x + point.x / 1080 * box.width, y: box.y + point.y / 675 * box.height });
  const a = map(start), b = map(end);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 16 });
  await page.mouse.up();
}

async function setRange(page, selector, nextValue) {
  await page.locator(selector).evaluate((element, value) => {
    element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, nextValue);
}

async function focusWorkspace(page) {
  await page.evaluate(() => {
    const workspace = document.querySelector('.rfw-workspace');
    const topbar = document.querySelector('.topbar');
    if (!workspace) return;
    const y = workspace.getBoundingClientRect().top + scrollY - (topbar?.offsetHeight || 0) - 4;
    scrollTo({ top: Math.max(0, y), behavior: 'instant' });
  });
  await page.waitForTimeout(350);
}

async function layoutSnapshot(page, width, height) {
  const selectorMap = {
    primary: '.rfw-primary-card', analysis: '.rfw-analysis-column',
    mechanism: '[data-module-id="mechanism"]', observable: '[data-module-id="observable"]',
    mainCanvas: '#rfwMainCanvas', mechanismCanvas: '[data-module-id="mechanism"] canvas',
    observableCanvas: '[data-module-id="observable"] canvas', leftHandle: '.rfw-left-handle', rightHandle: '.rfw-right-handle'
  };
  const boxes = {};
  for (const [key, selector] of Object.entries(selectorMap)) boxes[key] = await page.locator(selector).boundingBox();
  const css = await page.evaluate(() => {
    const inspect = selector => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const style = getComputedStyle(node);
      return {
        fontSize: parseFloat(style.fontSize), lineHeight: style.lineHeight,
        clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
        clientHeight: node.clientHeight, scrollHeight: node.scrollHeight
      };
    };
    return {
      primaryTitle: inspect('.rfw-primary-head h2'), moduleTitle: inspect('.rfw-module-head h3'),
      liveValue: inspect('.rfw-live-strip b'), mainFoot: inspect('.rfw-primary-foot'),
      leftHandle: inspect('.rfw-left-handle'), rightHandle: inspect('.rfw-right-handle'),
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      appClass: document.querySelector('.app')?.className || ''
    };
  });
  const fractions = Object.fromEntries(Object.entries(boxes).map(([key, box]) => [key, visibleFraction(box, width, height)]));
  return { boxes, fractions, css };
}

function validateLayout(record, snapshot) {
  const { width, assertions } = record;
  for (const key of ['primary', 'mechanism', 'observable']) {
    if (snapshot.fractions[key] < .90) assertions.push(`${key} visible fraction ${snapshot.fractions[key].toFixed(3)}`);
  }
  if (snapshot.css.documentOverflow > 2) assertions.push(`horizontal overflow ${snapshot.css.documentOverflow}px`);
  if (!snapshot.css.appClass.includes('r1-v014-active')) assertions.push('R1 wide-layout runtime class is missing');
  if ((snapshot.boxes.mechanismCanvas?.width || 0) < 430) assertions.push(`mechanism canvas too narrow ${snapshot.boxes.mechanismCanvas?.width || 0}`);
  if ((snapshot.boxes.observableCanvas?.width || 0) < 430) assertions.push(`observable canvas too narrow ${snapshot.boxes.observableCanvas?.width || 0}`);
  for (const key of ['mechanismCanvas', 'observableCanvas']) {
    const box = snapshot.boxes[key];
    if (!box) continue;
    const ratio = box.width / box.height;
    if (Math.abs(ratio - moduleAspect) > .08) assertions.push(`${key} distorted aspect ${ratio.toFixed(3)} (expected ${moduleAspect.toFixed(3)})`);
  }
  if ((snapshot.css.moduleTitle?.fontSize || 0) < 13) assertions.push(`module title too small ${snapshot.css.moduleTitle?.fontSize || 0}px`);
  if ((snapshot.css.liveValue?.fontSize || 0) < 12) assertions.push(`live value too small ${snapshot.css.liveValue?.fontSize || 0}px`);
  for (const key of ['leftHandle', 'rightHandle']) {
    const box = snapshot.boxes[key];
    const style = snapshot.css[key];
    if (box && visibleFraction(box, record.width, record.height) < .99) assertions.push(`${key} is clipped`);
    if (style && (style.scrollWidth > style.clientWidth + 1 || style.scrollHeight > style.clientHeight + 1)) assertions.push(`${key} text overflows`);
  }
  const primary = snapshot.boxes.primary;
  const analysis = snapshot.boxes.analysis;
  if (primary && analysis && width >= 1920) {
    const used = (analysis.x + analysis.width - primary.x) / width;
    if (used < .82) assertions.push(`wide viewport underused ${(used * 100).toFixed(1)}%`);
  }
}

async function audit(width, height) {
  const record = {
    width, height, beforeAngle: null, afterAngle: null, signal: null,
    initial: null, final: null, errors: [], assertions: []
  };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', message => { if (message.type() === 'error') record.errors.push(`console: ${message.text()}`); });
  page.on('pageerror', error => record.errors.push(`page: ${error.message}`));

  try {
    await page.goto('http://127.0.0.1:8000/#model:reflection-law', { waitUntil: 'networkidle' });
    await page.waitForSelector('.rfw-page[data-model-id="reflection-law"] .rfw-primary-card', { timeout: 20000 });
    await page.waitForTimeout(900);
    await focusWorkspace(page);

    record.initial = await layoutSnapshot(page, width, height);
    validateLayout(record, record.initial);
    await page.screenshot({ path: `${outDir}/r1-${width}x${height}-01-initial.png`, fullPage: false });

    const mainCanvas = page.locator('#rfwMainCanvas');
    record.beforeAngle = await page.locator('[data-rfw-output="angle"]').textContent();
    await dragLogical(page, mainCanvas, rayPoint(38, 285), rayPoint(55, 285));
    await page.waitForTimeout(450);
    record.afterAngle = await page.locator('[data-rfw-output="angle"]').textContent();
    if (Math.abs(parseFloat(record.afterAngle) - 55) > 1) record.assertions.push(`source drag ended at ${record.afterAngle}, expected about 55°`);

    await page.locator('.rfw-right-handle').click();
    await page.waitForSelector('.rfw-right-drawer.is-open');
    await page.waitForTimeout(220);
    const rightDrawer = await page.locator('.rfw-right-drawer').boundingBox();
    if (!rightDrawer || visibleFraction(rightDrawer, width, height) < .98) record.assertions.push('right drawer is clipped');
    await page.screenshot({ path: `${outDir}/r1-${width}x${height}-02-parameters-open.png`, fullPage: false });
    await setRange(page, '.rfw-right-drawer [data-rfw-param="roughness"]', 0.62);
    await page.waitForTimeout(420);
    await page.locator('.rfw-right-drawer [data-rfw-close]').click();
    await page.waitForTimeout(260);

    await dragLogical(page, mainCanvas, rayPoint(38, 220, true), rayPoint(55, 220, true));
    await page.waitForTimeout(450);
    record.signal = await page.locator('.rfw-live-strip article').filter({ hasText: '相对接收信号' }).locator('b').textContent({ timeout: 3000 });
    if (parseFloat(record.signal) < 90) record.assertions.push(`aligned receiver signal too low ${record.signal}`);
    await page.screenshot({ path: `${outDir}/r1-${width}x${height}-03-rough-aligned.png`, fullPage: false });

    await page.locator('.rfw-left-handle').click();
    await page.waitForSelector('.rfw-left-drawer.is-open');
    await page.waitForTimeout(220);
    const leftDrawer = await page.locator('.rfw-left-drawer').boundingBox();
    if (!leftDrawer || visibleFraction(leftDrawer, width, height) < .98) record.assertions.push('left drawer is clipped');
    await page.screenshot({ path: `${outDir}/r1-${width}x${height}-04-modules-open.png`, fullPage: false });
    await page.locator('.rfw-left-drawer [data-rfw-close]').click();
    await page.waitForTimeout(220);

    record.final = await layoutSnapshot(page, width, height);
    validateLayout(record, record.final);
  } catch (error) {
    record.errors.push(`audit: ${error?.stack || error}`);
    await page.screenshot({ path: `${outDir}/r1-${width}x${height}-99-failure.png`, fullPage: false }).catch(() => {});
  } finally {
    results.push(record);
    await page.close();
  }
}

for (const [width, height] of viewports) await audit(width, height);
await fs.writeFile(`${outDir}/metrics.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.errors.length || result.assertions.length)) process.exit(1);
