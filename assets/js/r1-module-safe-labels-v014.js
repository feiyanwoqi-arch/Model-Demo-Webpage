'use strict';
(() => {
  const previousRender = renderModel;
  let cleanup = () => {};

  const C = {
    green: '#66d900', greenDark: '#4b7900', teal: '#0e7c84', orange: '#e98242',
    ink: '#0b3040', muted: '#66808a', normal: '#82979d', surface: '#6e858a', red: '#c9534d'
  };

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
    return { sigma, signal, visible: delta <= state.acceptance + sigma * .35 };
  };

  function drawMechanism(root, api) {
    const state = { angle: value(root, 'angle', 38), roughness: value(root, 'roughness', 0) };
    api.clear();
    api.text(`同一全局入射方向 · θᵢ ${state.angle.toFixed(1)}°`, 48, 24, C.greenDark, 12, 'left', 700);
    api.text('局部法线不同 → 出射方向不同', 672, 24, C.teal, 12, 'right', 700);
    const incoming = { x: Math.sin(rad(state.angle)), y: Math.cos(rad(state.angle)) };

    [135, 360, 585].forEach((x, index) => {
      const tilt = state.roughness * (.35 * Math.sin(x * .041) + .18 * Math.cos(x * .079));
      const y = 134 + 10 * state.roughness * Math.sin(x * .055);
      const tangent = { x: Math.cos(tilt), y: Math.sin(tilt) };
      const normal = { x: Math.sin(tilt), y: -Math.cos(tilt) };
      const reflected = reflect(incoming, normal);
      api.line(x - 60 * tangent.x, y - 60 * tangent.y, x + 60 * tangent.x, y + 60 * tangent.y, C.surface, 5);
      api.line(x - 26 * normal.x, y - 26 * normal.y, x + 72 * normal.x, y + 72 * normal.y, C.normal, 1.5, [6, 5]);
      api.arrow(x - 88 * incoming.x, y - 88 * incoming.y, x, y, C.green, 3.2);
      api.arrow(x, y, x + 88 * reflected.x, y + 88 * reflected.y, C.teal, 3.2);
      api.circle(x, y, 4, '#fff', C.ink, 1.5);
      api.text(`面元 ${index + 1}`, x, 202, C.ink, 12, 'center', 700);
    });
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
    const x0 = 62, y0 = 32, width = 596, height = 146;
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
    api.text(`峰宽 σ ${info.sigma.toFixed(1)}°`, 64, 18, C.muted, 11, 'left', 700);
    api.text('横轴：相对法线的出射角', 360, 18, C.muted, 10, 'center', 600);
    api.text(`接收信号 ${(info.signal * 100).toFixed(1)}%`, 650, 18, info.visible ? C.teal : C.red, 13, 'right', 700);
    api.text('0°', x0, 195, C.muted, 10, 'center');
    api.text('40°', toX(40), 195, C.muted, 10, 'center');
    api.text('80°', x0 + width, 195, C.muted, 10, 'center');
    api.line(150, 217, 172, 217, C.green, 3, [5, 4]);
    api.text('理想反射方向', 180, 217, C.greenDark, 11, 'left', 700);
    api.line(374, 217, 396, 217, C.orange, 3);
    api.text('观察方向与接受窗口', 404, 217, C.orange, 11, 'left', 700);
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
      window.removeEventListener('resize', schedule);
    };
  }

  function wait(attempt = 0) {
    const installed = install();
    if (installed) {
      cleanup = installed;
      return;
    }
    if (attempt < 50 && location.hash.includes('model:reflection-law')) requestAnimationFrame(() => wait(attempt + 1));
  }

  renderModel = function renderR1SafeModuleLabels(id) {
    cleanup();
    cleanup = () => {};
    const result = previousRender(id);
    if (id === 'reflection-law') requestAnimationFrame(() => wait());
    return result;
  };
  window.renderModel = renderModel;
})();
