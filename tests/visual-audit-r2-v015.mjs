import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-r2-v015';
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

async function dragLogical(page, canvas, start, end) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error('main canvas has no bounding box');
  const map = point => ({
    x: box.x + point.x / 1080 * box.width,
    y: box.y + point.y / 675 * box.height
  });
  const a = map(start), b = map(end);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 18 });
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

async function layoutSnapshot(page, width, height) {
  const selectors = {
    page: '.rfw-page[data-model-id="plane-mirror"]',
    primary: '.rfw-primary-card',
    analysis: '.rfw-analysis-column',
    mechanism: '[data-module-id="mechanism"]',
    observable: '[data-module-id="observable"]',
    mainCanvas: '#rfwMainCanvas',
    mechanismCanvas: '[data-module-id="mechanism"] canvas',
    observableCanvas: '[data-module-id="observable"] canvas',
    leftHandle: '.rfw-left-handle',
    rightHandle: '.rfw-right-handle'
  };
  const boxes = {};
  for (const [key, selector] of Object.entries(selectors)) boxes[key] = await page.locator(selector).boundingBox();
  const css = await page.evaluate(() => {
    const inspect = selector => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const style = getComputedStyle(node);
      return {
        fontSize: parseFloat(style.fontSize),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        clientHeight: node.clientHeight,
        scrollHeight: node.scrollHeight
      };
    };
    return {
      moduleTitle: inspect('.rfw-module-head h3'),
      liveValue: inspect('.rfw-live-strip b'),
      leftHandle: inspect('.rfw-left-handle'),
      rightHandle: inspect('.rfw-right-handle'),
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  const fractions = Object.fromEntries(Object.entries(boxes).map(([key, box]) => [key, visibleFraction(box, width, height)]));
  return { boxes, fractions, css };
}

function validateLayout(record, snapshot) {
  for (const key of ['primary', 'mechanism', 'observable']) {
    if (snapshot.fractions[key] < .90) record.assertions.push(`${key} visible fraction ${snapshot.fractions[key].toFixed(3)}`);
  }
  if (snapshot.css.documentOverflow > 2) record.assertions.push(`horizontal overflow ${snapshot.css.documentOverflow}px`);
  for (const key of ['mechanismCanvas', 'observableCanvas']) {
    const box = snapshot.boxes[key];
    if (!box) continue;
    const ratio = box.width / box.height;
    if (box.width < 430) record.assertions.push(`${key} too narrow ${box.width.toFixed(1)}px`);
    if (Math.abs(ratio - moduleAspect) > .08) record.assertions.push(`${key} distorted aspect ${ratio.toFixed(3)}`);
  }
  if ((snapshot.css.moduleTitle?.fontSize || 0) < 13) record.assertions.push(`module title too small ${snapshot.css.moduleTitle?.fontSize || 0}px`);
  if ((snapshot.css.liveValue?.fontSize || 0) < 12) record.assertions.push(`live value too small ${snapshot.css.liveValue?.fontSize || 0}px`);
  for (const key of ['leftHandle', 'rightHandle']) {
    const box = snapshot.boxes[key];
    const style = snapshot.css[key];
    if (box && visibleFraction(box, record.width, record.height) < .99) record.assertions.push(`${key} clipped`);
    if (style && (style.scrollWidth > style.clientWidth + 1 || style.scrollHeight > style.clientHeight + 1)) record.assertions.push(`${key} text overflow`);
  }
  const primary = snapshot.boxes.primary;
  const analysis = snapshot.boxes.analysis;
  if (primary && analysis && record.width >= 1920) {
    const used = (analysis.x + analysis.width - primary.x) / record.width;
    record.widthUsage = used;
    if (used < .88) record.assertions.push(`wide viewport underused ${(used * 100).toFixed(1)}%`);
  }
}

async function audit(width, height) {
  const record = {
    width, height, widthUsage: null, initialInkRatio: null,
    before: {}, afterObject: {}, afterEye: {},
    partialStatus: '', fullStatus: '',
    rightDrawerBox: null, rightDrawerVisibleFraction: null,
    leftDrawerBox: null, leftDrawerVisibleFraction: null,
    initial: null, final: null,
    errors: [], assertions: []
  };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', message => { if (message.type() === 'error') record.errors.push(`console: ${message.text()}`); });
  page.on('pageerror', error => record.errors.push(`page: ${error.message}`));

  try {
    await page.goto('http://127.0.0.1:8000/#model:plane-mirror', { waitUntil: 'networkidle' });
    await page.waitForSelector('.rfw-page[data-model-id="plane-mirror"] .rfw-primary-card', { timeout: 20000 });
    await page.waitForTimeout(1300);
    await focusWorkspace(page);
    await page.waitForTimeout(850);

    const canvas = page.locator('#rfwMainCanvas');
    record.initialInkRatio = await canvasInkRatio(canvas);
    if (record.initialInkRatio < .002) record.assertions.push(`initial main canvas appears blank: ink ratio ${record.initialInkRatio.toFixed(5)}`);
    record.initial = await layoutSnapshot(page, width, height);
    validateLayout(record, record.initial);
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-01-initial.png`, fullPage: false });

    record.before = {
      distance: await page.locator('[data-rfw-output="distance"]').textContent(),
      height: await page.locator('[data-rfw-output="height"]').textContent(),
      observerY: await page.locator('[data-rfw-output="observerY"]').textContent()
    };
    await dragLogical(page, canvas, { x: 330, y: 395 }, { x: 280, y: 350 });
    await page.waitForTimeout(500);
    record.afterObject = {
      distance: await page.locator('[data-rfw-output="distance"]').textContent(),
      height: await page.locator('[data-rfw-output="height"]').textContent(),
      observerY: await page.locator('[data-rfw-output="observerY"]').textContent()
    };
    if (Math.abs(parseFloat(record.afterObject.distance) - 320) > 2) record.assertions.push(`object drag distance ${record.afterObject.distance}, expected about 320`);
    if (Math.abs(parseFloat(record.afterObject.height) - 195) > 2) record.assertions.push(`object drag height ${record.afterObject.height}, expected about 195`);
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-02-object-dragged.png`, fullPage: false });

    await dragLogical(page, canvas, { x: 145, y: 430 }, { x: 145, y: 270 });
    await page.waitForTimeout(500);
    record.afterEye = {
      distance: await page.locator('[data-rfw-output="distance"]').textContent(),
      height: await page.locator('[data-rfw-output="height"]').textContent(),
      observerY: await page.locator('[data-rfw-output="observerY"]').textContent()
    };
    if (Math.abs(parseFloat(record.afterEye.observerY) - 270) > 3) record.assertions.push(`eye drag observerY ${record.afterEye.observerY}, expected about 270`);
    if (record.afterEye.distance !== record.afterObject.distance) record.assertions.push('eye drag changed object distance');
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-03-eye-dragged.png`, fullPage: false });

    await page.locator('.rfw-right-handle').click();
    await page.waitForSelector('.rfw-right-drawer.is-open');
    await page.waitForTimeout(260);
    record.rightDrawerBox = await page.locator('.rfw-right-drawer').boundingBox();
    record.rightDrawerVisibleFraction = visibleFraction(record.rightDrawerBox, width, height);
    if (!record.rightDrawerBox || record.rightDrawerVisibleFraction < .98) record.assertions.push(`parameter drawer clipped: ${record.rightDrawerVisibleFraction.toFixed(3)}`);
    await setRange(page, '.rfw-right-drawer [data-rfw-param="mirrorHeight"]', 80);
    await page.waitForTimeout(450);
    record.partialStatus = await page.locator('.rfw-status').textContent();
    if (!/不能看到完整物体|部分/.test(record.partialStatus || '')) record.assertions.push(`short mirror status not partial: ${record.partialStatus}`);
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-04-short-mirror-drawer.png`, fullPage: false });

    await setRange(page, '.rfw-right-drawer [data-rfw-param="mirrorHeight"]', 500);
    await page.waitForTimeout(450);
    record.fullStatus = await page.locator('.rfw-status').textContent();
    if (!/覆盖了|完整/.test(record.fullStatus || '')) record.assertions.push(`tall mirror status not full: ${record.fullStatus}`);
    await page.locator('.rfw-right-drawer [data-rfw-close]').click();
    await page.waitForTimeout(260);
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-05-full-visible.png`, fullPage: false });

    await page.locator('.rfw-left-handle').click();
    await page.waitForSelector('.rfw-left-drawer.is-open');
    await page.waitForTimeout(260);
    record.leftDrawerBox = await page.locator('.rfw-left-drawer').boundingBox();
    record.leftDrawerVisibleFraction = visibleFraction(record.leftDrawerBox, width, height);
    if (!record.leftDrawerBox || record.leftDrawerVisibleFraction < .98) record.assertions.push(`module drawer clipped: ${record.leftDrawerVisibleFraction.toFixed(3)}`);
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-06-modules-open.png`, fullPage: false });
    await page.locator('.rfw-left-drawer [data-rfw-close]').click();
    await page.waitForTimeout(260);

    record.final = await layoutSnapshot(page, width, height);
    validateLayout(record, record.final);
  } catch (error) {
    record.errors.push(`audit: ${error?.stack || error}`);
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-99-failure.png`, fullPage: false }).catch(() => {});
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
