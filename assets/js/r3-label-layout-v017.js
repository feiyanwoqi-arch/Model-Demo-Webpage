'use strict';
(() => {
  if (window.R3LabelLayoutV017 || typeof window.canvasAPI !== 'function') return;

  const baseCanvasAPI = window.canvasAPI;
  window.canvasAPI = function canvasAPIWithR3Labels(canvas) {
    const api = baseCanvasAPI(canvas);
    const root = canvas?.closest?.('.rfw-page[data-model-id="spherical-mirror"]');
    if (!root || canvas.id !== 'rfwMainCanvas' || api.__r3LabelLayoutV017) return api;

    api.__r3LabelLayoutV017 = true;
    const originalText = api.text.bind(api);
    const originalRect = api.rect.bind(api);

    api.rect = function r3Rect(x, y, width, height, ...rest) {
      // Lift the live judgment card above the maximum mirror aperture so the
      // upper aperture handle and spherical surface remain visible.
      if (Math.abs(x - 664) < 1 && Math.abs(y - 70) < 1 && Math.abs(width - 356) < 1 && Math.abs(height - 132) < 1) {
        y -= 16;
      }
      return originalRect(x, y, width, height, ...rest);
    };

    api.text = function r3Text(label, x, y, color, size, align, weight) {
      let nextLabel = label;
      let nextX = x;
      let nextY = y;
      let nextSize = size;
      let nextAlign = align;

      if (label === 'C = 2F') nextLabel = 'C=2F';
      if (label === '物体' && Math.abs(y - 380) < 6) nextY += 30;
      if (label === '近轴实像位置') nextY += 64;
      if (label === '凹面球面镜' || label === '凸面球面镜') {
        nextX = 1020;
        nextY = 250;
        nextAlign = 'right';
      }

      const isStatusTitle = /物体接近焦点|近轴像与有限光束基本一致|有限口径产生可见球差/.test(label);
      const isStatusMetric = /^镜方程像距|^理论像面光斑高度/.test(label);
      if (isStatusTitle || isStatusMetric) nextY -= 16;
      if (/^理论像面光斑高度/.test(label)) nextSize = Math.max(17, Number(size) || 0);
      if (/^实线：有限物点发出的真实光线|^增大有效口径后/.test(label)) nextSize = Math.max(17, Number(size) || 0);

      return originalText(nextLabel, nextX, nextY, color, nextSize, nextAlign, weight);
    };

    return api;
  };

  window.R3LabelLayoutV017 = { version: '0.17.0' };
})();
