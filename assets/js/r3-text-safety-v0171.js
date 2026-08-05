'use strict';
(() => {
  const previousCanvasAPI = window.canvasAPI;
  if (typeof previousCanvasAPI !== 'function' || window.R3TextSafetyV0171) return;

  window.canvasAPI = function r3TextSafetyCanvasAPI(canvas) {
    const api = previousCanvasAPI(canvas);
    if (!canvas || !api?.text) return api;

    const originalText = api.text.bind(api);
    api.text = (label, x, y, color, size = 12, align = 'left', weight = 400, ...rest) => {
      const spherical = document.querySelector('.rfw-page[data-model-id="spherical-mirror"]');
      if (!spherical) return originalText(label, x, y, color, size, align, weight, ...rest);
      const adjustedSize = size <= 16 ? size * 1.08 : size;
      return originalText(label, x, y, color, adjustedSize, align, weight, ...rest);
    };
    return api;
  };

  window.R3TextSafetyV0171 = { version: '0.17.1' };
})();
