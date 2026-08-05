'use strict';
(() => {
  const model = models['plane-mirror'];
  if (!model || !window.R2VisualRefinementV015?.geometry) return;

  const C = {
    green: '#66d900', greenDark: '#4b7900', orange: '#e98242',
    ink: '#0b3040', muted: '#66808a', pale: '#f3ffdf', paleOrange: '#fff4eb'
  };
  const previousMainDraw = model.draw;
  const previousRender = renderModel;
  let cleanup = () => {};

  const value = (root, key, fallback = 0) => {
    const node = root.querySelector(`[data-rfw-param="${key}"]`);
    return node ? Number(node.value) : fallback;
  };

  const stateOf = root => ({
    distance: value(root, 'distance', 270),
    height: value(root, 'height', 150),
    observerY: value(root, 'observerY', 430),
    mirrorHeight: value(root, 'mirrorHeight', 260)
  });

  function intervalText(g) {
    const required = `${Math.round(g.requiredTop)}–${Math.round(g.requiredBottom)}`;
    const active = `${Math.round(g.activeTop)}–${Math.round(g.activeBottom)}`;
    return g.fullVisible
      ? { line1: `所需区间 ${required} px`, line2: `已包含于有效区 ${active} px` }
      : { line1: `所需区间 ${required} px`, line2: `未被有效区 ${active} px 完整覆盖` };
  }

  function redrawMainBadge(api, state) {
    const g = window.R2VisualRefinementV015.geometry(state);
    const copy = intervalText(g);
    const x = 850;
    const y = 82;
    api.rect(x - 132, y - 28, 264, 82, g.fullVisible ? C.pale : C.paleOrange, g.fullVisible ? C.green : C.orange, 14);
    api.text(g.fullVisible ? '完整物体可见' : '仅部分物体可见', x, y - 2, g.fullVisible ? C.greenDark : '#9a4d20', 16, 'center', 800);
    api.text(copy.line1, x, y + 24, C.ink, 10.5, 'center', 700);
    api.text(copy.line2, x, y + 42, C.muted, 9.5, 'center', 700);
  }

  model.draw = function drawR2WithIntervalClarity(api, state) {
    previousMainDraw(api, state);
    redrawMainBadge(api, state);
  };

  function redrawObservable(root) {
    const canvas = root.querySelector('[data-module-id="observable"] canvas');
    if (!canvas) return;
    const api = canvasAPI(canvas);
    const state = stateOf(root);
    const g = window.R2VisualRefinementV015.geometry(state);
    const copy = intervalText(g);
    const x = 552;
    const y = 51;
    api.rect(430, y, 245, 122, g.fullVisible ? C.pale : C.paleOrange, g.fullVisible ? C.green : C.orange, 14);
    api.text(g.fullVisible ? '完整物体可见' : '镜面截断部分视线', x, 85, g.fullVisible ? C.greenDark : '#9a4d20', 15, 'center', 800);
    api.text(copy.line1, x, 119, C.ink, 10.5, 'center', 700);
    api.text(copy.line2, x, 145, C.muted, 9.5, 'center', 700);
  }

  function install() {
    const root = document.querySelector('.rfw-page[data-model-id="plane-mirror"]');
    if (!root) return null;
    let frame = 0;
    const timers = [];
    const draw = () => redrawObservable(root);
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(draw)))));
    };
    const settled = () => {
      schedule();
      [180, 440, 840].forEach(delay => timers.push(setTimeout(draw, delay)));
    };
    const mutationObserver = new MutationObserver(settled);
    mutationObserver.observe(root, { attributes: true, attributeFilter: ['data-render-revision'] });
    const resizeObserver = new ResizeObserver(settled);
    const target = root.querySelector('[data-module-id="observable"] .rfw-module-canvas-wrap') || root;
    resizeObserver.observe(target);
    window.addEventListener('resize', settled, { passive: true });
    settled();
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', settled);
    };
  }

  function wait(attempt = 0) {
    const installed = install();
    if (installed) {
      cleanup = installed;
      return;
    }
    if (attempt < 60 && location.hash.includes('model:plane-mirror')) requestAnimationFrame(() => wait(attempt + 1));
  }

  renderModel = function renderR2IntervalClarity(id) {
    cleanup();
    cleanup = () => {};
    const result = previousRender(id);
    if (id === 'plane-mirror') requestAnimationFrame(() => wait());
    return result;
  };
  window.renderModel = renderModel;
})();
