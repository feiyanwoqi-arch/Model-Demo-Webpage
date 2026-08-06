'use strict';
(() => {
  if (window.R4FresnelWorkbenchV019) return;
  const physics = window.R4FresnelPhysicsV019;
  if (!physics) throw new Error('R4FresnelPhysicsV019 must load before the R4 workbench');

  const previousRender = window.renderModel;
  const COLORS = {
    green: '#7bea00', teal: '#0e7c84', orange: '#f59e57', purple: '#8066a8',
    ink: '#0b3040', muted: '#66808a', grid: '#d7e5e3', pale: '#efffdc',
    red: '#c9534d', blue: '#387fa3', panel: '#ffffff'
  };
  const moduleLabels = {
    curves: ['菲涅耳角谱', 'Rₛ、Rₚ、布儒斯特零点与全反射边界'],
    energy: ['振幅、相位与能量账本', '把 r 的符号、R=|r|² 与 R+T=1 放在一起'],
    boundary: ['边界条件剖面', '切向电场连续性如何区分 s 与 p 偏振'],
    apparatus: ['偏振分辨反射计', '现实装置如何测出两条菲涅耳曲线']
  };
  let destroyR4 = () => {};

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[char]));
  const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));
  const toRad = degrees => degrees * Math.PI / 180;
  const fmtPct = value => `${(value * 100).toFixed(value < 0.001 ? 3 : 2)}%`;
  const fmtSigned = value => Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(4)}` : '—';

  function typeset(root) {
    const run = () => window.MathJax?.typesetPromise?.([root]).catch(() => {});
    if (window.MathJax?.startup?.promise) window.MathJax.startup.promise.then(run);
    else setTimeout(run, 80);
  }

  function pointerInCanvas(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / Math.max(1, rect.width),
      y: (event.clientY - rect.top) * canvas.height / Math.max(1, rect.height)
    };
  }

  function sourcePoint(angle) {
    const x0 = 392, y0 = 302, length = 238, a = toRad(angle);
    return { x: x0 - length * Math.sin(a), y: y0 - length * Math.cos(a) };
  }

  function angleFromPointer(point) {
    const dx = Math.max(0, 392 - point.x);
    const dy = Math.max(4, 302 - point.y);
    return clampValue(Math.atan2(dx, dy) * 180 / Math.PI, 0, 89);
  }

  function controlRange(key, label, value, min, max, step, formatter) {
    return `<label class="r4w-control"><span><b>${esc(label)}</b><output data-r4-output="${key}">${esc(formatter(value))}</output></span><input data-r4-param="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
  }

  function moduleOptions(selected) {
    return Object.entries(moduleLabels).map(([value, item]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${esc(item[0])}</option>`).join('');
  }

  function renderR4() {
    const meta = window.modelMeta?.['fresnel-brewster'];
    const state = { n1: 1, n2: 1.52, angle: 45, pFraction: 0.5, slotA: 'curves', slotB: 'energy' };
    let revision = 0;
    let dragMain = false;
    let dragCurveSlot = null;
    let drawerOpen = false;

    const presets = [
      { name: '空气 → 玻璃 · 非偏振', values: { n1:1, n2:1.52, angle:45, pFraction:.5 } },
      { name: '空气 → 玻璃 · 布儒斯特', values: { n1:1, n2:1.52, angle:physics.brewsterAngle(1,1.52), pFraction:1 } },
      { name: '空气 → 水 · 布儒斯特', values: { n1:1, n2:1.33, angle:physics.brewsterAngle(1,1.33), pFraction:1 } },
      { name: '玻璃 → 空气 · 临界角前', values: { n1:1.52, n2:1, angle:39, pFraction:.5 } },
      { name: '玻璃 → 空气 · 全反射', values: { n1:1.52, n2:1, angle:48, pFraction:.5 } }
    ];

    view.innerHTML = `<div class="r4w-page" data-model-id="fresnel-brewster" data-version="019">
      <section class="r4w-hero">
        <div><button class="r4w-back" type="button" data-route="category:reflection">← 返回反射模型图谱</button><div class="eyebrow">R4 · v0.19 · FRESNEL / BREWSTER WORKBENCH</div><h1>${esc(meta?.title || '菲涅耳反射与布儒斯特角')}</h1><p>同一个界面为什么会对 s、p 偏振分配不同的反射振幅、相位与能量？布儒斯特角不是一条孤立公式，而是 p 反射振幅连续穿过零点的几何结果。</p></div>
        <div class="r4w-core"><b>统一因果链</b><span>入射方向 → s/p 分解 → 边界条件 → 振幅系数 → 相位与能量 → 探测信号</span><div>\\[n_1\sin\theta_i=n_2\sin\theta_t,\qquad R_{s,p}=|r_{s,p}|^2\\]</div></div>
      </section>

      <section class="r4w-workspace">
        <article class="card r4w-main-card">
          <header class="r4w-card-head"><div><span>PRIMARY MANIPULABLE SYSTEM</span><h2>偏振分辨界面反射</h2><p>拖动绿色入射源改变角度；光线宽度直接编码当前混合偏振的能量份额。</p></div><div class="r4w-legend"><span><i style="background:${COLORS.green}"></i>入射</span><span><i style="background:${COLORS.teal}"></i>反射</span><span><i style="background:${COLORS.orange}"></i>透射</span></div></header>
          <div class="r4w-main-canvas-wrap"><canvas id="r4wMainCanvas" width="1080" height="560" aria-label="菲涅耳反射主实验台"></canvas></div>
          <div class="r4w-live-strip" id="r4wLiveStrip"></div>
          <div class="r4w-status" id="r4wStatus"></div>
          <div class="r4w-main-foot"><span>直接拖动绿色光源；也可在“菲涅耳角谱”中拖动当前角度线。</span><span id="r4wFoot"></span></div>
        </article>

        <div class="r4w-analysis-column">
          <article class="card r4w-module" data-r4-slot="A">
            <header class="r4w-module-head"><div><span>SYNCHRONIZED VIEW A</span><h3 data-r4-title="A"></h3><p data-r4-sub="A"></p></div><select data-r4-slot-select="A" aria-label="选择分析视图 A">${moduleOptions(state.slotA)}</select></header>
            <canvas width="720" height="250" aria-label="同步分析视图 A"></canvas>
          </article>
          <article class="card r4w-module" data-r4-slot="B">
            <header class="r4w-module-head"><div><span>SYNCHRONIZED VIEW B</span><h3 data-r4-title="B"></h3><p data-r4-sub="B"></p></div><select data-r4-slot-select="B" aria-label="选择分析视图 B">${moduleOptions(state.slotB)}</select></header>
            <canvas width="720" height="250" aria-label="同步分析视图 B"></canvas>
          </article>
        </div>
      </section>

      <button class="r4w-drawer-handle" type="button" aria-expanded="false">参数与验证</button>
      <div class="r4w-backdrop"></div>
      <aside class="r4w-drawer" aria-label="R4 参数与验证抽屉">
        <header><div><span>R4 CONTROL & VALIDATION</span><h2>参数、预设与边界</h2></div><button type="button" data-r4-close>关闭</button></header>
        <div class="r4w-drawer-scroll">
          <section><h3>物理参数</h3><div class="r4w-controls">
            ${controlRange('n1','入射介质折射率 n₁',state.n1,1,2.5,.01,v=>Number(v).toFixed(2))}
            ${controlRange('n2','透射介质折射率 n₂',state.n2,1,2.5,.01,v=>Number(v).toFixed(2))}
            ${controlRange('angle','入射角 θᵢ',state.angle,0,89,.1,v=>`${Number(v).toFixed(1)}°`)}
            ${controlRange('pFraction','p 偏振能量占比',state.pFraction,0,1,.01,v=>`${Math.round(Number(v)*100)}%`)}
          </div></section>
          <section><h3>关键状态预设</h3><div class="r4w-presets">${presets.map((preset,index)=>`<button type="button" data-r4-preset="${index}">${esc(preset.name)}</button>`).join('')}</div></section>
          <section><h3>分析视图</h3><div class="r4w-slot-controls"><label>视图 A<select data-r4-slot-select="A">${moduleOptions(state.slotA)}</select></label><label>视图 B<select data-r4-slot-select="B">${moduleOptions(state.slotB)}</select></label></div></section>
          <section><h3>运行时验证</h3><div class="r4w-checks" id="r4wChecks"></div></section>
          <details open><summary>公式与符号</summary><div class="r4w-formulas">
            <div>\\[r_s=\frac{n_1\cos\theta_i-n_2\cos\theta_t}{n_1\cos\theta_i+n_2\cos\theta_t}\\]</div>
            <div>\\[r_p=\frac{n_1\cos\theta_t-n_2\cos\theta_i}{n_1\cos\theta_t+n_2\cos\theta_i}\\]</div>
            <div>\\[\tan\theta_B=\frac{n_2}{n_1},\qquad \theta_i+\theta_t=90^\circ\\]</div>
            <p>这里的 rₚ 采用固定实验室方向的符号约定，使正入射时 s、p 具有同一相位判据；反射率不受该符号约定影响。</p>
          </div></details>
          <details><summary>模型边界</summary><p>两侧介质被视为均匀、各向同性、无吸收、非磁性介质。金属、吸收介质和多层膜需要复折射率与复振幅；全反射后的倏逝场和偏振相位差属于 R5 的核心内容，本页只显示 R=1 的边界状态。</p></details>
          <button class="r4w-reset" type="button" data-r4-reset>恢复默认状态</button>
        </div>
      </aside>
    </div>`;

    const root = document.querySelector('.r4w-page');
    const mainCanvas = root.querySelector('#r4wMainCanvas');
    const mainApi = canvasAPI(mainCanvas);
    const slotNodes = {
      A: root.querySelector('[data-r4-slot="A"]'),
      B: root.querySelector('[data-r4-slot="B"]')
    };
    const slotApis = {
      A: canvasAPI(slotNodes.A.querySelector('canvas')),
      B: canvasAPI(slotNodes.B.querySelector('canvas'))
    };
    const liveStrip = root.querySelector('#r4wLiveStrip');
    const status = root.querySelector('#r4wStatus');
    const foot = root.querySelector('#r4wFoot');
    const checks = root.querySelector('#r4wChecks');
    const drawer = root.querySelector('.r4w-drawer');
    const backdrop = root.querySelector('.r4w-backdrop');
    const drawerHandle = root.querySelector('.r4w-drawer-handle');

    function setDrawer(open) {
      drawerOpen = open;
      drawer.classList.toggle('is-open', open);
      backdrop.classList.toggle('is-open', open);
      drawerHandle.setAttribute('aria-expanded', String(open));
    }

    function syncControls() {
      root.querySelectorAll('[data-r4-param]').forEach(control => {
        const key = control.dataset.r4Param;
        control.value = state[key];
      });
      const formatters = {
        n1: value => Number(value).toFixed(2), n2: value => Number(value).toFixed(2),
        angle: value => `${Number(value).toFixed(1)}°`, pFraction: value => `${Math.round(Number(value) * 100)}%`
      };
      root.querySelectorAll('[data-r4-output]').forEach(output => {
        const key = output.dataset.r4Output;
        output.textContent = formatters[key](state[key]);
      });
      root.querySelectorAll('[data-r4-slot-select="A"]').forEach(select => { select.value = state.slotA; });
      root.querySelectorAll('[data-r4-slot-select="B"]').forEach(select => { select.value = state.slotB; });
    }

    function drawPolarizationGlyph(a, x, y, fraction, label) {
      const sWeight = 1 - fraction;
      const pWeight = fraction;
      a.rect(x - 50, y - 32, 100, 64, '#ffffffdd', '#c9dcda', 12);
      a.text(label, x, y - 19, COLORS.muted, 11, 'center', 700);
      const dotRadius = 3 + 4 * sWeight;
      a.circle(x - 21, y + 8, dotRadius, COLORS.purple, COLORS.purple, 1);
      a.circle(x - 21, y + 8, dotRadius + 8, 'rgba(255,255,255,0)', COLORS.purple, 1);
      const length = 12 + 18 * pWeight;
      a.line(x + 11, y + 8, x + 11 + length, y + 8, COLORS.blue, 3);
      a.line(x + 11 + length, y + 8, x + 5 + length, y + 3, COLORS.blue, 2);
      a.line(x + 11 + length, y + 8, x + 5 + length, y + 13, COLORS.blue, 2);
    }

    function drawMain(result, mixed) {
      const a = mainApi;
      a.clear();
      const x0 = 392, y0 = 302, upper = '#f7fbfb', lower = '#e0f4f2';
      a.rect(0, 0, a.W, y0, upper, null);
      a.rect(0, y0, a.W, a.H - y0, lower, null);
      a.line(0, y0, a.W, y0, COLORS.teal, 3);
      a.line(x0, 45, x0, 520, '#91a4a8', 1.4, [7, 6]);
      a.text(`入射介质  n₁ = ${state.n1.toFixed(2)}`, 40, 38, COLORS.ink, 18);
      a.text(`透射介质  n₂ = ${state.n2.toFixed(2)}`, 40, 530, COLORS.ink, 18);
      a.text('局部法线', x0 + 16, 66, COLORS.muted, 13);

      const source = sourcePoint(state.angle);
      const angle = toRad(state.angle);
      const reflected = { x: x0 + 245 * Math.sin(angle), y: y0 - 245 * Math.cos(angle) };
      const reflectedWidth = 2.5 + 10 * Math.sqrt(mixed.R);
      const transmittedWidth = 2.5 + 10 * Math.sqrt(mixed.T);
      a.arrow(source.x, source.y, x0, y0, COLORS.green, 7);
      a.arrow(x0, y0, reflected.x, reflected.y, COLORS.teal, reflectedWidth);
      if (!result.tir) {
        const tt = toRad(result.thetaT);
        a.arrow(x0, y0, x0 + 260 * Math.sin(tt), y0 + 260 * Math.cos(tt), COLORS.orange, transmittedWidth);
      } else {
        for (let offset = 0; offset < 4; offset++) {
          const alpha = 0.35 - offset * 0.07;
          a.line(x0 + 8, y0 + 12 + offset * 16, x0 + 220, y0 + 12 + offset * 16, `rgba(245,158,87,${alpha})`, 2);
        }
        a.text('无传播折射光；界面下仅保留倏逝场（详见 R5）', 665, y0 + 88, COLORS.orange, 15, 'center', 700);
      }
      a.circle(source.x, source.y, 17, '#f4ffdc', COLORS.green, 5);
      a.text('拖动入射源', source.x, source.y - 31, COLORS.ink, 14, 'center', 700);
      a.circle(x0, y0, 8, '#fff', COLORS.teal, 3);
      a.text(`θᵢ = ${state.angle.toFixed(1)}°`, x0 - 96, y0 - 68, COLORS.ink, 16, 'center', 700);
      if (!result.tir) a.text(`θₜ = ${result.thetaT.toFixed(1)}°`, x0 + 94, y0 + 76, COLORS.orange, 16, 'center', 700);

      const start = -Math.PI / 2 - angle;
      a.arc(x0, y0, 62, start, -Math.PI / 2, COLORS.green, 2.4);
      a.arc(x0, y0, 78, -Math.PI / 2, -Math.PI / 2 + angle, COLORS.teal, 2.4);
      if (!result.tir) a.arc(x0, y0, 67, Math.PI / 2 - toRad(result.thetaT), Math.PI / 2, COLORS.orange, 2.4);

      drawPolarizationGlyph(a, 730, 86, state.pFraction, '入射偏振组成');
      drawPolarizationGlyph(a, 902, 86, mixed.R > 1e-8 ? state.pFraction * result.Rp / mixed.R : 0, '反射束 p 占比');

      a.rect(650, 160, 355, 250, '#ffffffee', '#d5e4e2', 16);
      a.text('同一边界的三层结果', 678, 188, COLORS.ink, 18, 'left', 700);
      a.text('方向层', 680, 228, COLORS.muted, 13);
      a.text(result.tir ? '折射传播解消失' : `θₜ = ${result.thetaT.toFixed(2)}°`, 978, 228, result.tir ? COLORS.red : COLORS.orange, 15, 'right', 700);
      a.text('振幅层', 680, 270, COLORS.muted, 13);
      a.text(`rₛ ${fmtSigned(result.rs)}   rₚ ${fmtSigned(result.rp)}`, 978, 270, COLORS.purple, 15, 'right', 700);
      a.text('能量层', 680, 312, COLORS.muted, 13);
      a.text(`R = ${fmtPct(mixed.R)}   T = ${fmtPct(mixed.T)}`, 978, 312, COLORS.teal, 15, 'right', 700);
      a.text('布儒斯特判据', 680, 354, COLORS.muted, 13);
      a.text(`θᴮ = ${result.brewster.toFixed(2)}°`, 978, 354, COLORS.orange, 15, 'right', 700);
      a.text('关键区别：反射方向由几何决定，反射多少由偏振边界条件决定。', 828, 390, COLORS.ink, 13, 'center', 700);
    }

    function drawCurves(a, result) {
      a.clear();
      const x0 = 62, y0 = 24, width = 610, height = 178;
      a.line(x0, y0 + height, x0 + width, y0 + height, '#80969a', 1.4);
      a.line(x0, y0, x0, y0 + height, '#80969a', 1.4);
      [0,.25,.5,.75,1].forEach(value => {
        const y = y0 + height - value * height;
        a.line(x0, y, x0 + width, y, '#e0e9e8', 1);
        a.text(`${Math.round(value*100)}%`, x0 - 10, y, COLORS.muted, 10, 'right');
      });
      [0,30,60,89].forEach(value => {
        const x = x0 + value / 89 * width;
        a.line(x, y0 + height, x, y0 + height + 6, '#80969a', 1);
        a.text(`${value}°`, x, y0 + height + 19, COLORS.muted, 10, 'center');
      });
      const samples = physics.sampleCurves(state.n1, state.n2, 0.5);
      const curves = [
        { key:'Rs', color:COLORS.teal, label:'Rₛ' },
        { key:'Rp', color:COLORS.orange, label:'Rₚ' }
      ];
      curves.forEach(curve => {
        const ctx = a.ctx; ctx.save(); ctx.beginPath();
        samples.forEach((sample,index) => {
          const x = x0 + sample.angle / 89 * width;
          const y = y0 + height - sample[curve.key] * height;
          index ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
        });
        ctx.strokeStyle = curve.color; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      });
      const bx = x0 + result.brewster / 89 * width;
      a.line(bx, y0, bx, y0 + height, COLORS.purple, 2, [5,4]);
      a.text('θᴮ', bx, y0 + 12, COLORS.purple, 12, 'center', 700);
      if (result.critical != null) {
        const cx = x0 + result.critical / 89 * width;
        a.line(cx, y0, cx, y0 + height, COLORS.red, 2, [5,4]);
        a.text('θc', cx, y0 + 30, COLORS.red, 12, 'center', 700);
      }
      const currentX = x0 + state.angle / 89 * width;
      a.line(currentX, y0, currentX, y0 + height, COLORS.green, 3);
      a.circle(currentX, y0 + height - result.Rs * height, 5, COLORS.teal, '#fff', 2);
      a.circle(currentX, y0 + height - result.Rp * height, 5, COLORS.orange, '#fff', 2);
      a.text(`当前 ${state.angle.toFixed(1)}°`, currentX, 238, COLORS.green, 11, 'center', 700);
      a.text('拖动绿色角度线', 678, 238, COLORS.green, 11, 'right', 700);
      a.text('Rₛ', 626, 39, COLORS.teal, 12, 'left', 700);
      a.text('Rₚ', 664, 39, COLORS.orange, 12, 'left', 700);
    }

    function drawEnergy(a, result, mixed) {
      a.clear();
      const rows = [
        { label:'s 偏振', R:result.Rs, T:result.Ts, amp:result.rs, phase:result.phaseS },
        { label:'p 偏振', R:result.Rp, T:result.Tp, amp:result.rp, phase:result.phaseP },
        { label:'当前混合', R:mixed.R, T:mixed.T, amp:null, phase:null }
      ];
      rows.forEach((row,index) => {
        const y = 48 + index * 67;
        a.text(row.label, 30, y, COLORS.ink, 13, 'left', 700);
        const x = 122, width = 382, height = 24;
        a.rect(x, y - 12, width, height, '#edf3f2', '#d4e1df', 8);
        const rWidth = width * row.R;
        if (rWidth > 0) a.rect(x, y - 12, rWidth, height, COLORS.teal, null, 8);
        if (row.T > 0) a.rect(x + rWidth, y - 12, width - rWidth, height, COLORS.orange, null, 8);
        a.text(`R ${fmtPct(row.R)}`, x + 8, y, row.R > .18 ? '#fff' : COLORS.teal, 11, 'left', 700);
        a.text(`T ${fmtPct(row.T)}`, x + width - 8, y, row.T > .18 ? '#fff' : COLORS.orange, 11, 'right', 700);
        if (row.amp != null) {
          a.text(`r = ${fmtSigned(row.amp)}`, 535, y - 8, COLORS.purple, 12);
          a.text(row.phase == null ? '零点：相位在此翻转' : `反射相位 ${row.phase}°`, 535, y + 12, row.phase == null ? COLORS.red : COLORS.muted, 10);
        }
      });
      a.line(22, 222, 698, 222, '#d7e5e3', 1);
      a.text(`能量残差 max = ${Math.max(result.energyResidualS,result.energyResidualP,Math.abs(mixed.R+mixed.T-1)).toExponential(1)}`, 28, 238, COLORS.muted, 11);
      a.text('青色反射 + 橙色透射 = 100%', 690, 238, COLORS.ink, 11, 'right', 700);
    }

    function drawBoundary(a, result) {
      a.clear();
      const x = 350, y = 128;
      a.line(40, y, 680, y, COLORS.teal, 3);
      a.text('界面', 680, y - 14, COLORS.teal, 12, 'right', 700);
      a.line(x, 22, x, 228, '#91a4a8', 1.2, [6,5]);
      const sHeight = 26 + 42 * Math.sqrt(result.Rs);
      const pHeight = 26 + 42 * Math.sqrt(result.Rp);
      a.text('s：E 垂直入射面', 42, 34, COLORS.purple, 13, 'left', 700);
      [-1,0,1].forEach(i => {
        a.circle(125+i*42, 85, 8, COLORS.purple, COLORS.purple, 1);
        a.circle(125+i*42, 85, 17, 'rgba(255,255,255,0)', COLORS.purple, 1);
      });
      a.arrow(245, 85, 245, 85-sHeight, COLORS.teal, 3);
      a.text(`反射幅度 ${fmtSigned(result.rs)}`, 245, 50, COLORS.teal, 11, 'center');
      a.text('p：E 位于入射面', 410, 34, COLORS.blue, 13, 'left', 700);
      a.arrow(470, 88, 470+pHeight, 88, COLORS.blue, 3);
      a.arrow(570, 88, 570+52, 88, COLORS.orange, 3);
      a.text(`反射幅度 ${fmtSigned(result.rp)}`, 510, 112, COLORS.blue, 11, 'center');
      a.text('切向 E、H 在界面两侧必须同时匹配', 360, 168, COLORS.ink, 15, 'center', 700);
      a.text('s 与 p 的场方向不同 → 同一几何方向下得到不同振幅系数', 360, 202, COLORS.muted, 12, 'center');
      if (!result.tir && Math.abs(state.angle-result.brewster)<.5) a.text('当前 p 反射边界方程给出 rₚ≈0', 360, 232, COLORS.orange, 12, 'center', 700);
    }

    function drawApparatus(a, result) {
      a.clear();
      a.circle(82, 124, 24, '#efffdc', COLORS.green, 3);
      a.text('激光', 82, 124, COLORS.ink, 11, 'center', 700);
      a.arrow(108,124,215,124,COLORS.green,4);
      a.circle(244,124,24,'#fff',COLORS.purple,3);
      a.line(229,139,259,109,COLORS.purple,3);
      a.text('起偏器',244,164,COLORS.purple,11,'center',700);
      a.arrow(270,124,365,124,COLORS.green,4);
      a.rect(382,66,18,116,'#dff4f3',COLORS.teal,4);
      a.text('样品转台',391,198,COLORS.teal,11,'center',700);
      const detectorAngle = toRad(state.angle);
      const dx = 391 + 145*Math.cos(detectorAngle), dy = 124 - 145*Math.sin(detectorAngle);
      a.arrow(400,124,dx,dy,COLORS.teal,3);
      a.circle(dx,dy,19,'#fff4eb',COLORS.orange,3);
      a.text('探测器',dx,dy-29,COLORS.orange,11,'center',700);
      a.rect(565,42,130,166,'#fff','#d6e3e1',12);
      a.text('实测读数',630,64,COLORS.ink,12,'center',700);
      a.text(`Rₛ ${fmtPct(result.Rs)}`,630,101,COLORS.teal,14,'center',700);
      a.text(`Rₚ ${fmtPct(result.Rp)}`,630,132,COLORS.orange,14,'center',700);
      a.text(`θ ${state.angle.toFixed(1)}°`,630,164,COLORS.green,14,'center',700);
      a.text('旋转样品扫描角度，旋转起偏器分离 s/p 曲线',360,232,COLORS.muted,12,'center',700);
    }

    function drawSlot(slot, result, mixed) {
      const key = slot === 'A' ? state.slotA : state.slotB;
      const label = moduleLabels[key];
      slotNodes[slot].querySelector(`[data-r4-title="${slot}"]`).textContent = label[0];
      slotNodes[slot].querySelector(`[data-r4-sub="${slot}"]`).textContent = label[1];
      if (key === 'curves') drawCurves(slotApis[slot], result);
      else if (key === 'energy') drawEnergy(slotApis[slot], result, mixed);
      else if (key === 'boundary') drawBoundary(slotApis[slot], result);
      else drawApparatus(slotApis[slot], result);
      slotNodes[slot].dataset.module = key;
    }

    function update() {
      const result = physics.fresnel(state.n1, state.n2, state.angle);
      const mixed = physics.mixedPower(result, state.pFraction);
      const brewsterDelta = Math.abs(state.angle - result.brewster);
      const residual = Math.max(result.energyResidualS, result.energyResidualP, Math.abs(mixed.R + mixed.T - 1));
      drawMain(result, mixed);
      drawSlot('A', result, mixed);
      drawSlot('B', result, mixed);

      liveStrip.innerHTML = [
        ['当前混合反射率', fmtPct(mixed.R)],
        ['s / p 反射率', `${fmtPct(result.Rs)} / ${fmtPct(result.Rp)}`],
        ['折射角', result.tir ? '无传播解' : `${result.thetaT.toFixed(2)}°`],
        ['布儒斯特角', `${result.brewster.toFixed(2)}°`]
      ].map((item,index)=>`<article class="${index===0?'is-primary':''}"><span>${item[0]}</span><b>${item[1]}</b></article>`).join('');

      if (result.tir) {
        status.className = 'r4w-status warn';
        status.textContent = `当前超过临界角 ${result.critical.toFixed(2)}°：传播折射解消失，Rₛ=Rₚ=100%。倏逝场与全反射相位属于 R5。`;
      } else if (brewsterDelta < .35) {
        status.className = 'r4w-status ok';
        status.textContent = `当前位于布儒斯特零点附近：Rₚ≈0，且 θᵢ+θₜ=${(state.angle+result.thetaT).toFixed(3)}°。反射束趋向纯 s 偏振。`;
      } else {
        status.className = 'r4w-status';
        status.textContent = '改变入射角可看到 Rₚ 先降至零再上升，而 Rₛ 通常随角度增加；方向规律与能量分配必须同时读取。';
      }
      foot.textContent = `p 偏振占比 ${Math.round(state.pFraction*100)}% · R+T=${(mixed.R+mixed.T).toFixed(6)}`;
      checks.innerHTML = [
        ['斯涅尔传播解', result.tir ? '超出 R4 传播区' : '通过', result.tir ? `θᵢ>${result.critical.toFixed(2)}°` : `θₜ=${result.thetaT.toFixed(5)}°`],
        ['能量守恒', residual < 1e-10 ? '通过' : '检查', `最大残差 ${residual.toExponential(2)}`],
        ['布儒斯特零点', brewsterDelta < .35 ? '命中' : '未命中', `|θᵢ−θᴮ|=${brewsterDelta.toFixed(3)}°，Rₚ=${fmtPct(result.Rp)}`],
        ['正入射对称性', state.angle < .2 ? (Math.abs(result.Rs-result.Rp)<1e-10?'通过':'检查') : '当前不适用', state.angle < .2 ? `|Rₛ−Rₚ|=${Math.abs(result.Rs-result.Rp).toExponential(2)}` : '把 θᵢ 调到 0° 可验证。']
      ].map(row=>`<article><span>${row[0]}</span><b>${row[1]}</b><p>${row[2]}</p></article>`).join('');

      syncControls();
      revision += 1;
      root.dataset.renderRevision = String(revision);
      root.dataset.angle = state.angle.toFixed(4);
      root.dataset.brewsterDelta = brewsterDelta.toFixed(8);
      root.dataset.energyResidual = residual.toExponential(8);
      root.dataset.tir = String(result.tir);
      root.dataset.mixedReflectance = mixed.R.toFixed(10);
      requestAnimationFrame(() => {
        [mainCanvas, slotNodes.A.querySelector('canvas'), slotNodes.B.querySelector('canvas')].forEach(canvas => window.CanvasHiDPIV092?.sync(canvas));
      });
    }

    function setAngleFromCurve(slot, event) {
      const canvas = slotNodes[slot].querySelector('canvas');
      const point = pointerInCanvas(canvas, event);
      state.angle = clampValue((point.x - 62) / 610 * 89, 0, 89);
      update();
    }

    const onMainDown = event => {
      const point = pointerInCanvas(mainCanvas, event);
      const source = sourcePoint(state.angle);
      if (Math.hypot(point.x-source.x, point.y-source.y) <= 42) {
        dragMain = true;
        mainCanvas.setPointerCapture(event.pointerId);
        event.preventDefault();
      }
    };
    const onMainMove = event => {
      if (!dragMain) return;
      state.angle = angleFromPointer(pointerInCanvas(mainCanvas,event));
      update();
    };
    const stopMainDrag = () => { dragMain = false; };
    mainCanvas.addEventListener('pointerdown', onMainDown);
    mainCanvas.addEventListener('pointermove', onMainMove);
    mainCanvas.addEventListener('pointerup', stopMainDrag);
    mainCanvas.addEventListener('pointercancel', stopMainDrag);

    Object.entries(slotNodes).forEach(([slot,node]) => {
      const canvas = node.querySelector('canvas');
      canvas.addEventListener('pointerdown', event => {
        const module = slot === 'A' ? state.slotA : state.slotB;
        if (module !== 'curves') return;
        dragCurveSlot = slot;
        canvas.setPointerCapture(event.pointerId);
        setAngleFromCurve(slot,event);
      });
      canvas.addEventListener('pointermove', event => {
        if (dragCurveSlot === slot) setAngleFromCurve(slot,event);
      });
      canvas.addEventListener('pointerup', () => { dragCurveSlot = null; });
      canvas.addEventListener('pointercancel', () => { dragCurveSlot = null; });
    });

    root.querySelector('.r4w-controls').addEventListener('input', event => {
      const input = event.target.closest('[data-r4-param]');
      if (!input) return;
      state[input.dataset.r4Param] = Number(input.value);
      update();
    });
    root.addEventListener('change', event => {
      const select = event.target.closest('[data-r4-slot-select]');
      if (!select) return;
      if (select.dataset.r4SlotSelect === 'A') state.slotA = select.value;
      else state.slotB = select.value;
      update();
    });
    root.querySelector('.r4w-presets').addEventListener('click', event => {
      const button = event.target.closest('[data-r4-preset]');
      if (!button) return;
      Object.assign(state, presets[Number(button.dataset.r4Preset)].values);
      update();
    });
    root.querySelector('[data-r4-reset]').addEventListener('click', () => {
      Object.assign(state,{n1:1,n2:1.52,angle:45,pFraction:.5,slotA:'curves',slotB:'energy'});
      update();
    });
    drawerHandle.addEventListener('click', () => setDrawer(!drawerOpen));
    root.querySelector('[data-r4-close]').addEventListener('click', () => setDrawer(false));
    backdrop.addEventListener('click', () => setDrawer(false));
    const keyHandler = event => { if (event.key === 'Escape') setDrawer(false); };
    window.addEventListener('keydown', keyHandler);

    update();
    typeset(root);

    return () => {
      window.removeEventListener('keydown', keyHandler);
      mainCanvas.removeEventListener('pointerdown', onMainDown);
      mainCanvas.removeEventListener('pointermove', onMainMove);
      mainCanvas.removeEventListener('pointerup', stopMainDrag);
      mainCanvas.removeEventListener('pointercancel', stopMainDrag);
    };
  }

  renderModel = function renderR4Workbench(id) {
    destroyR4();
    destroyR4 = () => {};
    if (id !== 'fresnel-brewster') return previousRender(id);
    previousRender(id);
    destroyR4 = renderR4();
  };
  window.renderModel = renderModel;
  window.R4FresnelWorkbenchV019 = { version:'0.19.0', model:'fresnel-brewster', render:renderR4 };
})();
