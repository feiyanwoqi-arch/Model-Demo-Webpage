'use strict';
(() => {
  if (window.R5CanvasTypographyV019) return;

  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  const originalRoundRect = CanvasRenderingContext2D.prototype.roundRect;
  const CORE = /全反射|倏逝|临界|探针|传播|反射|折射|穿透|能流|法向|当前状态|介质|波数|耦合/;
  const CONCLUSION = /全反射：|当前折射率顺序|临界状态|传播折射波仍存在|传播解 →|倏逝场的空间衰减|受抑全反射/;
  const MAIN_LEGEND_BOX_OFFSET = 14;
  const replacements = new Map([
    ['横向波数守恒；法向波数平方跨过 0', '切向波数守恒；kz² 跨过 0'],
    ['教学近似：耦合尺度 ∝ e⁻²ᵏᵍ', '耦合量级 ∝ e⁻²κg'],
    ['实线：传播波方向', '实线＝传播波'],
    ['紫色波列：倏逝场（平均法向能流为 0）', '紫色波列＝倏逝场（法向平均能流 0）']
  ]);

  const mainLegendPlacement = new Map([
    ['实线：传播波方向', canvas => ({ x: 605, y: canvas.height - 61 })],
    ['紫色波列：倏逝场（平均法向能流为 0）', canvas => ({ x: 605, y: canvas.height - 35 })]
  ]);

  let refreshTimer = 0;
  let observer = null;

  function canvasKey(canvas) {
    if (canvas?.id === 'r5MainCanvas') return 'main';
    return canvas?.dataset?.r5Canvas || '';
  }

  function isR5Canvas(canvas) {
    return Boolean(canvasKey(canvas) && canvas?.closest?.('.tir-page[data-model-id="total-internal"]'));
  }

  function displayScale(canvas) {
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / Math.max(1, canvas.width);
    const sy = rect.height / Math.max(1, canvas.height);
    const scale = Math.min(sx || 0, sy || 0);
    return Number.isFinite(scale) && scale > 0.05 ? scale : 1;
  }

  function effectiveFloor(label, key) {
    if (CONCLUSION.test(label)) return 18;
    if (key === 'apparatus' || CORE.test(label)) return 16;
    return 14;
  }

  function parseSize(font) {
    const match = String(font || '').match(/(\d+(?:\.\d+)?)px/);
    return match ? Number(match[1]) : 16;
  }

  function compensatedSize(label, canvas, baseSize) {
    const key = canvasKey(canvas);
    const floor = effectiveFloor(label, key);
    const scale = displayScale(canvas);
    // A small margin keeps fractional browser layout from turning a nominal
    // threshold into a sub-threshold screenshot measurement.
    const required = (floor + 0.2) / scale;
    return Math.min(28, Math.max(baseSize, required));
  }

  function replaceFontSize(font, size) {
    return String(font).replace(/\d+(?:\.\d+)?px/, `${size.toFixed(2)}px`);
  }

  function placementFor(sourceLabel, canvas, x, y) {
    if (canvasKey(canvas) !== 'main') return { x, y };
    return mainLegendPlacement.get(sourceLabel)?.(canvas) || { x, y };
  }

  CanvasRenderingContext2D.prototype.roundRect = function r5LegendRoundRect(x, y, width, height, radii) {
    const canvas = this.canvas;
    const isLegend = isR5Canvas(canvas)
      && canvasKey(canvas) === 'main'
      && Math.abs(x - 340) < 0.1
      && Math.abs(y - (canvas.height - 92)) < 0.1
      && Math.abs(width - 530) < 0.1
      && Math.abs(height - 60) < 0.1;
    return originalRoundRect.call(this, x, isLegend ? y + MAIN_LEGEND_BOX_OFFSET : y, width, height, radii);
  };

  CanvasRenderingContext2D.prototype.fillText = function r5LegibleFillText(text, x, y, maxWidth) {
    const canvas = this.canvas;
    if (!isR5Canvas(canvas)) {
      return maxWidth === undefined
        ? originalFillText.call(this, text, x, y)
        : originalFillText.call(this, text, x, y, maxWidth);
    }

    const sourceLabel = String(text);
    const label = replacements.get(sourceLabel) || sourceLabel;
    const point = placementFor(sourceLabel, canvas, x, y);
    const originalFont = this.font;
    const nextSize = compensatedSize(label, canvas, parseSize(originalFont));
    this.font = replaceFontSize(originalFont, nextSize);
    try {
      return maxWidth === undefined
        ? originalFillText.call(this, label, point.x, point.y)
        : originalFillText.call(this, label, point.x, point.y, maxWidth);
    } finally {
      this.font = originalFont;
    }
  };

  function transformedAudit() {
    const api = window.R5TIRWorkbenchV019;
    const raw = api?.__r5RawTextAudit?.() || {};
    const root = document.querySelector('.tir-page[data-model-id="total-internal"]');
    const canvasFor = key => key === 'main'
      ? root?.querySelector('#r5MainCanvas')
      : root?.querySelector(`[data-r5-canvas="${key}"]`);
    const result = {};
    for (const [key, items] of Object.entries(raw)) {
      const canvas = canvasFor(key);
      result[key] = (items || []).map(item => {
        const sourceLabel = String(item.label);
        const label = replacements.get(sourceLabel) || sourceLabel;
        const point = canvas ? placementFor(sourceLabel, canvas, item.x, item.y) : { x: item.x, y: item.y };
        const size = canvas ? compensatedSize(label, canvas, Number(item.size) || 16) : Number(item.size) || 16;
        return { ...item, ...point, label, size };
      });
    }
    return result;
  }

  function patchAuditApi() {
    const api = window.R5TIRWorkbenchV019;
    if (!api || api.__r5TypographyPatched) return false;
    api.__r5RawTextAudit = api.getTextAudit.bind(api);
    api.getTextAudit = transformedAudit;
    api.__r5TypographyPatched = true;
    api.typographyVersion = '0.19.7';
    return true;
  }

  function refreshModules() {
    refreshTimer = 0;
    patchAuditApi();
    const input = document.querySelector('.tir-page[data-model-id="total-internal"] [data-r5-param="angle"]');
    if (!input) return;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.tir-page[data-model-id="total-internal"]')?.setAttribute('data-r5-canvas-typography', '0197');
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refreshModules, 90);
  }

  function installObserver() {
    observer?.disconnect();
    const view = document.getElementById('view') || document.body;
    observer = new MutationObserver(scheduleRefresh);
    observer.observe(view, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'data-r5-fitted-width', 'data-r5-fitted-height']
    });
    window.addEventListener('resize', scheduleRefresh, { passive: true });
    window.addEventListener('hashchange', scheduleRefresh);
    scheduleRefresh();
  }

  window.R5CanvasTypographyV019 = {
    version: '0.19.7',
    replacements,
    effectiveFloor,
    compensatedSize,
    legendBoxOffset: MAIN_LEGEND_BOX_OFFSET,
    scheduleRefresh
  };

  installObserver();
})();