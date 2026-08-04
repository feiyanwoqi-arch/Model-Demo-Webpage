'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const guide = fs.readFileSync(path.join(root, 'assets/js/model-page-guide-v09.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/model-page-guide-v09.css'), 'utf8');

assert.match(index, /model-page-guide-v09\.css/, 'v0.9 guide stylesheet must be loaded');
assert.match(index, /model-page-guide-v09\.js/, 'v0.9 guide script must be loaded');
assert.ok(
  index.indexOf('thin-film-v08-ui.js') < index.indexOf('model-page-guide-v09.js') &&
  index.indexOf('model-page-guide-v09.js') < index.indexOf('bootstrap.js'),
  'guide must wrap the flagship renderer before bootstrap starts routing'
);

const sectionIds = [...guide.matchAll(/id:\s*'(tf-[^']+)'/g)].map(match => match[1]);
assert.equal(sectionIds.length, 11, 'thin-film page must register eleven navigable sections');
assert.equal(new Set(sectionIds).size, sectionIds.length, 'section ids must be unique');

for (const field of ['purpose:', 'role:', 'action:']) {
  const count = (guide.match(new RegExp(field, 'g')) || []).length;
  assert.equal(count, 11, `every section must declare ${field.slice(0, -1)}`);
}

for (const required of [
  'tf-overview', 'tf-state', 'tf-apparatus-section', 'tf-geometry-section',
  'tf-phase-section', 'tf-phasor-section', 'tf-spectrum-section',
  'tf-map-section', 'tf-inverse-section', 'tf-formula-section',
  'tf-validation-section'
]) {
  assert.ok(sectionIds.includes(required), `missing registered section ${required}`);
}

assert.match(guide, /aria-labelledby/, 'navigation and sections must be semantically labelled');
assert.match(guide, /aria-current/, 'current section must be exposed to assistive technology');
assert.match(guide, /prefers-reduced-motion/, 'navigation must respect reduced-motion preference');
assert.match(css, /position:sticky/, 'desktop project navigation must be sticky');
assert.match(css, /@media\(max-width:1320px\)/, 'navigation must have a responsive layout');
assert.match(css, /\.mp-purpose/, 'section-purpose presentation must be styled');

console.log('model-page-guide-v09 structure tests passed');
