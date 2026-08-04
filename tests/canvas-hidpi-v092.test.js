'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class MockContext2D {
  constructor() {
    this.transforms = [];
    this.fillCount = 0;
    this.strokeCount = 0;
    this.lineDash = [];
  }
  setTransform(...args) { this.transforms.push(args); }
  clearRect() {}
  fillRect() { this.fillCount++; }
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() { this.strokeCount++; }
  fill() { this.fillCount++; }
  closePath() {}
  arc() {}
  rect() {}
  roundRect() {}
  save() {}
  restore() {}
  setLineDash(value) { this.lineDash = value; }
  fillText() {}
}

class MockCanvas {
  constructor() {
    this._width = 1080;
    this._height = 675;
    this.dataset = {};
    this.isConnected = true;
    this.context = new MockContext2D();
    this.rect = { left: 20, top: 10, width: 1620, height: 1012.5 };
  }
  get width() { return this._width; }
  set width(value) { this._width = Number(value); }
  get height() { return this._height; }
  set height(value) { this._height = Number(value); }
  getContext() { return this.context; }
  getBoundingClientRect() { return this.rect; }
  closest() { return { querySelector: () => null }; }
  dispatchEvent() {}
}

class MockResizeObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
}

const context = {
  console,
  Math,
  Number,
  WeakMap,
  Set,
  Object,
  String,
  Array,
  HTMLCanvasElement: MockCanvas,
  ResizeObserver: MockResizeObserver,
  Event: class Event { constructor(type, options = {}) { this.type = type; Object.assign(this, options); } },
  CustomEvent: class CustomEvent { constructor(type, options = {}) { this.type = type; Object.assign(this, options); } },
  requestAnimationFrame(callback) { callback(); return 1; },
  window: null,
  document: { getElementById: () => null },
  devicePixelRatio: 2
};
context.window = context;
context.globalThis = context;
context.window.addEventListener = () => {};

const source = fs.readFileSync(path.resolve(__dirname, '../assets/js/canvas-hidpi-v092.js'), 'utf8');
vm.runInNewContext(source, context, { filename: 'canvas-hidpi-v092.js' });

assert.equal(typeof context.canvasAPI, 'function', 'high-DPI canvasAPI must be installed globally');
assert.equal(typeof context.getPointer, 'function', 'logical pointer helper must be installed globally');

const canvas = new MockCanvas();
const api = context.canvasAPI(canvas);
api.clear();

assert.equal(canvas.width, 1080, 'existing model code must continue to see logical canvas width');
assert.equal(canvas.height, 675, 'existing model code must continue to see logical canvas height');
assert.equal(canvas._width, 3240, 'native backing width must equal CSS width × devicePixelRatio');
assert.equal(canvas._height, 2025, 'native backing height must equal CSS height × devicePixelRatio');
assert.deepEqual(canvas.context.transforms.at(-1), [3, 0, 0, 3, 0, 0], 'logical coordinates must scale to the backing store');

const fillBefore = canvas.context.fillCount;
api.rect(10, 10, 100, 50, null, '#123456', 4);
assert.equal(canvas.context.fillCount, fillBefore, 'outline-only rectangles must not erase plots underneath');
assert.ok(canvas.context.strokeCount > 0, 'outline-only rectangle must still draw its stroke');

const pointer = context.getPointer(canvas, { clientX: 830, clientY: 516.25 });
assert.equal(pointer.x, 540, 'pointer x must remain in logical model coordinates');
assert.equal(pointer.y, 337.5, 'pointer y must remain in logical model coordinates');

const index = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
assert.ok(
  index.indexOf('core.js') < index.indexOf('canvas-hidpi-v092.js') &&
  index.indexOf('canvas-hidpi-v092.js') < index.indexOf('reflection-models.js'),
  'high-DPI layer must load after core and before all model renderers'
);

console.log('canvas-hidpi-v092 tests passed');
