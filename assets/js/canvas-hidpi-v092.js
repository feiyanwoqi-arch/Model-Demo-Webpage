'use strict';
(() => {
  const TAU2 = Math.PI * 2;
  const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height');
  const states = new WeakMap();
  const liveCanvases = new Set();
  const redrawFrames = new WeakMap();

  function finitePositive(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function installLogicalDimensions(canvas) {
    if (states.has(canvas)) return states.get(canvas);

    const logicalWidth = finitePositive(widthDescriptor.get.call(canvas), 300);
    const logicalHeight = finitePositive(heightDescriptor.get.call(canvas), 150);
    const state = {
      logicalWidth,
      logicalHeight,
      pixelWidth: 0,
      pixelHeight: 0,
      dpr: 1,
      cssWidth: 0,
      cssHeight: 0,
      observer: null
    };

    canvas.dataset.logicalWidth = String(logicalWidth);
    canvas.dataset.logicalHeight = String(logicalHeight);

    /*
     * Existing model code reads canvas.width / canvas.height as its logical
     * coordinate system. Keep those reads stable while the native backing
     * store is enlarged independently for high-DPI output.
     */
    try {
      Object.defineProperty(canvas, 'width', {
        configurable: true,
        enumerable: true,
        get() { return state.logicalWidth; },
        set(value) {
          state.logicalWidth = finitePositive(value, state.logicalWidth);
          canvas.dataset.logicalWidth = String(state.logicalWidth);
          state.pixelWidth = 0;
        }
      });
      Object.defineProperty(canvas, 'height', {
        configurable: true,
        enumerable: true,
        get() { return state.logicalHeight; },
        set(value) {
          state.logicalHeight = finitePositive(value, state.logicalHeight);
          canvas.dataset.logicalHeight = String(state.logicalHeight);
          state.pixelHeight = 0;
        }
      });
    } catch {
      /* Older engines still receive high-DPI drawing; pointer mapping uses data attributes. */
    }

    states.set(canvas, state);
    liveCanvases.add(canvas);
    return state;
  }

  function nativeSetSize(canvas, pixelWidth, pixelHeight) {
    if (widthDescriptor.get.call(canvas) !== pixelWidth) widthDescriptor.set.call(canvas, pixelWidth);
    if (heightDescriptor.get.call(canvas) !== pixelHeight) heightDescriptor.set.call(canvas, pixelHeight);
  }

  function syncBackingStore(canvas, ctx, state) {
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width || state.logicalWidth);
    const cssHeight = Math.max(1, rect.height || cssWidth * state.logicalHeight / state.logicalWidth);
    /* Never render below one physical pixel per CSS pixel; cap extreme displays for memory safety. */
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

    if (pixelWidth !== state.pixelWidth || pixelHeight !== state.pixelHeight || dpr !== state.dpr) {
      nativeSetSize(canvas, pixelWidth, pixelHeight);
      state.pixelWidth = pixelWidth;
      state.pixelHeight = pixelHeight;
      state.dpr = dpr;
      state.cssWidth = cssWidth;
      state.cssHeight = cssHeight;
    }

    const scaleX = pixelWidth / state.logicalWidth;
    const scaleY = pixelHeight / state.logicalHeight;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    return { scaleX, scaleY, cssWidth, cssHeight, dpr };
  }

  function scheduleModelRedraw(canvas) {
    const root = canvas.closest('#view') || document.getElementById('view');
    if (!root || redrawFrames.has(root)) return;
    const frame = requestAnimationFrame(() => {
      redrawFrames.delete(root);
      if (!canvas.isConnected) return;
      /*
       * Existing models already expose one unified update path through their
       * controls. Re-dispatching the current value redraws every coordinated
       * view without changing the physics state.
       */
      const control = root.querySelector('input[data-key], input[data-param], select[data-key], select[data-param]');
      if (control) {
        control.dispatchEvent(new Event(control.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      } else {
        canvas.dispatchEvent(new CustomEvent('canvasresolutionchange', { bubbles: true }));
      }
    });
    redrawFrames.set(root, frame);
  }

  function observeCanvas(canvas, state) {
    if (state.observer || typeof ResizeObserver === 'undefined') return;
    state.observer = new ResizeObserver(entries => {
      const entry = entries[entries.length - 1];
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      if (Math.abs(width - state.cssWidth) > .5 || Math.abs(height - state.cssHeight) > .5) {
        scheduleModelRedraw(canvas);
      }
    });
    state.observer.observe(canvas);
  }

  function highDpiCanvasAPI(canvas) {
    const ctx = canvas.getContext('2d');
    const state = installLogicalDimensions(canvas);
    const W = state.logicalWidth;
    const H = state.logicalHeight;

    const api = {
      ctx,
      W,
      H,
      sync() { return syncBackingStore(canvas, ctx, state); },
      clear() {
        this.sync();
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#f9fbfa';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#edf2f1';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += 40) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
      },
      line(x1, y1, x2, y2, color = '#0e7c84', width = 3, dash = []) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.restore();
      },
      arrow(x1, y1, x2, y2, color = '#7bea00', width = 4) {
        this.line(x1, y1, x2, y2, color, width);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const size = 12 + width;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - size * Math.cos(angle - .45), y2 - size * Math.sin(angle - .45));
        ctx.lineTo(x2 - size * Math.cos(angle + .45), y2 - size * Math.sin(angle + .45));
        ctx.closePath(); ctx.fill();
      },
      text(text, x, y, color = '#0b3040', size = 15, align = 'left', weight = 600) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `${weight} ${size}px Inter,"Microsoft YaHei",sans-serif`;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        ctx.restore();
      },
      mono(text, x, y, color = '#0b3040', size = 16, align = 'left') {
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `700 ${size}px "Cascadia Code",Consolas,monospace`;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        ctx.restore();
      },
      circle(x, y, radius, fill = '#fff', stroke = '#0b8589', width = 2) {
        ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU2);
        if (fill !== null && fill !== undefined && fill !== 'none') {
          ctx.fillStyle = fill; ctx.fill();
        }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
      },
      rect(x, y, width, height, fill = '#fff', stroke = '#d4e2e2', radius = 0) {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
        else ctx.rect(x, y, width, height);
        /* Important: an outline-only rectangle must not erase the plot underneath it. */
        if (fill !== null && fill !== undefined && fill !== 'none') {
          ctx.fillStyle = fill; ctx.fill();
        }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
      },
      arc(x, y, radius, start, end, color = '#0e7c84', width = 2) {
        ctx.beginPath(); ctx.arc(x, y, radius, start, end);
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
      },
      poly(points, fill, stroke = null, width = 1) {
        ctx.beginPath();
        points.forEach((point, index) => index ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
        ctx.closePath();
        if (fill !== null && fill !== undefined && fill !== 'none') { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
      },
      wave(x0, y0, length, amplitude, phase, k, color = '#0e7c84', width = 2) {
        ctx.beginPath();
        for (let x = 0; x <= length; x += 3) {
          const y = y0 + amplitude * Math.sin(k * x + phase);
          x === 0 ? ctx.moveTo(x0 + x, y) : ctx.lineTo(x0 + x, y);
        }
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
      }
    };

    api.sync();
    observeCanvas(canvas, state);
    return api;
  }

  function logicalPointer(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const state = states.get(canvas);
    const logicalWidth = state?.logicalWidth || finitePositive(canvas.dataset.logicalWidth, 300);
    const logicalHeight = state?.logicalHeight || finitePositive(canvas.dataset.logicalHeight, 150);
    return {
      x: (event.clientX - rect.left) / Math.max(1, rect.width) * logicalWidth,
      y: (event.clientY - rect.top) / Math.max(1, rect.height) * logicalHeight
    };
  }

  window.addEventListener('resize', () => {
    for (const canvas of [...liveCanvases]) {
      if (!canvas.isConnected) { liveCanvases.delete(canvas); continue; }
      scheduleModelRedraw(canvas);
    }
  }, { passive: true });

  globalThis.canvasAPI = highDpiCanvasAPI;
  globalThis.getPointer = logicalPointer;
  globalThis.CanvasHiDPIV092 = {
    version: '0.9.2',
    sync(canvas) {
      const state = installLogicalDimensions(canvas);
      return syncBackingStore(canvas, canvas.getContext('2d'), state);
    },
    pointer: logicalPointer,
    logicalSize(canvas) {
      const state = states.get(canvas) || installLogicalDimensions(canvas);
      return { width: state.logicalWidth, height: state.logicalHeight };
    }
  };
})();
