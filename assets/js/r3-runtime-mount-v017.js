'use strict';
(() => {
  if (window.R3RuntimeMountV017) return;
  let pending = 0;
  const view = document.getElementById('view');

  function syncViewClass() {
    const isR3 = Boolean(document.querySelector('.rfw-page[data-model-id="spherical-mirror"]'));
    view?.classList.toggle('r3-v017-mounted', isR3);
  }

  function ensureMounted() {
    clearTimeout(pending);
    pending = setTimeout(() => {
      syncViewClass();
      const root = document.querySelector('.rfw-page[data-model-id="spherical-mirror"]');
      if (!root || root.dataset.legibilityVersion === '017') return;
      if (typeof window.renderModel === 'function') window.renderModel('spherical-mirror');
      requestAnimationFrame(syncViewClass);
    }, 30);
  }

  window.addEventListener('hashchange', ensureMounted);
  if (view) new MutationObserver(ensureMounted).observe(view, { childList:true });
  ensureMounted();
  window.R3RuntimeMountV017 = { ensureMounted, syncViewClass };
})();
