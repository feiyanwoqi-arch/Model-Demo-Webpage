import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-r2-drawer-fit-v015';
const viewports = [[2560, 1440], [1920, 1080]];
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

function visibleFraction(box, width, height) {
  if (!box || box.width <= 0 || box.height <= 0) return 0;
  const visibleWidth = Math.max(0, Math.min(box.x + box.width, width) - Math.max(box.x, 0));
  const visibleHeight = Math.max(0, Math.min(box.y + box.height, height) - Math.max(box.y, 0));
  return visibleWidth * visibleHeight / (box.width * box.height);
}

for (const [width, height] of viewports) {
  const result = { width, height, right: null, left: null, errors: [], assertions: [] };
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', message => { if (message.type() === 'error') result.errors.push(`console: ${message.text()}`); });
  page.on('pageerror', error => result.errors.push(`page: ${error.message}`));

  try {
    await page.goto('http://127.0.0.1:8000/#model:plane-mirror', { waitUntil: 'networkidle' });
    await page.waitForSelector('.rfw-page[data-model-id="plane-mirror"] .rfw-primary-card', { timeout: 20000 });
    await page.waitForTimeout(1300);

    await page.locator('.rfw-right-handle').click();
    await page.waitForSelector('.rfw-right-drawer.is-open');
    await page.waitForTimeout(280);
    const rightBox = await page.locator('.rfw-right-drawer').boundingBox();
    const rightMetrics = await page.locator('.rfw-right-drawer').evaluate(node => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight
    }));
    result.right = { box: rightBox, ...rightMetrics, visibleFraction: visibleFraction(rightBox, width, height) };
    if (!rightBox || result.right.visibleFraction < .99) result.assertions.push(`right drawer clipped ${result.right.visibleFraction.toFixed(3)}`);
    if (rightBox && rightBox.height > height * .85) result.assertions.push(`right drawer wastes tall viewport: ${rightBox.height.toFixed(1)}px of ${height}px`);
    if (rightMetrics.clientHeight > rightMetrics.scrollHeight + 4) result.assertions.push('right drawer client height exceeds content height');
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-01-right-fit.png`, fullPage: false });
    await page.locator('.rfw-right-drawer [data-rfw-close]').click();
    await page.waitForTimeout(260);

    await page.locator('.rfw-left-handle').click();
    await page.waitForSelector('.rfw-left-drawer.is-open');
    await page.waitForTimeout(280);
    const leftBox = await page.locator('.rfw-left-drawer').boundingBox();
    const leftMetrics = await page.locator('.rfw-left-drawer').evaluate(node => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight
    }));
    result.left = { box: leftBox, ...leftMetrics, visibleFraction: visibleFraction(leftBox, width, height) };
    if (!leftBox || result.left.visibleFraction < .99) result.assertions.push(`left drawer clipped ${result.left.visibleFraction.toFixed(3)}`);
    if (leftBox && leftBox.height > height * .85) result.assertions.push(`left drawer wastes tall viewport: ${leftBox.height.toFixed(1)}px of ${height}px`);
    if (leftMetrics.clientHeight > leftMetrics.scrollHeight + 4) result.assertions.push('left drawer client height exceeds content height');
    await page.screenshot({ path: `${outDir}/r2-${width}x${height}-02-left-fit.png`, fullPage: false });
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
