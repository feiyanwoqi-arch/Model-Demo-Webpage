'use strict';
(() => {
  const model = models['plane-mirror'];
  if (!model) return;
  const C = { green:'#7bea00', teal:'#0e7c84', muted:'#98a9ad', ink:'#0b3040', orange:'#f59e57' };

  model.boundary = '模型把物体顶端和底端分别视为点光源，并用有限瞳孔的两条代表光线定位虚像；有限镜面可见性由这些光线与镜面的交点决定。真实眼睛、相机镜头和扩展物体还涉及有限孔径与景深。';

  model.draw = (a, state) => {
    a.clear();
    const mirrorX = 600;
    const base = 545;
    const objectX = mirrorX - state.distance;
    const imageX = mirrorX + state.distance;
    const objectTop = base - state.height;
    const eyeX = 145;
    const pupilPoints = [state.observerY - 12, state.observerY + 12];
    const mirrorHeight = Number.isFinite(state.mirrorHeight) ? state.mirrorHeight : 500;
    const activeTop = 320 - mirrorHeight / 2;
    const activeBottom = 320 + mirrorHeight / 2;

    a.line(mirrorX, 70, mirrorX, 570, '#cfdad8', 9);
    a.line(mirrorX, activeTop, mirrorX, activeBottom, C.teal, 10);
    for (let y = activeTop + 8; y < activeBottom; y += 18) a.line(mirrorX - 5, y, mirrorX + 6, y - 10, '#7fb6b6', 1);
    a.text('有限镜面', mirrorX + 18, activeTop - 12, C.teal, 10);

    a.arrow(objectX, base, objectX, objectTop, C.green, 5);
    a.text('物体', objectX, base + 28, C.ink, 13, 'center');
    a.arrow(imageX, base, imageX, objectTop, '#9acac8', 4);
    a.text('虚像', imageX, base + 28, '#66808a', 13, 'center');
    a.line(mirrorX, 60, mirrorX, 590, '#83999e', 1, [6, 6]);

    pupilPoints.forEach(pupilY => {
      const t = (mirrorX - eyeX) / Math.max(1, imageX - eyeX);
      const hitY = pupilY + t * (objectTop - pupilY);
      a.arrow(objectX, objectTop, mirrorX, hitY, C.green, 3);
      a.arrow(mirrorX, hitY, eyeX, pupilY, C.teal, 3);
      a.line(mirrorX, hitY, imageX, objectTop, C.muted, 2, [7, 6]);
      a.circle(mirrorX, hitY, 4, '#fff', hitY >= activeTop && hitY <= activeBottom ? C.teal : C.orange, 2);
    });

    a.circle(eyeX, state.observerY, 14, '#fff', C.teal, 3);
    a.line(eyeX + 4, state.observerY - 12, eyeX + 4, state.observerY + 12, C.teal, 3);
    a.text('拖动眼睛', eyeX, state.observerY + 30, C.ink, 11, 'center');

    a.line(objectX, base + 58, mirrorX, base + 58, '#66808a', 1);
    a.line(mirrorX, base + 58, imageX, base + 58, '#66808a', 1);
    a.text('dₒ', (objectX + mirrorX) / 2, base + 75, C.teal, 12, 'center', 700);
    a.text('|dᵢ|', (mirrorX + imageX) / 2, base + 75, C.teal, 12, 'center', 700);
    a.circle(objectX, objectTop, 12, '#f5ffdc', C.green, 4);
    a.text('实线：真实传播', 35, 35, C.teal, 11);
    a.text('虚线：反向追迹', 1045, 35, C.muted, 11, 'right');
  };
})();
