'use strict';
(() => {
  const previousRender = renderModel;
  let cleanup = () => {};
  const C = { green:'#66d900', greenDark:'#4b7900', teal:'#0e7c84', orange:'#e98242', ink:'#0b3040', muted:'#66808a', grey:'#96a8ac' };

  const value = (root, key, fallback = 0) => {
    const node = root.querySelector(`[data-rfw-param="${key}"]`);
    return node ? Number(node.value) : fallback;
  };

  function draw(root, api) {
    const distance = value(root, 'distance', 270);
    const height = value(root, 'height', 150);
    const observerY = value(root, 'observerY', 430);
    const mirrorX = 360;
    const scale = .55;
    const object = { x: mirrorX - distance * scale, y: 210 - height * scale };
    const image = { x: mirrorX + distance * scale, y: object.y };
    const eyeX = 58;
    const eyeCenterY = 105 + (observerY - 220) / 320 * 100;
    const pupilYs = [eyeCenterY - 12, eyeCenterY + 12];

    api.clear();
    api.text('有限瞳孔接收两条真实光', 38, 22, C.teal, 12, 'left', 800);
    api.text('反向延长线仍交于同一虚像点', 682, 22, C.orange, 12, 'right', 800);
    api.line(mirrorX, 34, mirrorX, 226, C.teal, 7);
    api.circle(object.x, object.y, 10, '#f3ffdf', C.green, 3);
    api.text('物点', object.x, object.y - 18, C.greenDark, 11, 'center', 700);
    api.circle(image.x, image.y, 10, '#ffffff', C.grey, 3);
    api.text('虚像点', image.x, image.y - 18, C.muted, 11, 'center', 700);

    pupilYs.forEach((eyeY, index) => {
      const t = (mirrorX - eyeX) / Math.max(1, image.x - eyeX);
      const hitY = eyeY + t * (image.y - eyeY);
      api.arrow(object.x, object.y, mirrorX, hitY, C.green, index ? 2.8 : 3.5);
      api.arrow(mirrorX, hitY, eyeX, eyeY, C.teal, index ? 2.8 : 3.5);
      api.line(mirrorX, hitY, image.x, image.y, C.grey, 1.8, [7, 5]);
      api.circle(mirrorX, hitY, 4, '#ffffff', C.teal, 1.5);
    });

    const { ctx } = api;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(eyeX, eyeCenterY, 15, 25, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    api.text('有限瞳孔', eyeX, Math.min(238, eyeCenterY + 39), C.ink, 11, 'center', 700);
    api.text(`物距 = 像距 = ${Math.round(distance)} px`, 360, 232, C.muted, 10, 'center', 700);
    api.text('镜前实线是传播；镜后虚线只用于定位', 360, 250, C.muted, 10, 'center', 700);
  }

  function install() {
    const root = document.querySelector('.rfw-page[data-model-id="plane-mirror"]');
    if (!root) return null;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
        const canvas = root.querySelector('[data-module-id="mechanism"] canvas');
        if (canvas) draw(root, canvasAPI(canvas));
      })));
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, { attributes:true, attributeFilter:['data-render-revision'] });
    window.addEventListener('resize', schedule, { passive:true });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }

  function wait(attempt = 0) {
    const installed = install();
    if (installed) { cleanup = installed; return; }
    if (attempt < 50 && location.hash.includes('model:plane-mirror')) requestAnimationFrame(() => wait(attempt + 1));
  }

  renderModel = function renderR2MechanismSync(id) {
    cleanup();
    cleanup = () => {};
    const result = previousRender(id);
    if (id === 'plane-mirror') requestAnimationFrame(() => wait());
    return result;
  };
  window.renderModel = renderModel;
})();
