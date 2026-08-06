'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/visual-audit.yml'), 'utf8');

function position(token) {
  const value = index.indexOf(token);
  assert(value >= 0, `missing index integration token: ${token}`);
  return value;
}

const r4Css = position('assets/css/r4-fresnel-workbench-v019.css');
const r4FitCss = position('assets/css/r4-fresnel-workbench-v0191.css');
const r5Css = position('assets/css/r5-workbench-v019.css');
assert(r4Css < r4FitCss && r4FitCss < r5Css, 'R4 corrections must load before the independent R5 stylesheet');

const r4Physics = position('assets/js/r4-fresnel-physics-v019.js');
const r4Workbench = position('assets/js/r4-fresnel-workbench-v019.js');
const r4HiDpi = position('assets/js/r4-hidpi-runtime-fix-v0191.js');
const bootstrap = position('assets/js/bootstrap.js');
const r3Runtime = position('assets/js/r3-runtime-mount-v017.js');
const r5Workbench = position('assets/js/r5-workbench-v019.js');
const r5CanvasFit = position('assets/js/r5-canvas-fit-v019.js');
const r5FontFloor = position('assets/js/r5-font-floor-v0194.js');
assert(r4Physics < r4Workbench, 'R4 physics must load before the R4 workbench');
assert(r4Workbench < r4HiDpi && r4HiDpi < bootstrap, 'R4 runtime fixes must be installed before initial routing');
assert(bootstrap < r3Runtime && r3Runtime < r5Workbench, 'preserve the validated R3/R5 runtime chain');
assert(r5Workbench < r5CanvasFit && r5CanvasFit < r5FontFloor, 'R5 measured fit and font-floor runtimes must load after the R5 workbench');

for (const token of [
  'R4 Fresnel physics regression',
  'R4 workbench source contract',
  'R4 and R5 integration contract',
  'R4 Fresnel/Brewster pixel-aware task audit',
  'R4 MathJax rendering audit',
  'R5 task and typography audit',
  'R5 containment, drawer and apparatus audit',
  'visual-audit-r4-v0191/',
  'visual-audit-r4-math-v0191/',
  'visual-audit-r5-v019/',
  'visual-audit-r5-occlusion-v019/'
]) assert(workflow.includes(token), `missing combined validation token: ${token}`);

assert(!fs.existsSync(path.join(root, '.r4-reconcile-trigger')), 'temporary reconciliation trigger must not ship');
assert(!fs.existsSync(path.join(root, '.github/workflows/r4-reconcile-main.yml')), 'temporary reconciliation workflow must not ship');
assert(!fs.existsSync(path.join(root, 'tests/visual-audit-r4-v019.mjs')), 'superseded pre-pixel R4 audit must not ship');

console.log('R4/R5 v0.19.1 integration contract passed');
