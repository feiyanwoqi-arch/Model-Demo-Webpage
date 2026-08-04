import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-v012';
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

function visibleFraction(box, width, height) {
  if (!box || box.width <= 0 || box.height <= 0) return 0;
  const visibleWidth = Math.max(0, Math.min(box.x + box.width, width) - Math.max(box.x, 0));
  const visibleHeight = Math.max(0, Math.min(box.y + box.height, height) - Math.max(box.y, 0));
  return (visibleWidth * visibleHeight) / (box.width * box.height);
}

async function selectComparison(page) {
  await page.locator('.tfr-left-handle').click();
  await page.waitForSelector('.tfr-left-drawer.is-open');
  await page.waitForTimeout(300);
  await page.locator('.tfr-left-drawer input[value="apparatus"]').check();
  await page.locator('.tfr-left-drawer input[value="phase"]').check();
  await page.waitForTimeout(450);
  await page.locator('[data-tfr-close="left"]').click();
  await page.waitForTimeout(320);
  await page.evaluate(() => {
    const command = document.querySelector('.tfw-command');
    const top = command ? command.getBoundingClientRect().top + window.scrollY - 6 : 0;
    window.scrollTo({ top, behavior: 'instant' });
  });
  await page.waitForTimeout(500);
}

async function audit(width, height, name) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  const assertions = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', err => errors.push(`page: ${err.message}`));

  await page.goto('http://127.0.0.1:8000/#model:thin-film', { waitUntil: 'networkidle' });
  await page.waitForSelector('#view.tfr-mounted.tfv-mounted .tfw-core-stage', { timeout: 20000 });
  await page.waitForTimeout(900);

  const hero = await page.locator('.tfw-hero').boundingBox();
  const coreColumn = await page.locator('.tfw-core-column').boundingBox();
  const analysisColumn = await page.locator('.tfw-analysis-column').boundingBox();
  const leftHandle = await page.locator('.tfr-left-handle').boundingBox();
  const rightHandle = await page.locator('.tfr-right-handle').boundingBox();
  await page.screenshot({ path: `${outDir}/${name}-initial.png`, fullPage: false });

  if (!hero || !coreColumn || !analysisColumn || !leftHandle || !rightHandle) assertions.push(`missing layout boxes at ${name}`);
  if (hero && hero.height > 180) assertions.push(`hero too tall at ${name}: ${hero.height}`);
  if (width >= 1700 && coreColumn && coreColumn.width < 650) assertions.push(`core too narrow at ${name}: ${coreColumn.width}`);
  if (width >= 1700 && analysisColumn && analysisColumn.width < 620) assertions.push(`analysis too narrow at ${name}: ${analysisColumn.width}`);
  if (await page.locator('.tfr-left-drawer').evaluate(el => el.classList.contains('is-open'))) assertions.push('left drawer should start collapsed');
  if (await page.locator('.tfr-right-drawer').evaluate(el => el.classList.contains('is-open'))) assertions.push('right drawer should start collapsed');

  await selectComparison(page);
  await page.waitForSelector('#view[data-simultaneous-mode="triple"] .tfw-board[data-count="2"]');

  const coreStage = await page.locator('.tfw-core-stage').boundingBox();
  const apparatus = await page.locator('[data-module-id="apparatus"]').boundingBox();
  const phase = await page.locator('[data-module-id="phase"]').boundingBox();
  const apparatusWindow = await page.locator('[data-module-id="apparatus"] .tfv-canvas-window').boundingBox();
  const phaseWindow = await page.locator('[data-module-id="phase"] .tfv-canvas-window').boundingBox();
  const boardCount = await page.locator('.tfw-board').getAttribute('data-count');
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  const boxes = { coreStage, apparatus, phase };
  for (const [label, box] of Object.entries(boxes)) {
    const fraction = visibleFraction(box, width, height);
    if (fraction < 0.96) assertions.push(`${label} not simultaneously visible at ${name}: fraction=${fraction.toFixed(3)} box=${JSON.stringify(box)}`);
  }
  if (boardCount !== '2') assertions.push(`expected two synchronized modules at ${name}, got ${boardCount}`);
  if (apparatus && phase && phase.y <= apparatus.y + apparatus.height - 2) assertions.push(`analysis modules overlap at ${name}`);
  if (apparatus && phase && Math.abs(apparatus.x - phase.x) > 3) assertions.push(`analysis modules should share one readable column at ${name}`);
  if (apparatusWindow && apparatusWindow.width < 600) assertions.push(`apparatus live view too narrow at ${name}: ${apparatusWindow.width}`);
  if (phaseWindow && phaseWindow.width < 600) assertions.push(`phase live view too narrow at ${name}: ${phaseWindow.width}`);
  if (apparatusWindow && apparatusWindow.height < 220) assertions.push(`apparatus live view too short at ${name}: ${apparatusWindow.height}`);
  if (phaseWindow && phaseWindow.height < 280) assertions.push(`phase live view too short at ${name}: ${phaseWindow.height}`);
  if (horizontalOverflow > 2) assertions.push(`horizontal overflow at ${name}: ${horizontalOverflow}px`);

  await page.screenshot({ path: `${outDir}/${name}-three-view.png`, fullPage: false });

  await page.locator('.tfr-right-handle').click();
  await page.waitForSelector('.tfr-right-drawer.is-open');
  await page.waitForTimeout(300);
  const rightDrawer = await page.locator('.tfr-right-drawer').boundingBox();
  if (!rightDrawer || rightDrawer.width < 360) assertions.push(`right drawer too narrow at ${name}: ${rightDrawer?.width}`);
  await page.screenshot({ path: `${outDir}/${name}-right-open.png`, fullPage: false });

  results.push({
    name, width, height, hero, coreColumn, analysisColumn, coreStage, apparatus, phase,
    apparatusWindow, phaseWindow, boardCount, horizontalOverflow, errors, assertions
  });
  await page.close();
}

await audit(2560, 1440, 'wide');
await audit(1920, 1080, 'desktop');
await audit(1735, 865, 'reported-viewport');
await fs.writeFile(`${outDir}/metrics.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.errors.length || result.assertions.length)) process.exit(1);
