'use strict';
(() => {
  const model = window.models?.['spherical-mirror'];
  if (!model || window.R3FiniteRayV017) return;

  const C = {
    green:'#66d900', greenDark:'#4b7900', teal:'#0e7c84', orange:'#e98242',
    ink:'#0b3040', muted:'#5f777f', grey:'#96a8ac', light:'#d9e5e3',
    pale:'#f3ffdf', paleOrange:'#fff4eb', red:'#c9534d', purple:'#8066a8',
    paper:'#ffffff', panel:'#f7fbfa'
  };
  const previousRenderModel = window.renderModel;
  const MAIN = { mirrorX:820, axisY:360, objectScale:1 };
  let cleanup = () => {};
  let frame = 0;

  model.canvasTitle = '近轴成像与有限口径光束';
  model.canvasSub = '粗线定位成像关系，淡线显示有限口径光束偏离近轴像点';
  model.legend = [['入射光束', C.green], ['反射光束', C.teal], ['虚像延长线', C.grey]];
  model.dragHint = '拖动物体顶部：左右改变物距，上下改变物高。';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
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
  function normalize(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x:x / length, y:y / length };
  }
  function reflect(direction, normal) {
    const dot = direction.x * normal.x + direction.y * normal.y;
    return normalize(direction.x - 2 * dot * normal.x, direction.y - 2 * dot * normal.y);
  }
  function surfacePoint(state, mirrorX, axisY, offsetY) {
    const radius = Math.max(2, 2 * state.f);
    const limited = clamp(offsetY, -radius * .88, radius * .88);
    const root = Math.sqrt(Math.max(0, radius * radius - limited * limited));
    const centerX = state.type === 'concave' ? mirrorX - radius : mirrorX + radius;
    const x = state.type === 'concave' ? centerX + root : centerX - root;
    const y = axisY + limited;
    return { x, y, centerX, radius, normal:normalize(x - centerX, limited) };
  }
  function traceFinite(state, geometry = {}) {
    const mirrorX = geometry.mirrorX ?? MAIN.mirrorX;
    const axisY = geometry.axisY ?? MAIN.axisY;
    const objectScale = geometry.objectScale ?? MAIN.objectScale;
    const objectX = mirrorX - state.do * objectScale;
    const objectTipY = axisY - state.height * objectScale;
    const radius = Math.max(2, 2 * state.f * objectScale);
    const half = Math.min(radius * .54, radius * .58 * state.aperture);
    const fractions = [-1,-.66,-.33,0,.33,.66,1];
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
  function pointOnRay(ray, x) {
    if (Math.abs(ray.reflected.x) < 1e-8) return null;
    const t = (x - ray.x) / ray.reflected.x;
    return { x, y:ray.y + t * ray.reflected.y };
  }
  function drawRayToX(api, ray, x, color, width = 3, dashed = false) {
    const target = pointOnRay(ray, x);
    if (!target) return;
    if (dashed) api.line(ray.x, ray.y, target.x, target.y, color, width, [9,7]);
    else api.arrow(ray.x, ray.y, target.x, target.y, color, width);
  }
  function text(api, label, x, y, color = C.ink, size = 16, align = 'left', weight = 700) {
    api.text(label, x, y, color, size, align, weight);
  }
  function drawMirror(api, state, mirrorX, axisY, scale = 1, showHandles = true) {
    const radius = Math.max(2, 2 * state.f * scale);
    const half = Math.min(radius * .54, radius * .58 * state.aperture);
    const ctx = api.ctx;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= 80; i += 1) {
      const yOff = -half + 2 * half * i / 80;
      const point = surfacePoint({...state, f:state.f * scale}, mirrorX, axisY, yOff);
      if (i) ctx.lineTo(point.x, point.y); else ctx.moveTo(point.x, point.y);
    }
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();
    if (showHandles) {
      const top = surfacePoint({...state, f:state.f * scale}, mirrorX, axisY, -half);
      const bottom = surfacePoint({...state, f:state.f * scale}, mirrorX, axisY, half);
      api.circle(top.x, top.y, 7, '#fff', C.orange, 3);
      api.circle(bottom.x, bottom.y, 7, '#fff', C.orange, 3);
    }
  }
  function statusFor(state, g) {
    if (Math.abs(state.do - state.f) < 5) {
      return { title:'焦点附近：像距迅速增大', type:'warn', fill:C.paleOrange, stroke:C.orange, color:'#9a4d20' };
    }
    if (!Number.isFinite(g.blur)) {
      return { title:'当前状态无法定义有限像面', type:'warn', fill:C.paleOrange, stroke:C.orange, color:'#9a4d20' };
    }
    if (g.blur < 8) return { title:'近轴近似良好', type:'ok', fill:C.pale, stroke:C.green, color:C.greenDark };
    if (g.blur < 28) return { title:'有限口径已出现偏差', type:'warn', fill:'#fff9ef', stroke:'#e5a55b', color:'#8b5d24' };
    return { title:'球差明显：边缘光线不同焦', type:'bad', fill:C.paleOrange, stroke:C.orange, color:'#9a4d20' };
  }

  function drawMain(api, state) {
    api.clear();
    const g = traceFinite(state, MAIN);
    const { mirrorX:mx, axisY:axis } = g;
    api.line(54, axis, 1030, axis, '#82979d', 2, [9,7]);

    const status = statusFor(state, g);
    api.rect(54, 52, 338, 104, status.fill, status.stroke, 15);
    text(api, status.title, 73, 80, status.color, 18, 'left', 800);
    text(api, `近轴像距  dᵢ = ${Number.isFinite(g.di) ? g.di.toFixed(1) : '∞'} px`, 73, 112, C.ink, 14, 'left', 800);
    text(api, `理论像面光斑  ${Number.isFinite(g.blur) ? g.blur.toFixed(2) : '—'} px`, 73, 138, C.muted, 14, 'left', 700);

    drawMirror(api, state, mx, axis, 1, true);
    const mirrorHalf = Math.min(2 * state.f * .54, 2 * state.f * .58 * state.aperture);
    text(api, state.type === 'concave' ? '凹面球面镜' : '凸面球面镜', mx + 22, axis - mirrorHalf - 24, C.teal, 16, 'left', 800);
    text(api, '镜前：真实传播', mx - 20, 52, C.teal, 14, 'right', 800);
    text(api, '镜后：仅画虚像延长线', mx + 18, 52, C.orange, 14, 'left', 800);

    const fX = mx - g.f;
    const cX = mx - 2 * g.f;
    api.circle(fX, axis, 5, C.orange, '#fff', 2);
    api.circle(cX, axis, 5, C.purple, '#fff', 2);
    text(api, 'F', fX, axis + 24, C.orange, 15, 'center', 800);
    text(api, 'C=2F', cX, axis + 24, C.purple, 15, 'center', 800);
    text(api, 'V', mx, axis + 24, C.teal, 15, 'center', 800);

    api.arrow(g.objectX, axis, g.objectX, g.objectTipY, C.green, 6);
    api.circle(g.objectX, g.objectTipY, 13, C.pale, C.green, 4);
    text(api, '拖动', g.objectX, g.objectTipY - 27, C.greenDark, 15, 'center', 800);
    text(api, '物体', g.objectX + 18, axis + 27, C.ink, 15, 'left', 800);

    const visibleIndices = new Set([0,2,3,4,6]);
    g.rays.forEach((ray, index) => {
      if (!visibleIndices.has(index)) return;
      const emphasized = index === 0 || index === 3 || index === 6;
      const incomingColor = emphasized ? C.green : 'rgba(102,217,0,.30)';
      const reflectedColor = emphasized ? C.teal : 'rgba(14,124,132,.30)';
      api.arrow(g.objectX, g.objectTipY, ray.x, ray.y, incomingColor, emphasized ? 3.4 : 1.7);
      let targetX = 70;
      if (g.real && Number.isFinite(g.imageX)) targetX = clamp(g.imageX - 105, 64, g.objectX - 55);
      drawRayToX(api, ray, targetX, reflectedColor, emphasized ? 3.4 : 1.7);
      if (!g.real && Number.isFinite(g.imageX) && g.imageX > ray.x) {
        drawRayToX(api, ray, clamp(g.imageX, ray.x + 20, 1032), C.grey, emphasized ? 2 : 1.2, true);
      }
    });

    if (Number.isFinite(g.imageX) && Number.isFinite(g.paraxialTipY) && g.imageX > 46 && g.imageX < 1034 && Math.abs(g.paraxialTipY - axis) < 260) {
      if (g.real) {
        api.arrow(g.imageX, axis, g.imageX, g.paraxialTipY, C.orange, 5);
        api.circle(g.imageX, g.paraxialTipY, 10, '#fff', C.orange, 3);
      } else {
        api.line(g.imageX, axis, g.imageX, g.paraxialTipY, C.grey, 4, [8,6]);
        api.circle(g.imageX, g.paraxialTipY, 10, '#fff', C.grey, 3);
      }
      const align = g.imageX < 180 ? 'left' : g.imageX > 900 ? 'right' : 'center';
      const labelX = align === 'left' ? g.imageX + 16 : align === 'right' ? g.imageX - 16 : g.imageX;
      const labelY = g.paraxialTipY + (g.paraxialTipY > axis ? 28 : -28);
      text(api, g.real ? '近轴实像' : '近轴虚像', labelX, labelY, g.real ? C.orange : C.grey, 15, align, 800);
    }

    api.rect(254, 618, 572, 36, 'rgba(255,255,255,.88)', '#d9e5e3', 11);
    text(api, '粗线：代表光线　淡线：有限口径采样　虚线：仅用于虚像反向定位', 540, 636, C.muted, 13, 'center', 700);
  }

  function drawMechanism(api, state) {
    api.clear();
    const g = traceFinite(state, MAIN);
    const ray = g.rays[g.rays.length - 1];
    text(api, '一个入射点的局部反射', 26, 24, C.teal, 16, 'left', 800);
    text(api, '像面上的有限口径离散', 694, 24, C.orange, 16, 'right', 800);

    api.rect(20, 48, 390, 190, C.paper, '#dce8e6', 12);
    const hit = { x:285, y:138 };
    const incomingStart = { x:hit.x - ray.incoming.x * 175, y:hit.y - ray.incoming.y * 175 };
    const reflectedEnd = { x:hit.x + ray.reflected.x * 175, y:hit.y + ray.reflected.y * 175 };
    api.arrow(incomingStart.x, incomingStart.y, hit.x, hit.y, C.green, 4);
    api.arrow(hit.x, hit.y, reflectedEnd.x, reflectedEnd.y, C.teal, 4);
    api.line(hit.x - ray.normal.x * 85, hit.y - ray.normal.y * 85, hit.x + ray.normal.x * 85, hit.y + ray.normal.y * 85, C.purple, 2, [7,5]);
    api.circle(hit.x, hit.y, 7, '#fff', C.orange, 3);
    text(api, '入射光', incomingStart.x + 10, incomingStart.y - 12, C.greenDark, 13, 'left', 800);
    text(api, '反射光', reflectedEnd.x - 8, reflectedEnd.y + 14, C.teal, 13, 'right', 800);
    text(api, '局部法线', hit.x + ray.normal.x * 70, hit.y + ray.normal.y * 70 - 12, C.purple, 13, 'center', 800);
    text(api, '法线由入射点指向曲率中心；反射方向由向量反射式唯一确定。', 215, 219, C.muted, 12, 'center', 700);

    api.rect(430, 48, 270, 190, C.paper, '#dce8e6', 12);
    const planeX = 555;
    api.line(planeX, 68, planeX, 218, C.orange, 3, [7,5]);
    text(api, '近轴像面', planeX, 59, C.orange, 13, 'center', 800);
    const centerY = 143;
    const deltas = g.samples.map(sample => sample - g.paraxialTipY);
    const span = deltas.length ? Math.max(1, Math.max(...deltas) - Math.min(...deltas)) : 1;
    const scaleY = Math.min(3.2, 118 / span);
    const ys = deltas.map(delta => centerY + delta * scaleY);
    ys.forEach((y, index) => api.circle(planeX, clamp(y, 76, 210), index === 3 ? 6 : 4, index === 3 ? C.teal : '#8fcfd0', '#fff', 1.5));
    const top = ys.length ? clamp(Math.min(...ys), 76, 210) : centerY;
    const bottom = ys.length ? clamp(Math.max(...ys), 76, 210) : centerY;
    api.line(618, top, 618, bottom, C.orange, 3);
    api.line(611, top, 625, top, C.orange, 2);
    api.line(611, bottom, 625, bottom, C.orange, 2);
    text(api, `${Number.isFinite(g.blur) ? g.blur.toFixed(1) : '—'} px`, 638, (top + bottom) / 2, C.orange, 14, 'left', 800);
    text(api, g.blur < 8 ? '接近同焦' : '边缘与近轴不同焦', 565, 225, g.blur < 8 ? C.greenDark : '#9a4d20', 13, 'center', 800);
  }

  function drawObservable(api, state) {
    api.clear();
    const out = mirrorResult(state);
    const x0 = 58, x1 = 662, y = 132;
    const mapRatio = ratio => x0 + (x1 - x0) * ratio / (ratio + 1.35);
    text(api, '成像性质由物距比 u/f 决定', 26, 24, C.teal, 16, 'left', 800);
    text(api, `当前 u/f = ${(state.do / state.f).toFixed(2)}`, 694, 24, C.greenDark, 15, 'right', 800);

    if (state.type === 'concave') {
      const F = mapRatio(1), twoF = mapRatio(2), current = mapRatio(state.do / state.f);
      api.line(x0, y - 34, F, y - 34, C.orange, 7);
      api.line(F, y - 34, twoF, y - 34, C.green, 7);
      api.line(twoF, y - 34, x1, y - 34, C.teal, 7);
      text(api, 'u<f：正立虚像', (x0 + F) / 2, y - 58, C.orange, 13, 'center', 800);
      text(api, 'f<u<2f：放大实像', (F + twoF) / 2, y - 58, C.greenDark, 13, 'center', 800);
      text(api, 'u>2f：缩小实像', (twoF + x1) / 2, y - 58, C.teal, 13, 'center', 800);
      api.line(x0, y, x1, y, C.ink, 3);
      api.circle(F, y, 6, C.orange, '#fff', 2);
      api.circle(twoF, y, 6, C.purple, '#fff', 2);
      text(api, 'F', F, y + 22, C.orange, 14, 'center', 800);
      text(api, '2F', twoF, y + 22, C.purple, 14, 'center', 800);
      api.circle(current, y, 10, C.green, '#fff', 3);
      text(api, '当前', current, y + 44, C.greenDark, 13, 'center', 800);
    } else {
      api.line(x0, y - 28, x1, y - 28, C.teal, 8);
      text(api, '凸面镜：所有正物距均为缩小、正立、虚像', 360, y - 54, C.teal, 14, 'center', 800);
      api.line(x0, y, x1, y, C.ink, 3);
      api.circle(mapRatio(state.do / state.f), y, 10, C.green, '#fff', 3);
    }

    const nature = state.type === 'convex'
      ? '缩小 · 正立 · 虚像'
      : out.real
        ? `${Math.abs(out.m) > 1.02 ? '放大' : Math.abs(out.m) < .98 ? '缩小' : '等大'} · 倒立 · 实像`
        : '放大 · 正立 · 虚像';
    api.rect(170, 190, 380, 48, out.real ? '#eef8f6' : C.paleOrange, out.real ? C.teal : C.orange, 13);
    text(api, nature, 360, 214, out.real ? C.teal : C.orange, 18, 'center', 800);
  }

  function drawApparatus(api, state) {
    api.clear();
    const out = mirrorResult(state);
    const g = traceFinite(state, { mirrorX:610, axisY:132, objectScale:.50 });
    text(api, '屏幕检验：只有实像能够被接收', 26, 24, C.teal, 16, 'left', 800);
    text(api, '移动屏幕寻找最小光斑', 694, 24, C.orange, 15, 'right', 800);
    api.line(34, 132, 690, 132, '#82979d', 2);
    api.arrow(g.objectX, 132, g.objectX, g.objectTipY, C.green, 4.5);
    drawMirror(api, state, 610, 132, .50, false);
    if (out.real && Number.isFinite(g.imageX)) {
      const screenX = g.imageX - state.screenShift * .50;
      api.line(screenX, 58, screenX, 212, C.ink, 6);
      text(api, '屏幕', screenX, 44, C.ink, 14, 'center', 800);
      api.line(g.imageX, 66, g.imageX, 205, C.orange, 2, [7,5]);
      text(api, '近轴像面', g.imageX, 224, C.orange, 13, 'center', 800);
      const blur = Math.hypot(g.blur, Math.abs(state.screenShift) * .18);
      api.rect(442, 178, 240, 50, blur < 10 ? C.pale : C.paleOrange, blur < 10 ? C.green : C.orange, 12);
      text(api, `离焦/像差 ≈ ${blur.toFixed(1)} px`, 562, 203, blur < 10 ? C.greenDark : '#9a4d20', 14, 'center', 800);
    } else {
      api.rect(250, 178, 360, 50, C.paleOrange, C.orange, 12);
      text(api, '虚像：镜前屏幕没有真实会聚位置', 430, 203, C.orange, 15, 'center', 800);
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
    root.dataset.r3Blur = String(traceFinite(state, MAIN).blur);
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
    root.dataset.legibilityVersion = '018';
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
    version:'0.18.0',
    geometry:MAIN,
    mirrorResult,
    traceFinite,
    getState:() => stateOf(document.querySelector('.rfw-page[data-model-id="spherical-mirror"]'))
  };
})();
