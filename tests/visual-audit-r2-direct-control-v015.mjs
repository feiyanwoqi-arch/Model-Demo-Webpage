import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-r2-direct-control-v015';
const viewports = [[1735, 865], [1366, 768]];
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

function visibleFraction(box, width, height) {
  if (!box || box.width <= 0 || box.height <= 0) return 0;
  const visibleWidth = Math.max(0, Math.min(box.x + box.width, width) - Math.max(box.x, 0));
  const visibleHeight = Math.max(0, Math.min(box.y + box.height, height) - Math.max(box.y, 0));
  return visibleWidth * visibleHeight / (box.width * box.height);
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

async function dragLogical(page, canvas, start, end) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error('main canvas has no bounding box');
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

for (const [width, height] of viewports) {
  const result = { width, height, shortHeight: null, tallHeight: null, errors: [], assertions: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', message => { if (message.type() === 'error') result.errors.push(`console: ${message.text()}`); });
  page.on('pageerror', error => result.errors.push(`page: ${error.message}`));

  try {
    await page.goto('http://127.0.0.1:8000/#model:plane-mirror', { waitUntil: 'networkidle' });
    await page.waitForSelector('.rfw-page[data-model-id="plane-mirror"] #rfwMainCanvas', { timeout: 20000 });
    await page.waitForTimeout(900);
    await focusWorkspace(page);

    await page.locator('.rfw-right-handle').click();
    await page.waitForSelector('.rfw-right-drawer.is-open');
    const rightDrawer = await page.locator('.rfw-right-drawer').boundingBox();
    if (!rightDrawer || visibleFraction(rightDrawer, width, height) < .99) {
      result.assertions.push(`right drawer visible fraction ${visibleFraction(rightDrawer, width, height).toFixed(3)}`);
    }
    await page.locator('.rfw-right-drawer [data-rfw-close]').click();
    await page.waitForTimeout(220);

    const canvas = page.locator('#rfwMainCanvas');
    await dragLogical(page, canvas, { x: 600, y: 190 }, { x: 600, y: 275 });
    await page.waitForTimeout(450);
    result.shortHeight = await page.locator('[data-rfw-output="mirrorHeight"]').textContent();
    const shortStatus = await page.locator('.rfw-status').textContent();
    if (Math.abs(parseFloat(result.shortHeight) - 90) > 4) result.assertions.push(`direct short-mirror drag ended at ${result.shortHeight}, expected about 90 px`);
    if (!/不能看到完整物体|部分/.test(shortStatus || '')) result.assertions.push(`direct short-mirror status not partial: ${shortStatus}`);
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-01-direct-short.png`, fullPage: false });

    const currentTop = 320 - parseFloat(result.shortHeight) / 2;
    await dragLogical(page, canvas, { x: 600, y: currentTop }, { x: 600, y: 70 });
    await page.waitForTimeout(450);
    result.tallHeight = await page.locator('[data-rfw-output="mirrorHeight"]').textContent();
    const tallStatus = await page.locator('.rfw-status').textContent();
    if (Math.abs(parseFloat(result.tallHeight) - 500) > 3) result.assertions.push(`direct tall-mirror drag ended at ${result.tallHeight}, expected about 500 px`);
    if (!/覆盖了|完整/.test(tallStatus || '')) result.assertions.push(`direct tall-mirror status not full: ${tallStatus}`);
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-02-direct-tall.png`, fullPage: false });
  } catch (error) {
    result.errors.push(`audit: ${error?.stack || error}`);
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-99-failure.png`, fullPage: false }).catch(() => {});
  } finally {
    results.push(result);
    await page.close();
  }
}

await fs.writeFile(`${outDir}/metrics.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.errors.length || result.assertions.length)) process.exit(1);
