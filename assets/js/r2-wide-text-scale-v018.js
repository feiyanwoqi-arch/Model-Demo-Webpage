'use strict';
(() => {
  const previousCanvasAPI = window.canvasAPI;
  if (typeof previousCanvasAPI !== 'function') return;
  window.canvasAPI = function r2WideTextCanvasAPI(canvas) {
    const api = previousCanvasAPI(canvas);
    const page = canvas.closest?.('.rfw-page[data-model-id="plane-mirror"]');
    if (!page || innerWidth < 1600 || innerHeight < 760) return api;
    const module = canvas.closest?.('[data-module-id]');
    const isAnalysis = module?.dataset?.moduleId === 'mechanism' || module?.dataset?.moduleId === 'observable';
    const isMain = canvas.id === 'rfwMainCanvas';
    if (!isAnalysis && !isMain) return api;
    const originalText = api.text.bind(api);
    api.text = (label, x, y, color, size, align, weight) => {
      const factor = isAnalysis ? 1.20 : 1.06;
      let nextX = x;
      let nextY = isAnalysis && y < 36 ? y + 5 : y;
      if (isMain && String(label).startsWith('完整可见：')) nextY -= 4;
      if (isAnalysis && String(label).startsWith('未被有效镜面')) nextX -= 4;
      return originalText(label, nextX, nextY, color, size * factor, align, weight);
    };
    return api;
  };
})();
