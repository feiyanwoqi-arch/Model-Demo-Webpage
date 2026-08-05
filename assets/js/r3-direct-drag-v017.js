'use strict';
(() => {
  if (window.R3DirectDragV017) return;

  const GEOMETRY = { mirrorX:820, axisY:360 };
  const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));
  let activeCanvas = null;
  let dragging = false;
  let pointerId = null;

  function logicalPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / Math.max(1, rect.width) * 1080,
      y: (event.clientY - rect.top) / Math.max(1, rect.height) * 675
    };
  }

  function controls(canvas) {
    const root = canvas.closest('.rfw-page[data-model-id="spherical-mirror"]');
    return {
      root,
      distance: root?.querySelector('[data-rfw-param="do"]'),
      height: root?.querySelector('[data-rfw-param="height"]')
    };
  }

  function emit(control) {
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function bind(canvas) {
    if (!canvas || canvas.dataset.r3DirectDrag === '018') return;
    canvas.dataset.r3DirectDrag = '018';

    canvas.addEventListener('pointerdown', event => {
      const { distance, height } = controls(canvas);
      if (!distance || !height) return;
      const point = logicalPoint(canvas, event);
      const objectX = GEOMETRY.mirrorX - Number(distance.value);
      const objectY = GEOMETRY.axisY - Number(height.value);
      if (Math.hypot(point.x - objectX, point.y - objectY) > 32) return;

      dragging = true;
      pointerId = event.pointerId;
      activeCanvas = canvas;
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    canvas.addEventListener('pointermove', event => {
      if (!dragging || activeCanvas !== canvas || event.pointerId !== pointerId) return;
      const current = controls(canvas);
      if (!current.distance || !current.height || !current.root) return;
      const point = logicalPoint(canvas, event);
      const nextDistance = Math.round(clampValue(GEOMETRY.mirrorX - point.x, 70, 520));
      const nextHeight = Math.round(clampValue(GEOMETRY.axisY - point.y, 50, 150));

      current.distance.value = String(nextDistance);
      emit(current.distance);
      const refreshedHeight = current.root.querySelector('[data-rfw-param="height"]');
      if (refreshedHeight) {
        refreshedHeight.value = String(nextHeight);
        emit(refreshedHeight);
      }
      current.root.dataset.r3DragDistance = String(nextDistance);
      current.root.dataset.r3DragHeight = String(nextHeight);

      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    const stop = event => {
      if (!dragging || activeCanvas !== canvas || event.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      activeCanvas = null;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    canvas.addEventListener('pointerup', stop, true);
    canvas.addEventListener('pointercancel', stop, true);
  }

  function scan() {
    bind(document.querySelector('.rfw-page[data-model-id="spherical-mirror"] #rfwMainCanvas'));
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.getElementById('view') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => setTimeout(scan, 0));
  scan();

  window.R3DirectDragV017 = { version: '0.18.0', scan, geometry:GEOMETRY };
})();
