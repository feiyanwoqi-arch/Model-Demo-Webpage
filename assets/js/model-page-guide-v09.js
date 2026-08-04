'use strict';
(() => {
  const previousRender = window.renderModel;
  if (typeof previousRender !== 'function') return;

  let destroyCurrent = () => {};

  const pages = {
    'thin-film': {
      title: '单层薄膜干涉旗舰实验',
      domain: '干涉',
      scope: '无吸收、各向同性、非磁性、平行均匀的单层介质膜',
      sections: [
        {
          id: 'tf-overview', number: '00', label: '模型总览', nav: '先确定研究对象与边界', selector: '.tf-hero', kind: 'hero',
          purpose: '先回答“这个模型究竟研究什么”，并给出精确核心关系和适用边界。',
          role: '建立全页的统一问题意识，避免用户在大量图表中失去主线。',
          action: '先阅读标题、精确反射振幅和模型边界，再进入参数操作。'
        },
        {
          id: 'tf-state', number: '01', label: '实验状态与时间', nav: '统一所有视图的状态', selector: '.tf-command', kind: 'command',
          purpose: '选择理想理论或现实实验层级，并控制所有相量共享的公共时间相位。',
          role: '保证后续装置图、几何图、相量、光谱和测量结果来自同一物理状态。',
          action: '先暂停时间，再逐步推进相位；需要观察平均效应时切换到现实实验。'
        },
        {
          id: 'tf-apparatus-section', number: '02', label: '真实实验装置', nav: '参数如何对应真实器件', selector: '#tfApparatus',
          purpose: '说明光源、准直、偏振、样品、收集光学与探测器如何构成真实测量链。',
          role: '把抽象参数映射到可调器件和可测信号，区分“理论状态量”与“仪器读数”。',
          action: '沿光路从左到右读图，并确认每个右侧参数在装置中对应哪个元件。'
        },
        {
          id: 'tf-geometry-section', number: '03', label: '几何、光路与波前', nav: '建立角度和光程', selector: '#tfGeometry',
          purpose: '建立三层介质、入射角、折射角、膜厚和膜内往返路径的统一几何。',
          role: '给传播相位提供可见的几何来源，同时承担最直接的拖动交互。',
          action: '拖动绿色角度把手和青色膜厚把手，观察所有视图如何同步响应。'
        },
        {
          id: 'tf-phase-section', number: '04', label: '界面反射相位', nav: '分开记录两个界面', selector: '#tfPhaseLedger',
          purpose: '分别判断上、下界面反射振幅的符号及其 0 或 π 相位变化。',
          role: '把界面相位与传播相位彻底分开，避免机械套用“半波损失”口诀。',
          action: '改变 n₁、n₂、n₃ 的大小顺序，观察两条反射振幅箭头是否翻向。'
        },
        {
          id: 'tf-phasor-section', number: '05', label: '多束相量与稳态', nav: '看见无穷多束怎样相加', selector: '#tfPhasor',
          purpose: '展示第一束、第二束和后续往返束的复振幅首尾相加及其闭式总和。',
          role: '解释为什么“两束光路图”只是直觉入口，而精确反射来自几何级数。',
          action: '暂停后逐步推进时间，区分相量的共同转动与各束之间固定的相对相位。'
        },
        {
          id: 'tf-spectrum-section', number: '06', label: '光谱、能量与颜色', nav: '从场叠加走向观测', selector: '#tfSpectrum',
          purpose: '把复振幅转化为反射率、透射率、偏振谱和综合色。',
          role: '连接微观相位机制与光谱仪、功率计和人眼最终接收到的宏观结果。',
          action: '比较精确多束解与两束近似，再改变光源和偏振观察谱形与颜色。'
        },
        {
          id: 'tf-map-section', number: '07', label: '膜厚—角度相图', nav: '查看参数空间全局结构', selector: '#tfHeatmap',
          purpose: '一次显示膜厚和入射角共同改变时的反射率全局结构。',
          role: '突破单个滑块只能看到局部变化的限制，识别等相位轨迹和周期结构。',
          action: '先固定波长，再沿横向、纵向和斜向比较相图中的反射率变化。'
        },
        {
          id: 'tf-inverse-section', number: '08', label: '盲样测量与反演', nav: '由数据反推膜厚', selector: '#tfMeasurement',
          purpose: '生成带噪声光谱，并由全谱最小二乘反演未知膜厚。',
          role: '把正向演示升级为真实物理工作流：测量、建模、拟合、揭示真值和评价误差。',
          action: '依次点击生成盲样、拟合膜厚、揭示真值；最后导出 CSV 检查数据。'
        },
        {
          id: 'tf-formula-section', number: '09', label: '公式—对象映射', nav: '让符号重新落回物理对象', selector: '.tf-formula-map',
          purpose: '把公式中的每个符号、相位项和振幅项绑定到图中的具体对象。',
          role: '防止公式与图形各自成立却彼此脱节，训练跨表征的一一对应能力。',
          action: '点击任一公式项，检查装置、界面、光路和结果区域是否同步高亮。'
        },
        {
          id: 'tf-validation-section', number: '10', label: '自洽性与模型边界', nav: '判断何时可信、何时失效', selector: '#tfValidation',
          purpose: '检查能量守恒、多束级数收敛、两束近似误差和当前模型的适用范围。',
          role: '把模型从“漂亮动画”变为可被证伪、可被验证、明确标注边界的物理工具。',
          action: '优先查看失败或警告项；参数越极端，越要先确认模型边界而不是直接相信图形。'
        }
      ]
    }
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  function sectionContainer(root, def) {
    const hit = root.querySelector(def.selector);
    if (!hit) return null;
    if (def.kind === 'hero' || def.kind === 'command') return hit;
    return hit.closest('.tf-section, .card, section, article') || hit;
  }

  function purposeHtml(def) {
    return `<div class="mp-purpose" data-purpose-for="${escapeHtml(def.id)}">
      <div><span>本节目的</span><p>${escapeHtml(def.purpose)}</p></div>
      <div><span>它的作用</span><p>${escapeHtml(def.role)}</p></div>
      <div><span>建议操作</span><p>${escapeHtml(def.action)}</p></div>
    </div>`;
  }

  function ensureHeading(node, def) {
    if (def.kind === 'hero') {
      const h1 = node.querySelector('h1');
      if (h1) {
        h1.id = `${def.id}-heading`;
        node.setAttribute('aria-labelledby', h1.id);
      }
      return;
    }

    let heading = node.querySelector('.card-head .head-title > div > h2, .card-head h2');
    if (!heading) {
      const old = node.querySelector('.card-head .head-title > div > b, .card-head b');
      if (old) {
        heading = document.createElement('h2');
        heading.className = 'mp-section-title';
        heading.innerHTML = old.innerHTML;
        old.replaceWith(heading);
      }
    }
    if (!heading) {
      heading = document.createElement('h2');
      heading.className = 'mp-visually-hidden';
      heading.textContent = def.label;
      node.prepend(heading);
    }
    heading.id = `${def.id}-heading`;
    node.setAttribute('aria-labelledby', heading.id);
  }

  function insertPurpose(node, def) {
    if (node.querySelector(`[data-purpose-for="${def.id}"]`)) return;
    const holder = document.createElement('div');
    holder.innerHTML = purposeHtml(def);
    const purpose = holder.firstElementChild;

    if (def.kind === 'hero') {
      const left = node.firstElementChild || node;
      const paragraph = left.querySelector('p');
      if (paragraph) paragraph.insertAdjacentElement('afterend', purpose);
      else left.appendChild(purpose);
      purpose.classList.add('mp-purpose-hero');
      return;
    }

    if (def.kind === 'command') {
      node.prepend(purpose);
      purpose.classList.add('mp-purpose-command');
      return;
    }

    const head = node.querySelector(':scope > .card-head') || node.querySelector('.card-head');
    if (head) head.insertAdjacentElement('afterend', purpose);
    else node.prepend(purpose);
  }

  function buildNav(config, mounted) {
    const nav = document.createElement('nav');
    nav.className = 'mp-toc card';
    nav.setAttribute('aria-labelledby', 'mp-toc-title');
    nav.innerHTML = `<div class="mp-toc-head">
      <div><span>ON THIS MODEL</span><h2 id="mp-toc-title">本页项目栏</h2></div>
      <output class="mp-toc-count">1 / ${mounted.length}</output>
    </div>
    <div class="mp-progress" aria-hidden="true"><i></i></div>
    <ol>${mounted.map((item, index) => `<li>
      <button type="button" data-mp-target="${escapeHtml(item.def.id)}" ${index === 0 ? 'aria-current="true"' : ''}>
        <i>${escapeHtml(item.def.number)}</i>
        <span><b>${escapeHtml(item.def.label)}</b><small>${escapeHtml(item.def.nav)}</small></span>
      </button>
    </li>`).join('')}</ol>
    <div class="mp-toc-scope"><b>统一模型边界</b><span>${escapeHtml(config.scope)}</span></div>
    <button type="button" class="mp-back" data-route="category:interference">← 返回${escapeHtml(config.domain)}模型图谱</button>`;
    return nav;
  }

  function mountPage(modelId, config) {
    const root = document.getElementById('view');
    if (!root || !location.hash.includes(`model:${modelId}`)) return () => {};

    root.classList.add('mp-mounted');
    const mounted = [];
    for (const def of config.sections) {
      const node = sectionContainer(root, def);
      if (!node) continue;
      node.id = def.id;
      node.classList.add('mp-guided-section');
      node.tabIndex = -1;
      ensureHeading(node, def);
      insertPurpose(node, def);
      mounted.push({ def, node });
    }
    if (!mounted.length) return () => {};

    const content = document.createElement('div');
    content.className = 'mp-page-content';
    while (root.firstChild) content.appendChild(root.firstChild);

    const nav = buildNav(config, mounted);
    const shell = document.createElement('div');
    shell.className = 'mp-page-shell';
    shell.append(nav, content);
    root.appendChild(shell);

    const buttons = [...nav.querySelectorAll('[data-mp-target]')];
    const count = nav.querySelector('.mp-toc-count');
    const progress = nav.querySelector('.mp-progress i');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let activeIndex = -1;
    let raf = 0;

    function setActive(index) {
      if (index === activeIndex || index < 0) return;
      activeIndex = index;
      buttons.forEach((button, i) => {
        if (i === index) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      count.textContent = `${index + 1} / ${mounted.length}`;
      progress.style.height = `${((index + 1) / mounted.length) * 100}%`;
      const activeButton = buttons[index];
      if (activeButton && nav.scrollHeight > nav.clientHeight) {
        activeButton.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    }

    function updateFromScroll() {
      raf = 0;
      const marker = Math.min(190, window.innerHeight * 0.28);
      let index = 0;
      for (let i = 0; i < mounted.length; i++) {
        if (mounted[i].node.getBoundingClientRect().top <= marker) index = i;
        else break;
      }
      setActive(index);
    }

    function onScroll() {
      if (!raf) raf = requestAnimationFrame(updateFromScroll);
    }

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => {
        const target = mounted[index].node;
        target.scrollIntoView({
          behavior: reducedMotion.matches ? 'auto' : 'smooth',
          block: 'start'
        });
        setActive(index);
        window.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion.matches ? 0 : 420);
      });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateFromScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }

  window.ModelPageGuideV09 = {
    version: '0.9.0',
    register(modelId, config) { pages[modelId] = config; },
    mount(modelId) {
      destroyCurrent();
      destroyCurrent = pages[modelId] ? mountPage(modelId, pages[modelId]) : () => {};
    }
  };

  window.renderModel = function renderModelV09(modelId) {
    destroyCurrent();
    destroyCurrent = () => {};
    const result = previousRender(modelId);
    requestAnimationFrame(() => {
      if (pages[modelId]) destroyCurrent = mountPage(modelId, pages[modelId]);
    });
    return result;
  };

  window.addEventListener('hashchange', () => {
    if (!location.hash.includes('model:')) {
      destroyCurrent();
      destroyCurrent = () => {};
    }
  });
})();
