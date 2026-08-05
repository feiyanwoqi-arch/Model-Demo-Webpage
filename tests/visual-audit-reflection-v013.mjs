import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const outDir = 'visual-audit-reflection-v013';
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

const scenarios = [
  {
    id: 'reflection-law', output: 'angle', mechanismMustChange: true,
    start: { x: 570 - 285 * Math.sin(38 * Math.PI / 180), y: 420 - 285 * Math.cos(38 * Math.PI / 180) },
    end: { x: 570 - 285 * Math.sin(55 * Math.PI / 180), y: 420 - 285 * Math.cos(55 * Math.PI / 180) }
  },
  { id: 'plane-mirror', output: 'distance', mechanismMustChange: true, start: { x: 330, y: 395 }, end: { x: 280, y: 355 } },
  { id: 'spherical-mirror', output: 'do', mechanismMustChange: true, start: { x: 590, y: 240 }, end: { x: 520, y: 205 } }
];

function visibleFraction(box, width, height) {
  if (!box || box.width <= 0 || box.height <= 0) return 0;
  const visibleWidth = Math.max(0, Math.min(box.x + box.width, width) - Math.max(box.x, 0));
  const visibleHeight = Math.max(0, Math.min(box.y + box.height, height) - Math.max(box.y, 0));
  return (visibleWidth * visibleHeight) / (box.width * box.height);
}

async function dragLogical(page, start, end) {
  await page.waitForSelector('#rfwMainCanvas:visible', { timeout: 20000 });
  const locator = page.locator('#rfwMainCanvas');
  const box = await locator.boundingBox();
  if (!box) throw new Error('main canvas has no bounding box after stable-mount wait');
  const map = point => ({
    x: box.x + point.x / 1080 * box.width,
    y: box.y + point.y / 675 * box.height
  });
  const a = map(start), b = map(end);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
}

async function auditScenario(scenario, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  const assertions = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));

  await page.goto(`http://127.0.0.1:8000/#model:${scenario.id}`, { waitUntil: 'networkidle' });
  await page.waitForSelector(`.rfw-page[data-model-id="${scenario.id}"] .rfw-primary-card`, { timeout: 20000 });
  if (scenario.id === 'spherical-mirror') {
    await page.waitForSelector('.rfw-page[data-model-id="spherical-mirror"][data-legibility-version="017"]', { timeout: 20000 });
    await page.waitForTimeout(650);
  } else {
    await page.waitForTimeout(900);
  }
  await page.evaluate(() => {
    const workspace = document.querySelector('.rfw-workspace');
    const topbar = document.querySelector('.topbar');
    const top = workspace ? workspace.getBoundingClientRect().top + scrollY - (topbar?.offsetHeight || 0) - 4 : 0;
    scrollTo({ top, behavior: 'instant' });
  });
  await page.waitForTimeout(450);

  const primary = await page.locator('.rfw-primary-card').boundingBox();
  const mechanism = await page.locator('[data-module-id="mechanism"]').boundingBox();
  const observable = await page.locator('[data-module-id="observable"]').boundingBox();
  const mechanismCanvas = await page.locator('[data-module-id="mechanism"] canvas').boundingBox();
  const observableCanvas = await page.locator('[data-module-id="observable"] canvas').boundingBox();
  const boardCount = await page.locator('.rfw-board').getAttribute('data-count');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const version = await page.locator('.rfw-page').getAttribute('data-legibility-version');
  const legibilityFlow = (scenario.id === 'plane-mirror' && version === '016') || (scenario.id === 'spherical-mirror' && version === '017');

  if (legibilityFlow) {
    if (!primary || primary.width < width * .86) assertions.push(`${scenario.id}: full-width primary workbench not applied`);
    if (!primary || !mechanism || mechanism.y < primary.y + primary.height + 10) assertions.push(`${scenario.id}: analysis must follow the primary workbench`);
    if (mechanism && observable && Math.abs(mechanism.y - observable.y) > 3) assertions.push(`${scenario.id}: wide-screen analysis modules should share a row`);
    if (mechanism && observable && observable.x <= mechanism.x + mechanism.width - 2) assertions.push(`${scenario.id}: analysis modules overlap horizontally`);
  } else {
    for (const [name, box] of Object.entries({ primary, mechanism, observable })) {
      const fraction = visibleFraction(box, width, height);
      if (fraction < .90) assertions.push(`${scenario.id}: ${name} visible fraction ${fraction.toFixed(3)} at ${width}x${height}`);
    }
    if (mechanism && observable && observable.y <= mechanism.y + mechanism.height - 2) assertions.push(`${scenario.id}: analysis modules overlap`);
    if (mechanism && observable && Math.abs(mechanism.x - observable.x) > 3) assertions.push(`${scenario.id}: analysis modules must share a readable column`);
  }
  if (boardCount !== '2') assertions.push(`${scenario.id}: expected two active modules, got ${boardCount}`);
  if (mechanismCanvas && mechanismCanvas.width < 500) assertions.push(`${scenario.id}: mechanism canvas too narrow ${mechanismCanvas.width}`);
  if (observableCanvas && observableCanvas.width < 500) assertions.push(`${scenario.id}: observable canvas too narrow ${observableCanvas.width}`);
  if (mechanismCanvas && mechanismCanvas.height < 150) assertions.push(`${scenario.id}: mechanism canvas too short ${mechanismCanvas.height}`);
  if (observableCanvas && observableCanvas.height < 150) assertions.push(`${scenario.id}: observable canvas too short ${observableCanvas.height}`);
  if (overflow > 2) assertions.push(`${scenario.id}: horizontal overflow ${overflow}px`);

  const beforeValue = await page.locator(`[data-rfw-output="${scenario.output}"]`).textContent();
  const beforeMechanism = await page.locator('[data-module-id="mechanism"] canvas').evaluate(canvas => canvas.toDataURL());
  const beforeObservable = await page.locator('[data-module-id="observable"] canvas').evaluate(canvas => canvas.toDataURL());
  const beforeRevision = Number(await page.locator('.rfw-page').getAttribute('data-render-revision'));
  await dragLogical(page, scenario.start, scenario.end);
  await page.waitForTimeout(650);
  const afterValue = await page.locator(`[data-rfw-output="${scenario.output}"]`).textContent();
  const afterMechanism = await page.locator('[data-module-id="mechanism"] canvas').evaluate(canvas => canvas.toDataURL());
  const afterObservable = await page.locator('[data-module-id="observable"] canvas').evaluate(canvas => canvas.toDataURL());
  const afterRevision = Number(await page.locator('.rfw-page').getAttribute('data-render-revision'));
  if (afterValue === beforeValue) assertions.push(`${scenario.id}: direct drag did not change ${scenario.output}`);
  if (afterRevision <= beforeRevision) assertions.push(`${scenario.id}: render revision did not advance after direct drag`);
  if (afterObservable === beforeObservable) assertions.push(`${scenario.id}: selected observable module did not redraw after direct drag`);
  if (scenario.mechanismMustChange && afterMechanism === beforeMechanism) assertions.push(`${scenario.id}: related mechanism module did not redraw from the changed state`);

  await page.screenshot({ path: `${outDir}/${scenario.id}-${width}x${height}.png`, fullPage: false });

  await page.locator('.rfw-left-handle').click();
  await page.waitForSelector('.rfw-left-drawer.is-open');
  const leftDrawer = await page.locator('.rfw-left-drawer').boundingBox();
  if (!leftDrawer || leftDrawer.width < 360) assertions.push(`${scenario.id}: module drawer too narrow`);
  const selectableCount = await page.locator('.rfw-module-selector input[type="checkbox"]').count();
  if (selectableCount < 5) assertions.push(`${scenario.id}: insufficient analysis modules ${selectableCount}`);
  await page.locator('.rfw-left-drawer [data-rfw-close]').click();
  await page.waitForTimeout(240);

  await page.locator('.rfw-right-handle').click();
  await page.waitForSelector('.rfw-right-drawer.is-open');
  const rightDrawer = await page.locator('.rfw-right-drawer').boundingBox();
  if (!rightDrawer || rightDrawer.width < 360) assertions.push(`${scenario.id}: parameter drawer too narrow`);
  const controlCount = await page.locator('.rfw-right-drawer [data-rfw-param]').count();
  if (controlCount < 4) assertions.push(`${scenario.id}: too few unified controls ${controlCount}`);
  await page.locator('.rfw-right-drawer [data-rfw-close]').click();
  await page.waitForTimeout(240);

  results.push({
    scenario: scenario.id, width, height, legibilityFlow, primary, mechanism, observable, mechanismCanvas, observableCanvas,
    boardCount, overflow, beforeValue, afterValue, beforeRevision, afterRevision,
    mechanismChanged: beforeMechanism !== afterMechanism, observableChanged: beforeObservable !== afterObservable,
    errors, assertions
  });
  await page.close();
}

for (const scenario of scenarios) await auditScenario(scenario, 1735, 865);
await auditScenario(scenarios[2], 1920, 1080);

await fs.writeFile(`${outDir}/metrics.json`, JSON.stringify(results, null, 2));
await browser.close();
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.errors.length || result.assertions.length)) process.exit(1);
