'use strict';
(() => {
  const model = models['plane-mirror'];
  if (!model) return;

  const previousRender = renderModel;
  let cleanup = () => {};
  const C = {
    green: '#66d900', greenDark: '#4b7900', teal: '#0e7c84', orange: '#e98242',
    ink: '#0b3040', muted: '#66808a', grey: '#96a8ac', light: '#d9e5e3',
    pale: '#f3ffdf', paleOrange: '#fff4eb', red: '#c9534d', purple: '#8066a8'
  };

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

  function geometry(state) {
    if (window.R2VisualRefinementV015?.geometry) return window.R2VisualRefinementV015.geometry(state);
    const mirrorX = 600;
    const base = 545;
    const objectX = mirrorX - state.distance;
    const imageX = mirrorX + state.distance;
    const top = base - state.height;
    const eye = { x: 145, y: state.observerY };
    const intersect = yImage => {
      const t = (mirrorX - eye.x) / Math.max(1, imageX - eye.x);
      return { x: mirrorX, y: eye.y + t * (yImage - eye.y) };
    };
    const topHit = intersect(top);
    const bottomHit = intersect(base);
    const requiredTop = Math.min(topHit.y, bottomHit.y);
    const requiredBottom = Math.max(topHit.y, bottomHit.y);
    const activeTop = 320 - state.mirrorHeight / 2;
    const activeBottom = 320 + state.mirrorHeight / 2;
    return {
      topHit, bottomHit, requiredTop, requiredBottom,
      requiredHeight: requiredBottom - requiredTop,
      activeTop, activeBottom,
      topVisible: topHit.y >= activeTop && topHit.y <= activeBottom,
      bottomVisible: bottomHit.y >= activeTop && bottomHit.y <= activeBottom,
      fullVisible: requiredTop >= activeTop && requiredBottom <= activeBottom
    };
  }

  function drawMechanism(root, api) {
    const state = stateOf(root);
    const mirrorX = 360;
    const scale = .55;
    const object = { x: mirrorX - state.distance * scale, y: 207 - state.height * scale };
    const image = { x: mirrorX + state.distance * scale, y: object.y };
    const eyeX = 58;
    const eyeCenterY = 100 + (state.observerY - 220) / 320 * 92;
    const pupilYs = [eyeCenterY - 12, eyeCenterY + 12];

    api.clear();
    api.text('有限瞳孔接收两条真实光', 38, 22, C.teal, 12, 'left', 800);
    api.text('反向延长线仍交于同一虚像点', 682, 22, C.orange, 12, 'right', 800);
    api.line(mirrorX, 34, mirrorX, 214, C.teal, 7);
    api.circle(object.x, object.y, 10, C.pale, C.green, 3);
    api.text('物点', object.x, object.y - 18, C.greenDark, 11, 'center', 700);
    api.circle(image.x, image.y, 10, '#ffffff', C.grey, 3);
    api.text('虚像点', image.x, image.y - 18, C.muted, 11, 'center', 700);

    pupilYs.forEach((eyeY, index) => {
      const t = (mirrorX - eyeX) / Math.max(1, image.x - eyeX);
      const hitY = eyeY + t * (image.y - eyeY);
      api.arrow(object.x, object.y, mirrorX, hitY, C.green, index ? 2.8 : 3.5);
      api.arrow(mirrorX, hitY, eyeX, eyeY, C.teal, index ? 2.8 : 3.5);
      api.line(mirrorX, hitY, image.x, image.y, C.grey, 1.8, [7, 5]);
      api.circle(mirrorX, hitY, 4, '#ffffff', C.teal, 1.5);
    });

    const { ctx } = api;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeCenterY, 15, 25, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    api.text('有限瞳孔', eyeX, Math.min(205, eyeCenterY + 38), C.ink, 11, 'center', 700);
    api.text(`物距 = 像距 = ${Math.round(state.distance)} px`, 360, 219, C.muted, 10, 'center', 700);
    api.text('镜前实线是传播；镜后虚线只用于定位', 360, 238, C.muted, 10, 'center', 700);
  }

  function drawObservable(root, api) {
    const state = stateOf(root);
    const g = geometry(state);
    const mapY = y => 32 + (y - 70) / 500 * 178;
    const mirrorX = 225;
    const requiredX = 300;

    api.clear();
    api.text('有限镜面覆盖判据', 42, 22, C.teal, 12, 'left', 800);
    api.text('两个必要点必须同时落入有效区', 678, 22, C.orange, 12, 'right', 800);
    api.line(mirrorX, mapY(70), mirrorX, mapY(570), C.light, 11);
    api.line(mirrorX, mapY(g.activeTop), mirrorX, mapY(g.activeBottom), C.teal, 12);
    api.circle(mirrorX, mapY(g.topHit.y), 6, g.topVisible ? C.green : '#ffffff', g.topVisible ? '#ffffff' : C.red, 2);
    api.circle(mirrorX, mapY(g.bottomHit.y), 6, g.bottomVisible ? C.orange : '#ffffff', g.bottomVisible ? '#ffffff' : C.red, 2);
    api.text('顶部必要点', mirrorX - 18, mapY(g.topHit.y) - 5, g.topVisible ? C.greenDark : C.red, 10, 'right', 700);
    api.text('底部必要点', mirrorX - 18, mapY(g.bottomHit.y) + 12, g.bottomVisible ? '#a35225' : C.red, 10, 'right', 700);

    api.line(requiredX, mapY(g.requiredTop), requiredX, mapY(g.requiredBottom), C.purple, 4);
    api.line(requiredX - 8, mapY(g.requiredTop), requiredX + 8, mapY(g.requiredTop), C.purple, 3);
    api.line(requiredX - 8, mapY(g.requiredBottom), requiredX + 8, mapY(g.requiredBottom), C.purple, 3);
    api.text(`所需区间 ${g.requiredHeight.toFixed(1)} px`, requiredX + 18, (mapY(g.requiredTop) + mapY(g.requiredBottom)) / 2, C.purple, 10, 'left', 700);

    api.rect(430, 51, 245, 122, g.fullVisible ? C.pale : C.paleOrange, g.fullVisible ? C.green : C.orange, 14);
    api.text(g.fullVisible ? '完整物体可见' : '镜面截断部分视线', 552, 85, g.fullVisible ? C.greenDark : '#9a4d20', 15, 'center', 800);
    api.text(`当前镜高 ${Math.round(state.mirrorHeight)} px`, 552, 119, C.ink, 11, 'center', 700);
    api.text(`几何所需 ${g.requiredHeight.toFixed(1)} px`, 552, 145, C.muted, 11, 'center', 700);
    api.text('判据：所需区间 ⊆ 有效镜面区间', 552, 202, C.muted, 10, 'center', 700);
    api.text('眼睛移动改变必要反射点，但不改变虚像的对称位置', 360, 235, C.muted, 10, 'center', 700);
  }

  function install() {
    const root = document.querySelector('.rfw-page[data-model-id="plane-mirror"]');
    const mainCanvas = root?.querySelector('#rfwMainCanvas');
    if (!root || !mainCanvas) return null;

    let frame = 0;
    const timeouts = [];
    const drawAll = () => {
      const state = stateOf(root);
      model.draw(canvasAPI(mainCanvas), state);
      const mechanismCanvas = root.querySelector('[data-module-id="mechanism"] canvas');
      const observableCanvas = root.querySelector('[data-module-id="observable"] canvas');
      if (mechanismCanvas) drawMechanism(root, canvasAPI(mechanismCanvas));
      if (observableCanvas) drawObservable(root, canvasAPI(observableCanvas));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(drawAll))));
    };
    const scheduleSettled = () => {
      schedule();
      [120, 360, 760].forEach(delay => timeouts.push(setTimeout(drawAll, delay)));
    };

    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(root, { attributes: true, attributeFilter: ['data-render-revision'] });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(mainCanvas.parentElement || mainCanvas);
    window.addEventListener('resize', scheduleSettled, { passive: true });
    scheduleSettled();

    return () => {
      cancelAnimationFrame(frame);
      timeouts.forEach(clearTimeout);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleSettled);
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

  renderModel = function renderR2Stable(id) {
    cleanup();
    cleanup = () => {};
    const result = previousRender(id);
    if (id === 'plane-mirror') requestAnimationFrame(() => wait());
    return result;
  };
  window.renderModel = renderModel;
})();
