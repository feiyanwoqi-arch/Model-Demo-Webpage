import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-r1-v014';
const viewports = [[2560, 1440], [1920, 1080], [1735, 865], [1440, 900], [1366, 768]];
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
  return { x: 570 + sign * radius * Math.sin(theta), y: 420 - sign * radius * Math.cos(theta) };
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

async function setRange(page, selector, value) {
  await page.locator(selector).evaluate((element, next) => {
    element.value = String(next);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
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
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  const fractions = Object.fromEntries(Object.entries(boxes).map(([key, box]) => [key, visibleFraction(box, width, height)]));
  return { boxes, fractions, css };
}

async function audit(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [], assertions = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));

  await page.goto('http://127.0.0.1:8000/#model:reflection-law', { waitUntil: 'networkidle' });
  await page.waitForSelector('.rfw-page[data-model-id="reflection-law"] .rfw-primary-card', { timeout: 20000 });
  await page.waitForTimeout(900);
  await focusWorkspace(page);

  const initial = await layoutSnapshot(page, width, height);
  for (const key of ['primary', 'mechanism', 'observable']) {
    if (initial.fractions[key] < .90) assertions.push(`${key} visible fraction ${initial.fractions[key].toFixed(3)}`);
  }
  if (initial.css.documentOverflow > 2) assertions.push(`horizontal overflow ${initial.css.documentOverflow}px`);
  if ((initial.boxes.mechanismCanvas?.width || 0) < 430) assertions.push(`mechanism canvas too narrow ${initial.boxes.mechanismCanvas?.width || 0}`);
  if ((initial.boxes.observableCanvas?.width || 0) < 430) assertions.push(`observable canvas too narrow ${initial.boxes.observableCanvas?.width || 0}`);
  if ((initial.css.moduleTitle?.fontSize || 0) < 13) assertions.push(`module title too small ${initial.css.moduleTitle?.fontSize || 0}px`);
  if ((initial.css.liveValue?.fontSize || 0) < 12) assertions.push(`live value too small ${initial.css.liveValue?.fontSize || 0}px`);
  await page.screenshot({ path: `${outDir}/r1-${width}x${height}-01-initial.png`, fullPage: false });

  const mainCanvas = page.locator('#rfwMainCanvas');
  const beforeAngle = await page.locator('[data-rfw-output="angle"]').textContent();
  await dragLogical(page, mainCanvas, rayPoint(38, 285), rayPoint(55, 285));
  await page.waitForTimeout(420);
  const afterAngle = await page.locator('[data-rfw-output="angle"]').textContent();
  if (beforeAngle === afterAngle) assertions.push('source drag did not change angle');

  await page.locator('.rfw-right-handle').click();
  await page.waitForSelector('.rfw-right-drawer.is-open');
  await page.waitForTimeout(220);
  const rightDrawer = await page.locator('.rfw-right-drawer').boundingBox();
  if (!rightDrawer || visibleFraction(rightDrawer, width, height) < .98) assertions.push('right drawer is clipped');
  await page.screenshot({ path: `${outDir}/r1-${width}x${height}-02-parameters-open.png`, fullPage: false });
  await setRange(page, '.rfw-right-drawer [data-rfw-param="roughness"]', 0.62);
  await page.waitForTimeout(420);
  await page.locator('.rfw-right-drawer [data-rfw-close]').click();
  await page.waitForTimeout(260);

  await dragLogical(page, mainCanvas, rayPoint(38, 220, true), rayPoint(55, 220, true));
  await page.waitForTimeout(420);
  const signal = await page.locator('.rfw-live-strip article').filter({ hasText: '相对接收信号' }).locator('b').textContent();
  await page.screenshot({ path: `${outDir}/r1-${width}x${height}-03-rough-aligned.png`, fullPage: false });

  await page.locator('.rfw-left-handle').click();
  await page.waitForSelector('.rfw-left-drawer.is-open');
  await page.waitForTimeout(220);
  const leftDrawer = await page.locator('.rfw-left-drawer').boundingBox();
  if (!leftDrawer || visibleFraction(leftDrawer, width, height) < .98) assertions.push('left drawer is clipped');
  await page.screenshot({ path: `${outDir}/r1-${width}x${height}-04-modules-open.png`, fullPage: false });
  await page.locator('.rfw-left-drawer [data-rfw-close]').click();
  await page.waitForTimeout(220);

  const final = await layoutSnapshot(page, width, height);
  results.push({ width, height, beforeAngle, afterAngle, signal, initial, final, errors, assertions });
  await page.close();
}

for (const [width, height] of viewports) await audit(width, height);
await fs.writeFile(`${outDir}/metrics.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.errors.length || result.assertions.length)) process.exit(1);
