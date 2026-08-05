'use strict';
(() => {
  const model = models['plane-mirror'];
  if (!model) return;
  const previousRender = renderModel;
  let cleanup = () => {};

  const value = (root, key, fallback) => {
    const node = root?.querySelector(`[data-rfw-param="${key}"]`);
    return node ? Number(node.value) : fallback;
  };
  const stateOf = root => ({
    distance: value(root, 'distance', 270),
    height: value(root, 'height', 150),
    observerY: value(root, 'observerY', 430),
    mirrorHeight: value(root, 'mirrorHeight', 260)
  });

  function install() {
    const root = document.querySelector('.rfw-page[data-model-id="plane-mirror"]');
    const canvas = root?.querySelector('#rfwMainCanvas');
    if (!root || !canvas) return null;
    let frame = 0;
    const timers = [];
    const draw = () => model.draw(canvasAPI(canvas), stateOf(root));
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(draw)));
    };
    const settled = () => {
      schedule();
      [80, 220, 520, 900].forEach(delay => timers.push(setTimeout(draw, delay)));
    };
    const mutationObserver = new MutationObserver(settled);
    mutationObserver.observe(root, { attributes: true, attributeFilter: ['data-render-revision'] });
    const resizeObserver = new ResizeObserver(settled);
    resizeObserver.observe(canvas);
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
    if (installed) { cleanup = installed; return; }
    if (attempt < 60 && location.hash.includes('model:plane-mirror')) requestAnimationFrame(() => wait(attempt + 1));
  }

  renderModel = function renderR2MainFinalV016(id) {
    cleanup(); cleanup = () => {};
    const result = previousRender(id);
    if (id === 'plane-mirror') requestAnimationFrame(() => wait());
    return result;
  };
  window.renderModel = renderModel;
})();
