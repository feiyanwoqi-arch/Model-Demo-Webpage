'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/js/simultaneous-viewport-v012.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/simultaneous-viewport-v012.css'), 'utf8');

assert.match(index, /simultaneous-viewport-v012\.css/, 'v0.12 viewport stylesheet must be loaded');
assert.match(index, /simultaneous-viewport-v012\.js/, 'v0.12 viewport controller must be loaded');
assert.ok(
  index.indexOf('adaptive-edge-rails-v011.js') < index.indexOf('simultaneous-viewport-v012.js') &&
  index.indexOf('simultaneous-viewport-v012.js') < index.indexOf('bootstrap.js'),
  'v0.12 must wrap the adaptive workbench before routing starts'
);

for (const id of ['apparatus','phase','phasor','spectrum','heatmap','measurement','validation']) {
  assert.match(script, new RegExp(`${id}: \\{`), `missing compact viewport profile for ${id}`);
}
assert.match(script, /root\.dataset\.simultaneousMode = count === 2 \? 'triple'/, 'exactly two analysis modules must activate triple-view mode');
assert.match(script, /MutationObserver/, 'viewport mode must follow live module selection');
assert.match(script, /CanvasHiDPIV092/, 'cropped windows must resynchronize high-DPI canvas output');
assert.match(css, /data-simultaneous-mode="triple"/, 'triple-view styling must be state-specific');
assert.match(css, /grid-template-columns:1fr/, 'paired modules must remain full-width and readable rather than becoming tiny thumbnails');
assert.match(css, /overflow:hidden/, 'compact windows must crop duplicated canvas chrome instead of shrinking text indiscriminately');
assert.match(css, /translateY\(var\(--tfv-crop-y\)\)/, 'compact windows must use semantic vertical crops');
assert.match(css, /\.evidence-caption\{display:none\}/, 'duplicated captions must not consume the live comparison viewport');

console.log('simultaneous-viewport-v012 contract tests passed');
