'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/js/thin-film-workbench-v010.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/thin-film-workbench-v010.css'), 'utf8');

assert.match(index, /thin-film-workbench-v010\.css/, 'workbench stylesheet must be loaded');
assert.match(index, /thin-film-workbench-v010\.js/, 'workbench script must be loaded');
assert.ok(
  index.indexOf('model-page-guide-v09.js') < index.indexOf('thin-film-workbench-v010.js') &&
  index.indexOf('thin-film-workbench-v010.js') < index.indexOf('bootstrap.js'),
  'workbench must restructure the guided page before bootstrap routing starts'
);

const moduleIds = [...script.matchAll(/\{id:'([^']+)', label:/g)].map(match => match[1]);
assert.deepEqual(moduleIds, [
  'apparatus','phase','phasor','spectrum','heatmap','measurement','formula','validation'
], 'all eight optional analysis modules must be registered');
assert.match(script, /const MAX_ACTIVE = 4/, 'simultaneous modules must be capped at four');
assert.match(script, /board\.dataset\.count = '0'/, 'analysis board must start empty');
assert.match(script, /input type="checkbox"/, 'module selection must use semantic checkboxes');
assert.match(script, /same|同步|同一状态/, 'workbench must communicate coordination semantics');
assert.match(script, /CanvasHiDPIV092\?\.sync/, 'mounted canvases must resync their high-DPI backing stores');
assert.match(script, /data-focus/, 'panels must support focus mode');
assert.match(script, /data-remove/, 'panels must support direct removal');

for (const preset of ['phase','spectrum','experiment','panorama']) {
  assert.match(script, new RegExp(`${preset}:\[`), `missing ${preset} analysis preset`);
}

assert.match(css, /grid-template-columns:270px minmax\(650px,1\.15fr\) minmax\(590px,1fr\) 390px/, 'wide screen must show dock, core, analysis and controls together');
assert.match(css, /\.tfw-reservoir\{display:none!important\}/, 'unselected modules must remain hidden');
assert.match(css, /\.tfw-board\[data-count="3"\].*repeat\(2/, 'three and four panel layouts must use a readable grid');
assert.match(css, /@media\(max-width:900px\)/, 'workbench must have a mobile fallback');

console.log('thin-film-workbench-v010 structure tests passed');
