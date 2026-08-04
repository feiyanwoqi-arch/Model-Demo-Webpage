'use strict';
(() => {
  const previousRender = renderModel;
  const upgraded = new Set(['reflection-law', 'plane-mirror', 'spherical-mirror']);
  const C = {
    green: '#7bea00', teal: '#0e7c84', orange: '#f59e57', purple: '#8066a8',
    ink: '#0b3040', muted: '#66808a', grid: '#d7e5e3', pale: '#efffdc', red: '#c9534d'
  };
  const MAX_ACTIVE = 2;
  let destroyCurrent = () => {};
  let renderToken = 0;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const tex = (value, display = false) => display
    ? `<div class="rfw-equation">\\[${value}\\]</div>`
    : `<span class="rfw-inline-math">\\(${value}\\)</span>`;

  function typeset(root) {
    const run = () => window.MathJax?.typesetPromise?.([root]).catch(() => {});
    if (window.MathJax?.startup?.promise) MathJax.startup.promise.then(run);
    else setTimeout(run, 80);
  }

  function localReflection(incoming, normal) {
    const dot = incoming.x * normal.x + incoming.y * normal.y;
    return {
      x: incoming.x - 2 * dot * normal.x,
      y: incoming.y - 2 * dot * normal.y
    };
  }

  function r1Observer(state) {
    const sigma = 1.8 + 18 * state.roughness;
    const delta = Math.abs(state.observerAngle - state.angle);
    const signal = Math.exp(-0.5 * (delta / sigma) ** 2);
    return { sigma, delta, signal, visible: delta <= state.acceptance + sigma * 0.35 };
  }

  function planeVisibility(state) {
    const mirrorX = 600;
    const imageX = mirrorX + state.distance;
    const base = 545;
    const eye = { x: 145, y: state.observerY };
    const intersect = yImage => {
      const t = (mirrorX - eye.x) / Math.max(1, imageX - eye.x);
      return eye.y + t * (yImage - eye.y);
    };
    const yTop = intersect(base - state.height);
    const yBottom = intersect(base);
    const requiredTop = Math.min(yTop, yBottom);
    const requiredBottom = Math.max(yTop, yBottom);
    const activeTop = 320 - state.mirrorHeight / 2;
    const activeBottom = 320 + state.mirrorHeight / 2;
    return {
      yTop, yBottom, requiredTop, requiredBottom, activeTop, activeBottom,
      requiredHeight: requiredBottom - requiredTop,
      fullVisible: requiredTop >= activeTop && requiredBottom <= activeBottom
    };
  }

  function sphericalBundle(state) {
    const R = Math.max(1, 2 * state.f);
    const maxY = Math.min(R * 0.62, R * 0.58 * state.aperture);
    const offsets = [-1, -.72, -.42, .42, .72, 1].map(k => k * maxY);
    const rays = [];
    const crossings = [];
    for (const y of offsets) {
      const root = Math.sqrt(Math.max(0, R * R - y * y));
      let x;
      let normal;
      if (state.type === 'concave') {
        x = -R + root;
        normal = { x: root / R, y: y / R };
      } else {
        x = R - root;
        normal = { x: -root / R, y: y / R };
      }
      const reflected = localReflection({ x: 1, y: 0 }, normal);
      const t = Math.abs(reflected.y) > 1e-8 ? -y / reflected.y : NaN;
      const crossing = Number.isFinite(t) ? x + t * reflected.x : NaN;
      if (Number.isFinite(crossing)) crossings.push(crossing);
      rays.push({ x, y, reflected, crossing });
    }
    const mean = crossings.reduce((sum, value) => sum + value, 0) / Math.max(1, crossings.length);
    const spread = crossings.length ? Math.max(...crossings) - Math.min(...crossings) : 0;
    return { R, rays, crossings, mean, spread };
  }

  const modelConfigs = {
    'reflection-law': {
      version: 'R1 · v1.0',
      question: '一个边界点怎样把入射方向映射成反射方向？粗糙表面为什么仍服从同一局部规律？',
      core: '局部法线 → 方向镜像 → 法线分布 → 角分布 → 观察者接收',
      defaultModules: ['mechanism', 'observable'],
      extraDefaults: { observerAngle: 38, acceptance: 4 },
      extraParams: [
        { key: 'observerAngle', label: '观察方向（相对法线）', min: 0, max: 80, step: .5, format: v => `${Number(v).toFixed(1)}°` },
        { key: 'acceptance', label: '观察者角接受宽度', min: 1, max: 12, step: .5, format: v => `${Number(v).toFixed(1)}°` }
      ],
      labels: { roughness: '局部法线离散度（几何示意）', rays: '采样光线数量' },
      primaryPurpose: '直接拖动入射光源，先验证单个入射点处的方向镜像，再把同一规律推广到一组具有不同局部法线的微面元。',
      primaryRole: '这是不可隐藏的物理本体；所有装置图、微表面图和角分布都读取同一入射角与法线分布。',
      primaryAction: '先令法线离散度为 0，拖动光源；再保持入射角不变增加离散度，并拖动观察者比较接收到的信号。',
      presets: {
        mechanism: ['mechanism', 'observable'], apparatus: ['apparatus', 'observable'], proof: ['derivation', 'validation']
      },
      modules: [
        {
          id: 'apparatus', group: '现实实验', title: '角分辨反射实验', sub: '激光、转台样品和扫描探测器',
          purpose: '回答现实中怎样测量反射方向和反射角分布。', role: '把“画出的反射线”转化为探测器随角度扫描得到的信号。', action: '改变入射角和法线离散度，比较反射峰位置与宽度。',
          draw(a, s) {
            a.clear();
            const cx = 270, cy = 160, angle = rad(s.angle);
            const sx = cx - 175 * Math.sin(angle), sy = cy - 175 * Math.cos(angle);
            const dx = cx + 135 * Math.sin(angle), dy = cy - 135 * Math.cos(angle);
            a.circle(cx, cy, 24, '#eaf6f4', C.teal, 2);
            a.text('样品', cx, cy, C.ink, 11, 'center');
            a.arrow(sx, sy, cx, cy, C.green, 4);
            a.text('准直激光', sx, sy - 17, C.ink, 10, 'center');
            a.arrow(cx, cy, dx, dy, C.teal, 4);
            a.circle(dx, dy, 14, '#fff4eb', C.orange, 3);
            a.text('扫描探测器', dx, dy - 22, C.orange, 10, 'center');
            a.line(cx, 30, cx, 230, '#9aaeb1', 1, [5, 4]);
            const x0 = 455, y0 = 38, w = 220, h = 170;
            a.line(x0, y0 + h, x0 + w, y0 + h, '#8da2a6', 1.2);
            a.line(x0, y0, x0, y0 + h, '#8da2a6', 1.2);
            const ctx = a.ctx;
            const sigma = 4 + 38 * s.roughness;
            ctx.save(); ctx.beginPath();
            for (let i = 0; i <= w; i++) {
              const d = (i / w * 100 - 50);
              const value = Math.exp(-0.5 * (d / sigma) ** 2);
              const x = x0 + i, y = y0 + h - value * (h - 20);
              i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.strokeStyle = C.orange; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
            a.text('探测角偏差', x0 + w / 2, y0 + h + 22, C.muted, 10, 'center');
            a.text(s.roughness < .12 ? '镜面窄峰' : '法线分布使反射峰展宽', x0 + w / 2, 22, C.teal, 11, 'center', 700);
          }
        },
        {
          id: 'mechanism', group: '局部机制', title: '微表面局部法线', sub: '每个面元独立满足反射定律',
          purpose: '解释漫反射为什么不等于反射定律失效。', role: '把宏观粗糙度拆成多个局部法线，并逐条验证方向镜像。', action: '保持光源不动，增加法线离散度，追踪三块面元的法线和反射线。',
          draw(a, s) {
            a.clear();
            const incoming = { x: .62, y: .78 };
            [145, 360, 575].forEach((x, index) => {
              const tilt = s.roughness * (.35 * Math.sin(x * .041) + .18 * Math.cos(x * .079));
              const y = 165 + 12 * s.roughness * Math.sin(x * .055);
              const normal = { x: Math.sin(tilt), y: -Math.cos(tilt) };
              const reflected = localReflection(incoming, normal);
              a.line(x - 62 * Math.cos(tilt), y - 62 * Math.sin(tilt), x + 62 * Math.cos(tilt), y + 62 * Math.sin(tilt), '#72878c', 4);
              a.line(x - 35 * normal.x, y - 35 * normal.y, x + 62 * normal.x, y + 62 * normal.y, '#91a3a8', 1.2, [5, 4]);
              a.arrow(x - 90 * incoming.x, y - 90 * incoming.y, x, y, C.green, 3);
              a.arrow(x, y, x + 90 * reflected.x, y + 90 * reflected.y, C.teal, 3);
              a.text(`面元 ${index + 1}`, x, 235, C.muted, 10, 'center');
            });
            a.text('同一入射方向', 75, 30, C.green, 11);
            a.text('不同局部法线 → 不同宏观出射方向', 645, 30, C.teal, 11, 'right', 700);
          }
        },
        {
          id: 'observable', group: '可观测量', title: '角分布与观察者可见性', sub: '是否“看见”取决于光是否进入观察方向',
          purpose: '把反射方向分布转化为观察者或探测器真正接收到的信号。', role: '连接局部几何与宏观可见性，避免把“物体存在”误当成“任意方向都能看见”。', action: '拖动主图中的观察者，比较镜面和粗糙表面在不同方向的相对信号。',
          draw(a, s) {
            a.clear();
            const info = r1Observer(s), x0 = 55, y0 = 30, w = 610, h = 180;
            a.line(x0, y0 + h, x0 + w, y0 + h, '#879da1', 1.2);
            a.line(x0, y0, x0, y0 + h, '#879da1', 1.2);
            const ctx = a.ctx;
            ctx.save(); ctx.beginPath();
            for (let i = 0; i <= w; i++) {
              const angle = i / w * 80;
              const value = Math.exp(-0.5 * ((angle - s.angle) / info.sigma) ** 2);
              const x = x0 + i, y = y0 + h - value * (h - 18);
              i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.strokeStyle = C.teal; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
            const idealX = x0 + s.angle / 80 * w;
            const observerX = x0 + s.observerAngle / 80 * w;
            a.line(idealX, y0, idealX, y0 + h, C.green, 2, [5, 4]);
            a.line(observerX, y0, observerX, y0 + h, C.orange, 3);
            a.text('理想反射方向', idealX, 224, C.green, 10, 'center');
            a.text('观察方向', observerX, 244, C.orange, 10, 'center');
            a.text(`相对信号 ${(info.signal * 100).toFixed(1)}%`, 640, 22, info.visible ? C.teal : C.red, 12, 'right', 700);
          }
        }
      ],
      augment(state, out) {
        const info = r1Observer(state);
        return {
          extraMetrics: [
            ['观察方向偏差', `${info.delta.toFixed(1)}°`],
            ['相对接收信号', `${(info.signal * 100).toFixed(1)}%`]
          ],
          status: info.visible ? '当前观察方向能接收到显著反射信号。' : '当前观察方向偏离主要反射分布；镜面状态下几乎不可见。'
        };
      },
      decorateMain(a, state) {
        const x0 = 570, y0 = 420, angle = rad(state.observerAngle);
        const x = x0 + 220 * Math.sin(angle), y = y0 - 220 * Math.cos(angle);
        a.circle(x, y, 11, '#fff4eb', C.orange, 3);
        a.text('观察者', x, y - 21, C.orange, 10, 'center', 700);
      },
      extraHit(point, state) {
        const x = 570 + 220 * Math.sin(rad(state.observerAngle));
        const y = 420 - 220 * Math.cos(rad(state.observerAngle));
        return Math.hypot(point.x - x, point.y - y) < 28 ? 'observer' : null;
      },
      extraDrag(handle, point, state) {
        if (handle !== 'observer') return false;
        const dx = point.x - 570, dy = 420 - point.y;
        if (dy > 10) state.observerAngle = clamp(deg(Math.atan2(Math.max(0, dx), dy)), 0, 80);
        return true;
      },
      validation(state) {
        const info = r1Observer(state);
        return [
          ['局部方向定律', '通过', '每条构造光线均由矢量镜像式生成，因而 θᵢ=θᵣ。'],
          ['角度参照', '通过', '所有角度相对入射点局部法线，而不是相对宏观表面。'],
          ['观察者判据', info.visible ? '可见' : '弱/不可见', `观察方向与中心反射方向相差 ${info.delta.toFixed(1)}°。`],
          ['模型边界', state.roughness < .75 ? '几何示意有效' : '谨慎', '参数描述局部斜率离散，不等同于真实材料的波长级粗糙度或完整 BRDF。']
        ];
      }
    },

    'plane-mirror': {
      version: 'R2 · v1.0',
      question: '镜后没有真实光线，眼睛为什么仍能稳定定位到一个可被拍摄的虚像？',
      core: '物点发散光 → 镜面反射 → 进入瞳孔 → 反向追迹 → 对称虚像',
      defaultModules: ['mechanism', 'observable'],
      extraDefaults: { mirrorHeight: 260 },
      extraParams: [
        { key: 'mirrorHeight', label: '有限镜面高度', min: 80, max: 500, step: 2, format: v => `${Math.round(v)} px` }
      ],
      primaryPurpose: '拖动物体和观察者，区分真实传播的入射/反射光与仅用于定位虚像的反向延长线。',
      primaryRole: '主图同时保存物体、镜面、眼睛和虚像的几何关系，是判断“看得见”与“能投屏”的共同基础。',
      primaryAction: '先拖动物体验证物像对称，再拖动眼睛改变入镜光线；最后改变有限镜面高度检查完整物体是否可见。',
      presets: {
        mechanism: ['mechanism', 'observable'], apparatus: ['apparatus', 'observable'], proof: ['derivation', 'validation']
      },
      modules: [
        {
          id: 'apparatus', group: '现实实验', title: '观察与投屏检验', sub: '眼睛能看到，不代表屏幕能在镜后接到会聚光',
          purpose: '用实验判据区分虚像和实像。', role: '把视觉定位与屏幕接收这两个常被混淆的判断拆开。', action: '移动物体和眼睛，观察反射光进入眼睛；再检查镜后屏幕是否存在真实会聚点。',
          draw(a, s) {
            a.clear();
            const mx = 355, base = 220, scale = .42;
            const ox = mx - s.distance * scale, ix = mx + s.distance * scale, top = base - s.height * scale;
            const eyeY = 45 + (s.observerY - 220) / 320 * 165;
            a.line(mx, 30, mx, 235, C.teal, 7);
            a.arrow(ox, base, ox, top, C.green, 4);
            a.arrow(ix, base, ix, top, '#a5cfcd', 3);
            [80, 160].forEach(hitY => {
              a.arrow(ox, top, mx, hitY, C.green, 2.5);
              a.arrow(mx, hitY, 65, eyeY, C.teal, 2.5);
              a.line(mx, hitY, ix, top, '#9ba9ab', 1.5, [6, 5]);
            });
            a.circle(65, eyeY, 10, '#fff', C.teal, 2);
            a.text('眼睛/相机', 65, eyeY + 20, C.ink, 10, 'center');
            a.line(650, 45, 650, 220, C.ink, 5);
            a.text('镜后屏幕', 650, 236, C.orange, 10, 'center');
            a.text('无真实会聚光', 650, 26, C.orange, 11, 'center', 700);
          }
        },
        {
          id: 'mechanism', group: '局部机制', title: '眼睛的反向追迹', sub: '到达方向相同，就会被定位到同一镜后点',
          purpose: '解释虚像位置为什么由进入眼睛的反射光方向决定。', role: '明确实线和虚线的逻辑地位：前者是传播，后者是定位。', action: '拖动眼睛，观察真实反射路径改变，但所有反向延长线仍交于镜面对称点。',
          draw(a, s) {
            a.clear();
            const mx = 360, image = { x: 585, y: 65 }, eye = { x: 70, y: 185 };
            a.line(mx, 25, mx, 240, C.teal, 6);
            [85, 165].forEach(y => {
              a.arrow(mx, y, eye.x, eye.y, C.teal, 3);
              a.line(mx, y, image.x, image.y, '#9ba9ab', 2, [7, 5]);
            });
            a.circle(image.x, image.y, 8, '#fff', '#9ba9ab', 2);
            a.text('反向延长线交点', image.x, image.y - 18, C.muted, 10, 'center');
            a.circle(eye.x, eye.y, 11, '#fff', C.teal, 2);
            a.text('眼睛只记录到达方向', 155, 235, C.muted, 10, 'center');
            a.text('镜后没有真实光线', 650, 225, C.orange, 10, 'right', 700);
          }
        },
        {
          id: 'observable', group: '可观测量', title: '有限镜面与完整可见性', sub: '镜面只需截获通向眼睛的必要光线',
          purpose: '把“像的位置”进一步转化为有限镜面能否让观察者看到完整物体。', role: '说明镜面大小、观察者高度和物体高度共同决定可见范围。', action: '拖动眼睛或改变镜面高度，观察顶部和底部所需反射点是否落在镜面有效区。',
          draw(a, s) {
            a.clear();
            const v = planeVisibility(s);
            const mapY = y => 25 + (y - 70) / 500 * 210;
            const x = 360;
            a.line(x, 25, x, 235, '#ced9d8', 9);
            a.line(x, mapY(v.activeTop), x, mapY(v.activeBottom), C.teal, 10);
            a.circle(x, mapY(v.yTop), 6, C.green, '#fff', 2);
            a.circle(x, mapY(v.yBottom), 6, C.orange, '#fff', 2);
            a.text('看见物体顶部所需点', 335, mapY(v.yTop), C.green, 10, 'right');
            a.text('看见物体底部所需点', 335, mapY(v.yBottom), C.orange, 10, 'right');
            a.rect(440, 70, 235, 110, v.fullVisible ? '#efffdc' : '#fff4eb', v.fullVisible ? C.green : C.orange, 12);
            a.text(v.fullVisible ? '完整物体可见' : '镜面截断部分视线', 557, 105, v.fullVisible ? '#3b6b00' : '#9a4d20', 14, 'center', 700);
            a.text(`所需高度 ${v.requiredHeight.toFixed(1)} px`, 557, 140, C.ink, 11, 'center');
            a.text(`当前镜面 ${Math.round(s.mirrorHeight)} px`, 557, 165, C.muted, 10, 'center');
          }
        }
      ],
      augment(state) {
        const v = planeVisibility(state);
        return {
          extraMetrics: [
            ['完整可见所需镜高', `${v.requiredHeight.toFixed(1)} px`],
            ['有限镜面判据', v.fullVisible ? '完整可见' : '部分截断']
          ],
          status: v.fullVisible ? '当前有限镜面覆盖了物体顶部和底部通向眼睛的必要反射点。' : '当前镜面过短或位置不合适，观察者不能看到完整物体。'
        };
      },
      decorateMain(a, state) {
        const v = planeVisibility(state);
        a.line(600, 70, 600, 570, '#cfdad8', 9);
        a.line(600, v.activeTop, 600, v.activeBottom, C.teal, 10);
        a.text('有限镜面', 618, v.activeTop - 12, C.teal, 10);
      },
      extraHit(point, state) {
        return Math.hypot(point.x - 145, point.y - state.observerY) < 30 ? 'observer' : null;
      },
      extraDrag(handle, point, state) {
        if (handle !== 'observer') return false;
        state.observerY = clamp(point.y, 220, 540);
        return true;
      },
      validation(state) {
        const v = planeVisibility(state);
        return [
          ['物像对称', '通过', `物距与像距大小均为 ${Math.round(state.distance)} px。`],
          ['放大率', '+1', '平面镜像正立且等大。'],
          ['光路真实性', '通过', '镜前实线表示真实传播；镜后虚线只表示反向追迹。'],
          ['有限镜面', v.fullVisible ? '完整可见' : '部分可见', `当前镜高 ${Math.round(state.mirrorHeight)} px，几何所需约 ${v.requiredHeight.toFixed(1)} px。`]
        ];
      }
    },

    'spherical-mirror': {
      version: 'R3 · v1.0',
      question: '球面镜的局部反射怎样在近轴条件下形成像？镜方程何时可信，何时开始被球差破坏？',
      core: '球面法线 → 近轴反射 → 光线交点 → 镜方程 → 屏幕与像差',
      defaultModules: ['mechanism', 'observable'],
      extraDefaults: { aperture: .42, screenShift: 0 },
      extraParams: [
        { key: 'aperture', label: '有效口径比例', min: .15, max: 1, step: .01, format: v => `${Math.round(v * 100)}%` },
        { key: 'screenShift', label: '屏幕相对理论像面偏移', min: -160, max: 160, step: 2, format: v => `${Math.round(v)} px` }
      ],
      primaryPurpose: '拖动物体跨越焦点和二倍焦点，比较主光线几何、镜方程和屏幕成像；再增大口径观察近轴模型如何失效。',
      primaryRole: '主图保存物体、焦点、曲率中心、反射主光线和像点，是所有数值与装置判断的共同几何底座。',
      primaryAction: '先用小口径验证镜方程；把物体拖过 F 与 2F；最后增大口径并查看精确光束焦散宽度。',
      presets: {
        mechanism: ['mechanism', 'observable'], apparatus: ['apparatus', 'observable'], proof: ['derivation', 'validation']
      },
      modules: [
        {
          id: 'apparatus', group: '现实实验', title: '光具座与屏幕扫描', sub: '实像必须能在预测像面附近被屏幕接收',
          purpose: '将代数像距落实为可移动屏幕上的清晰度峰值。', role: '区分“方程给出像点”和“实验中屏幕是否放在正确位置”。', action: '选择凹面镜实像预设，再移动屏幕偏移；比较小口径和大口径下的清晰范围。',
          draw(a, s, out) {
            a.clear();
            const axis = 150, mx = 610, scale = .55;
            const ox = mx - s.do * scale;
            a.line(35, axis, 685, axis, '#7f9398', 2);
            a.arrow(ox, axis, ox, axis - s.height * .55, C.green, 4);
            a.line(mx, 45, mx, 235, C.teal, 7);
            const bundle = sphericalBundle(s);
            if (out.real && Number.isFinite(out.di)) {
              const focusX = mx - out.di * scale;
              const screenX = mx - (out.di + s.screenShift) * scale;
              a.line(focusX, 85, focusX, 215, C.green, 2, [5, 4]);
              a.text('理论像面', focusX, 235, C.green, 10, 'center');
              a.line(screenX, 55, screenX, 225, C.ink, 5);
              a.text('屏幕', screenX, 38, C.ink, 10, 'center');
              const width = Math.abs(s.screenShift) + bundle.spread;
              a.text(`离焦/像差尺度 ≈ ${width.toFixed(1)} px`, 360, 25, width < 18 ? C.teal : C.orange, 11, 'center', 700);
            } else {
              a.text('当前为虚像：镜前屏幕不存在真实会聚位置', 340, 35, C.orange, 11, 'center', 700);
            }
            a.text(s.type === 'concave' ? '凹面镜' : '凸面镜', mx, 250, C.teal, 10, 'center');
          }
        },
        {
          id: 'mechanism', group: '局部机制', title: '精确球面反射束与球差', sub: '边缘光线不再严格汇聚于近轴焦点',
          purpose: '揭示镜方程和 f≈R/2 的近轴来源及其失效方式。', role: '用真实球面法线逐条反射，而不是再次调用主光线口诀。', action: '保持物体条件不变逐步增大口径，观察各条平行光与主轴交点的分散。',
          draw(a, s) {
            a.clear();
            const bundle = sphericalBundle(s), scale = Math.min(1.2, 235 / bundle.R);
            const vertexX = 565, axis = 130;
            const centerX = s.type === 'concave' ? vertexX - bundle.R * scale : vertexX + bundle.R * scale;
            a.line(35, axis, 690, axis, '#92a4a8', 1, [6, 5]);
            for (const ray of bundle.rays) {
              const px = vertexX + ray.x * scale;
              const py = axis + ray.y * scale;
              a.arrow(45, py, px, py, C.green, 2.2);
              const endX = px + ray.reflected.x * 260;
              const endY = py + ray.reflected.y * 260;
              a.arrow(px, py, endX, endY, C.teal, 2.2);
              if (s.type === 'convex') a.line(px, py, px - ray.reflected.x * 240, py - ray.reflected.y * 240, '#9ba9ab', 1.3, [6, 5]);
            }
            a.circle(centerX, axis, 4, C.purple, C.purple, 1);
            a.text('C', centerX, axis + 18, C.purple, 10, 'center');
            const idealX = vertexX + (s.type === 'concave' ? -s.f : s.f) * scale;
            a.line(idealX, 45, idealX, 215, C.orange, 2, [5, 4]);
            a.text('近轴焦点', idealX, 230, C.orange, 10, 'center');
            a.text(`焦散宽度 ${bundle.spread.toFixed(2)} px`, 680, 25, bundle.spread < 8 ? C.teal : C.red, 11, 'right', 700);
          }
        },
        {
          id: 'observable', group: '可观测量', title: '成像区域相图', sub: '物距跨越 F 与 2F 时，像的性质连续改变',
          purpose: '把当前物距放入完整参数区间，而不是孤立记忆若干作图案例。', role: '同时给出实/虚、正/倒和放大/缩小，连接几何位置与观测性质。', action: '选择凹面镜后拖动物体依次穿过 2F、F；再切换凸面镜比较其始终为缩小正立虚像。',
          draw(a, s, out) {
            a.clear();
            const x0 = 65, x1 = 665, y = 125;
            a.line(x0, y, x1, y, C.ink, 3);
            const F = x0 + 190, twoF = x0 + 380;
            a.circle(F, y, 6, C.teal, C.teal, 1);
            a.circle(twoF, y, 6, C.purple, C.purple, 1);
            a.text('F', F, y + 22, C.teal, 10, 'center');
            a.text('2F', twoF, y + 22, C.purple, 10, 'center');
            const px = s.type === 'concave' ? clamp(x0 + s.do / s.f * 190, x0, x1) : x0 + 95;
            a.circle(px, y - 28, 10, C.green, '#fff', 2);
            a.text('当前物体', px, y - 48, C.green, 10, 'center');
            const label = s.type === 'convex'
              ? '凸面镜：缩小 · 正立 · 虚像'
              : out.real
                ? `${Math.abs(out.m) > 1.02 ? '放大' : Math.abs(out.m) < .98 ? '缩小' : '等大'} · 倒立 · 实像`
                : '放大 · 正立 · 虚像';
            a.rect(115, 185, 490, 50, out.real ? '#eef8f6' : '#fff4eb', out.real ? C.teal : C.orange, 12);
            a.text(label, 360, 210, out.real ? C.teal : C.orange, 14, 'center', 700);
          }
        }
      ],
      augment(state, out) {
        const bundle = sphericalBundle(state);
        const defocus = out.real ? Math.abs(state.screenShift) : NaN;
        return {
          extraMetrics: [
            ['球面光束焦散宽度', `${bundle.spread.toFixed(2)} px`],
            ['屏幕相对像面', out.real ? `${Math.round(state.screenShift)} px` : '虚像无屏幕像面']
          ],
          status: bundle.spread < 8
            ? '当前口径下近轴近似良好，主光线与精确球面反射束基本一致。'
            : '口径较大，边缘光线出现明显球差；镜方程仍给出近轴像点，但不代表所有光线严格同焦。'
        };
      },
      decorateMain(a, state) {
        const half = 105 * state.aperture;
        a.line(850, 350 - half, 850, 350 + half, C.orange, 3);
        a.line(840, 350 - half, 860, 350 - half, C.orange, 2);
        a.line(840, 350 + half, 860, 350 + half, C.orange, 2);
        a.text('有效口径', 875, 350, C.orange, 10);
      },
      validation(state, out) {
        const f = (state.type === 'concave' ? 1 : -1) * state.f;
        const residual = Number.isFinite(out.di) ? Math.abs(1 / f - 1 / state.do - 1 / out.di) : NaN;
        const bundle = sphericalBundle(state);
        return [
          ['镜方程残差', residual < 1e-9 ? '通过' : '检查', Number.isFinite(residual) ? residual.toExponential(2) : '焦点极限'],
          ['实/虚像判据', out.real ? '实像' : '虚像', out.real ? '反射光在镜前真实相交，可用屏幕接收。' : '只有反向延长线相交。'],
          ['近轴有效性', bundle.spread < 8 ? '良好' : bundle.spread < 20 ? '有限' : '失效明显', `当前精确球面光束焦散宽度约 ${bundle.spread.toFixed(2)} px。`],
          ['屏幕位置', out.real ? (Math.abs(state.screenShift) < 6 ? '接近像面' : '离焦') : '不适用', out.real ? `相对近轴像面偏移 ${Math.round(state.screenShift)} px。` : '虚像不能由镜前移动屏幕直接承接。']
        ];
      }
    }
  };

  function controlHtml(param, value, labelOverride) {
    const label = labelOverride || param.label;
    if (param.type === 'select') {
      return `<label class="rfw-control"><span><b>${esc(label)}</b></span><select data-rfw-param="${esc(param.key)}">${param.options.map(option => `<option value="${esc(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}</select></label>`;
    }
    return `<label class="rfw-control"><span><b>${esc(label)}</b><output data-rfw-output="${esc(param.key)}">${esc(param.format ? param.format(value) : value)}</output></span><input type="range" data-rfw-param="${esc(param.key)}" min="${param.min}" max="${param.max}" step="${param.step}" value="${value}"></label>`;
  }

  function reasoningModule(config, cfg) {
    return {
      id: 'derivation', group: '数学表征', title: '从图到公式', sub: '公式必须能回指局部机制和可测对象',
      purpose: '把几何关系压缩成可计算的方程，同时保留每一步的物理来源。', role: '承担跨表征映射，防止公式与图形各自成立却互不对应。', action: '按顺序展开推导，并在主图中寻找每个符号对应的对象。',
      html: `<div class="rfw-derivation-list">${(cfg.derivation || []).map((item, index) => `<article><i>${index + 1}</i><div>${tex(item.tex, true)}<p>${esc(item.why)}</p></div></article>`).join('')}</div>`
    };
  }

  function validationModule(config, model) {
    return {
      id: 'validation', group: '验证与边界', title: '自洽性与模型边界', sub: '任何漂亮图形都必须能被检查和证伪',
      purpose: '检查当前状态下的恒等关系、几何判据与近似适用性。', role: '区分严格结果、教学示意和超出模型能力的现实效应。', action: '优先阅读警告项；参数越极端，越不能只相信图像。',
      dynamic: true,
      html: `<div class="rfw-checks" data-rfw-checks></div><div class="rfw-boundary"><b>模型边界</b><p>${esc(model.boundary || '')}</p></div>`
    };
  }

  function moduleCard(module) {
    const body = module.html
      ? `<div class="rfw-module-html">${module.html}</div>`
      : `<div class="rfw-module-canvas-wrap"><canvas width="720" height="260"></canvas></div>`;
    return `<article class="card rfw-module" data-module-id="${module.id}">
      <header class="rfw-module-head"><div><span>${esc(module.group)}</span><h3>${esc(module.title)}</h3><p>${esc(module.sub)}</p></div><div class="rfw-module-actions"><button type="button" data-rfw-focus="${module.id}">放大</button><button type="button" data-rfw-remove="${module.id}">关闭</button></div></header>
      <details class="rfw-module-guide"><summary>目的、作用与建议操作</summary><div><p><b>目的</b>${esc(module.purpose)}</p><p><b>作用</b>${esc(module.role)}</p><p><b>操作</b>${esc(module.action)}</p></div></details>
      ${body}
    </article>`;
  }

  function drawerController(root, side) {
    const drawer = root.querySelector(`.rfw-${side}-drawer`);
    const handle = root.querySelector(`.rfw-${side}-handle`);
    const close = drawer.querySelector('[data-rfw-close]');
    const pin = drawer.querySelector('[data-rfw-pin]');
    const backdrop = root.querySelector('.rfw-backdrop');
    const fine = matchMedia('(hover:hover) and (pointer:fine)');
    const key = `rfw-v013-pin-${side}`;
    let pinned = localStorage.getItem(key) === '1';
    let openTimer = 0, closeTimer = 0, interacting = false;

    function setOpen(open, source = 'click') {
      clearTimeout(openTimer); clearTimeout(closeTimer);
      drawer.classList.toggle('is-open', open);
      handle.setAttribute('aria-expanded', String(open));
      if (source === 'modal') backdrop.classList.toggle('is-open', open);
      if (!open) backdrop.classList.remove('is-open');
    }
    function setPinned(value) {
      pinned = value;
      drawer.classList.toggle('is-pinned', pinned);
      pin.setAttribute('aria-pressed', String(pinned));
      pin.textContent = pinned ? '取消固定' : '固定';
      localStorage.setItem(key, pinned ? '1' : '0');
      if (pinned) setOpen(true);
    }
    setPinned(pinned);

    handle.addEventListener('click', () => setOpen(!drawer.classList.contains('is-open'), innerWidth <= 900 ? 'modal' : 'click'));
    close.addEventListener('click', () => { setPinned(false); setOpen(false); });
    pin.addEventListener('click', () => setPinned(!pinned));
    drawer.addEventListener('pointerdown', () => { interacting = true; });
    window.addEventListener('pointerup', () => { interacting = false; }, { passive: true });

    const enter = () => {
      if (!fine.matches || pinned) return;
      clearTimeout(closeTimer);
      openTimer = window.setTimeout(() => setOpen(true, 'hover'), 140);
    };
    const leave = () => {
      if (!fine.matches || pinned || interacting) return;
      clearTimeout(openTimer);
      closeTimer = window.setTimeout(() => setOpen(false, 'hover'), 560);
    };
    handle.addEventListener('pointerenter', enter);
    drawer.addEventListener('pointerenter', enter);
    handle.addEventListener('pointerleave', leave);
    drawer.addEventListener('pointerleave', leave);
    backdrop.addEventListener('click', () => setOpen(false));

    return {
      close() { setOpen(false); },
      destroy() { clearTimeout(openTimer); clearTimeout(closeTimer); }
    };
  }

  function renderFoundation(id) {
    const token = ++renderToken;
    const model = models[id];
    const meta = modelMeta[id];
    const config = modelConfigs[id];
    const upgrade = ModelUpgradeV07.registry[id] || {};
    const state = Object.assign(structuredClone(model.defaults), structuredClone(config.extraDefaults || {}));
    const modules = [...config.modules, reasoningModule(config, upgrade), validationModule(config, model)];
    const moduleMap = new Map(modules.map(module => [module.id, module]));
    const allParams = [...model.params, ...(config.extraParams || [])];
    const active = new Set(config.defaultModules);

    view.innerHTML = `<div class="rfw-page" data-model-id="${id}">
      <section class="rfw-hero">
        <div><div class="crumb" data-route="category:reflection">← 返回反射模型图谱</div><div class="eyebrow">${esc(config.version)} · REFLECTION FOUNDATIONS</div><h1>${esc(meta.title)}</h1><p>${esc(config.question)}</p></div>
        <div class="rfw-core"><b>统一因果链</b><span>${esc(config.core)}</span>${tex(upgrade.mainEquation || meta.equation, true)}</div>
      </section>
      <div class="rfw-workspace">
        <main class="rfw-primary-column">
          <section class="card rfw-primary-card">
            <header class="rfw-primary-head"><div><span>PRIMARY MANIPULABLE SYSTEM</span><h2>${esc(model.canvasTitle)}</h2><p>${esc(model.canvasSub)}</p></div><div class="legend">${(model.legend || []).map(item => `<span><i style="background:${item[1]}"></i>${esc(item[0])}</span>`).join('')}</div></header>
            <details class="rfw-primary-guide"><summary>主实验台的目的、作用与建议操作</summary><div><p><b>目的</b>${esc(config.primaryPurpose)}</p><p><b>作用</b>${esc(config.primaryRole)}</p><p><b>操作</b>${esc(config.primaryAction)}</p></div></details>
            <div class="rfw-main-canvas-wrap"><canvas id="rfwMainCanvas" width="1080" height="675"></canvas></div>
            <div class="rfw-live-strip" id="rfwLiveStrip"></div>
            <div class="rfw-primary-foot"><span>${esc(model.dragHint || '拖动高亮对象改变物理状态。')}</span><span id="rfwFoot"></span></div>
          </section>
        </main>
        <section class="rfw-analysis-column">
          <header class="rfw-analysis-head"><div><span>SYNCHRONIZED ANALYSIS</span><h2>同步分析区</h2><p>最多同时挂载两个可读模块；主实验台与所选模块必须在同一视口完成比较。</p></div><output id="rfwActiveCount">${active.size} / ${MAX_ACTIVE}</output></header>
          <div class="rfw-board" data-count="${active.size}"></div>
        </section>
      </div>
      <button class="rfw-edge-handle rfw-left-handle" aria-expanded="false" aria-controls="rfwLeftDrawer"><b>模块</b><span id="rfwRailCount">${active.size}/${MAX_ACTIVE}</span></button>
      <button class="rfw-edge-handle rfw-right-handle" aria-expanded="false" aria-controls="rfwRightDrawer"><b>参数</b><span>状态</span></button>
      <aside class="rfw-drawer rfw-left-drawer" id="rfwLeftDrawer" aria-label="同步分析模块">
        <header><div><span>ANALYSIS DOCK</span><h2>同步分析模块</h2></div><div><button data-rfw-pin aria-pressed="false">固定</button><button data-rfw-close>关闭</button></div></header>
        <div class="rfw-preset-grid"><button data-rfw-preset="mechanism">机制＋观测</button><button data-rfw-preset="apparatus">装置＋观测</button><button data-rfw-preset="proof">公式＋验证</button><button data-rfw-preset="clear">清空</button></div>
        <div class="rfw-module-selector">${[...new Set(modules.map(module => module.group))].map(group => `<fieldset><legend>${esc(group)}</legend>${modules.filter(module => module.group === group).map(module => `<label><input type="checkbox" value="${module.id}" ${active.has(module.id) ? 'checked' : ''}><span><b>${esc(module.title)}</b><small>${esc(module.sub)}</small></span></label>`).join('')}</fieldset>`).join('')}</div>
        <div class="rfw-budget"><b>同屏预算：2 个分析模块</b><p>上限由当前视口的可读性决定，不以“功能越多越好”为目标。</p></div>
      </aside>
      <aside class="rfw-drawer rfw-right-drawer" id="rfwRightDrawer" aria-label="实验参数与判据">
        <header><div><span>UNIFIED STATE</span><h2>参数与实时判据</h2></div><div><button data-rfw-pin aria-pressed="false">固定</button><button data-rfw-close>关闭</button></div></header>
        <div class="rfw-param-body"><button class="rfw-reset" id="rfwReset">恢复默认</button><div class="rfw-controls">${allParams.map(param => controlHtml(param, state[param.key], config.labels?.[param.key])).join('')}</div><div class="rfw-model-presets">${(model.presets || []).map((preset, index) => `<button data-rfw-model-preset="${index}">${esc(preset.name)}</button>`).join('')}</div><div class="rfw-full-metrics" id="rfwFullMetrics"></div><div class="rfw-status" id="rfwStatus"></div></div>
      </aside>
      <div class="rfw-backdrop"></div>
      <div class="rfw-reservoir" hidden>${modules.map(moduleCard).join('')}</div>
    </div>`;

    const root = view.querySelector('.rfw-page');
    const mainCanvas = root.querySelector('#rfwMainCanvas');
    const mainApi = canvasAPI(mainCanvas);
    const board = root.querySelector('.rfw-board');
    const reservoir = root.querySelector('.rfw-reservoir');
    const liveStrip = root.querySelector('#rfwLiveStrip');
    const fullMetrics = root.querySelector('#rfwFullMetrics');
    const status = root.querySelector('#rfwStatus');
    const foot = root.querySelector('#rfwFoot');
    const activeCount = root.querySelector('#rfwActiveCount');
    const railCount = root.querySelector('#rfwRailCount');
    const checkboxes = [...root.querySelectorAll('.rfw-module-selector input[type="checkbox"]')];
    const moduleNodes = new Map([...reservoir.querySelectorAll('.rfw-module')].map(node => [node.dataset.moduleId, node]));
    const moduleApis = new Map();
    let dragHandle = null;
    let focused = null;
    let revision = 0;

    function outputForCurrentState() {
      const out = model.compute(state);
      const augment = config.augment ? config.augment(state, out) : { extraMetrics: [], status: '' };
      return { out, augment };
    }

    function ensureModuleApi(id) {
      const node = moduleNodes.get(id);
      const canvas = node?.querySelector('canvas');
      if (!canvas) return null;
      if (!moduleApis.has(id)) moduleApis.set(id, canvasAPI(canvas));
      return moduleApis.get(id);
    }

    function renderChecks(out) {
      const node = moduleNodes.get('validation');
      if (!node) return;
      const container = node.querySelector('[data-rfw-checks]');
      if (!container) return;
      const rows = config.validation ? config.validation(state, out) : [];
      container.innerHTML = rows.map(row => `<article><span>${esc(row[0])}</span><b>${esc(row[1])}</b><p>${esc(row[2])}</p></article>`).join('');
    }

    function syncControls() {
      allParams.forEach(param => {
        const control = root.querySelector(`[data-rfw-param="${param.key}"]`);
        const output = root.querySelector(`[data-rfw-output="${param.key}"]`);
        if (control && String(control.value) !== String(state[param.key])) control.value = state[param.key];
        if (output) output.textContent = param.format ? param.format(state[param.key]) : state[param.key];
      });
    }

    function update() {
      if (token !== renderToken) return;
      const { out, augment } = outputForCurrentState();
      model.draw(mainApi, state, out, 0);
      config.decorateMain?.(mainApi, state, out);
      for (const id of active) {
        const module = moduleMap.get(id);
        if (module?.draw) module.draw(ensureModuleApi(id), state, out, 0);
      }
      renderChecks(out);
      const metrics = [...(out.metrics || []), ...(augment.extraMetrics || [])];
      liveStrip.innerHTML = metrics.slice(0, 4).map((item, index) => `<article class="${index === 0 ? 'is-primary' : ''}"><span>${esc(item[0])}</span><b>${esc(item[1])}</b></article>`).join('');
      fullMetrics.innerHTML = metrics.map(item => `<article><span>${esc(item[0])}</span><b>${esc(item[1])}</b></article>`).join('');
      status.className = `rfw-status ${out.statusType || ''}`;
      status.textContent = [out.status, augment.status].filter(Boolean).join(' ');
      foot.textContent = out.foot || '';
      syncControls();
      revision += 1;
      root.dataset.renderRevision = String(revision);
      requestAnimationFrame(() => {
        window.CanvasHiDPIV092?.sync(mainCanvas);
        for (const id of active) {
          const canvas = moduleNodes.get(id)?.querySelector('canvas');
          if (canvas) window.CanvasHiDPIV092?.sync(canvas);
        }
      });
    }

    function refreshBoard() {
      for (const [id, node] of moduleNodes) {
        if (active.has(id)) board.append(node);
        else reservoir.append(node);
      }
      board.dataset.count = String(active.size);
      activeCount.textContent = `${active.size} / ${MAX_ACTIVE}`;
      railCount.textContent = `${active.size}/${MAX_ACTIVE}`;
      checkboxes.forEach(box => {
        box.checked = active.has(box.value);
        box.disabled = !box.checked && active.size >= MAX_ACTIVE;
      });
      if (focused && !active.has(focused)) focused = null;
      board.classList.toggle('is-focused', Boolean(focused));
      board.querySelectorAll('.rfw-module').forEach(node => node.classList.toggle('is-focus-target', node.dataset.moduleId === focused));
      update();
      typeset(board);
    }

    function addModule(id) {
      if (!moduleMap.has(id) || active.has(id)) return;
      if (active.size >= MAX_ACTIVE) return;
      active.add(id); refreshBoard();
    }
    function removeModule(id) { active.delete(id); refreshBoard(); }
    function applyModulePreset(name) {
      const wanted = name === 'clear' ? [] : config.presets[name] || [];
      active.clear();
      wanted.slice(0, MAX_ACTIVE).forEach(id => active.add(id));
      refreshBoard();
    }

    root.querySelector('.rfw-module-selector').addEventListener('change', event => {
      const box = event.target.closest('input[type="checkbox"]');
      if (!box) return;
      box.checked ? addModule(box.value) : removeModule(box.value);
    });
    root.querySelector('.rfw-preset-grid').addEventListener('click', event => {
      const button = event.target.closest('[data-rfw-preset]');
      if (button) applyModulePreset(button.dataset.rfwPreset);
    });
    board.addEventListener('click', event => {
      const remove = event.target.closest('[data-rfw-remove]');
      if (remove) return removeModule(remove.dataset.rfwRemove);
      const focus = event.target.closest('[data-rfw-focus]');
      if (focus) {
        focused = focused === focus.dataset.rfwFocus ? null : focus.dataset.rfwFocus;
        refreshBoard();
      }
    });

    root.querySelector('.rfw-controls').addEventListener('input', event => {
      const control = event.target.closest('[data-rfw-param]');
      if (!control) return;
      const param = allParams.find(item => item.key === control.dataset.rfwParam);
      state[param.key] = control.tagName === 'SELECT' ? control.value : Number(control.value);
      update();
    });
    root.querySelector('.rfw-controls').addEventListener('change', event => {
      const control = event.target.closest('select[data-rfw-param]');
      if (!control) return;
      state[control.dataset.rfwParam] = control.value;
      update();
    });
    root.querySelector('#rfwReset').addEventListener('click', () => {
      Object.assign(state, structuredClone(model.defaults), structuredClone(config.extraDefaults || {}));
      update();
    });
    root.querySelector('.rfw-model-presets').addEventListener('click', event => {
      const button = event.target.closest('[data-rfw-model-preset]');
      if (!button) return;
      const preset = model.presets[Number(button.dataset.rfwModelPreset)];
      Object.assign(state, preset.values);
      update();
    });

    mainCanvas.addEventListener('pointerdown', event => {
      const point = getPointer(mainCanvas, event);
      const current = model.compute(state);
      dragHandle = config.extraHit?.(point, state, current) || model.hit?.(point, state, current) || null;
      if (dragHandle) {
        mainCanvas.setPointerCapture(event.pointerId);
        event.preventDefault();
      }
    });
    mainCanvas.addEventListener('pointermove', event => {
      if (!dragHandle) return;
      const point = getPointer(mainCanvas, event);
      const handled = config.extraDrag?.(dragHandle, point, state);
      if (!handled) model.drag?.(dragHandle, point, state);
      update();
    });
    const stopDrag = () => { dragHandle = null; };
    mainCanvas.addEventListener('pointerup', stopDrag);
    mainCanvas.addEventListener('pointercancel', stopDrag);

    const leftDrawer = drawerController(root, 'left');
    const rightDrawer = drawerController(root, 'right');
    const keyHandler = event => {
      if (event.key === 'Escape') { leftDrawer.close(); rightDrawer.close(); }
    };
    window.addEventListener('keydown', keyHandler);

    refreshBoard();
    typeset(root);

    return () => {
      window.removeEventListener('keydown', keyHandler);
      leftDrawer.destroy(); rightDrawer.destroy();
    };
  }

  renderModel = function renderReflectionFoundations(id) {
    destroyCurrent();
    destroyCurrent = () => {};
    if (!upgraded.has(id)) return previousRender(id);
    destroyCurrent = renderFoundation(id);
  };
  window.renderModel = renderModel;

  window.ReflectionFoundationsV013 = {
    version: '0.13.0',
    models: [...upgraded],
    maxActiveModules: MAX_ACTIVE
  };
})();
