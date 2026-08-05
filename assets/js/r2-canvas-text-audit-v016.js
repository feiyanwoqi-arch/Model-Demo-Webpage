'use strict';
(() => {
  const originalCanvasAPI = window.canvasAPI;
  if (typeof originalCanvasAPI !== 'function' || window.R2CanvasTextAuditV016) return;

  const records = new WeakMap();
  const metadata = new WeakMap();
  const canvases = new Set();

  window.canvasAPI = function auditedCanvasAPI(canvas) {
    const api = originalCanvasAPI(canvas);
    if (!canvas || !api) return api;
    canvases.add(canvas);
    metadata.set(canvas, { logicalWidth: api.W, logicalHeight: api.H });

    const originalClear = api.clear.bind(api);
    const originalText = api.text.bind(api);

    api.clear = (...args) => {
      records.set(canvas, []);
      return originalClear(...args);
    };

    api.text = (label, x, y, color, size = 12, align = 'left', weight = 400, ...rest) => {
      const ctx = api.ctx;
      ctx.save();
      ctx.font = `${weight} ${size}px Inter,"Microsoft YaHei",sans-serif`;
      const width = ctx.measureText(String(label)).width;
      ctx.restore();
      let left = x;
      if (align === 'center') left = x - width / 2;
      else if (align === 'right') left = x - width;
      const list = records.get(canvas) || [];
      list.push({
        label: String(label), x, y, size, align, weight,
        left, right: left + width,
        top: y - size * .56,
        bottom: y + size * .56
      });
      records.set(canvas, list);
      return originalText(label, x, y, color, size, align, weight, ...rest);
    };
    return api;
  };

  function canvasName(canvas) {
    if (canvas.id === 'rfwMainCanvas') return 'main';
    const module = canvas.closest?.('[data-module-id]');
    return module?.dataset?.moduleId || canvas.id || 'canvas';
  }

  function getMetrics() {
    const result = {};
    for (const canvas of canvases) {
      if (!document.contains(canvas)) continue;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const meta = metadata.get(canvas);
      if (!meta?.logicalWidth || !meta?.logicalHeight) continue;
      const scale = Math.min(rect.width / meta.logicalWidth, rect.height / meta.logicalHeight);
      result[canvasName(canvas)] = {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        logicalWidth: meta.logicalWidth,
        logicalHeight: meta.logicalHeight,
        scale,
        labels: (records.get(canvas) || []).map(item => ({
          ...item,
          effectivePx: item.size * scale,
          marginsPx: {
            left: item.left * scale,
            right: (meta.logicalWidth - item.right) * scale,
            top: item.top * scale,
            bottom: (meta.logicalHeight - item.bottom) * scale
          }
        }))
      };
    }
    return result;
  }

  window.R2CanvasTextAuditV016 = { getMetrics };
})();
