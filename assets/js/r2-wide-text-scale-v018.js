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
      const shiftedY = isAnalysis && y < 36 ? y + 5 : y;
      return originalText(label, x, shiftedY, color, size * factor, align, weight);
    };
    return api;
  };
  window.canvasAPI = window.canvasAPI;
})();
