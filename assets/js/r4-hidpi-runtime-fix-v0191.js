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

  document.addEventListener('canvasresolutionchange', redrawR4);
  window.R4HiDPIRuntimeFixV0191 = Object.freeze({
    version: '0.19.1',
    redrawEvent: 'canvasresolutionchange'
  });
})();
