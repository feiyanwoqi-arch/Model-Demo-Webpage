'use strict';
(() => {
  const model = models['plane-mirror'];
  if (!model) return;

  const C = {
    green: '#66d900', greenDark: '#4b7900', teal: '#0e7c84', orange: '#e98242',
    ink: '#0b3040', muted: '#66808a', grey: '#96a8ac', light: '#d9e5e3',
    pale: '#f3ffdf', paleOrange: '#fff4eb', red: '#c9534d', purple: '#8066a8'
  };
  const previousRender = renderModel;
  let cleanup = () => {};
  let r2LayoutActive = false;

  const value = (root, key, fallback = 0) => {
    const node = root.querySelector(`[data-rfw-param="${key}"]`);
    if (!node) return fallback;
    return node.tagName === 'SELECT' ? node.value : Number(node.value);
  };

  function geometry(state) {
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
      mirrorX, base, objectX, imageX, top, eye, topHit, bottomHit,
      requiredTop, requiredBottom, requiredHeight: requiredBottom - requiredTop,
      activeTop, activeBottom,
      topVisible: topHit.y >= activeTop && topHit.y <= activeBottom,
      bottomVisible: bottomHit.y >= activeTop && bottomHit.y <= activeBottom,
      fullVisible: requiredTop >= activeTop && requiredBottom <= activeBottom
    };
  }

  function cross(api, x, y, color) {
    api.line(x - 8, y - 8, x + 8, y + 8, color, 3);
    api.line(x - 8, y + 8, x + 8, y - 8, color, 3);
  }

  function drawEye(api, x, y, label = '拖动眼睛') {
    const { ctx } = api;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, 17, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 2, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = C.teal;
    ctx.fill();
    ctx.restore();
    api.text(label, x, y + 28, C.ink, 12, 'center', 700);
  }

  function drawDimension(api, x1, x2, y, label) {
    api.line(x1, y, x2, y, C.muted, 1.2);
    api.line(x1, y - 6, x1, y + 6, C.muted, 1.2);
    api.line(x2, y - 6, x2, y + 6, C.muted, 1.2);
    api.text(label, (x1 + x2) / 2, y + 18, C.teal, 12, 'center', 700);
  }

  function drawPath(api, g, endpoint, hit, marker, available, label) {
    const actualIn = available ? C.green : 'rgba(102,217,0,.32)';
    const actualOut = available ? C.teal : 'rgba(14,124,132,.28)';
    if (available) {
      api.arrow(g.objectX, endpoint, g.mirrorX, hit.y, actualIn, 3.4);
      api.arrow(g.mirrorX, hit.y, g.eye.x, g.eye.y, actualOut, 3.4);
    } else {
      api.line(g.objectX, endpoint, g.mirrorX, hit.y, actualIn, 2.2, [7, 5]);
      api.line(g.mirrorX, hit.y, g.eye.x, g.eye.y, actualOut, 2.2, [7, 5]);
      cross(api, g.mirrorX, hit.y, C.red);
    }
    api.line(g.mirrorX, hit.y, g.imageX, endpoint, C.grey, 2, [8, 6]);
    api.circle(g.mirrorX, hit.y, 6, available ? marker : '#ffffff', available ? '#ffffff' : C.red, 2);
    api.text(label, g.mirrorX + 17, hit.y - 10, available ? marker : C.red, 10, 'left', 700);
  }

  model.draw = (api, state) => {
    api.clear();
    const g = geometry(state);

    api.text('真实传播区（镜前）', 52, 45, C.teal, 12, 'left', 800);
    api.text('虚拟定位区（镜后没有真实光）', 1028, 45, C.orange, 12, 'right', 800);
    api.line(g.mirrorX, 66, g.mirrorX, 574, C.light, 13);
    api.line(g.mirrorX, g.activeTop, g.mirrorX, g.activeBottom, C.teal, 13);
    api.circle(g.mirrorX, g.activeTop, 10, '#ffffff', C.teal, 3);
    api.circle(g.mirrorX, g.activeBottom, 10, '#ffffff', C.teal, 3);
    api.text('拖动镜面端点', g.mirrorX + 22, g.activeTop - 11, C.teal, 11, 'left', 700);

    api.arrow(g.objectX, g.base, g.objectX, g.top, C.green, 6);
    api.circle(g.objectX, g.top, 13, C.pale, C.green, 4);
    api.text('拖动物体顶部', g.objectX, g.top - 27, C.greenDark, 12, 'center', 700);
    api.text('物体', g.objectX, g.base + 25, C.ink, 12, 'center', 700);

    api.arrow(g.imageX, g.base, g.imageX, g.top, 'rgba(14,124,132,.34)', 5);
    api.circle(g.imageX, g.top, 11, '#ffffff', C.grey, 3);
    api.text('虚像（定位结果）', g.imageX, g.base + 25, C.muted, 12, 'center', 700);

    drawPath(api, g, g.top, g.topHit, C.green, g.topVisible, '顶部必要点');
    drawPath(api, g, g.base, g.bottomHit, C.orange, g.bottomVisible, '底部必要点');
    drawEye(api, g.eye.x, g.eye.y);

    const statusX = 850, statusY = 82;
    api.rect(statusX - 132, statusY - 28, 264, 82, g.fullVisible ? C.pale : C.paleOrange, g.fullVisible ? C.green : C.orange, 14);
    api.text(g.fullVisible ? '完整物体可见' : '仅部分物体可见', statusX, statusY, g.fullVisible ? C.greenDark : '#9a4d20', 16, 'center', 800);
    api.text(`所需镜高 ${g.requiredHeight.toFixed(1)} px｜当前 ${Math.round(state.mirrorHeight)} px`, statusX, statusY + 29, C.ink, 11, 'center', 700);

    drawDimension(api, g.objectX, g.mirrorX, 594, `物距 dₒ = ${Math.round(state.distance)} px`);
    drawDimension(api, g.mirrorX, g.imageX, 594, `像距 |dᵢ| = ${Math.round(state.distance)} px`);
    api.text('实线：光实际传播　｜　虚线：眼睛按到达方向反向追迹', 540, 645, C.muted, 12, 'center', 700);
    api.text('完整可见 ⇔ 顶部与底部两个必要反射点都落在有限镜面内', 540, 666, C.muted, 11, 'center', 600);
  };

  function readState(root) {
    return {
      distance: value(root, 'distance', 270),
      height: value(root, 'height', 150),
      observerY: value(root, 'observerY', 430),
      mirrorHeight: value(root, 'mirrorHeight', 260)
    };
  }

  function drawMechanism(root, api) {
    api.clear();
    const state = readState(root);
    const mirrorX = 360;
    const object = { x: 120, y: 82 };
    const image = { x: 600, y: 82 };
    const pupilYs = [168, 194];
    const eyeX = 70;

    api.text('两条真实光进入有限瞳孔', 42, 22, C.teal, 12, 'left', 800);
    api.text('反向延长线交于同一虚像点', 678, 22, C.orange, 12, 'right', 800);
    api.line(mirrorX, 35, mirrorX, 226, C.teal, 7);
    api.circle(object.x, object.y, 10, C.pale, C.green, 3);
    api.text('物点', object.x, object.y - 18, C.greenDark, 11, 'center', 700);
    api.circle(image.x, image.y, 10, '#ffffff', C.grey, 3);
    api.text('虚像点', image.x, image.y - 18, C.muted, 11, 'center', 700);

    pupilYs.forEach((eyeY, index) => {
      const t = (mirrorX - eyeX) / (image.x - eyeX);
      const hitY = eyeY + t * (image.y - eyeY);
      api.arrow(object.x, object.y, mirrorX, hitY, C.green, index ? 2.8 : 3.5);
      api.arrow(mirrorX, hitY, eyeX, eyeY, C.teal, index ? 2.8 : 3.5);
      api.line(mirrorX, hitY, image.x, image.y, C.grey, 1.8, [7, 5]);
      api.circle(mirrorX, hitY, 4, '#ffffff', C.teal, 1.5);
    });

    const { ctx } = api;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(eyeX, 181, 15, 25, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    api.text('有限瞳孔', eyeX, 226, C.ink, 11, 'center', 700);
    api.text('镜前实线是传播；镜后虚线只用于定位', 360, 246, C.muted, 10, 'center', 700);
  }

  function drawObservable(root, api) {
    api.clear();
    const state = readState(root);
    const g = geometry(state);
    const mapY = y => 34 + (y - 70) / 500 * 188;
    const mirrorX = 225;
    const requiredX = 300;

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

    api.rect(430, 55, 245, 126, g.fullVisible ? C.pale : C.paleOrange, g.fullVisible ? C.green : C.orange, 14);
    api.text(g.fullVisible ? '完整物体可见' : '镜面截断部分视线', 552, 91, g.fullVisible ? C.greenDark : '#9a4d20', 15, 'center', 800);
    api.text(`当前镜高 ${Math.round(state.mirrorHeight)} px`, 552, 126, C.ink, 11, 'center', 700);
    api.text(`几何所需 ${g.requiredHeight.toFixed(1)} px`, 552, 151, C.muted, 11, 'center', 700);
    api.text('判据：所需区间 ⊆ 有效镜面区间', 552, 210, C.muted, 10, 'center', 700);
    api.text('眼睛移动会改变所需反射点，但不会改变虚像的对称位置', 360, 246, C.muted, 10, 'center', 700);
  }

  function drawApparatus(root, api) {
    api.clear();
    const state = readState(root);
    const mx = 355;
    const scale = .43;
    const base = 205;
    const objectX = mx - state.distance * scale;
    const imageX = mx + state.distance * scale;
    const top = base - state.height * scale;
    const eye = { x: 58, y: 55 + (state.observerY - 220) / 320 * 145 };
    const hitFor = yImage => {
      const t = (mx - eye.x) / Math.max(1, imageX - eye.x);
      return eye.y + t * (yImage - eye.y);
    };

    api.text('眼睛/相机能记录到达方向', 35, 22, C.teal, 11, 'left', 800);
    api.text('镜后屏幕接不到会聚光', 685, 22, C.orange, 11, 'right', 800);
    api.line(mx, 34, mx, 228, C.teal, 7);
    api.arrow(objectX, base, objectX, top, C.green, 4);
    api.arrow(imageX, base, imageX, top, 'rgba(14,124,132,.35)', 3.5);
    [top, base].forEach(yPoint => {
      const hitY = hitFor(yPoint);
      api.arrow(objectX, yPoint, mx, hitY, C.green, 2.7);
      api.arrow(mx, hitY, eye.x, eye.y, C.teal, 2.7);
      api.line(mx, hitY, imageX, yPoint, C.grey, 1.5, [6, 5]);
    });
    drawEye(api, eye.x, eye.y, '眼睛/相机');
    api.line(670, 50, 670, 220, C.ink, 5);
    cross(api, 670, 132, C.red);
    api.text('镜后屏幕', 670, 239, C.ink, 10, 'center', 700);
    api.text('虚像可拍摄 ≠ 镜后有真实会聚光', 470, 246, C.muted, 10, 'center', 700);
  }

  function updateLiveStrip(root) {
    const state = readState(root);
    const g = geometry(state);
    const cards = root.querySelectorAll('.rfw-live-strip article');
    if (cards.length < 4) return;
    cards[3].classList.toggle('is-r2-visible', g.fullVisible);
    cards[3].classList.toggle('is-r2-partial', !g.fullVisible);
    cards[3].innerHTML = `<span>有限镜面判据</span><b>${g.fullVisible ? '完整可见' : '部分截断'}</b>`;
    cards[3].title = `完整可见所需镜高 ${g.requiredHeight.toFixed(1)} px；当前 ${Math.round(state.mirrorHeight)} px`;
  }

  function installMirrorDrag(root, canvas) {
    let handle = null;
    const logical = event => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / Math.max(1, rect.width) * 1080,
        y: (event.clientY - rect.top) / Math.max(1, rect.height) * 675
      };
    };
    const positions = () => {
      const h = value(root, 'mirrorHeight', 260);
      return { top: 320 - h / 2, bottom: 320 + h / 2 };
    };
    const down = event => {
      const point = logical(event);
      const pos = positions();
      if (Math.hypot(point.x - 600, point.y - pos.top) < 34) handle = 'top';
      else if (Math.hypot(point.x - 600, point.y - pos.bottom) < 34) handle = 'bottom';
      else return;
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const move = event => {
      if (!handle) return;
      const point = logical(event);
      const next = handle === 'top' ? 2 * (320 - point.y) : 2 * (point.y - 320);
      const control = root.querySelector('[data-rfw-param="mirrorHeight"]');
      if (!control) return;
      control.value = String(Math.round(clamp(next, 80, 500)));
      control.dispatchEvent(new Event('input', { bubbles: true }));
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const stop = () => { handle = null; };
    canvas.addEventListener('pointerdown', down, true);
    canvas.addEventListener('pointermove', move, true);
    canvas.addEventListener('pointerup', stop, true);
    canvas.addEventListener('pointercancel', stop, true);
    return () => {
      canvas.removeEventListener('pointerdown', down, true);
      canvas.removeEventListener('pointermove', move, true);
      canvas.removeEventListener('pointerup', stop, true);
      canvas.removeEventListener('pointercancel', stop, true);
    };
  }

  function install() {
    const root = document.querySelector('.rfw-page[data-model-id="plane-mirror"]');
    const mainCanvas = root?.querySelector('#rfwMainCanvas');
    if (!root || !mainCanvas) return null;
    const removeMirrorDrag = installMirrorDrag(root, mainCanvas);
    let frame = 0;

    const draw = () => {
      const mechanism = root.querySelector('[data-module-id="mechanism"] canvas');
      const observable = root.querySelector('[data-module-id="observable"] canvas');
      const apparatus = root.querySelector('[data-module-id="apparatus"] canvas');
      if (mechanism) drawMechanism(root, canvasAPI(mechanism));
      if (observable) drawObservable(root, canvasAPI(observable));
      if (apparatus) drawApparatus(root, canvasAPI(apparatus));
      updateLiveStrip(root);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(draw)));
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, { attributes: true, attributeFilter: ['data-render-revision'] });
    window.addEventListener('resize', schedule, { passive: true });
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      removeMirrorDrag();
      window.removeEventListener('resize', schedule);
    };
  }

  function applyLayout() {
    const app = document.querySelector('.app');
    const view = document.querySelector('#view');
    app?.classList.add('r2-v015-active');
    view?.classList.add('r2-v015-mounted');
    app?.style.setProperty('width', '100vw', 'important');
    app?.style.setProperty('max-width', 'none', 'important');
    app?.style.setProperty('margin', '0', 'important');
    view?.style.setProperty('width', '100%', 'important');
    view?.style.setProperty('max-width', 'none', 'important');
    view?.style.setProperty('margin', '0', 'important');
    document.documentElement.style.setProperty('overflow-x', 'clip');
    document.body.style.setProperty('overflow-x', 'clip');
    r2LayoutActive = true;
  }

  function clearLayout() {
    if (!r2LayoutActive) return;
    const app = document.querySelector('.app');
    const view = document.querySelector('#view');
    app?.classList.remove('r2-v015-active');
    view?.classList.remove('r2-v015-mounted');
    ['width', 'max-width', 'margin'].forEach(property => app?.style.removeProperty(property));
    ['width', 'max-width', 'margin'].forEach(property => view?.style.removeProperty(property));
    document.documentElement.style.removeProperty('overflow-x');
    document.body.style.removeProperty('overflow-x');
    r2LayoutActive = false;
  }

  function wait(attempt = 0) {
    const installed = install();
    if (installed) {
      cleanup = installed;
      return;
    }
    if (attempt < 50 && location.hash.includes('model:plane-mirror')) requestAnimationFrame(() => wait(attempt + 1));
  }

  renderModel = function renderR2VisualRefinement(id) {
    cleanup();
    cleanup = () => {};
    clearLayout();
    const result = previousRender(id);
    if (id === 'plane-mirror') {
      applyLayout();
      requestAnimationFrame(() => wait());
    }
    return result;
  };
  window.renderModel = renderModel;
  window.R2VisualRefinementV015 = { geometry };
})();
