'use strict';
(() => {
  const hidpi = window.CanvasHiDPIV092;
  if (!hidpi || window.R4HiDPIRuntimeFixV0191) return;

  const originalSync = hidpi.sync.bind(hidpi);

  /*
   * The R4 workbench draws through canvasAPI.clear(), whose private sync runs
   * before every frame. A second public sync after the frame can resize and
   * therefore clear the backing store when the live metrics change layout.
   * Skip only that redundant R4 post-frame sync; all other models keep the
   * original public behavior.
   */
  hidpi.sync = canvas => {
    if (canvas?.closest?.('.r4w-page')) {
      return {
        skipped: true,
        reason: 'R4 redraw owns backing-store synchronization'
      };
    }
    return originalSync(canvas);
  };

  function redrawR4(event) {
    const canvas = event.target;
    const root = canvas?.closest?.('.r4w-page');
    if (!root) return;
    const control = root.querySelector('[data-r4-param="angle"]');
    if (!control) return;
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function repairFormulaMarkup(root) {
    if (!root || root.dataset.r4FormulaRepair === 'true') return;
    const core = root.querySelector('.r4w-core > div:last-child');
    const formulas = root.querySelector('.r4w-formulas');
    if (!core || !formulas) return;

    core.textContent = String.raw`\[n_1\sin\theta_i=n_2\sin\theta_t,\qquad R_{s,p}=|r_{s,p}|^2\]`;
    formulas.innerHTML = [
      String.raw`<div>\[r_s=\frac{n_1\cos\theta_i-n_2\cos\theta_t}{n_1\cos\theta_i+n_2\cos\theta_t}\]</div>`,
      String.raw`<div>\[r_p=\frac{n_1\cos\theta_t-n_2\cos\theta_i}{n_1\cos\theta_t+n_2\cos\theta_i}\]</div>`,
      String.raw`<div>\[\tan\theta_B=\frac{n_2}{n_1},\qquad \theta_i+\theta_t=90^\circ\]</div>`,
      '<p>这里的 rₚ 采用固定实验室方向的符号约定，使正入射时 s、p 具有同一相位判据；反射率不受该符号约定影响。</p>'
    ].join('');
    root.dataset.r4FormulaRepair = 'true';

    const typeset = () => requestAnimationFrame(() => {
      const targets = [core, formulas];
      window.MathJax?.typesetClear?.(targets);
      window.MathJax?.typesetPromise?.(targets).catch(() => {});
    });
    if (window.MathJax?.startup?.promise) window.MathJax.startup.promise.then(typeset);
    else setTimeout(typeset, 120);
  }

  const observer = new MutationObserver(() => {
    repairFormulaMarkup(document.querySelector('.r4w-page'));
  });
  observer.observe(document.getElementById('view') || document.body, {
    childList: true,
    subtree: true
  });

  document.addEventListener('canvasresolutionchange', redrawR4);
  repairFormulaMarkup(document.querySelector('.r4w-page'));

  window.R4HiDPIRuntimeFixV0191 = Object.freeze({
    version: '0.19.1',
    redrawEvent: 'canvasresolutionchange',
    formulaRepair: true
  });
})();
