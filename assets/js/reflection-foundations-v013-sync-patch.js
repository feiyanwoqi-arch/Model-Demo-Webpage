'use strict';
(() => {
  const previousRender = renderModel;
  const targetModels = new Set(['reflection-law', 'plane-mirror']);
  const C = { green:'#7bea00', teal:'#0e7c84', orange:'#f59e57', ink:'#0b3040', muted:'#66808a' };
  let cleanup = () => {};

  const value = (root, key, fallback = 0) => {
    const control = root.querySelector(`[data-rfw-param="${key}"]`);
    if (!control) return fallback;
    return control.tagName === 'SELECT' ? control.value : Number(control.value);
  };

  function reflect(incoming, normal) {
    const dot = incoming.x * normal.x + incoming.y * normal.y;
    return { x: incoming.x - 2 * dot * normal.x, y: incoming.y - 2 * dot * normal.y };
  }

  function drawReflectionMechanism(root, api) {
    const angle = rad(value(root, 'angle', 38));
    const roughness = value(root, 'roughness', 0);
    api.clear();
    api.text('同一入射方向', 52, 24, C.green, 11);
    api.text('改变入射角后，三个面元同步重算', 668, 24, C.teal, 11, 'right', 700);
    const incoming = { x: Math.sin(angle), y: Math.cos(angle) };
    [145, 360, 575].forEach((x, index) => {
      const tilt = roughness * (.35 * Math.sin(x * .041) + .18 * Math.cos(x * .079));
      const y = 166 + 12 * roughness * Math.sin(x * .055);
      const tangent = { x: Math.cos(tilt), y: Math.sin(tilt) };
      const normal = { x: Math.sin(tilt), y: -Math.cos(tilt) };
      const reflected = reflect(incoming, normal);
      api.line(x - 64 * tangent.x, y - 64 * tangent.y, x + 64 * tangent.x, y + 64 * tangent.y, '#72878c', 4);
      api.line(x - 34 * normal.x, y - 34 * normal.y, x + 60 * normal.x, y + 60 * normal.y, '#91a3a8', 1.2, [5, 4]);
      api.arrow(x - 94 * incoming.x, y - 94 * incoming.y, x, y, C.green, 3);
      api.arrow(x, y, x + 94 * reflected.x, y + 94 * reflected.y, C.teal, 3);
      api.text(`面元 ${index + 1}`, x, 238, C.muted, 10, 'center');
    });
    api.text(`全局入射角 θᵢ=${(angle * 180 / Math.PI).toFixed(1)}°`, 360, 249, C.ink, 10, 'center', 700);
  }

  function drawPlaneMechanism(root, api) {
    const distance = value(root, 'distance', 270);
    const height = value(root, 'height', 150);
    const observerY = value(root, 'observerY', 430);
    api.clear();
    const mirrorX = 360;
    const scale = Math.min(.72, 245 / Math.max(90, distance));
    const objectX = mirrorX - distance * scale;
    const imageX = mirrorX + distance * scale;
    const imageY = 58 + (210 - height) / 150 * 45;
    const eye = { x: 68, y: 62 + (observerY - 220) / 320 * 145 };
    const pupils = [eye.y - 10, eye.y + 10];

    api.line(mirrorX, 25, mirrorX, 238, C.teal, 6);
    api.circle(objectX, imageY, 8, '#f5ffdc', C.green, 3);
    api.text('物点', objectX, imageY - 17, C.green, 10, 'center');
    api.circle(imageX, imageY, 8, '#fff', '#9ba9ab', 2);
    api.text('虚像点', imageX, imageY - 17, C.muted, 10, 'center');

    pupils.forEach(pupilY => {
      const t = (mirrorX - eye.x) / Math.max(1, imageX - eye.x);
      const hitY = pupilY + t * (imageY - pupilY);
      api.arrow(objectX, imageY, mirrorX, hitY, C.green, 2.6);
      api.arrow(mirrorX, hitY, eye.x, pupilY, C.teal, 2.6);
      api.line(mirrorX, hitY, imageX, imageY, '#9ba9ab', 1.7, [6, 5]);
    });
    api.circle(eye.x, eye.y, 11, '#fff', C.teal, 2);
    api.line(eye.x + 3, eye.y - 10, eye.x + 3, eye.y + 10, C.teal, 2);
    api.text('有限瞳孔', eye.x, eye.y + 22, C.ink, 10, 'center');
    api.text(`物距 ${Math.round(distance)} px · 眼高 ${Math.round(observerY)} px`, 360, 248, C.ink, 10, 'center', 700);
    api.text('实线为传播，虚线仅为定位', 680, 24, C.orange, 10, 'right', 700);
  }

  function install(id) {
    const root = document.querySelector(`.rfw-page[data-model-id="${id}"]`);
    const canvas = root?.querySelector('[data-module-id="mechanism"] canvas');
    if (!root || !canvas) return null;
    const api = canvasAPI(canvas);
    const draw = id === 'reflection-law'
      ? () => drawReflectionMechanism(root, api)
      : () => drawPlaneMechanism(root, api);
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, { attributes: true, attributeFilter: ['data-render-revision'] });
    window.addEventListener('resize', schedule, { passive: true });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }

  function wait(id, attempt = 0) {
    const mounted = install(id);
    if (mounted) { cleanup = mounted; return; }
    if (attempt < 30 && location.hash.includes(`model:${id}`)) requestAnimationFrame(() => wait(id, attempt + 1));
  }

  renderModel = function renderReflectionStateSync(id) {
    cleanup(); cleanup = () => {};
    const result = previousRender(id);
    if (targetModels.has(id)) requestAnimationFrame(() => wait(id));
    return result;
  };
  window.renderModel = renderModel;
})();
