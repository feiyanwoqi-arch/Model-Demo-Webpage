'use strict';
(() => {
  const previousRender = window.renderModel;
  if (typeof previousRender !== 'function') return;

  const compactViews = {
    apparatus: { selector: '#tfApparatus', top: 50, visible: 390, width: 1080, height: 470 },
    phase: { selector: '#tfPhaseLedger', top: 55, visible: 360, width: 720, height: 450 },
    phasor: { selector: '#tfPhasor', top: 55, visible: 360, width: 720, height: 450 },
    spectrum: { selector: '#tfSpectrum', top: 58, visible: 425, width: 1080, height: 530 },
    heatmap: { selector: '#tfHeatmap', top: 55, visible: 405, width: 1080, height: 500 },
    measurement: { selector: '#tfMeasurement', top: 48, visible: 390, width: 820, height: 470 },
    validation: { selector: '#tfValidation', top: 45, visible: 345, width: 720, height: 420 }
  };

  let cleanup = () => {};

  function wrapCanvas(root, id, profile) {
    const canvas = root.querySelector(profile.selector);
    const section = canvas?.closest('.tfw-module');
    if (!canvas || !section || canvas.closest('.tfv-canvas-window')) return;

    const windowEl = document.createElement('div');
    windowEl.className = 'tfv-canvas-window';
    windowEl.dataset.compactView = id;
    windowEl.style.setProperty('--tfv-crop-y', `${-(profile.top / profile.height) * 100}%`);
    windowEl.style.setProperty('--tfv-natural-ratio', `${profile.width} / ${profile.visible}`);
    windowEl.style.setProperty('--tfv-canvas-ratio', `${profile.width} / ${profile.height}`);
    canvas.replaceWith(windowEl);
    windowEl.append(canvas);
    section.dataset.compactReady = 'true';
  }

  function install() {
    const root = document.getElementById('view');
    const board = root?.querySelector('.tfw-board');
    if (!root || !board || !location.hash.includes('model:thin-film')) return null;

    for (const [id, profile] of Object.entries(compactViews)) wrapCanvas(root, id, profile);
    root.classList.add('tfv-mounted');

    const sync = () => {
      const count = Number(board.dataset.count || 0);
      root.dataset.simultaneousMode = count === 2 ? 'triple' : count > 2 ? 'overview' : 'single';
      requestAnimationFrame(() => {
        board.querySelectorAll('canvas').forEach(canvas => window.CanvasHiDPIV092?.sync(canvas));
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(board, { attributes: true, attributeFilter: ['data-count'], childList: true });
    window.addEventListener('resize', sync, { passive: true });
    sync();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }

  function waitForWorkbench(attempt = 0) {
    const mounted = install();
    if (mounted) {
      cleanup = mounted;
      return;
    }
    if (attempt < 30 && location.hash.includes('model:thin-film')) {
      requestAnimationFrame(() => waitForWorkbench(attempt + 1));
    }
  }

  window.renderModel = function renderModelSimultaneousViewport(id) {
    cleanup();
    cleanup = () => {};
    const result = previousRender(id);
    if (id === 'thin-film') requestAnimationFrame(() => waitForWorkbench());
    return result;
  };
})();
