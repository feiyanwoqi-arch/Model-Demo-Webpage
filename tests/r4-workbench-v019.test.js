'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root,'assets/js/r4-fresnel-workbench-v019.js'),'utf8');
const css = fs.readFileSync(path.join(root,'assets/css/r4-fresnel-workbench-v019.css'),'utf8');
const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
const workflowPath = path.join(root,'.github/workflows/visual-audit.yml');
const workflow = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath,'utf8') : '';

for (const token of [
  "data-model-id=\"fresnel-brewster\"",
  'data-version="019"',
  'pointerdown',
  'pointermove',
  'R4FresnelPhysicsV019',
  'energyResidual',
  'brewsterDelta',
  "slotA: 'curves'",
  "slotB: 'energy'",
  '倏逝场与全反射相位属于 R5'
]) assert.ok(js.includes(token), `missing R4 workbench contract token: ${token}`);

assert.ok(css.includes('grid-template-columns:minmax(720px,1.36fr)'), 'missing wide synchronized workspace');
assert.ok(css.includes('@media (max-width:1499px)'), 'missing stacked responsive fallback');
assert.ok(css.includes('touch-action:none'), 'direct manipulation must support pointer/touch input');
assert.ok(index.indexOf('r4-fresnel-physics-v019.js') < index.indexOf('r4-fresnel-workbench-v019.js'), 'R4 physics must load before the workbench');
assert.ok(index.indexOf('r4-fresnel-workbench-v019.js') < index.indexOf('bootstrap.js'), 'R4 renderer must mount before initial routing');
if (workflow) {
  assert.ok(workflow.includes('r4-fresnel-physics-v019.test.js'), 'workflow must run R4 physics regression');
  assert.ok(workflow.includes('visual-audit-r4-v019.mjs'), 'workflow must run R4 browser audit');
}
console.log('R4 workbench v0.19 source contract tests passed');
