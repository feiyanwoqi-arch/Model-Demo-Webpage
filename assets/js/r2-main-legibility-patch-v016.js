'use strict';
(() => {
  const model = models['plane-mirror'];
  const geometry = window.R2VisualRefinementV015?.geometry;
  const registry = window.R2LegibilityV016?.registry;
  if (!model || !geometry || !registry) return;

  const C = {
    green:'#66d900', greenDark:'#4b7900', teal:'#0e7c84', orange:'#e98242',
    ink:'#0b3040', muted:'#5f777f', grey:'#96a8ac', light:'#d9e5e3',
    pale:'#f3ffdf', paleOrange:'#fff4eb', red:'#c9534d'
  };

  function text(api,label,x,y,color,size,align='left',weight=700,role='secondary') {
    const { ctx } = api;
    ctx.save();
    ctx.font = `${weight} ${size}px Inter,"Microsoft YaHei",sans-serif`;
    const width = ctx.measureText(label).width;
    ctx.restore();
    let left=x;
    if(align==='center') left=x-width/2;
    else if(align==='right') left=x-width;
    registry.main.push({
      label,x,y,size,align,role,left,right:left+width,
      top:y-size*.56,bottom:y+size*.56
    });
    api.text(label,x,y,color,size,align,weight);
  }
  function cross(api,x,y,color){
    api.line(x-9,y-9,x+9,y+9,color,3.5);
    api.line(x-9,y+9,x+9,y-9,color,3.5);
  }
  function drawEye(api,x,y){
    const {ctx}=api;
    ctx.save();
    ctx.beginPath();ctx.ellipse(x,y,20,13,0,0,Math.PI*2);
    ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=C.teal;ctx.lineWidth=4;ctx.stroke();
    ctx.beginPath();ctx.arc(x+3,y,5,0,Math.PI*2);ctx.fillStyle=C.teal;ctx.fill();ctx.restore();
    text(api,'拖动眼睛',x,y+35,C.ink,19,'center',800,'core');
  }
  function dimension(api,x1,x2,y,label){
    api.line(x1,y,x2,y,C.muted,1.8);
    api.line(x1,y-8,x1,y+8,C.muted,1.8);
    api.line(x2,y-8,x2,y+8,C.muted,1.8);
    text(api,label,(x1+x2)/2,y+25,C.teal,18,'center',800,'core');
  }
  function intervalCopy(g){
    const required=`${Math.round(g.requiredTop)}–${Math.round(g.requiredBottom)} px`;
    const active=`${Math.round(g.activeTop)}–${Math.round(g.activeBottom)} px`;
    return g.fullVisible
      ? {one:`所需区间 ${required}`,two:`已被有效镜面 ${active} 完整覆盖`}
      : {one:`所需区间 ${required}`,two:`未被有效镜面 ${active} 完整覆盖`};
  }
  function path(api,g,endpoint,hit,marker,available,label){
    const incoming=available?C.green:'rgba(102,217,0,.32)';
    const outgoing=available?C.teal:'rgba(14,124,132,.30)';
    if(available){
      api.arrow(g.objectX,endpoint,g.mirrorX,hit.y,incoming,4.2);
      api.arrow(g.mirrorX,hit.y,g.eye.x,g.eye.y,outgoing,4.2);
    }else{
      api.line(g.objectX,endpoint,g.mirrorX,hit.y,incoming,3,[9,6]);
      api.line(g.mirrorX,hit.y,g.eye.x,g.eye.y,outgoing,3,[9,6]);
      cross(api,g.mirrorX,hit.y,C.red);
    }
    api.line(g.mirrorX,hit.y,g.imageX,endpoint,C.grey,2.6,[10,7]);
    api.circle(g.mirrorX,hit.y,7,available?marker:'#fff',available?'#fff':C.red,2.5);
    text(api,label,g.mirrorX+23,hit.y-15,available?marker:C.red,18,'left',800,'core');
  }

  model.draw=(api,state)=>{
    registry.main=[];
    api.clear();
    const g=geometry(state);
    const copy=intervalCopy(g);

    text(api,'真实传播区（镜前）',70,40,C.teal,20,'left',800,'core');
    text(api,'虚拟定位区（镜后没有真实光）',1010,40,C.orange,20,'right',800,'core');

    api.line(g.mirrorX,66,g.mirrorX,574,C.light,15);
    api.line(g.mirrorX,g.activeTop,g.mirrorX,g.activeBottom,C.teal,15);
    api.circle(g.mirrorX,g.activeTop,12,'#fff',C.teal,4);
    api.circle(g.mirrorX,g.activeBottom,12,'#fff',C.teal,4);
    text(api,'拖动镜面端点',g.mirrorX-28,Math.max(58,g.activeTop-22),C.teal,18,'right',800,'core');

    api.arrow(g.objectX,g.base,g.objectX,g.top,C.green,7);
    api.circle(g.objectX,g.top,15,C.pale,C.green,4.5);
    text(api,'拖动物体顶部',g.objectX,g.top-35,C.greenDark,19,'center',800,'core');
    text(api,'物体',g.objectX,g.base+30,C.ink,19,'center',800,'core');

    api.arrow(g.imageX,g.base,g.imageX,g.top,'rgba(14,124,132,.36)',6);
    api.circle(g.imageX,g.top,13,'#fff',C.grey,3.5);
    text(api,'虚像（定位结果）',g.imageX,g.base+30,C.muted,19,'center',800,'core');

    path(api,g,g.top,g.topHit,C.green,g.topVisible,'顶部必要点');
    path(api,g,g.base,g.bottomHit,C.orange,g.bottomVisible,'底部必要点');
    drawEye(api,g.eye.x,g.eye.y);

    const bx=858,by=106;
    api.rect(bx-170,by-48,340,128,g.fullVisible?C.pale:C.paleOrange,g.fullVisible?C.green:C.orange,16);
    text(api,g.fullVisible?'完整物体可见':'仅部分物体可见',bx,by-14,g.fullVisible?C.greenDark:'#9a4d20',25,'center',800,'status');
    text(api,copy.one,bx,by+23,C.ink,18,'center',800,'core');
    text(api,copy.two,bx,by+53,C.muted,17,'center',700,'secondary');

    dimension(api,g.objectX,g.mirrorX,584,`物距 dₒ = ${Math.round(state.distance)} px`);
    dimension(api,g.mirrorX,g.imageX,584,`像距 |dᵢ| = ${Math.round(state.distance)} px`);
    text(api,'实线表示真实传播；镜后虚线只是眼睛的反向追迹',540,625,C.muted,18,'center',700,'secondary');
    text(api,'完整可见：顶部与底部两个必要反射点都落在有效镜面内',540,651,C.muted,18,'center',700,'secondary');
  };
})();
