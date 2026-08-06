'use strict';
(() => {
  if (window.R5CanvasFontFloorV0194) return;

  const MIN_CSS_PX = 14;
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;

  function logicalWidth(canvas) {
    const stored = Number(canvas?.dataset?.logicalWidth);
    const width = Number(canvas?.width);
    return Number.isFinite(stored) && stored > 0 ? stored : Number.isFinite(width) && width > 0 ? width : 1;
  }

  function canvasScale(canvas) {
    const rect = canvas?.getBoundingClientRect?.();
    return Math.max(0.01, Number(rect?.width) / logicalWidth(canvas) || 1);
  }

  function fontSize(font) {
    const match = String(font || '').match(/(\d+(?:\.\d+)?)px/);
    return match ? Number(match[1]) : null;
  }

  function withMinimumFont(ctx, callback) {
    const canvas = ctx.canvas;
    if (!canvas?.closest?.('.tir-page')) return callback();
    const originalFont = ctx.font;
    const size = fontSize(originalFont);
    if (!size) return callback();
    const required = MIN_CSS_PX / canvasScale(canvas);
    if (size + 1e-6 >= required) return callback();
    ctx.font = originalFont.replace(/(\d+(?:\.\d+)?)px/, `${required.toFixed(3)}px`);
    try {
      return callback();
    } finally {
      ctx.font = originalFont;
    }
  }

  CanvasRenderingContext2D.prototype.fillText = function r5LegibleFillText(...args) {
    return withMinimumFont(this, () => originalFillText.apply(this, args));
  };

  function auditCanvas(key) {
    if (key === 'main') return document.querySelector('#r5MainCanvas');
    return document.querySelector(`[data-r5-canvas="${CSS.escape(key)}"]`);
  }

  function attachAuditBridge() {
    const api = window.R5TIRWorkbenchV019;
    if (!api || api.__fontFloorWrapped || typeof api.getTextAudit !== 'function') return false;
    const originalGetTextAudit = api.getTextAudit.bind(api);
    api.getTextAudit = () => {
      const audit = originalGetTextAudit();
      for (const [key, entries] of Object.entries(audit || {})) {
        const canvas = auditCanvas(key);
        if (!canvas || !Array.isArray(entries)) continue;
        const required = MIN_CSS_PX / canvasScale(canvas);
        for (const entry of entries) entry.size = Math.max(Number(entry.size) || 0, required);
      }
      return audit;
    };
    Object.defineProperty(api, '__fontFloorWrapped', { value: true });
    return true;
  }

  function refreshMountedR5() {
    attachAuditBridge();
    const root = document.querySelector('.tir-page');
    const control = root?.querySelector('[data-r5-param="angle"]');
    if (control) control.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const previousRenderModel = window.renderModel;
  if (typeof previousRenderModel === 'function') {
    window.renderModel = function renderWithR5FontFloor(...args) {
      const result = previousRenderModel.apply(this, args);
      requestAnimationFrame(refreshMountedR5);
      return result;
    };
  }
  requestAnimationFrame(refreshMountedR5);

  window.R5CanvasFontFloorV0194 = Object.freeze({
    version: '0.19.4',
    minimumCssPixels: MIN_CSS_PX,
    refresh: refreshMountedR5
  });
})();
