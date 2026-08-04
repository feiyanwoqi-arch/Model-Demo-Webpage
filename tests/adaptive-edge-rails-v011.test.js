'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/js/adaptive-edge-rails-v011.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/adaptive-edge-rails-v011.css'), 'utf8');

assert.match(index, /adaptive-edge-rails-v011\.css/, 'adaptive rail stylesheet must be loaded');
assert.match(index, /adaptive-edge-rails-v011\.js/, 'adaptive rail script must be loaded');
assert.ok(
  index.indexOf('thin-film-workbench-v010.js') < index.indexOf('adaptive-edge-rails-v011.js') &&
  index.indexOf('adaptive-edge-rails-v011.js') < index.indexOf('bootstrap.js'),
  'adaptive rails must wrap the synchronized workbench before routing starts'
);

assert.match(script, /const OPEN_DELAY = 140/, 'hover opening must be intentional, not instantaneous');
assert.match(script, /const CLOSE_DELAY = 560/, 'drawers must not disappear immediately when the pointer leaves');
assert.match(script, /\(hover:hover\) and \(pointer:fine\)/, 'hover behavior must be limited to fine pointers');
assert.match(script, /aria-expanded/, 'edge handles must expose drawer state');
assert.match(script, /aria-pressed/, 'pin buttons must expose persistent state');
assert.match(script, /localStorage/, 'pin preferences must persist');
assert.match(script, /pointerup/, 'slider interaction must hold drawers open until pointer release');
assert.match(script, /Escape/, 'drawers must be dismissible from the keyboard');
assert.match(script, /MutationObserver/, 'left rail must reflect selected analysis-module count');
assert.match(script, /wrapPurpose/, 'long purpose text must become on-demand disclosure');

assert.match(css, /\.tfr-handle/, 'collapsed edge handles must remain discoverable');
assert.match(css, /\.tfr-drawer\.is-open/, 'drawers must have an explicit open state');
assert.match(css, /\.tfr-drawer\.is-pinned/, 'drawers must support a pinned state');
assert.match(css, /position:fixed!important/, 'drawers must overlay instead of permanently consuming the analysis canvas');
assert.match(css, /\.tfr-left-pinned \.tfr-mounted/, 'wide screens must reserve space only when the user pins a drawer');
assert.match(css, /@media\(max-width:900px\)/, 'touch and small-screen fallback must exist');
assert.match(css, /prefers-reduced-motion/, 'rail transitions must respect reduced-motion preference');
assert.match(css, /grid-template-columns:minmax\(720px,1\.18fr\) minmax\(620px,1fr\)/, 'core and synchronized analysis must receive the primary desktop width');

console.log('adaptive-edge-rails-v011 contract tests passed');
