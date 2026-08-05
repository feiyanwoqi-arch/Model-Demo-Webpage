'use strict';
(() => {
  const originalCanvasAPI = window.canvasAPI;
  if (typeof originalCanvasAPI !== 'function' || window.R2WideTextScaleV018) return;

  function canvasRole(canvas) {
    if (canvas?.id === 'rfwMainCanvas') return 'main';
    return canvas?.closest?.('[data-module-id]')?.dataset?.moduleId || '';
  }

  window.canvasAPI = function r2WideTextCanvasAPI(canvas) {
    const api = originalCanvasAPI(canvas);
    if (!canvas || !api?.text) return api;
    const role = canvasRole(canvas);
    if (!['main', 'mechanism', 'observable'].includes(role)) return api;

    const originalText = api.text.bind(api);
    api.text = (label, x, y, color, size = 12, align = 'left', weight = 400, ...rest) => {
      const wide = innerWidth >= 1600 && innerHeight >= 760 &&
        document.querySelector('.rfw-page[data-model-id="plane-mirror"]');
      if (!wide) return originalText(label, x, y, color, size, align, weight, ...rest);

      let nextX = x;
      let nextY = y;
      let factor = 1;

      if (role === 'main') {
        factor = size <= 19 ? 1.08 : 1.03;
        if (label === '完整可见：顶部与底部两个必要反射点都落在有效镜面内') nextY -= 6;
      } else {
        factor = size <= 18 ? 1.24 : 1.14;
        if (y <= 25) nextY += 8;
        if (role === 'observable' && label.startsWith('未被有效镜面')) nextX -= 14;
      }

      return originalText(label, nextX, nextY, color, size * factor, align, weight, ...rest);
    };
    return api;
  };

  window.R2WideTextScaleV018 = { version: '0.18.1' };
})();
