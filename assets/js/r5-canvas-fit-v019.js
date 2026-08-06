'use strict';
(() => {
  if (window.R5CanvasFitV019) return;

  let frame = 0;
  let resizeObserver = null;
  let mutationObserver = null;
  let observed = new Set();

  function contentBox(node) {
    const style = getComputedStyle(node);
    const width = node.clientWidth
      - parseFloat(style.paddingLeft || 0)
      - parseFloat(style.paddingRight || 0);
    const height = node.clientHeight
      - parseFloat(style.paddingTop || 0)
      - parseFloat(style.paddingBottom || 0);
    return {
      width: Math.max(0, width),
      height: Math.max(0, height)
    };
  }

  function fitCanvas(canvas) {
    const wrap = canvas.parentElement;
    if (!wrap || !wrap.isConnected) return;
    const box = contentBox(wrap);
    if (box.width < 8 || box.height < 8) return;

    const ratio = canvas.width / Math.max(1, canvas.height);
    let width = Math.min(box.width, box.height * ratio);
    let height = width / ratio;
    if (height > box.height) {
      height = box.height;
      width = height * ratio;
    }

    // Leave one physical CSS pixel of safety on each axis so borders and
    // fractional layout rounding cannot place canvas pixels under the next row.
    width = Math.max(1, Math.floor(width - 1));
    height = Math.max(1, Math.floor(height - 1));

    const widthPx = `${width}px`;
    const heightPx = `${height}px`;
    if (canvas.style.width !== widthPx) canvas.style.setProperty('width', widthPx, 'important');
    if (canvas.style.height !== heightPx) canvas.style.setProperty('height', heightPx, 'important');
    canvas.style.setProperty('max-width', 'none', 'important');
    canvas.style.setProperty('max-height', 'none', 'important');
    canvas.style.setProperty('object-fit', 'contain', 'important');
    canvas.dataset.r5FittedWidth = String(width);
    canvas.dataset.r5FittedHeight = String(height);
  }

  function fitAll() {
    frame = 0;
    const root = document.querySelector('.tir-page[data-model-id="total-internal"]');
    if (!root) return;
    const canvases = [
      root.querySelector('#r5MainCanvas'),
      ...root.querySelectorAll('.tir-module-canvas-wrap canvas')
    ].filter(Boolean);
    for (const canvas of canvases) {
      const wrap = canvas.parentElement;
      if (resizeObserver && wrap && !observed.has(wrap)) {
        resizeObserver.observe(wrap);
        observed.add(wrap);
      }
      fitCanvas(canvas);
    }
    root.dataset.r5CanvasFit = '019';
  }

  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => requestAnimationFrame(fitAll));
  }

  function install() {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    observed = new Set();
    resizeObserver = new ResizeObserver(schedule);
    mutationObserver = new MutationObserver(schedule);
    const view = document.getElementById('view') || document.body;
    mutationObserver.observe(view, { childList: true, subtree: true });
    resizeObserver.observe(document.documentElement);
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('hashchange', schedule);
    schedule();
  }

  window.R5CanvasFitV019 = {
    version: '0.19.4',
    fitAll,
    schedule,
    install
  };
  install();
})();
