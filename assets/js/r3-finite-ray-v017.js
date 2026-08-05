'use strict';
(() => {
  const model = window.models?.['spherical-mirror'];
  if (!model || window.R3FiniteRayV017) return;

  const C = {
    green:'#66d900', greenDark:'#4b7900', teal:'#0e7c84', orange:'#e98242',
    ink:'#0b3040', muted:'#5f777f', grey:'#96a8ac', light:'#d9e5e3',
    pale:'#f3ffdf', paleOrange:'#fff4eb', red:'#c9534d', purple:'#8066a8'
  };
  const previousRenderModel = window.renderModel;
  let cleanup = () => {};
  let frame = 0;

  const value = (root, key, fallback = 0) => {
    const node = root?.querySelector(`[data-rfw-param="${key}"]`);
    if (!node) return fallback;
    return node.tagName === 'SELECT' ? node.value : Number(node.value);
  };
  const stateOf = root => ({
    type:value(root,'type','concave'),
    f:value(root,'f',150),
    do:value(root,'do',260),
    height:value(root,'height',110),
    aperture:value(root,'aperture',.42),
    screenShift:value(root,'screenShift',0)
  });
  const mirrorResult = state => {
    const f = (state.type === 'concave' ? 1 : -1) * Math.max(1, state.f);
    const denominator = 1 / f - 1 / Math.max(1, state.do);
    const di = Math.abs(denominator) < 1e-9 ? (denominator < 0 ? -Infinity : Infinity) : 1 / denominator;
    const m = -di / Math.max(1, state.do);
    return { f, di, m, real: di > 0 && Number.isFinite(di) };
  };
  function reflect(direction, normal) {
    const dot = direction.x * normal.x + direction.y * normal.y;
    return { x:direction.x - 2 * dot * normal.x, y:direction.y - 2 * dot * normal.y };
  }
  function normalize(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x:x / length, y:y / length };
  }
  function surfacePoint(state, mirrorX, axisY, offsetY) {
    const radius = Math.max(2, 2 * state.f);
    const limited = Math.max(-radius * .88, Math.min(radius * .88, offsetY));
    const root = Math.sqrt(Math.max(0, radius * radius - limited * limited));
    const centerX = state.type === 'concave' ? mirrorX - radius : mirrorX + radius;
    const x = state.type === 'concave' ? centerX + root : centerX - root;
    const y = axisY + limited;
    return { x, y, centerX, radius, normal:normalize(x - centerX, limited) };
  }
  function traceFinite(state, geometry = {}) {
    const mirrorX = geometry.mirrorX ?? 850;
    const axisY = geometry.axisY ?? 350;
    const objectScale = geometry.objectScale ?? 1;
    const objectX = mirrorX - state.do * objectScale;
    const objectTipY = axisY - state.height * objectScale;
    const radius = Math.max(2, 2 * state.f * objectScale);
    const half = Math.min(radius * .56, radius * .58 * state.aperture);
    const fractions = [-1,-.72,-.42,0,.42,.72,1];
    const rays = fractions.map(fraction => {
      const point = surfacePoint({...state, f:state.f * objectScale}, mirrorX, axisY, fraction * half);
      const incoming = normalize(point.x - objectX, point.y - objectTipY);
      const reflected = reflect(incoming, point.normal);
      return { ...point, incoming, reflected, fraction };
    });
    const result = mirrorResult(state);
    const imageX = Number.isFinite(result.di) ? mirrorX - result.di * objectScale : null;
    const paraxialTipY = Number.isFinite(result.m) ? axisY - state.height * result.m * objectScale : null;
    const samples = [];
    if (Number.isFinite(imageX)) {
      for (const ray of rays) {
        if (Math.abs(ray.reflected.x) < 1e-8) continue;
        const t = (imageX - ray.x) / ray.reflected.x;
        samples.push(ray.y + t * ray.reflected.y);
      }
    }
    const blur = samples.length ? Math.max(...samples) - Math.min(...samples) : Infinity;
    return { mirrorX, axisY, objectX, objectTipY, imageX, paraxialTipY, rays, samples, blur, ...result };
  }
  function lineToX(api, ray, x, color, width = 3, dashed = false) {
    if (Math.abs(ray.reflected.x) < 1e-8) return;
    const t = (x - ray.x) / ray.reflected.x;
    const y = ray.y + t * ray.reflected.y;
    dashed ? api.line(ray.x, ray.y, x, y, color, width, [10,7]) : api.arrow(ray.x, ray.y, x, y, color, width);
  }
  function text(api, label, x, y, color = C.ink, size = 16, align = 'left', weight = 700) {
    api.text(label, x, y, color, size, align, weight);
  }
  function drawMirror(api, state, mirrorX, axisY, scale = 1) {
    const radius = Math.max(2, 2 * state.f * scale);
    const half = Math.min(radius * .56, radius * .58 * state.aperture);
    const ctx = api.ctx;
    ctx.save();
    ctx.beginPath();
    const samples = 80;
    for (let i = 0; i <= samples; i += 1) {
      const yOff = -half + 2 * half * i / samples;
      const point = surfacePoint({...state, f:state.f * scale}, mirrorX, axisY, yOff);
      if (i) ctx.lineTo(point.x, point.y); else ctx.moveTo(point.x, point.y);
    }
    ctx.strokeStyle = C.teal; ctx.lineWidth = 8; ctx.stroke();
    ctx.restore();
    const top = surfacePoint({...state, f:state.f * scale}, mirrorX, axisY, -half);
    const bottom = surfacePoint({...state, f:state.f * scale}, mirrorX, axisY, half);
    api.circle(top.x, top.y, 8, '#fff', C.orange, 3);
    api.circle(bottom.x, bottom.y, 8, '#fff', C.orange, 3);
  }

  function drawMain(api, state) {
    api.clear();
    const g = traceFinite(state);
    const { mirrorX:mx, axisY:axis } = g;
    api.line(46, axis, 1035, axis, '#82979d', 2, [9,7]);
    text(api, '真实反射区（镜前）', 58, 42, C.teal, 19, 'left', 800);
    text(api, '镜后只画虚延长线', 1018, 42, C.orange, 19, 'right', 800);

    drawMirror(api, state, mx, axis, 1);
    text(api, state.type === 'concave' ? '凹面球面镜' : '凸面球面镜', mx + 24, 82, C.teal, 18, 'left', 800);

    const fX = mx - g.f;
    const cX = mx - 2 * g.f;
    api.circle(fX, axis, 6, C.orange, '#fff', 2);
    api.circle(cX, axis, 6, C.purple, '#fff', 2);
    text(api, 'F', fX, axis + 28, C.orange, 18, 'center', 800);
    text(api, 'C = 2F', cX, axis + 28, C.purple, 18, 'center', 800);
    text(api, 'V', mx, axis + 30, C.teal, 18, 'center', 800);

    api.arrow(g.objectX, axis, g.objectX, g.objectTipY, C.green, 7);
    api.circle(g.objectX, g.objectTipY, 15, C.pale, C.green, 4.5);
    text(api, '拖动物体顶部', g.objectX, g.objectTipY - 34, C.greenDark, 18, 'center', 800);
    text(api, '物体', g.objectX, axis + 30, C.ink, 18, 'center', 800);

    g.rays.forEach((ray, index) => {
      const emphasized = index === 0 || index === 3 || index === g.rays.length - 1;
      api.arrow(g.objectX, g.objectTipY, ray.x, ray.y, emphasized ? C.green : 'rgba(102,217,0,.42)', emphasized ? 3.8 : 2.2);
      const targetX = ray.reflected.x < 0 ? 62 : 1030;
      lineToX(api, ray, targetX, emphasized ? C.teal : 'rgba(14,124,132,.42)', emphasized ? 3.8 : 2.2);
      if (!g.real && Number.isFinite(g.imageX)) lineToX(api, ray, g.imageX, C.grey, 2, true);
    });

    if (Number.isFinite(g.imageX) && Number.isFinite(g.paraxialTipY)) {
      const imageColor = g.real ? C.orange : C.grey;
      api.arrow(g.imageX, axis, g.imageX, g.paraxialTipY, imageColor, g.real ? 6 : 4);
      api.circle(g.imageX, g.paraxialTipY, 12, '#fff', imageColor, 3.5);
      text(api, g.real ? '近轴实像位置' : '近轴虚像位置', g.imageX, g.paraxialTipY - 30, imageColor, 18, 'center', 800);
    }

    const statusX = 842, statusY = 118;
    const nearFocus = Math.abs(state.do - state.f) < 5;
    const good = Number.isFinite(g.blur) && g.blur < 8;
    api.rect(statusX - 178, statusY - 48, 356, 132, good ? C.pale : C.paleOrange, good ? C.green : C.orange, 16);
    text(api, nearFocus ? '物体接近焦点：像距趋于无穷' : good ? '近轴像与有限光束基本一致' : '有限口径产生可见球差', statusX, statusY - 15, nearFocus ? C.red : good ? C.greenDark : '#9a4d20', 22, 'center', 800);
    text(api, `镜方程像距 dᵢ = ${Number.isFinite(g.di) ? g.di.toFixed(1) : '∞'} px`, statusX, statusY + 24, C.ink, 17, 'center', 800);
    text(api, `理论像面光斑高度 ≈ ${Number.isFinite(g.blur) ? g.blur.toFixed(2) : '—'} px`, statusX, statusY + 56, C.muted, 16, 'center', 700);

    text(api, '实线：有限物点发出的真实光线；灰色虚线：虚像反向延长', 540, 621, C.muted, 16, 'center', 700);
    text(api, '增大有效口径后，边缘光线与近轴光线不再严格同焦', 540, 650, C.muted, 16, 'center', 700);
  }

  function drawMechanism(api, state) {
    api.clear();
    const scale = .58;
    const mirrorX = 610, axisY = 132;
    const g = traceFinite(state, { mirrorX, axisY, objectScale:scale });
    text(api, '有限物点的精确球面反射', 34, 24, C.teal, 18, 'left', 800);
    text(api, '局部法线始终指向曲率中心', 686, 24, C.purple, 18, 'right', 800);
    api.line(28, axisY, 692, axisY, '#91a3a8', 1.5, [8,6]);
    drawMirror(api, state, mirrorX, axisY, scale);
    api.circle(g.objectX, g.objectTipY, 9, C.pale, C.green, 3);
    text(api, '物点', g.objectX, g.objectTipY - 20, C.greenDark, 16, 'center', 800);
    g.rays.forEach((ray, index) => {
      api.arrow(g.objectX, g.objectTipY, ray.x, ray.y, index % 3 === 0 ? C.green : 'rgba(102,217,0,.36)', index % 3 === 0 ? 2.8 : 1.7);
      lineToX(api, ray, 34, index % 3 === 0 ? C.teal : 'rgba(14,124,132,.36)', index % 3 === 0 ? 2.8 : 1.7);
      if (index === 0 || index === g.rays.length - 1) {
        api.line(ray.x, ray.y, ray.centerX, axisY, C.purple, 1.4, [6,5]);
      }
    });
    const label = g.blur < 8 ? '小口径：精确光束接近近轴像点' : `大口径：理论像面光斑约 ${g.blur.toFixed(2)} px`;
    text(api, label, 360, 232, g.blur < 8 ? C.teal : C.orange, 17, 'center', 800);
  }

  function drawObservable(api, state) {
    api.clear();
    const out = mirrorResult(state);
    const x0 = 72, x1 = 660, y = 116;
    text(api, '物距跨越 F 与 2F 的连续成像地图', 34, 24, C.teal, 18, 'left', 800);
    text(api, state.type === 'convex' ? '凸面镜始终形成缩小正立虚像' : '凹面镜区域由物距决定', 686, 24, C.orange, 18, 'right', 800);
    api.line(x0, y, x1, y, C.ink, 4);
    if (state.type === 'concave') {
      const F = x0 + 190, twoF = x0 + 380;
      api.line(x0, y - 32, F, y - 32, C.orange, 7);
      api.line(F, y - 32, twoF, y - 32, C.green, 7);
      api.line(twoF, y - 32, x1, y - 32, C.teal, 7);
      text(api, '放大正立虚像', (x0 + F) / 2, y - 54, C.orange, 16, 'center', 800);
      text(api, '放大倒立实像', (F + twoF) / 2, y - 54, C.greenDark, 16, 'center', 800);
      text(api, '缩小倒立实像', (twoF + x1) / 2, y - 54, C.teal, 16, 'center', 800);
      api.circle(F, y, 7, C.orange, '#fff', 2);
      api.circle(twoF, y, 7, C.purple, '#fff', 2);
      text(api, 'F', F, y + 25, C.orange, 17, 'center', 800);
      text(api, '2F', twoF, y + 25, C.purple, 17, 'center', 800);
      const px = Math.max(x0, Math.min(x1, x0 + state.do / state.f * 190));
      api.circle(px, y, 11, C.green, '#fff', 3);
      text(api, '当前物距', px, y + 49, C.greenDark, 16, 'center', 800);
    } else {
      api.line(x0, y - 24, x1, y - 24, C.teal, 8);
      text(api, '所有正物距', 360, y - 50, C.teal, 17, 'center', 800);
      api.circle(250, y, 11, C.green, '#fff', 3);
      text(api, '当前物体', 250, y + 30, C.greenDark, 16, 'center', 800);
    }
    const nature = state.type === 'convex' ? '缩小 · 正立 · 虚像' : out.real ? `${Math.abs(out.m) > 1.02 ? '放大' : Math.abs(out.m) < .98 ? '缩小' : '等大'} · 倒立 · 实像` : '放大 · 正立 · 虚像';
    api.rect(170, 180, 380, 54, out.real ? '#eef8f6' : C.paleOrange, out.real ? C.teal : C.orange, 14);
    text(api, nature, 360, 207, out.real ? C.teal : C.orange, 20, 'center', 800);
  }

  function drawApparatus(api, state) {
    api.clear();
    const out = mirrorResult(state);
    const g = traceFinite(state, { mirrorX:610, axisY:138, objectScale:.52 });
    text(api, '光具座：屏幕只接收真实会聚光', 34, 24, C.teal, 18, 'left', 800);
    text(api, '移动屏幕寻找最小光斑', 686, 24, C.orange, 18, 'right', 800);
    api.line(34, 138, 690, 138, '#82979d', 2);
    api.arrow(g.objectX, 138, g.objectX, g.objectTipY, C.green, 5);
    drawMirror(api, state, 610, 138, .52);
    if (out.real && Number.isFinite(g.imageX)) {
      const screenX = g.imageX - state.screenShift * .52;
      api.line(screenX, 54, screenX, 218, C.ink, 7);
      text(api, '屏幕', screenX, 40, C.ink, 16, 'center', 800);
      api.line(g.imageX, 66, g.imageX, 210, C.orange, 2.5, [7,5]);
      text(api, '近轴像面', g.imageX, 230, C.orange, 16, 'center', 800);
      const blur = Math.hypot(g.blur, Math.abs(state.screenShift) * .18);
      text(api, `当前离焦/像差尺度 ≈ ${blur.toFixed(1)} px`, 350, 232, blur < 10 ? C.teal : C.orange, 17, 'center', 800);
    } else {
      api.rect(180, 176, 360, 54, C.paleOrange, C.orange, 14);
      text(api, '虚像：镜前屏幕没有真实会聚位置', 360, 203, C.orange, 18, 'center', 800);
    }
  }

  function redraw(root) {
    if (!root?.isConnected) return;
    const state = stateOf(root);
    const main = root.querySelector('#rfwMainCanvas');
    if (main) drawMain(window.canvasAPI(main), state);
    const mechanism = root.querySelector('[data-module-id="mechanism"] canvas');
    if (mechanism) drawMechanism(window.canvasAPI(mechanism), state);
    const observable = root.querySelector('[data-module-id="observable"] canvas');
    if (observable) drawObservable(window.canvasAPI(observable), state);
    const apparatus = root.querySelector('[data-module-id="apparatus"] canvas');
    if (apparatus) drawApparatus(window.canvasAPI(apparatus), state);
    root.dataset.r3Blur = String(traceFinite(state).blur);
  }
  function schedule(root) {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => requestAnimationFrame(() => redraw(root)));
  }
  function mount() {
    cleanup();
    const root = document.querySelector('.rfw-page[data-model-id="spherical-mirror"]');
    if (!root) return;
    document.querySelector('.app')?.classList.add('r3-v017-active');
    root.dataset.legibilityVersion = '017';
    const observer = new MutationObserver(records => {
      if (records.some(record => record.type === 'attributes' && record.attributeName === 'data-render-revision')) schedule(root);
    });
    observer.observe(root, { attributes:true, attributeFilter:['data-render-revision'] });
    const resize = () => schedule(root);
    window.addEventListener('resize', resize, { passive:true });
    schedule(root);
    cleanup = () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      document.querySelector('.app')?.classList.remove('r3-v017-active');
      cancelAnimationFrame(frame);
    };
  }

  window.renderModel = function renderWithR3V017(id) {
    cleanup();
    previousRenderModel(id);
    if (id === 'spherical-mirror') setTimeout(mount, 0);
  };
  window.R3FiniteRayV017 = {
    version:'0.17.0',
    mirrorResult,
    traceFinite,
    getState:() => stateOf(document.querySelector('.rfw-page[data-model-id="spherical-mirror"]'))
  };
})();
