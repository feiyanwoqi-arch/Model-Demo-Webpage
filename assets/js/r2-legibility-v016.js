'use strict';
(() => {
  const model = models['plane-mirror'];
  const geometry = window.R2VisualRefinementV015?.geometry;
  if (!model || !geometry) return;

  const C = {
    green:'#66d900', greenDark:'#4b7900', teal:'#0e7c84', orange:'#e98242',
    ink:'#0b3040', muted:'#5f777f', grey:'#96a8ac', light:'#d9e5e3',
    pale:'#f3ffdf', paleOrange:'#fff4eb', red:'#c9534d', purple:'#8066a8'
  };
  const previousRender = renderModel;
  let cleanup = () => {};
  const registry = { main:[], mechanism:[], observable:[], apparatus:[] };
  const canvasMeta = {
    main:{ selector:'#rfwMainCanvas', logicalWidth:1080, logicalHeight:675 },
    mechanism:{ selector:'[data-module-id="mechanism"] canvas', logicalWidth:720, logicalHeight:260 },
    observable:{ selector:'[data-module-id="observable"] canvas', logicalWidth:720, logicalHeight:260 },
    apparatus:{ selector:'[data-module-id="apparatus"] canvas', logicalWidth:720, logicalHeight:260 }
  };

  const value = (root, key, fallback = 0) => {
    const node = root?.querySelector(`[data-rfw-param="${key}"]`);
    return node ? Number(node.value) : fallback;
  };
  const stateOf = root => ({
    distance:value(root,'distance',270),
    height:value(root,'height',150),
    observerY:value(root,'observerY',430),
    mirrorHeight:value(root,'mirrorHeight',260)
  });

  function begin(key) { registry[key] = []; }
  function text(api, key, label, x, y, color, size, align='left', weight=700, role='secondary') {
    const { ctx } = api;
    ctx.save();
    ctx.font = `${weight} ${size}px Inter,"Microsoft YaHei",sans-serif`;
    const width = ctx.measureText(label).width;
    ctx.restore();
    let left = x;
    if (align === 'center') left = x - width / 2;
    else if (align === 'right') left = x - width;
    registry[key].push({
      label, x, y, size, align, role,
      left, right:left + width,
      top:y - size * .56,
      bottom:y + size * .56
    });
    api.text(label, x, y, color, size, align, weight);
  }
  function cross(api, x, y, color) {
    api.line(x-9,y-9,x+9,y+9,color,3.5);
    api.line(x-9,y+9,x+9,y-9,color,3.5);
  }
  function drawEye(api, key, x, y, label='眼睛') {
    const { ctx } = api;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x,y,20,13,0,0,Math.PI*2);
    ctx.fillStyle='#fff'; ctx.fill();
    ctx.strokeStyle=C.teal; ctx.lineWidth=4; ctx.stroke();
    ctx.beginPath(); ctx.arc(x+3,y,5,0,Math.PI*2);
    ctx.fillStyle=C.teal; ctx.fill();
    ctx.restore();
    text(api,key,label,x,y+34,C.ink,18,'center',800,'core');
  }
  function drawDimension(api, key, x1, x2, y, label) {
    api.line(x1,y,x2,y,C.muted,1.8);
    api.line(x1,y-8,x1,y+8,C.muted,1.8);
    api.line(x2,y-8,x2,y+8,C.muted,1.8);
    text(api,key,label,(x1+x2)/2,y+24,C.teal,17,'center',800,'core');
  }
  function intervalCopy(g) {
    const required = `${Math.round(g.requiredTop)}–${Math.round(g.requiredBottom)} px`;
    const active = `${Math.round(g.activeTop)}–${Math.round(g.activeBottom)} px`;
    return g.fullVisible
      ? { one:`所需区间 ${required}`, two:`已被有效镜面 ${active} 完整覆盖` }
      : { one:`所需区间 ${required}`, two:`未被有效镜面 ${active} 完整覆盖` };
  }
  function drawPath(api, key, g, endpoint, hit, marker, available, label) {
    const incoming = available ? C.green : 'rgba(102,217,0,.32)';
    const outgoing = available ? C.teal : 'rgba(14,124,132,.30)';
    if (available) {
      api.arrow(g.objectX,endpoint,g.mirrorX,hit.y,incoming,4.2);
      api.arrow(g.mirrorX,hit.y,g.eye.x,g.eye.y,outgoing,4.2);
    } else {
      api.line(g.objectX,endpoint,g.mirrorX,hit.y,incoming,3,[9,6]);
      api.line(g.mirrorX,hit.y,g.eye.x,g.eye.y,outgoing,3,[9,6]);
      cross(api,g.mirrorX,hit.y,C.red);
    }
    api.line(g.mirrorX,hit.y,g.imageX,endpoint,C.grey,2.6,[10,7]);
    api.circle(g.mirrorX,hit.y,7,available?marker:'#fff',available?'#fff':C.red,2.5);
    text(api,key,label,g.mirrorX+22,hit.y-14,available?marker:C.red,16,'left',800,'core');
  }

  model.draw = (api, state) => {
    begin('main');
    api.clear();
    const g = geometry(state);
    const copy = intervalCopy(g);

    text(api,'main','真实传播区（镜前）',70,40,C.teal,19,'left',800,'core');
    text(api,'main','虚拟定位区（镜后没有真实光）',1010,40,C.orange,19,'right',800,'core');

    api.line(g.mirrorX,66,g.mirrorX,574,C.light,15);
    api.line(g.mirrorX,g.activeTop,g.mirrorX,g.activeBottom,C.teal,15);
    api.circle(g.mirrorX,g.activeTop,12,'#fff',C.teal,4);
    api.circle(g.mirrorX,g.activeBottom,12,'#fff',C.teal,4);
    text(api,'main','拖动镜面端点',g.mirrorX+28,Math.max(52,g.activeTop-20),C.teal,17,'left',800,'core');

    api.arrow(g.objectX,g.base,g.objectX,g.top,C.green,7);
    api.circle(g.objectX,g.top,15,C.pale,C.green,4.5);
    text(api,'main','拖动物体顶部',g.objectX,g.top-34,C.greenDark,18,'center',800,'core');
    text(api,'main','物体',g.objectX,g.base+29,C.ink,18,'center',800,'core');

    api.arrow(g.imageX,g.base,g.imageX,g.top,'rgba(14,124,132,.36)',6);
    api.circle(g.imageX,g.top,13,'#fff',C.grey,3.5);
    text(api,'main','虚像（定位结果）',g.imageX,g.base+29,C.muted,18,'center',800,'core');

    drawPath(api,'main',g,g.top,g.topHit,C.green,g.topVisible,'顶部必要点');
    drawPath(api,'main',g,g.base,g.bottomHit,C.orange,g.bottomVisible,'底部必要点');
    drawEye(api,'main',g.eye.x,g.eye.y,'拖动眼睛');

    const bx=858, by=106;
    api.rect(bx-170,by-48,340,128,g.fullVisible?C.pale:C.paleOrange,g.fullVisible?C.green:C.orange,16);
    text(api,'main',g.fullVisible?'完整物体可见':'仅部分物体可见',bx,by-14,g.fullVisible?C.greenDark:'#9a4d20',24,'center',800,'status');
    text(api,'main',copy.one,bx,by+23,C.ink,17,'center',800,'core');
    text(api,'main',copy.two,bx,by+52,C.muted,16,'center',700,'secondary');

    drawDimension(api,'main',g.objectX,g.mirrorX,584,`物距 dₒ = ${Math.round(state.distance)} px`);
    drawDimension(api,'main',g.mirrorX,g.imageX,584,`像距 |dᵢ| = ${Math.round(state.distance)} px`);
    text(api,'main','实线表示真实传播；镜后虚线只是眼睛的反向追迹',540,625,C.muted,16,'center',700,'secondary');
    text(api,'main','完整可见：顶部与底部两个必要反射点都落在有效镜面内',540,651,C.muted,16,'center',700,'secondary');
  };

  function drawMechanism(root, api) {
    begin('mechanism');
    api.clear();
    const state = stateOf(root);
    const mirrorX=360, scale=.55;
    const object={x:mirrorX-state.distance*scale,y:205-state.height*scale};
    const image={x:mirrorX+state.distance*scale,y:object.y};
    const eyeX=64;
    const eyeCenterY=106+(state.observerY-220)/320*88;
    const pupilYs=[eyeCenterY-13,eyeCenterY+13];

    text(api,'mechanism','有限瞳孔接收真实反射光',34,24,C.teal,18,'left',800,'core');
    text(api,'mechanism','延长线交于同一虚像点',686,24,C.orange,18,'right',800,'core');
    api.line(mirrorX,48,mirrorX,204,C.teal,8);
    api.circle(object.x,object.y,11,C.pale,C.green,3.5);
    text(api,'mechanism','物点',object.x,object.y-22,C.greenDark,17,'center',800,'core');
    api.circle(image.x,image.y,11,'#fff',C.grey,3.5);
    text(api,'mechanism','虚像点',image.x,image.y-22,C.muted,17,'center',800,'core');

    pupilYs.forEach((eyeY,index)=>{
      const t=(mirrorX-eyeX)/Math.max(1,image.x-eyeX);
      const hitY=eyeY+t*(image.y-eyeY);
      api.arrow(object.x,object.y,mirrorX,hitY,C.green,index?3.3:4);
      api.arrow(mirrorX,hitY,eyeX,eyeY,C.teal,index?3.3:4);
      api.line(mirrorX,hitY,image.x,image.y,C.grey,2.2,[8,6]);
      api.circle(mirrorX,hitY,5,'#fff',C.teal,2);
    });
    const {ctx}=api;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(eyeX,eyeCenterY,17,28,0,0,Math.PI*2);
    ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=C.teal;ctx.lineWidth=4;ctx.stroke();ctx.restore();
    text(api,'mechanism',`物距 = 像距 = ${Math.round(state.distance)} px；镜后虚线只用于定位`,360,230,C.muted,17,'center',800,'secondary');
  }

  function drawObservable(root, api) {
    begin('observable');
    api.clear();
    const state=stateOf(root);
    const g=geometry(state);
    const copy=intervalCopy(g);
    const mapY=y=>50+(y-70)/500*150;
    const mirrorX=205, requiredX=312;

    text(api,'observable','有限镜面覆盖判据',34,24,C.teal,18,'left',800,'core');
    text(api,'observable',g.fullVisible?'两个必要点均在有效区':'至少一个必要点落在镜面外',686,24,g.fullVisible?C.greenDark:C.orange,18,'right',800,'status');
    api.line(mirrorX,mapY(70),mirrorX,mapY(570),C.light,13);
    api.line(mirrorX,mapY(g.activeTop),mirrorX,mapY(g.activeBottom),C.teal,14);
    api.circle(mirrorX,mapY(g.topHit.y),7,g.topVisible?C.green:'#fff',g.topVisible?'#fff':C.red,2.5);
    api.circle(mirrorX,mapY(g.bottomHit.y),7,g.bottomVisible?C.orange:'#fff',g.bottomVisible?'#fff':C.red,2.5);
    text(api,'observable','顶部必要点',mirrorX-22,mapY(g.topHit.y)-12,g.topVisible?C.greenDark:C.red,17,'right',800,'core');
    text(api,'observable','底部必要点',mirrorX-22,mapY(g.bottomHit.y)+14,g.bottomVisible?'#a35225':C.red,17,'right',800,'core');

    api.line(requiredX,mapY(g.requiredTop),requiredX,mapY(g.requiredBottom),C.purple,5);
    api.line(requiredX-10,mapY(g.requiredTop),requiredX+10,mapY(g.requiredTop),C.purple,4);
    api.line(requiredX-10,mapY(g.requiredBottom),requiredX+10,mapY(g.requiredBottom),C.purple,4);
    text(api,'observable','所需区间',requiredX+22,(mapY(g.requiredTop)+mapY(g.requiredBottom))/2,C.purple,17,'left',800,'core');

    api.rect(425,55,260,130,g.fullVisible?C.pale:C.paleOrange,g.fullVisible?C.green:C.orange,16);
    text(api,'observable',g.fullVisible?'完整物体可见':'镜面截断部分视线',555,86,g.fullVisible?C.greenDark:'#9a4d20',21,'center',800,'status');
    text(api,'observable',copy.one,555,126,C.ink,17,'center',800,'core');
    text(api,'observable',copy.two,555,158,C.muted,16,'center',700,'secondary');
    text(api,'observable','眼睛移动会改变必要反射点，但不会改变虚像的对称位置',360,229,C.muted,17,'center',700,'secondary');
  }

  function drawApparatus(root, api) {
    begin('apparatus');
    api.clear();
    const state=stateOf(root);
    const mx=355, scale=.43, base=205;
    const objectX=mx-state.distance*scale;
    const imageX=mx+state.distance*scale;
    const top=base-state.height*scale;
    const eye={x:64,y:58+(state.observerY-220)/320*132};
    const hitFor=yImage=>{
      const t=(mx-eye.x)/Math.max(1,imageX-eye.x);
      return eye.y+t*(yImage-eye.y);
    };

    text(api,'apparatus','眼睛或相机可记录到达方向',34,24,C.teal,18,'left',800,'core');
    text(api,'apparatus','镜后屏幕接不到会聚光',686,24,C.orange,18,'right',800,'core');
    api.line(mx,48,mx,204,C.teal,8);
    api.arrow(objectX,base,objectX,top,C.green,5);
    api.arrow(imageX,base,imageX,top,'rgba(14,124,132,.36)',4.5);
    [top,base].forEach(yPoint=>{
      const hitY=hitFor(yPoint);
      api.arrow(objectX,yPoint,mx,hitY,C.green,3.4);
      api.arrow(mx,hitY,eye.x,eye.y,C.teal,3.4);
      api.line(mx,hitY,imageX,yPoint,C.grey,2,[8,6]);
    });
    drawEye(api,'apparatus',eye.x,eye.y,'眼睛/相机');
    api.line(660,55,660,202,C.ink,6);
    cross(api,660,130,C.red);
    text(api,'apparatus','镜后屏幕',660,220,C.ink,17,'center',800,'core');
    text(api,'apparatus','虚像可以被拍摄，但虚像位置没有真实会聚光',420,232,C.muted,17,'center',700,'secondary');
  }

  function redrawModules(root) {
    const mechanism=root.querySelector('[data-module-id="mechanism"] canvas');
    const observable=root.querySelector('[data-module-id="observable"] canvas');
    const apparatus=root.querySelector('[data-module-id="apparatus"] canvas');
    if (mechanism) drawMechanism(root,canvasAPI(mechanism));
    if (observable) drawObservable(root,canvasAPI(observable));
    if (apparatus) drawApparatus(root,canvasAPI(apparatus));
  }

  function getMetrics() {
    const root=document.querySelector('.rfw-page[data-model-id="plane-mirror"]');
    const result={};
    for (const [key,meta] of Object.entries(canvasMeta)) {
      const canvas=root?.querySelector(meta.selector);
      if (!canvas || !registry[key]?.length) continue;
      const rect=canvas.getBoundingClientRect();
      const scale=Math.min(rect.width/meta.logicalWidth,rect.height/meta.logicalHeight);
      result[key]={
        rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},
        logicalWidth:meta.logicalWidth,
        logicalHeight:meta.logicalHeight,
        scale,
        labels:registry[key].map(item=>({
          ...item,
          effectivePx:item.size*scale,
          marginsPx:{
            left:item.left*scale,
            right:(meta.logicalWidth-item.right)*scale,
            top:item.top*scale,
            bottom:(meta.logicalHeight-item.bottom)*scale
          }
        }))
      };
    }
    return result;
  }

  function install() {
    const root=document.querySelector('.rfw-page[data-model-id="plane-mirror"]');
    if (!root) return null;
    root.dataset.legibilityVersion='016';
    let frame=0;
    const timers=[];
    const draw=()=>redrawModules(root);
    const schedule=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(draw))))));
    };
    const settled=()=>{
      schedule();
      [140,360,760].forEach(delay=>timers.push(setTimeout(draw,delay)));
    };
    const mutationObserver=new MutationObserver(settled);
    mutationObserver.observe(root,{attributes:true,attributeFilter:['data-render-revision']});
    const resizeObserver=new ResizeObserver(settled);
    resizeObserver.observe(root);
    window.addEventListener('resize',settled,{passive:true});
    settled();
    return()=>{
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize',settled);
      delete root.dataset.legibilityVersion;
    };
  }

  function wait(attempt=0) {
    const installed=install();
    if (installed) { cleanup=installed; return; }
    if (attempt<60 && location.hash.includes('model:plane-mirror')) requestAnimationFrame(()=>wait(attempt+1));
  }

  renderModel=function renderR2LegibilityV016(id) {
    cleanup(); cleanup=()=>{};
    const result=previousRender(id);
    if (id==='plane-mirror') requestAnimationFrame(()=>wait());
    return result;
  };
  window.renderModel=renderModel;
  window.R2LegibilityV016={getMetrics,registry};
})();
