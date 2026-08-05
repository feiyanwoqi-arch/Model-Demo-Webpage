'use strict';
(() => {
  if (window.R3RuntimeMountV017) return;
  let pending = 0;
  function ensureMounted() {
    clearTimeout(pending);
    pending = setTimeout(() => {
      const root = document.querySelector('.rfw-page[data-model-id="spherical-mirror"]');
      if (!root || root.dataset.legibilityVersion === '017') return;
      if (typeof window.renderModel === 'function') window.renderModel('spherical-mirror');
    }, 30);
  }
  window.addEventListener('hashchange', ensureMounted);
  const view = document.getElementById('view');
  if (view) new MutationObserver(ensureMounted).observe(view, { childList:true });
  ensureMounted();
  window.R3RuntimeMountV017 = { ensureMounted };
})();
