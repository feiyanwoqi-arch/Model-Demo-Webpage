'use strict';
(() => {
  const previousRender = window.renderModel;
  if (typeof previousRender !== 'function') return;

  const modules = [
    {id:'apparatus', label:'真实实验装置', group:'实验上下文', selector:'#tfApparatus', summary:'查看光源、偏振、样品和探测器怎样组成测量链。'},
    {id:'phase', label:'界面反射相位', group:'局部机制', selector:'#tfPhaseLedger', summary:'分别检查两个界面的反射振幅符号与 0/π 相位。'},
    {id:'phasor', label:'多束相量', group:'局部机制', selector:'#tfPhasor', summary:'观察各次反射束如何组成复振幅几何级数。'},
    {id:'spectrum', label:'光谱、能量与颜色', group:'可观测量', selector:'#tfSpectrum', summary:'把场叠加转化为 R、T、偏振谱和综合色。'},
    {id:'heatmap', label:'膜厚—角度相图', group:'全局结构', selector:'#tfHeatmap', summary:'一次查看膜厚和角度共同改变时的反射率结构。'},
    {id:'measurement', label:'盲样测量与反演', group:'虚拟实验', selector:'#tfMeasurement', summary:'由带噪光谱反演未知膜厚并检查误差。'},
    {id:'formula', label:'公式—对象映射', group:'数学表征', selector:'.tf-formula-map', summary:'让每个公式项重新对应到几何和物理对象。'},
    {id:'validation', label:'自洽性与模型边界', group:'验证', selector:'#tfValidation', summary:'检查守恒、收敛、近似误差和适用范围。'}
  ];
  const presets = {
    phase:['phase','phasor'],
    spectrum:['spectrum','heatmap'],
    experiment:['apparatus','measurement','validation'],
    panorama:['phase','phasor','spectrum','validation']
  };
  const MAX_ACTIVE = 4;
  let cleanup = () => {};

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function sectionFor(root, selector) {
    const hit = root.querySelector(selector);
    return hit?.closest('.tf-section, section, article') || null;
  }

  function compactPurpose(section) {
    const purpose = section.querySelector(':scope > .mp-purpose');
    if (!purpose || purpose.closest('details')) return;
    const details = document.createElement('details');
    details.className = 'tfw-purpose';
    const summary = document.createElement('summary');
    summary.textContent = '本模块目的、作用与建议操作';
    details.append(summary, purpose);
    const head = section.querySelector(':scope > .card-head');
    if (head) head.insertAdjacentElement('afterend', details);
    else section.prepend(details);
  }

  function mountWorkbench() {
    const root = document.getElementById('view');
    if (!root || !location.hash.includes('model:thin-film')) return () => {};

    const hero = root.querySelector('.tf-hero');
    const command = root.querySelector('.tf-command');
    const geometry = sectionFor(root, '#tfGeometry');
    const controls = root.querySelector('.tf-side');
    if (!hero || !command || !geometry || !controls) return () => {};

    const moduleMap = new Map();
    for (const def of modules) {
      const section = sectionFor(root, def.selector);
      if (!section || section === geometry) continue;
      compactPurpose(section);
      section.classList.add('tfw-module');
      section.dataset.moduleId = def.id;
      moduleMap.set(def.id, {def, section});
    }

    const shell = document.createElement('div');
    shell.className = 'tfw-shell';
    const dock = document.createElement('aside');
    dock.className = 'tfw-dock card';
    const core = document.createElement('main');
    core.className = 'tfw-core-column';
    const analysis = document.createElement('section');
    analysis.className = 'tfw-analysis-column';
    const board = document.createElement('div');
    board.className = 'tfw-board';
    board.dataset.count = '0';
    const reservoir = document.createElement('div');
    reservoir.className = 'tfw-reservoir';
    reservoir.hidden = true;

    const groups = [...new Set(modules.map(m => m.group))];
    dock.innerHTML = `
      <div class="tfw-dock-head"><span>LIVE ANALYSIS DOCK</span><h2>同步分析模块</h2><p>勾选后挂载到右侧；拖动主光线时，所有已选模块同时更新。</p></div>
      <div class="tfw-presets" aria-label="分析预设">
        <button type="button" data-preset="phase">相位机制</button>
        <button type="button" data-preset="spectrum">光谱分析</button>
        <button type="button" data-preset="experiment">实验反演</button>
        <button type="button" data-preset="panorama">四窗全景</button>
        <button type="button" data-preset="clear">清空</button>
      </div>
      <div class="tfw-module-groups">${groups.map(group => `<fieldset><legend>${escapeHtml(group)}</legend>${modules.filter(m=>m.group===group).map(m=>`<label class="tfw-choice"><input type="checkbox" value="${m.id}"><span><b>${escapeHtml(m.label)}</b><small>${escapeHtml(m.summary)}</small></span></label>`).join('')}</fieldset>`).join('')}</div>
      <div class="tfw-limit"><b><output id="tfwCount">0</output> / ${MAX_ACTIVE}</b><span id="tfwMessage">默认不显示分析模块；建议同时开启 1～2 个，最多 4 个。</span></div>`;

    analysis.innerHTML = `<header class="tfw-analysis-head"><div><span>SYNCHRONIZED VIEWS</span><h2>同步分析区</h2><p>这里不是后续阅读章节，而是与主实验台同一状态、同一时刻的协调视图。</p></div><div class="tfw-live" aria-live="polite"><i></i><span>等待选择模块</span></div></header>`;
    analysis.append(board);
    const empty = document.createElement('div');
    empty.className = 'tfw-empty';
    empty.innerHTML = '<b>尚未挂载分析模块</b><span>从左侧勾选一个方面，再拖动主光线或改变参数，便可同时观察对应结果。</span>';
    board.append(empty);

    hero.classList.add('tfw-hero');
    command.classList.add('tfw-command');
    geometry.classList.add('tfw-core-stage');
    controls.classList.add('tfw-controls');
    const guidePurpose = geometry.querySelector(':scope > .mp-purpose');
    if (guidePurpose) guidePurpose.classList.add('tfw-core-purpose');

    const oldShell = root.querySelector('.mp-page-shell');
    root.replaceChildren(shell);
    shell.append(hero, dock, core, analysis, controls, reservoir);
    core.append(command, geometry);
    for (const {section} of moduleMap.values()) reservoir.append(section);
    oldShell?.remove();
    root.classList.add('tfw-mounted');

    const countOut = dock.querySelector('#tfwCount');
    const message = dock.querySelector('#tfwMessage');
    const liveText = analysis.querySelector('.tfw-live span');
    const checkboxes = [...dock.querySelectorAll('input[type="checkbox"]')];
    let focused = null;
    let pulseTimer = 0;

    function pulse() {
      analysis.classList.remove('tfw-pulse');
      void analysis.offsetWidth;
      analysis.classList.add('tfw-pulse');
      liveText.textContent = activeIds().length ? '已同步更新' : '等待选择模块';
      clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => analysis.classList.remove('tfw-pulse'), 420);
    }

    function activeIds() {
      return [...board.querySelectorAll('.tfw-module')].map(x => x.dataset.moduleId);
    }

    function decoratePanel(id) {
      const item = moduleMap.get(id);
      if (!item) return;
      const {section, def} = item;
      if (section.querySelector('.tfw-panel-actions')) return;
      const actions = document.createElement('div');
      actions.className = 'tfw-panel-actions';
      actions.innerHTML = `<button type="button" data-focus="${id}" aria-label="放大${escapeHtml(def.label)}">放大</button><button type="button" data-remove="${id}" aria-label="关闭${escapeHtml(def.label)}">关闭</button>`;
      section.querySelector(':scope > .card-head')?.append(actions);
    }

    function refreshLayout() {
      const ids = activeIds();
      board.dataset.count = String(ids.length);
      countOut.textContent = String(ids.length);
      empty.hidden = ids.length > 0;
      liveText.textContent = ids.length ? `${ids.length} 个模块实时联动` : '等待选择模块';
      checkboxes.forEach(cb => {
        cb.checked = ids.includes(cb.value);
        cb.disabled = !cb.checked && ids.length >= MAX_ACTIVE;
      });
      if (focused && !ids.includes(focused)) focused = null;
      board.classList.toggle('tfw-focused', Boolean(focused));
      board.querySelectorAll('.tfw-module').forEach(x => x.classList.toggle('tfw-focus-target', x.dataset.moduleId === focused));
      if (!ids.length) message.textContent = '默认不显示分析模块；建议同时开启 1～2 个，最多 4 个。';
      else message.textContent = '拖动主光线、膜厚或参数时，已选模块会在同一状态下重绘。';
      requestAnimationFrame(() => {
        for (const id of ids) {
          const canvas = moduleMap.get(id)?.section.querySelector('canvas');
          if (canvas) window.CanvasHiDPIV092?.sync(canvas);
        }
        const control = root.querySelector('#tfControls input[data-key], #tfControls select[data-key]');
        control?.dispatchEvent(new Event(control.tagName === 'SELECT' ? 'change' : 'input', {bubbles:true}));
      });
    }

    function add(id) {
      const item = moduleMap.get(id);
      if (!item || activeIds().includes(id)) return;
      if (activeIds().length >= MAX_ACTIVE) {
        message.textContent = '同步窗口最多 4 个；请先关闭一个模块，或使用“放大”聚焦当前模块。';
        return;
      }
      decoratePanel(id);
      board.append(item.section);
      refreshLayout();
      pulse();
    }

    function remove(id) {
      const item = moduleMap.get(id);
      if (!item) return;
      reservoir.append(item.section);
      if (focused === id) focused = null;
      refreshLayout();
    }

    function applyPreset(name) {
      const wanted = name === 'clear' ? [] : presets[name] || [];
      for (const id of activeIds()) if (!wanted.includes(id)) remove(id);
      for (const id of wanted) add(id);
      refreshLayout();
    }

    dock.addEventListener('change', event => {
      const cb = event.target.closest('input[type="checkbox"]');
      if (!cb) return;
      cb.checked ? add(cb.value) : remove(cb.value);
    });
    dock.addEventListener('click', event => {
      const preset = event.target.closest('[data-preset]');
      if (preset) applyPreset(preset.dataset.preset);
    });
    board.addEventListener('click', event => {
      const removeButton = event.target.closest('[data-remove]');
      if (removeButton) return remove(removeButton.dataset.remove);
      const focusButton = event.target.closest('[data-focus]');
      if (focusButton) {
        focused = focused === focusButton.dataset.focus ? null : focusButton.dataset.focus;
        focusButton.textContent = focused ? '还原' : '放大';
        refreshLayout();
      }
    });

    const updateListener = event => {
      if (event.target.closest('#tfControls, #tfGeometry, .tf-command')) pulse();
    };
    root.addEventListener('input', updateListener, true);
    root.addEventListener('pointermove', updateListener, true);
    refreshLayout();

    return () => {
      clearTimeout(pulseTimer);
      root.removeEventListener('input', updateListener, true);
      root.removeEventListener('pointermove', updateListener, true);
    };
  }

  window.renderModel = function renderModelWorkbench(id) {
    cleanup(); cleanup = () => {};
    const result = previousRender(id);
    if (id === 'thin-film') {
      requestAnimationFrame(() => requestAnimationFrame(() => { cleanup = mountWorkbench(); }));
    }
    return result;
  };
})();
