'use strict';
(() => {
  const previousRender = window.renderModel;
  if (typeof previousRender !== 'function') return;

  let cleanup = () => {};
  const OPEN_DELAY = 140;
  const CLOSE_DELAY = 560;

  const safeStorage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
  };

  function wrapPurpose(section, label) {
    if (!section) return;
    const purpose = section.querySelector(':scope > .mp-purpose, :scope > .mp-purpose-command');
    if (!purpose || purpose.closest('.tfr-inline-help')) return;
    const details = document.createElement('details');
    details.className = 'tfr-inline-help';
    const summary = document.createElement('summary');
    summary.textContent = label;
    purpose.replaceWith(details);
    details.append(summary, purpose);
  }

  function createDrawerToolbar(side, title) {
    const toolbar = document.createElement('div');
    toolbar.className = 'tfr-drawer-toolbar';
    toolbar.innerHTML = `<strong>${title}</strong><span><button type="button" data-tfr-pin="${side}" aria-pressed="false" title="固定侧栏">📌</button><button type="button" data-tfr-close="${side}" title="收起侧栏">×</button></span>`;
    return toolbar;
  }

  function createHandle(side, label, detail) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tfr-handle tfr-${side}-handle`;
    button.dataset.tfrToggle = side;
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = `<i>${side === 'left' ? '◫' : '≡'}</i><b>${label}</b><small>${detail}</small>`;
    return button;
  }

  function mountRails() {
    const root = document.getElementById('view');
    if (!root || !location.hash.includes('model:thin-film')) return () => {};
    const shell = root.querySelector('.tfw-shell');
    const leftDrawer = shell?.querySelector('.tfw-dock');
    const rightDrawer = shell?.querySelector('.tfw-controls');
    const core = shell?.querySelector('.tfw-core-column');
    if (!shell || !leftDrawer || !rightDrawer || !core) return () => {};

    document.body.classList.add('tfr-workbench-active');
    root.classList.add('tfr-mounted');
    leftDrawer.classList.add('tfr-drawer', 'tfr-left-drawer');
    rightDrawer.classList.add('tfr-drawer', 'tfr-right-drawer');

    const command = core.querySelector('.tfw-command');
    const stage = core.querySelector('.tfw-core-stage');
    wrapPurpose(command, '实验状态与时间控制的目的与作用');
    wrapPurpose(stage, '主实验台的目的、作用与建议操作');

    const layer = document.createElement('div');
    layer.className = 'tfr-edge-layer';
    const leftHandle = createHandle('left', '模块', '0 / 4');
    const rightHandle = createHandle('right', '参数', 'θ · d · λ');
    const scrim = document.createElement('button');
    scrim.type = 'button';
    scrim.className = 'tfr-scrim';
    scrim.setAttribute('aria-label', '关闭侧栏');
    layer.append(leftHandle, rightHandle, scrim);
    root.append(layer);

    leftDrawer.prepend(createDrawerToolbar('left', '同步分析模块'));
    rightDrawer.prepend(createDrawerToolbar('right', '完整参数检查器'));

    const mediaHover = matchMedia('(hover:hover) and (pointer:fine)');
    const mediaOverlay = matchMedia('(max-width:1100px)');
    const states = {
      left: {
        drawer: leftDrawer,
        handle: leftHandle,
        pinned: safeStorage.get('thinFilm.leftRailPinned') === '1',
        open: false,
        openTimer: 0,
        closeTimer: 0,
        hold: false
      },
      right: {
        drawer: rightDrawer,
        handle: rightHandle,
        pinned: safeStorage.get('thinFilm.rightRailPinned') === '1',
        open: false,
        openTimer: 0,
        closeTimer: 0,
        hold: false
      }
    };

    function updateBodyClasses() {
      document.body.classList.toggle('tfr-left-pinned', states.left.pinned);
      document.body.classList.toggle('tfr-right-pinned', states.right.pinned);
      const anyOverlay = mediaOverlay.matches && (states.left.open || states.right.open);
      scrim.classList.toggle('is-visible', anyOverlay);
    }

    function updatePin(side) {
      const state = states[side];
      const button = state.drawer.querySelector(`[data-tfr-pin="${side}"]`);
      button?.setAttribute('aria-pressed', String(state.pinned));
      if (button) button.textContent = state.pinned ? '📍' : '📌';
      state.drawer.classList.toggle('is-pinned', state.pinned);
      safeStorage.set(`thinFilm.${side}RailPinned`, state.pinned ? '1' : '0');
    }

    function setOpen(side, open, {focus = false} = {}) {
      const state = states[side];
      clearTimeout(state.openTimer);
      clearTimeout(state.closeTimer);
      state.open = Boolean(open || state.pinned);
      state.drawer.classList.toggle('is-open', state.open);
      state.handle.classList.toggle('is-open', state.open);
      state.handle.setAttribute('aria-expanded', String(state.open));
      root.classList.toggle(`tfr-${side}-open`, state.open);
      updateBodyClasses();
      if (focus && state.open) {
        requestAnimationFrame(() => state.drawer.querySelector('button,input,select,summary')?.focus({preventScroll:true}));
      }
    }

    function scheduleOpen(side) {
      const state = states[side];
      clearTimeout(state.closeTimer);
      if (state.open) return;
      state.openTimer = setTimeout(() => setOpen(side, true), mediaHover.matches ? OPEN_DELAY : 0);
    }

    function scheduleClose(side) {
      const state = states[side];
      clearTimeout(state.openTimer);
      if (state.pinned || state.hold) return;
      state.closeTimer = setTimeout(() => {
        if (state.drawer.matches(':hover') || state.handle.matches(':hover') || state.drawer.contains(document.activeElement)) return;
        setOpen(side, false);
      }, CLOSE_DELAY);
    }

    function togglePinned(side) {
      const state = states[side];
      state.pinned = !state.pinned;
      updatePin(side);
      setOpen(side, state.pinned || state.open);
      if (!state.pinned) scheduleClose(side);
    }

    function closeAll() {
      for (const side of ['left','right']) {
        states[side].pinned = false;
        updatePin(side);
        setOpen(side, false);
      }
    }

    for (const side of ['left','right']) {
      const state = states[side];
      updatePin(side);
      setOpen(side, state.pinned);

      for (const target of [state.handle, state.drawer]) {
        target.addEventListener('pointerenter', () => mediaHover.matches && scheduleOpen(side));
        target.addEventListener('pointerleave', () => mediaHover.matches && scheduleClose(side));
        target.addEventListener('focusin', () => scheduleOpen(side));
        target.addEventListener('focusout', () => scheduleClose(side));
      }

      state.handle.addEventListener('click', () => setOpen(side, !state.open, {focus: !state.open}));
      state.drawer.addEventListener('click', event => {
        if (event.target.closest(`[data-tfr-pin="${side}"]`)) togglePinned(side);
        if (event.target.closest(`[data-tfr-close="${side}"]`)) {
          state.pinned = false;
          updatePin(side);
          setOpen(side, false);
          state.handle.focus({preventScroll:true});
        }
      });
      state.drawer.addEventListener('pointerdown', event => {
        if (event.target.closest('input[type="range"],select,button,summary')) state.hold = true;
      });
    }

    function releaseHolds() {
      for (const side of ['left','right']) {
        states[side].hold = false;
        scheduleClose(side);
      }
    }
    window.addEventListener('pointerup', releaseHolds, true);
    window.addEventListener('pointercancel', releaseHolds, true);
    scrim.addEventListener('click', closeAll);

    const keyHandler = event => {
      if (event.key !== 'Escape') return;
      const side = states.right.open ? 'right' : states.left.open ? 'left' : null;
      if (!side) return;
      states[side].pinned = false;
      updatePin(side);
      setOpen(side, false);
      states[side].handle.focus({preventScroll:true});
    };
    document.addEventListener('keydown', keyHandler);

    const count = leftDrawer.querySelector('#tfwCount');
    const updateCount = () => {
      const value = count?.textContent?.trim() || '0';
      leftHandle.querySelector('small').textContent = `${value} / 4`;
      leftHandle.classList.toggle('has-selection', value !== '0');
    };
    updateCount();
    const countObserver = count ? new MutationObserver(updateCount) : null;
    countObserver?.observe(count, {subtree:true, childList:true, characterData:true});

    const parameterPulse = event => {
      if (!event.target.closest('.tfr-right-drawer input,.tfr-right-drawer select,.tfr-right-drawer button')) return;
      rightHandle.classList.remove('has-update');
      void rightHandle.offsetWidth;
      rightHandle.classList.add('has-update');
      setTimeout(() => rightHandle.classList.remove('has-update'), 420);
    };
    rightDrawer.addEventListener('input', parameterPulse, true);
    rightDrawer.addEventListener('change', parameterPulse, true);

    const mediaHandler = () => {
      for (const side of ['left','right']) {
        if (mediaOverlay.matches && !states[side].pinned) setOpen(side, false);
      }
      updateBodyClasses();
    };
    mediaOverlay.addEventListener?.('change', mediaHandler);

    return () => {
      countObserver?.disconnect();
      document.removeEventListener('keydown', keyHandler);
      window.removeEventListener('pointerup', releaseHolds, true);
      window.removeEventListener('pointercancel', releaseHolds, true);
      mediaOverlay.removeEventListener?.('change', mediaHandler);
      document.body.classList.remove('tfr-workbench-active','tfr-left-pinned','tfr-right-pinned');
      root.classList.remove('tfr-mounted','tfr-left-open','tfr-right-open');
      layer.remove();
    };
  }

  window.renderModel = function renderModelAdaptiveRails(id) {
    cleanup();
    cleanup = () => {};
    const result = previousRender(id);
    if (id === 'thin-film') {
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
        cleanup = mountRails();
      })));
    }
    return result;
  };
})();
