'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/js/reflection-foundations-v013.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/reflection-foundations-v013.css'), 'utf8');
const standard = fs.readFileSync(path.join(root, 'docs/INTERACTIVE_MODEL_CONSTRUCTION_STANDARD_V1.md'), 'utf8');

assert.match(index, /reflection-foundations-v013\.css/, 'v0.13 stylesheet must be loaded');
assert.match(index, /reflection-foundations-v013\.js/, 'v0.13 controller must be loaded');
assert.ok(
  index.indexOf('simultaneous-viewport-v012.js') < index.indexOf('reflection-foundations-v013.js') &&
  index.indexOf('reflection-foundations-v013.js') < index.indexOf('bootstrap.js'),
  'reflection foundations controller must be the final model wrapper before bootstrap'
);

for (const id of ['reflection-law', 'plane-mirror', 'spherical-mirror']) {
  assert.match(script, new RegExp(`'${id}'\\s*:`), `missing configuration for ${id}`);
}

assert.match(script, /const MAX_ACTIVE = 2/, 'foundational reflection models must enforce a two-module readability budget');
assert.match(script, /defaultModules:\s*\['mechanism', 'observable'\]/g, 'each model must start with mechanism and observable views');
assert.match(script, /primaryPurpose:/g, 'every model must define the primary system purpose');
assert.match(script, /primaryRole:/g, 'every model must define the primary system role');
assert.match(script, /primaryAction:/g, 'every model must define a recommended primary action');
assert.match(script, /purpose:/g, 'analysis modules must declare purposes');
assert.match(script, /role:/g, 'analysis modules must declare roles');
assert.match(script, /action:/g, 'analysis modules must declare actions');
assert.match(script, /data-rfw-param/, 'all controls must bind to the unified state');
assert.match(script, /CanvasHiDPIV092/, 'mounted views must resynchronize high-DPI canvases');
assert.match(script, /extraHit/, 'direct-manipulation extensions must be supported');
assert.match(script, /planeVisibility/, 'plane-mirror finite visibility must be calculated geometrically');
assert.match(script, /sphericalBundle/, 'spherical-mirror aperture validation must use reflected ray bundles');
assert.match(script, /局部法线离散度（几何示意）/, 'R1 roughness control must not masquerade as a material BRDF parameter');
assert.match(script, /mirrorHeight/, 'R2 must include finite-mirror visibility');
assert.match(script, /aperture/, 'R3 must expose the paraxial-validity control');
assert.match(script, /screenShift/, 'R3 must connect image distance to a movable screen');

assert.match(css, /grid-template-columns:minmax\(650px,1\.12fr\) minmax\(620px,1fr\)/, 'desktop workspace must prioritize primary and analysis columns');
assert.match(css, /\.rfw-board\[data-count="2"\]/, 'two selected modules need a dedicated same-viewport layout');
assert.match(css, /position:fixed/, 'intermittent controls must use overlay edge drawers');
assert.match(css, /@media\(max-width:760px\)/, 'workbench must provide a narrow-screen fallback');
assert.match(css, /prefers-reduced-motion/, 'drawer motion must respect reduced-motion preference');

for (const phrase of [
  '不可隐藏的“物理本体”', '单一状态源', '直接操作优先', '观察同步',
  '可读性预算', '现实装置与可观测量', '模型边界', '任务级视觉'
]) {
  assert.ok(standard.includes(phrase), `construction standard missing: ${phrase}`);
}

console.log('reflection-foundations-v013 contract tests passed');
