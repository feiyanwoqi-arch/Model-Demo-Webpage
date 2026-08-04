import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit';
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

async function audit(width, height, name) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', err => errors.push(`page: ${err.message}`));
  await page.goto('http://127.0.0.1:8000/#model:thin-film', { waitUntil: 'networkidle' });
  await page.waitForSelector('#view.tfr-mounted .tfw-core-stage', { timeout: 20000 });
  await page.waitForTimeout(900);

  const hero = await page.locator('.tfw-hero').boundingBox();
  const core = await page.locator('.tfw-core-column').boundingBox();
  const analysis = await page.locator('.tfw-analysis-column').boundingBox();
  const leftHandle = await page.locator('.tfr-left-handle').boundingBox();
  const rightHandle = await page.locator('.tfr-right-handle').boundingBox();
  await page.screenshot({ path: `${outDir}/${name}-initial.png`, fullPage: false });

  const assertions = [];
  if (!hero || !core || !analysis || !leftHandle || !rightHandle) assertions.push(`missing layout boxes at ${name}`);
  if (hero && hero.height > 180) assertions.push(`hero too tall at ${name}: ${hero.height}`);
  if (width >= 2000 && core && core.width < 700) assertions.push(`core too narrow at ${name}: ${core.width}`);
  if (width >= 2000 && analysis && analysis.width < 560) assertions.push(`analysis too narrow at ${name}: ${analysis.width}`);
  if (await page.locator('.tfr-left-drawer').evaluate(el => el.classList.contains('is-open'))) assertions.push('left drawer should start collapsed');
  if (await page.locator('.tfr-right-drawer').evaluate(el => el.classList.contains('is-open'))) assertions.push('right drawer should start collapsed');

  await page.locator('.tfr-left-handle').click();
  await page.waitForSelector('.tfr-left-drawer.is-open');
  await page.waitForTimeout(300);
  const leftDrawer = await page.locator('.tfr-left-drawer').boundingBox();
  const leftTitle = await page.locator('.tfr-left-drawer .tfw-dock-head h2').boundingBox();
  const leftTitleStyle = await page.locator('.tfr-left-drawer .tfw-dock-head h2').evaluate(el => ({
    writingMode: getComputedStyle(el).writingMode,
    display: getComputedStyle(el).display
  }));
  if (!leftDrawer || leftDrawer.width < 330) assertions.push(`left drawer too narrow at ${name}: ${leftDrawer?.width}`);
  if (!leftTitle || leftTitle.width < 180 || leftTitle.height > 70) assertions.push(`left drawer title collapsed at ${name}: ${JSON.stringify(leftTitle)}`);
  if (leftTitleStyle.writingMode !== 'horizontal-tb') assertions.push(`left drawer title writing mode is ${leftTitleStyle.writingMode}`);
  await page.locator('[data-preset="spectrum"]').click();
  await page.waitForTimeout(500);
  await page.locator('[data-tfr-close="left"]').click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outDir}/${name}-collapsed.png`, fullPage: false });

  await page.locator('.tfr-left-handle').click();
  await page.waitForSelector('.tfr-left-drawer.is-open');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/${name}-left-open.png`, fullPage: false });
  await page.locator('[data-tfr-close="left"]').click();
  await page.waitForTimeout(260);

  await page.locator('.tfr-right-handle').click();
  await page.waitForSelector('.tfr-right-drawer.is-open');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/${name}-right-open.png`, fullPage: false });

  results.push({ name, width, height, hero, core, analysis, leftDrawer, leftTitle, leftTitleStyle, errors, assertions });
  await page.close();
}

await audit(2560, 1440, 'wide');
await audit(1920, 1080, 'desktop');
await fs.writeFile(`${outDir}/metrics.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.errors.length || result.assertions.length)) process.exit(1);
