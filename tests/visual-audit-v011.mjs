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
  if (!hero || !core || !analysis || !leftHandle || !rightHandle) throw new Error(`missing layout boxes at ${name}`);
  if (hero.height > 190) throw new Error(`hero too tall at ${name}: ${hero.height}`);
  if (width >= 2000 && core.width < 700) throw new Error(`core too narrow at ${name}: ${core.width}`);
  if (width >= 2000 && analysis.width < 560) throw new Error(`analysis too narrow at ${name}: ${analysis.width}`);
  if (await page.locator('.tfr-left-drawer').evaluate(el => el.classList.contains('is-open'))) throw new Error('left drawer should start collapsed');
  if (await page.locator('.tfr-right-drawer').evaluate(el => el.classList.contains('is-open'))) throw new Error('right drawer should start collapsed');

  await page.locator('.tfr-left-handle').click();
  await page.waitForSelector('.tfr-left-drawer.is-open');
  await page.locator('[data-preset="spectrum"]').click();
  await page.waitForTimeout(500);
  await page.locator('[data-tfr-close="left"]').click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outDir}/${name}-collapsed.png`, fullPage: false });

  await page.locator('.tfr-left-handle').click();
  await page.waitForSelector('.tfr-left-drawer.is-open');
  await page.screenshot({ path: `${outDir}/${name}-left-open.png`, fullPage: false });
  await page.locator('[data-tfr-close="left"]').click();

  await page.locator('.tfr-right-handle').click();
  await page.waitForSelector('.tfr-right-drawer.is-open');
  await page.screenshot({ path: `${outDir}/${name}-right-open.png`, fullPage: false });

  results.push({ name, width, height, hero, core, analysis, errors });
  await page.close();
}

await audit(2560, 1440, 'wide');
await audit(1920, 1080, 'desktop');
await fs.writeFile(`${outDir}/metrics.json`, JSON.stringify(results, null, 2));
await browser.close();
if (results.some(result => result.errors.length)) {
  console.error(results);
  process.exit(1);
}
console.log(JSON.stringify(results, null, 2));
