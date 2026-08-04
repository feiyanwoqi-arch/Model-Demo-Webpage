'use strict';
(() => {
  const model = models['reflection-law'];
  if (!model) return;

  const C = {
    green: '#66d900', greenDark: '#4b7900', teal: '#0e7c84', orange: '#e98242',
    ink: '#0b3040', muted: '#66808a', normal: '#82979d', surface: '#6e858a',
    substrate: '#eef6f3', pale: '#f3ffdf', red: '#c9534d'
  };
  const previousRender = renderModel;
  let cleanup = () => {};

  const value = (root, key, fallback = 0) => {
    const node = root.querySelector(`[data-rfw-param="${key}"]`);
    if (!node) return fallback;
    return node.tagName === 'SELECT' ? node.value : Number(node.value);
  };

  const reflect = (incoming, normal) => {
    const dot = incoming.x * normal.x + incoming.y * normal.y;
    return { x: incoming.x - 2 * dot * normal.x, y: incoming.y - 2 * dot * normal.y };
  };

  const observerInfo = state => {
    const sigma = 1.8 + 18 * state.roughness;
    const delta = Math.abs(state.observerAngle - state.angle);
    const signal = Math.exp(-0.5 * (delta / sigma) ** 2);
    return { sigma, delta, signal, visible: delta <= state.acceptance + sigma * .35 };
  };

  function textChip(api, x, y, width, label, accent) {
    api.rect(x, y, width, 34, '#ffffff', '#d5e5e2', 10);
    api.line(x + 12, y + 17, x + 30, y + 17, accent, 4);
    api.text(label, x + 40, y + 17, C.ink, 12, 'left', 700);
  }

  model.draw = (api, state) => {
    api.clear();
    const { ctx, W, H } = api;
    const x0 = 570, y0 = 430;
    const angle = rad(state.angle);
    const observerAngle = rad(Number.isFinite(state.observerAngle) ? state.observerAngle : state.angle);
    const acceptance = rad(Number.isFinite(state.acceptance) ? state.acceptance : 4);
    const roughness = state.roughness;
    const info = observerInfo({
      angle: state.angle,
      observerAngle: Number.isFinite(state.observerAngle) ? state.observerAngle : state.angle,
      acceptance: Number.isFinite(state.acceptance) ? state.acceptance : 4,
      roughness
    });
    const surfaceY = x => y0 + roughness * (11 * Math.sin(x * .055) + 6 * Math.sin(x * .13));

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, surfaceY(0));
    for (let x = 4; x <= W; x += 4) ctx.lineTo(x, surfaceY(x));
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = C.substrate;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = C.surface;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const y = surfaceY(x);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    const observerStart = -Math.PI / 2 + observerAngle - acceptance;
    const observerEnd = -Math.PI / 2 + observerAngle + acceptance;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.arc(x0, y0, 235, observerStart, observerEnd);
    ctx.closePath();
    ctx.fillStyle = 'rgba(233,130,66,.12)';
    ctx.fill();
    ctx.restore();
    api.line(x0, y0, x0 + 235 * Math.cos(observerStart), y0 + 235 * Math.sin(observerStart), 'rgba(233,130,66,.55)', 1.5, [6, 5]);
    api.line(x0, y0, x0 + 235 * Math.cos(observerEnd), y0 + 235 * Math.sin(observerEnd), 'rgba(233,130,66,.55)', 1.5, [6, 5]);

    const count = Math.max(1, Math.round(state.rays));
    const middle = Math.floor(count / 2);
    for (let index = 0; index < count; index++) {
      const offset = (index - (count - 1) / 2) * 19;
      const hitX = x0 + offset;
      const hitY = surfaceY(hitX);
      const localTilt = roughness * (.22 * Math.sin(hitX * .047) + .13 * Math.cos(hitX * .081));
      const incoming = { x: Math.sin(angle), y: Math.cos(angle) };
      const normal = { x: Math.sin(localTilt), y: -Math.cos(localTilt) };
      const reflected = reflect(incoming, normal);
      const primary = index === middle;
      ctx.save();
      ctx.globalAlpha = primary ? 1 : .62;
      api.arrow(hitX - 270 * incoming.x, hitY - 270 * incoming.y, hitX, hitY, C.green, primary ? 5 : 2.5);
      api.arrow(hitX, hitY, hitX + 255 * reflected.x, hitY + 255 * reflected.y, C.teal, primary ? 4.5 : 2.2);
      ctx.restore();
      if (primary || index % 3 === 0) api.line(hitX - 28 * normal.x, hitY - 28 * normal.y, hitX + 82 * normal.x, hitY + 82 * normal.y, C.normal, primary ? 2 : 1, [6, 5]);
    }

    const sourceX = x0 - 285 * Math.sin(angle);
    const sourceY = y0 - 285 * Math.cos(angle);
    api.circle(sourceX, sourceY, 18, C.pale, C.green, 4);
    api.circle(sourceX, sourceY, 5, C.green, C.green, 1);
    api.text('拖动入射光源', sourceX, sourceY - 30, C.greenDark, 13, 'center', 700);

    api.line(x0, y0 - 145, x0, y0 + 54, C.normal, 2, [7, 6]);
    api.text('入射点局部法线', x0, y0 - 160, C.muted, 12, 'center', 700);

    ctx.save();
    ctx.strokeStyle = C.greenDark;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x0, y0, 80, -Math.PI / 2 - angle, -Math.PI / 2);
    ctx.stroke();
    ctx.strokeStyle = C.teal;
    ctx.beginPath();
    ctx.arc(x0, y0, 80, -Math.PI / 2, -Math.PI / 2 + angle);
    ctx.stroke();
    ctx.restore();
    api.text(`θᵢ ${state.angle.toFixed(1)}°`, x0 - 104, y0 - 83, C.greenDark, 14, 'center', 700);
    api.text(`θᵣ ${state.angle.toFixed(1)}°`, x0 + 104, y0 - 83, C.teal, 14, 'center', 700);

    const observerX = x0 + 220 * Math.sin(observerAngle);
    const observerY = y0 - 220 * Math.cos(observerAngle);
    api.circle(observerX, observerY, 18, '#fff8f1', info.visible ? C.orange : C.red, 4);
    api.line(observerX - 8, observerY, observerX + 8, observerY, info.visible ? C.orange : C.red, 3);
    api.line(observerX + 6, observerY - 9, observerX + 6, observerY + 9, info.visible ? C.orange : C.red, 3);
    api.text('拖动观察方向', observerX, observerY - 31, C.orange, 13, 'center', 700);
    api.text(`接受角 ±${(acceptance * 180 / Math.PI).toFixed(1)}°`, observerX, observerY + 31, C.muted, 11, 'center', 700);

    textChip(api, 88, 520, 264, '微观：每个点都满足 θᵢ = θᵣ', C.green);
    textChip(api, 404, 520, 278, `宏观：反射峰宽 σ ≈ ${info.sigma.toFixed(1)}°`, C.teal);
    textChip(api, 734, 520, 258, `观测：接收信号 ${(info.signal * 100).toFixed(1)}%`, C.orange);
    api.text('粗糙度在本模型中表示“局部法线离散度”的几何示意，不等同于真实材料 BRDF。', W / 2, 595, C.muted, 12, 'center', 600);
    api.text('上方：光在空气中的真实传播　｜　下方：表面材料区域与因果判据', W / 2, 628, C.muted, 11, 'center', 600);
  };

  function drawMechanism(root, api) {
    const state = {
      angle: value(root, 'angle', 38),
      roughness: value(root, 'roughness', 0)
    };
    api.clear();
    api.text('同一全局入射方向', 48, 24, C.greenDark, 12, 'left', 700);
    api.text('局部法线不同 → 出射方向不同', 672, 24, C.teal, 12, 'right', 700);
    const incoming = { x: Math.sin(rad(state.angle)), y: Math.cos(rad(state.angle)) };
    [135, 360, 585].forEach((x, index) => {
      const tilt = state.roughness * (.35 * Math.sin(x * .041) + .18 * Math.cos(x * .079));
      const y = 142 + 10 * state.roughness * Math.sin(x * .055);
      const tangent = { x: Math.cos(tilt), y: Math.sin(tilt) };
      const normal = { x: Math.sin(tilt), y: -Math.cos(tilt) };
      const reflected = reflect(incoming, normal);
      api.line(x - 60 * tangent.x, y - 60 * tangent.y, x + 60 * tangent.x, y + 60 * tangent.y, C.surface, 5);
      api.line(x - 26 * normal.x, y - 26 * normal.y, x + 72 * normal.x, y + 72 * normal.y, C.normal, 1.5, [6, 5]);
      api.arrow(x - 88 * incoming.x, y - 88 * incoming.y, x, y, C.green, 3.2);
      api.arrow(x, y, x + 88 * reflected.x, y + 88 * reflected.y, C.teal, 3.2);
      api.circle(x, y, 4, '#fff', C.ink, 1.5);
      api.text(`面元 ${index + 1}`, x, 216, C.ink, 12, 'center', 700);
    });
    api.text(`共享入射角 θᵢ = ${state.angle.toFixed(1)}°`, 360, 243, C.muted, 11, 'center', 700);
  }

  function drawObservable(root, api) {
    const state = {
      angle: value(root, 'angle', 38),
      roughness: value(root, 'roughness', 0),
      observerAngle: value(root, 'observerAngle', 38),
      acceptance: value(root, 'acceptance', 4)
    };
    const info = observerInfo(state);
    api.clear();
    const x0 = 62, y0 = 34, width = 596, height = 150;
    const toX = angle => x0 + angle / 80 * width;
    const left = toX(Math.max(0, state.observerAngle - state.acceptance));
    const right = toX(Math.min(80, state.observerAngle + state.acceptance));
    const ctx = api.ctx;

    ctx.save();
    ctx.fillStyle = 'rgba(233,130,66,.11)';
    ctx.fillRect(left, y0, Math.max(2, right - left), height);
    ctx.restore();
    api.line(x0, y0 + height, x0 + width, y0 + height, '#879da1', 1.5);
    api.line(x0, y0, x0, y0 + height, '#879da1', 1.5);

    ctx.save();
    ctx.beginPath();
    for (let pixel = 0; pixel <= width; pixel++) {
      const angle = pixel / width * 80;
      const intensity = Math.exp(-.5 * ((angle - state.angle) / info.sigma) ** 2);
      const x = x0 + pixel;
      const y = y0 + height - intensity * (height - 14);
      pixel ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();

    const idealX = toX(state.angle);
    const observerX = toX(state.observerAngle);
    api.line(idealX, y0, idealX, y0 + height, C.green, 2, [6, 5]);
    api.line(observerX, y0, observerX, y0 + height, C.orange, 3);
    api.text(`接收信号 ${(info.signal * 100).toFixed(1)}%`, 650, 20, info.visible ? C.teal : C.red, 13, 'right', 700);
    api.text(`峰宽 σ ${info.sigma.toFixed(1)}°`, 64, 20, C.muted, 11, 'left', 700);
    api.text('0°', x0, 204, C.muted, 10, 'center');
    api.text('40°', toX(40), 204, C.muted, 10, 'center');
    api.text('80°', x0 + width, 204, C.muted, 10, 'center');
    api.line(166, 229, 188, 229, C.green, 3, [5, 4]);
    api.text('理想反射方向', 196, 229, C.greenDark, 11, 'left', 700);
    api.line(380, 229, 402, 229, C.orange, 3);
    api.text('观察方向与接受窗口', 410, 229, C.orange, 11, 'left', 700);
    api.text('相对法线的出射角', 360, 249, C.muted, 10, 'center', 600);
  }

  function updateLiveStrip(root) {
    const state = {
      angle: value(root, 'angle', 38),
      roughness: value(root, 'roughness', 0),
      observerAngle: value(root, 'observerAngle', 38),
      acceptance: value(root, 'acceptance', 4)
    };
    const info = observerInfo(state);
    const cards = root.querySelectorAll('.rfw-live-strip article');
    if (cards.length >= 4) {
      cards[3].classList.add('is-r1-signal');
      cards[3].innerHTML = `<span>相对接收信号</span><b>${(info.signal * 100).toFixed(1)}%</b>`;
      cards[3].title = `观察方向偏差 ${info.delta.toFixed(1)}°；接受角 ±${state.acceptance.toFixed(1)}°`;
    }
  }

  function install() {
    const root = document.querySelector('.rfw-page[data-model-id="reflection-law"]');
    const mechanismCanvas = root?.querySelector('[data-module-id="mechanism"] canvas');
    const observableCanvas = root?.querySelector('[data-module-id="observable"] canvas');
    if (!root || !mechanismCanvas || !observableCanvas) return null;
    const mechanismApi = canvasAPI(mechanismCanvas);
    const observableApi = canvasAPI(observableCanvas);
    let frame = 0;

    const draw = () => {
      drawMechanism(root, mechanismApi);
      drawObservable(root, observableApi);
      updateLiveStrip(root);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => requestAnimationFrame(draw));
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

  function wait(attempt = 0) {
    const installed = install();
    if (installed) {
      cleanup = installed;
      return;
    }
    if (attempt < 40 && location.hash.includes('model:reflection-law')) requestAnimationFrame(() => wait(attempt + 1));
  }

  renderModel = function renderR1VisualRefinement(id) {
    cleanup();
    cleanup = () => {};
    const result = previousRender(id);
    if (id === 'reflection-law') requestAnimationFrame(() => wait());
    return result;
  };
  window.renderModel = renderModel;
  window.R1VisualRefinementV014 = { observerInfo };
})();
