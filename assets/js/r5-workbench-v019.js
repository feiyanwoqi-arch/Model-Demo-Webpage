'use strict';
(() => {
  if (window.R5TIRWorkbenchV019) return;

  const previousRenderModel = window.renderModel;
  const TAU = Math.PI * 2;
  const MODEL_ID = 'total-internal';
  const MAX_MODULES = 2;
  const C = {
    green:'#66d900', greenDark:'#4f7900', teal:'#0e7c84', tealDark:'#075e67',
    orange:'#e98242', orangeDark:'#a65022', purple:'#7657a5', purpleLight:'#eee7fb',
    ink:'#0b3040', muted:'#5e767e', grey:'#94a8ac', grid:'#e7efed',
    upper:'#f5fbfa', lower:'#d9f1ef', paper:'#ffffff', pale:'#f3ffdf', warn:'#fff4eb', red:'#bd4f49'
  };

  let cleanup = () => {};
  let animationFrame = 0;
  let activeState = null;
  let activeRoot = null;
  let activeModules = new Set(['transition','decay']);
  let textAudit = { main:[], transition:[], decay:[], apparatus:[] };

  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const rad = deg => deg * Math.PI / 180;
  const deg = r => r * 180 / Math.PI;
  const fmt = (v,n=2) => Number.isFinite(v) ? Number(v).toFixed(n) : '—';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function freshState(){
    return {
      n1:1.52,
      n2:1.00,
      angle:55,
      lambda:633,
      pol:'s',
      probeDepth:320,
      gap:650,
      n3:1.52
    };
  }

  function fresnelEnergy(n1,n2,angle){
    const ti=rad(angle), st=n1/n2*Math.sin(ti);
    if(Math.abs(st)>=1) return {tir:true,thetaT:NaN,Rs:1,Rp:1,Ts:0,Tp:0};
    const tt=Math.asin(st), ci=Math.cos(ti), ct=Math.cos(tt);
    const rs=(n1*ci-n2*ct)/(n1*ci+n2*ct);
    const rp=(n2*ci-n1*ct)/(n2*ci+n1*ct);
    const Rs=rs*rs, Rp=rp*rp;
    return {tir:false,thetaT:tt,Rs,Rp,Ts:1-Rs,Tp:1-Rp};
  }

  function outputFor(s){
    const valid=s.n1>s.n2;
    const critical=valid?deg(Math.asin(s.n2/s.n1)):NaN;
    const margin=valid?s.angle-critical:NaN;
    const ti=rad(s.angle);
    const f=fresnelEnergy(s.n1,s.n2,s.angle);
    const q=s.n1*s.n1*Math.sin(ti)**2-s.n2*s.n2;
    const tir=valid&&margin>0.02&&q>0;
    const criticalState=valid&&Math.abs(margin)<=0.35;
    const k0=TAU/s.lambda;
    const kx=k0*s.n1*Math.sin(ti);
    const kappa=tir?k0*Math.sqrt(q):0;
    const depth=tir?1/kappa:Infinity;
    const intensityDepth=tir?1/(2*kappa):Infinity;
    const probeAmplitude=tir?Math.exp(-kappa*s.probeDepth):1;
    const probeIntensity=tir?Math.exp(-2*kappa*s.probeDepth):1;
    const R=s.pol==='s'?f.Rs:s.pol==='p'?f.Rp:(f.Rs+f.Rp)/2;
    const T=s.pol==='s'?f.Ts:s.pol==='p'?f.Tp:(f.Ts+f.Tp)/2;
    let phaseS=0,phaseP=0;
    if(tir){
      const root=Math.sqrt(Math.max(0,Math.sin(ti)**2-(s.n2/s.n1)**2));
      phaseS=-2*Math.atan2(root,Math.cos(ti));
      phaseP=-2*Math.atan2((s.n1*s.n1/(s.n2*s.n2))*root,Math.cos(ti));
    }
    const relativePhase=tir?phaseP-phaseS:0;
    const coupling=tir?Math.exp(-2*kappa*s.gap):1;
    const regime=!valid?'no-tir':tir?'tir':criticalState?'critical':'transmission';
    const regimeLabel={
      'no-tir':'当前折射率顺序不支持全反射',
      transmission:'传播折射波仍存在',
      critical:'临界状态：折射方向贴近界面',
      tir:'全反射：仅剩倏逝场'
    }[regime];
    const status=!valid
      ? 'n₁≤n₂：当前传播方向没有临界角。先建立高折射率侧，再讨论全反射。'
      : tir
        ? `θᵢ 比 θc 高 ${fmt(margin,2)}°。反射率为 100%，上方仍有场，但平均法向能流为 0。`
        : criticalState
          ? '折射角逼近 90°；这是传播折射波转化为倏逝解的连续边界。'
          : `仍有传播波进入 n₂；当前能量透射率约 ${fmt(T*100,1)}%。`;
    return {valid,critical,margin,f,q,tir,criticalState,k0,kx,kappa,depth,intensityDepth,probeAmplitude,probeIntensity,R,T,phaseS,phaseP,relativePhase,coupling,regime,regimeLabel,status};
  }

  function logicalPoint(canvas,event){
    const r=canvas.getBoundingClientRect();
    return {x:(event.clientX-r.left)/Math.max(1,r.width)*canvas.width,y:(event.clientY-r.top)/Math.max(1,r.height)*canvas.height};
  }

  function api(canvas,key){
    const ctx=canvas.getContext('2d');
    const W=canvas.width,H=canvas.height;
    textAudit[key]=[];
    ctx.lineCap='round';ctx.lineJoin='round';
    function record(label,x,y,size,align){
      textAudit[key].push({label:String(label),x,y,size,align});
    }
    return {
      ctx,W,H,
      clear(fill='#f9fbfa'){
        ctx.clearRect(0,0,W,H);ctx.fillStyle=fill;ctx.fillRect(0,0,W,H);
      },
      grid(step=40){
        ctx.save();ctx.strokeStyle=C.grid;ctx.lineWidth=1;
        for(let x=0;x<=W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
        for(let y=0;y<=H;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
        ctx.restore();
      },
      line(x1,y1,x2,y2,color=C.teal,width=2,dash=[]){
        ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
      },
      arrow(x1,y1,x2,y2,color=C.green,width=4){
        this.line(x1,y1,x2,y2,color,width);
        const ang=Math.atan2(y2-y1,x2-x1),s=10+width;
        ctx.save();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-s*Math.cos(ang-.43),y2-s*Math.sin(ang-.43));ctx.lineTo(x2-s*Math.cos(ang+.43),y2-s*Math.sin(ang+.43));ctx.closePath();ctx.fill();ctx.restore();
      },
      rect(x,y,w,h,fill,stroke=null,r=12,width=1.5){
        ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}ctx.restore();
      },
      circle(x,y,r,fill,stroke=null,width=2){
        ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}ctx.restore();
      },
      text(label,x,y,color=C.ink,size=16,align='left',weight=700){
        ctx.save();ctx.fillStyle=color;ctx.font=`${weight} ${size}px Inter,"Microsoft YaHei",sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(label,x,y);ctx.restore();record(label,x,y,size,align);
      },
      mono(label,x,y,color=C.ink,size=16,align='left',weight=700){
        ctx.save();ctx.fillStyle=color;ctx.font=`${weight} ${size}px "Cascadia Code",Consolas,monospace`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(label,x,y);ctx.restore();record(label,x,y,size,align);
      },
      poly(points,fill,stroke=null,width=1.5){
        ctx.save();ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}ctx.restore();
      },
      arc(x,y,r,a0,a1,color=C.teal,width=2,dash=[]){
        ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.arc(x,y,r,a0,a1);ctx.stroke();ctx.restore();
      }
    };
  }

  function lineWidthForPower(power){return 2.2+4.5*Math.sqrt(clamp(power,0,1));}

  function drawMain(canvas,s,o,time){
    const a=api(canvas,'main');
    const {ctx,W,H}=a;
    a.clear(C.upper);a.grid(45);
    const x0=760,y0=390,L=270,ang=rad(s.angle);
    ctx.save();ctx.fillStyle=C.lower;ctx.fillRect(0,y0,W,H-y0);ctx.restore();
    a.line(0,y0,W,y0,C.teal,3);
    a.line(x0,y0-225,x0,y0+250,C.grey,1.5,[7,6]);
    a.text(`低折射率介质  n₂=${s.n2.toFixed(2)}`,48,64,C.ink,18,'left',800);
    a.text(`高折射率介质  n₁=${s.n1.toFixed(2)}`,48,H-56,C.ink,18,'left',800);
    a.text('界面法线',x0+18,y0-207,C.muted,17,'left',700);

    const sx=x0-L*Math.sin(ang),sy=y0+L*Math.cos(ang);
    const rx=x0+L*Math.sin(ang),ry=y0+L*Math.cos(ang);
    a.arrow(sx,sy,x0,y0,C.green,lineWidthForPower(1));
    a.arrow(x0,y0,rx,ry,C.teal,lineWidthForPower(o.R));
    a.circle(sx,sy,14,C.pale,C.green,4);
    a.text('拖动入射方向',sx,Math.min(H-30,sy+31),C.greenDark,17,'center',800);

    if(!o.tir&&Number.isFinite(o.f.thetaT)){
      const Lt=250,tx=x0+Lt*Math.sin(o.f.thetaT),ty=y0-Lt*Math.cos(o.f.thetaT);
      a.arrow(x0,y0,tx,ty,C.orange,lineWidthForPower(o.T));
      a.text(`传播折射波  T≈${fmt(o.T*100,1)}%`,tx,Math.max(34,ty-24),C.orangeDark,17,'center',800);
    }

    if(o.tir){
      const maxZ=Math.min(245,Math.max(90,o.depth*3.4));
      ctx.save();ctx.beginPath();ctx.rect(80,78,W-135,y0-86);ctx.clip();
      for(let band=0;band<9;band++){
        const z=band/8*maxZ, y=y0-z;
        const amp=26*Math.exp(-z/o.depth);
        const alpha=.18+.72*Math.exp(-z/o.depth);
        ctx.beginPath();
        for(let x=125;x<=W-80;x+=4){
          const yy=y+amp*Math.sin(.043*x-time*2.2);
          x===125?ctx.moveTo(x,yy):ctx.lineTo(x,yy);
        }
        ctx.strokeStyle=`rgba(118,87,165,${alpha})`;ctx.lineWidth=2.2;ctx.stroke();
      }
      ctx.restore();
      a.arrow(430,y0-112,920,y0-112,C.purple,3);
      a.text('倏逝场沿界面有相位传播',675,y0-140,C.purple,19,'center',800);
      a.text('离开界面：场幅 ∝ e⁻ᵏᶻ',675,y0-82,C.purple,17,'center',700);
    }

    const probeX=960;
    const depthScale=.22;
    const probeY=y0-clamp(s.probeDepth*depthScale,28,250);
    a.line(probeX,y0,probeX,probeY,C.purple,2,[6,5]);
    a.circle(probeX,probeY,12,C.paper,C.purple,4);
    a.text('场探针',probeX,probeY-27,C.purple,17,'center',800);
    a.mono(`${Math.round(s.probeDepth)} nm`,probeX+18,(probeY+y0)/2,C.purple,16,'left',800);

    const arcR=78;
    a.arc(x0,y0,arcR,Math.PI/2,Math.PI/2+ang,C.greenDark,2.5);
    a.text(`θᵢ=${fmt(s.angle,1)}°`,x0-92,y0+70,C.greenDark,18,'center',800);
    if(o.valid)a.text(`θᵣ=θᵢ=${fmt(s.angle,1)}°`,x0+116,y0+70,C.purple,18,'center',800);

    const stateColor=o.regime==='tir'?C.purple:o.regime==='critical'?C.orange:o.regime==='no-tir'?C.red:C.teal;
    const stateFill=o.regime==='tir'?C.purpleLight:o.regime==='critical'?C.warn:o.regime==='no-tir'?'#fff0ef':'#eef9f7';
    a.rect(58,102,360,152,stateFill,stateColor,16,2);
    a.text(o.regimeLabel,82,132,stateColor,22,'left',850);
    a.text(o.valid?`临界角  ${fmt(o.critical,2)}°`:'临界角  不存在',82,170,C.ink,18,'left',800);
    a.text(o.tir?`振幅穿透深度  ${fmt(o.depth,0)} nm`:`能量透射率  ${fmt(o.T*100,1)}%`,82,201,C.ink,18,'left',700);
    a.text(o.tir?`探针场幅  ${(o.probeAmplitude*100).toFixed(1)}%`:'上方存在传播折射波',82,232,C.muted,17,'left',700);

    a.rect(340,H-92,530,60,'rgba(255,255,255,.93)','#d8e5e2',14,1.5);
    a.text('实线：传播波方向',465,H-62,C.tealDark,16,'center',700);
    a.text('紫色波列：倏逝场（平均法向能流为 0）',700,H-62,C.purple,16,'center',700);

    activeRoot.dataset.r5Regime=o.regime;
    activeRoot.dataset.r5Critical=String(o.critical);
    activeRoot.dataset.r5Depth=String(o.depth);
    activeRoot.dataset.r5ProbeAmplitude=String(o.probeAmplitude);
  }

  function drawTransition(canvas,s,o){
    const a=api(canvas,'transition');a.clear('#fbfdfc');
    const x0=68,y0=200,w=590,h=120;
    a.text('传播解 → 临界点 → 倏逝解',34,27,C.tealDark,19,'left',850);
    a.text('横向波数守恒；法向波数平方跨过 0',686,27,C.muted,16,'right',700);
    a.line(x0,y0,x0+w,y0,C.ink,2);
    a.line(x0,y0-h,x0,y0+55,C.ink,1.5);
    const vals=[];
    let maxAbs=1;
    for(let ang=0;ang<=89;ang+=1){const q=s.n2*s.n2-s.n1*s.n1*Math.sin(rad(ang))**2;vals.push([ang,q]);maxAbs=Math.max(maxAbs,Math.abs(q));}
    const mapX=ang=>x0+ang/89*w;
    const mapY=q=>y0-q/maxAbs*h*.82;
    const ctx=a.ctx;ctx.save();ctx.beginPath();vals.forEach(([ang,q],i)=>i?ctx.lineTo(mapX(ang),mapY(q)):ctx.moveTo(mapX(ang),mapY(q)));ctx.strokeStyle=C.teal;ctx.lineWidth=3;ctx.stroke();ctx.restore();
    if(o.valid){const cx=mapX(o.critical);a.line(cx,58,cx,y0+36,C.orange,2,[6,5]);a.text('θc',cx,y0+27,C.orangeDark,16,'center',800);}
    const currentQ=s.n2*s.n2-s.n1*s.n1*Math.sin(rad(s.angle))**2;
    const px=mapX(s.angle),py=mapY(currentQ);a.circle(px,py,9,C.green,C.paper,3);a.text('当前状态',px,Math.max(60,py-25),C.greenDark,16,'center',800);
    a.text('kz² > 0：传播折射波',175,71,C.teal,17,'center',800);
    a.text('kz² < 0：kz=iκ，指数衰减',505,71,C.purple,17,'center',800);
    a.text('入射角 θᵢ',x0+w/2,258,C.muted,16,'center',700);
  }

  function drawDecay(canvas,s,o){
    const a=api(canvas,'decay');a.clear('#fbfdfc');
    a.text('倏逝场的空间衰减',34,27,C.tealDark,19,'left',850);
    a.text(o.tir?`δE=${fmt(o.depth,0)} nm`:'仅在全反射区定义',686,27,o.tir?C.purple:C.muted,16,'right',800);
    const x0=76,y0=205,w=560,h=125;
    a.line(x0,y0,x0+w,y0,C.ink,2);a.line(x0,y0-h,x0,y0,C.ink,1.5);
    a.text('1.0',x0-14,y0-h,C.muted,15,'right',700);a.text('0',x0-14,y0,C.muted,15,'right',700);
    if(o.tir){
      const maxZ=Math.max(900,o.depth*4);
      const ctx=a.ctx;ctx.save();ctx.beginPath();
      for(let i=0;i<=180;i++){const z=i/180*maxZ,A=Math.exp(-z/o.depth),x=x0+i/180*w,y=y0-A*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
      ctx.strokeStyle=C.purple;ctx.lineWidth=4;ctx.stroke();ctx.restore();
      const px=x0+clamp(s.probeDepth/maxZ,0,1)*w,py=y0-o.probeAmplitude*h;
      a.line(px,y0,px,py,C.greenDark,2,[5,5]);a.circle(px,py,9,C.green,C.paper,3);
      a.text(`探针 ${(o.probeAmplitude*100).toFixed(1)}%`,px,Math.max(60,py-24),C.greenDark,16,'center',800);
      const dx=x0+o.depth/maxZ*w;a.line(dx,y0,dx,y0-h/Math.E,C.orange,2,[5,5]);a.text('δE',dx,y0+26,C.orangeDark,16,'center',800);
      a.text(`离界面深度 z（0–${Math.round(maxZ)} nm）`,x0+w/2,258,C.muted,16,'center',700);
    }else{
      a.rect(150,100,410,92,o.valid?C.warn:'#fff0ef',o.valid?C.orange:C.red,14,1.6);
      a.text(o.valid?'尚未越过临界角':'折射率顺序不支持全反射',355,132,o.valid?C.orangeDark:C.red,17,'center',850);
      a.text('当前上方是传播解，不应画成指数衰减曲线。',355,166,C.muted,16,'center',700);
    }
  }

  function drawApparatus(canvas,s,o){
    const a=api(canvas,'apparatus');a.clear('#fbfdfc');
    a.text('受抑全反射：第二介质进入倏逝场',34,27,C.tealDark,19,'left',850);
    a.text('教学近似：耦合尺度 ∝ e⁻²ᵏᵍ',686,27,C.orangeDark,16,'right',800);
    const y1=105,y2=190,gapPx=65;
    a.rect(65,y2,590,58,C.lower,C.teal,10,1.5);
    a.rect(65,y1-gapPx,590,58,'#e8f4f3',C.teal,10,1.5);
    a.text(`第一棱镜 n₁=${s.n1.toFixed(2)}`,86,y2+29,C.ink,16,'left',800);
    a.text(`第二耦合介质 n₃=${s.n3.toFixed(2)}`,86,y1-gapPx+29,C.ink,16,'left',800);
    a.text(`间隙 g=${Math.round(s.gap)} nm`,360,146,C.purple,16,'center',800);
    a.arrow(120,260,270,y2,C.green,4);
    a.arrow(270,y2,430,260,C.teal,4);
    if(o.tir){
      const alpha=clamp(o.coupling,.05,1);a.arrow(270,y2,360,y1-gapPx+58,`rgba(233,130,66,${alpha})`,3+3*alpha);
      a.arrow(360,y1-gapPx+58,520,70,`rgba(233,130,66,${alpha})`,3+3*alpha);
    }
    a.rect(470,198,186,70,o.tir?C.purpleLight:C.warn,o.tir?C.purple:C.orange,12,1.5);
    a.text(o.tir?'近似耦合强度':'需先进入全反射区',563,220,o.tir?C.purple:C.orangeDark,16,'center',800);
    a.mono(o.tir?`${(o.coupling*100).toFixed(2)}%`:'—',563,247,o.tir?C.purple:C.muted,19,'center',850);
  }

  const modules={
    transition:{group:'机制连续性',title:'传播解如何变成倏逝解',sub:'用法向波数平方跨零，而不是背诵“突然全反射”',purpose:'展示临界角不是人为开关，而是法向传播常数从实数连续过渡为纯虚数。',role:'连接斯涅尔定律、临界角和指数衰减解。',action:'拖动入射方向穿过 θc，观察当前点跨过 kz²=0。',kind:'canvas',draw:drawTransition},
    decay:{group:'可观测量',title:'穿透深度与局部场探针',sub:'场幅不为零，但离开界面指数衰减',purpose:'量化倏逝场在低折射率侧实际延伸多远。',role:'把 κ 转换为穿透深度和探针读数。',action:'在主图上下拖动场探针，并改变波长或入射角。',kind:'canvas',draw:drawDecay},
    apparatus:{group:'现实装置',title:'受抑全反射耦合',sub:'第二介质进入衰减区后可重新获得传播能量',purpose:'说明倏逝场不是“没有光”，并连接棱镜耦合实验。',role:'把间隙厚度与可测透射信号联系起来。',action:'进入全反射区后减小间隙 g，观察耦合量级上升。',kind:'canvas',draw:drawApparatus},
    derivation:{group:'数学表征',title:'从切向波数守恒到穿透深度',sub:'每个符号必须回指主图中的界面、方向和深度',purpose:'从边界相位连续性推导临界条件和倏逝解。',role:'将几何角度转换成波矢分量和指数衰减。',action:'依次核对 kx、kz、κ 和 δE 的物理对象。',kind:'html'},
    validation:{group:'验证与边界',title:'自洽性与模型边界',sub:'区分反射率、场存在和法向能流',purpose:'检查全反射条件、能量分配、穿透深度和教学近似。',role:'防止把“R=1”误读为“另一侧完全没有电磁场”。',action:'优先查看警告项，再切换折射率顺序和极端间隙。',kind:'html'}
  };

  function guide(module){
    return `<details class="tir-module-guide"><summary>目的、作用与建议操作</summary><div><p><b>目的</b>${esc(module.purpose)}</p><p><b>作用</b>${esc(module.role)}</p><p><b>操作</b>${esc(module.action)}</p></div></details>`;
  }

  function derivationHtml(){
    return `<div class="tir-derivation">
      <article><i>1</i><div><div class="tir-eq">\\[k_x=k_0n_1\\sin\\theta_i\\]</div><p>界面方向的相位必须连续，所以切向波数在两侧相同。</p></div></article>
      <article><i>2</i><div><div class="tir-eq">\\[k_{z,2}^2=k_0^2\\left(n_2^2-n_1^2\\sin^2\\theta_i\\right)\\]</div><p>括号为正时存在传播折射波；等于零时折射方向贴着界面。</p></div></article>
      <article><i>3</i><div><div class="tir-eq">\\[\\theta_i>\\theta_c\\Rightarrow k_{z,2}=i\\kappa,\\quad \\kappa=k_0\\sqrt{n_1^2\\sin^2\\theta_i-n_2^2}\\]</div><p>超过临界角后，法向波数变成纯虚数，场不再沿法向传播。</p></div></article>
      <article><i>4</i><div><div class="tir-eq">\\[E(z)=E(0)e^{-\\kappa z},\\qquad \\delta_E=\\frac1{\\kappa}\\]</div><p>δE 是场幅降至 1/e 的深度；强度的 1/e 深度为 1/(2κ)。</p></div></article>
    </div>`;
  }

  function validationHtml(o,s){
    const checks=[
      ['全反射必要条件',o.valid?'通过':'不满足',o.valid?`n₁=${s.n1.toFixed(2)} > n₂=${s.n2.toFixed(2)}`:'必须先有 n₁>n₂。',o.valid?'ok':'bad'],
      ['当前角度判据',o.valid?(o.tir?'全反射':o.criticalState?'临界附近':'仍有透射'):'不适用',o.valid?`θᵢ−θc=${fmt(o.margin,2)}°`:'没有临界角。',o.tir?'ok':o.criticalState?'warn':''],
      ['平均法向能流',o.tir?'0':'非零',o.tir?'倏逝场存在，但不向远离界面的方向输运平均功率。':`当前透射率约 ${fmt(o.T*100,1)}%。`,o.tir?'ok':''],
      ['场幅穿透深度',o.tir?`${fmt(o.depth,0)} nm`:'不定义',o.tir?`强度 1/e 深度约 ${fmt(o.intensityDepth,0)} nm。`:'传播波不能用指数穿透深度描述。',o.tir?'ok':'warn'],
      ['受抑全反射近似',o.tir?`${(o.coupling*100).toFixed(2)}%`:'不适用','e⁻²κg 只表示量级；精确三层结构需要完整菲涅耳多层计算。','warn']
    ];
    return `<div class="tir-checks">${checks.map(([k,v,p,t])=>`<article class="${t}"><span>${esc(k)}</span><b>${esc(v)}</b><p>${esc(p)}</p></article>`).join('')}</div><div class="tir-boundary"><b>模型边界</b><p>当前模型假设平面、均匀、无吸收、各向同性、非磁性介质。倏逝场线条表示标量场幅；真实 TE/TM 电磁场分量、Goos–Hänchen 位移和三层耦合需更完整的矢量边界计算。</p></div>`;
  }

  function moduleCard(id){
    const m=modules[id];
    const body=m.kind==='canvas'?`<div class="tir-module-canvas-wrap"><canvas width="720" height="290" data-r5-canvas="${id}"></canvas></div>`:`<div class="tir-module-html" data-r5-html="${id}">${id==='derivation'?derivationHtml():validationHtml(outputFor(activeState),activeState)}</div>`;
    return `<article class="tir-module" data-module-id="${id}"><header><div><span>${esc(m.group)}</span><h3>${esc(m.title)}</h3><p>${esc(m.sub)}</p></div><div class="tir-module-actions"><button type="button" data-r5-focus="${id}">放大</button><button type="button" data-r5-remove="${id}">关闭</button></div></header>${guide(m)}${body}</article>`;
  }

  function controlRange(key,label,min,max,step,unit){
    const value=activeState[key];
    const formatted=unit==='ratio'?Number(value).toFixed(2):unit==='deg'?`${Number(value).toFixed(1)}°`:`${Math.round(value)} ${unit}`;
    return `<label class="tir-control"><span><b>${esc(label)}</b><output data-r5-output="${key}">${formatted}</output></span><input data-r5-param="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
  }

  function renderShell(){
    const root=document.getElementById('view');
    root.classList.add('r5-v019-mounted');
    document.querySelector('.app')?.classList.add('r5-v019-active');
    root.innerHTML=`<section class="tir-page" data-model-id="${MODEL_ID}" data-legibility-version="019">
      <header class="tir-hero"><div><button class="tir-back" data-route="category:reflection">← 返回反射模型图谱</button><span>R5 · v0.19 · TOTAL INTERNAL REFLECTION</span><h1>全反射与倏逝场</h1><p>不是把折射光“删除”，而是追踪法向传播常数如何跨过零并转化为指数衰减场。</p></div><aside><b>核心因果链</b><p>切向波数守恒 → 临界角 → 法向波数变虚 → 倏逝衰减 → 探针与耦合实验</p><div class="tir-hero-eq">\\[\\sin\\theta_c=\\frac{n_2}{n_1},\\qquad \\delta_E=\\frac{1}{\\kappa}\\]</div></aside></header>
      <main class="tir-workspace"><section class="tir-primary"><header><div><span>PRIMARY MANIPULABLE SYSTEM</span><h2>界面传播与局部场探针</h2><p>拖动入射方向穿过临界角；拖动上方探针读取场幅随深度的变化。</p></div><div class="tir-legend"><span><i style="background:${C.green}"></i>入射波</span><span><i style="background:${C.teal}"></i>反射波</span><span><i style="background:${C.orange}"></i>传播折射波</span><span><i style="background:${C.purple}"></i>倏逝场</span></div></header>
        <details class="tir-primary-guide"><summary>主实验台目的、作用与建议操作</summary><div><p><b>目的</b>直接观察传播折射波如何在临界角处转化为倏逝解。</p><p><b>作用</b>统一角度、波矢、反射率、穿透深度和局部场读数。</p><p><b>操作</b>先穿过 θc，再上下拖动场探针；随后改变波长和折射率。</p></div></details>
        <div class="tir-main-canvas-wrap"><canvas id="r5MainCanvas" width="1080" height="675"></canvas></div>
        <div class="tir-live-strip"><article class="primary"><span>当前状态</span><b data-r5-metric="regime"></b></article><article><span>临界角 θc</span><b data-r5-metric="critical"></b></article><article><span>场幅穿透深度 δE</span><b data-r5-metric="depth"></b></article><article><span>探针场幅</span><b data-r5-metric="probe"></b></article></div>
        <footer><span>拖动绿色入射把手改变 θᵢ；拖动紫色探针改变 z。</span><span data-r5-foot></span></footer>
      </section>
      <section class="tir-analysis"><header><div><span>SYNCHRONIZED ANALYSIS</span><h2>同步分析区</h2><p>主图与两个互补模块读取同一状态；模块文字和图内标签均按真实显示字号验收。</p></div><output data-r5-count>2 / 2</output></header><div class="tir-board"></div></section></main>
      <button class="tir-edge tir-left-handle" aria-controls="r5LeftDrawer"><b>模块</b><span data-r5-count>2 / 2</span></button>
      <button class="tir-edge tir-right-handle" aria-controls="r5RightDrawer"><b>参数</b><span>状态</span></button>
      <aside class="tir-drawer tir-left-drawer" id="r5LeftDrawer"><header><div><span>ANALYSIS DOCK</span><h2>同步分析模块</h2></div><button data-r5-close>关闭</button></header><div class="tir-module-presets"><button data-r5-preset="mechanism">机制＋探针</button><button data-r5-preset="apparatus">装置＋探针</button><button data-r5-preset="proof">公式＋验证</button><button data-r5-preset="clear">清空</button></div><div class="tir-module-selector">${Object.entries(modules).map(([id,m])=>`<label><input type="checkbox" value="${id}" ${activeModules.has(id)?'checked':''}><span><b>${esc(m.title)}</b><small>${esc(m.sub)}</small></span></label>`).join('')}</div><div class="tir-budget"><b>同屏预算：2 个模块</b><p>超过两个时必须先关闭旧模块；不以“塞得下”为可读标准。</p></div></aside>
      <aside class="tir-drawer tir-right-drawer" id="r5RightDrawer"><header><div><span>UNIFIED STATE</span><h2>参数与实时判据</h2></div><button data-r5-close>关闭</button></header><div class="tir-param-body"><button class="tir-reset" data-r5-reset>恢复默认</button><div class="tir-controls">
        ${controlRange('n1','高折射率侧 n₁',1.05,2.5,.01,'ratio')}
        ${controlRange('n2','低折射率侧 n₂',1,2.2,.01,'ratio')}
        ${controlRange('angle','界面入射角 θᵢ',0,89,.2,'deg')}
        ${controlRange('lambda','真空波长 λ',380,1650,5,'nm')}
        <label class="tir-control"><span><b>偏振</b></span><select data-r5-param="pol"><option value="s" ${activeState.pol==='s'?'selected':''}>s 偏振</option><option value="p" ${activeState.pol==='p'?'selected':''}>p 偏振</option><option value="unpolarized" ${activeState.pol==='unpolarized'?'selected':''}>非偏振</option></select></label>
        ${controlRange('probeDepth','场探针深度 z',0,3000,10,'nm')}
        ${controlRange('gap','第二介质间隙 g',0,2500,10,'nm')}
        ${controlRange('n3','第二耦合介质 n₃',1,2.5,.01,'ratio')}
      </div><div class="tir-presets"><button data-r5-state-preset="below">未到临界角</button><button data-r5-state-preset="critical">临界附近</button><button data-r5-state-preset="tir">全反射</button><button data-r5-state-preset="invalid">无临界角</button></div><div class="tir-full-metrics"><article><span>反射率 R</span><b data-r5-detail="R"></b></article><article><span>能量透射率 T</span><b data-r5-detail="T"></b></article><article><span>s/p 相位差</span><b data-r5-detail="phase"></b></article><article><span>强度 1/e 深度</span><b data-r5-detail="intensityDepth"></b></article></div><div class="tir-status" data-r5-status></div></div></aside>
      <div class="tir-backdrop"></div>
    </section>`;
    activeRoot=root.querySelector('.tir-page');
    typeset(activeRoot);
    bindInteractions();
    renderBoard();
    updateAll();
  }

  function typeset(root){
    const run=()=>window.MathJax?.typesetPromise?.([root]).catch(()=>{});
    if(window.MathJax?.startup?.promise)window.MathJax.startup.promise.then(run);else setTimeout(run,100);
  }

  function updateControlDisplays(){
    const formats={n1:v=>Number(v).toFixed(2),n2:v=>Number(v).toFixed(2),angle:v=>`${Number(v).toFixed(1)}°`,lambda:v=>`${Math.round(v)} nm`,probeDepth:v=>`${Math.round(v)} nm`,gap:v=>`${Math.round(v)} nm`,n3:v=>Number(v).toFixed(2)};
    Object.entries(formats).forEach(([key,fn])=>{const out=activeRoot.querySelector(`[data-r5-output="${key}"]`);if(out)out.textContent=fn(activeState[key]);const input=activeRoot.querySelector(`[data-r5-param="${key}"]`);if(input&&String(input.value)!==String(activeState[key]))input.value=activeState[key];});
    const pol=activeRoot.querySelector('[data-r5-param="pol"]');if(pol&&pol.value!==activeState.pol)pol.value=activeState.pol;
  }

  function updateMetrics(o){
    const set=(key,value)=>{const n=activeRoot.querySelector(`[data-r5-metric="${key}"]`);if(n)n.textContent=value;};
    set('regime',o.regimeLabel);set('critical',o.valid?`${fmt(o.critical,2)}°`:'不存在');set('depth',o.tir?`${fmt(o.depth,0)} nm`:'不定义');set('probe',o.tir?`${(o.probeAmplitude*100).toFixed(1)}%`:'传播波');
    const detail=(key,value)=>{const n=activeRoot.querySelector(`[data-r5-detail="${key}"]`);if(n)n.textContent=value;};
    detail('R',`${fmt(o.R*100,2)}%`);detail('T',`${fmt(o.T*100,2)}%`);detail('phase',o.tir?`${fmt(deg(o.relativePhase),2)}°`:'0°');detail('intensityDepth',o.tir?`${fmt(o.intensityDepth,0)} nm`:'不定义');
    activeRoot.querySelector('[data-r5-status]').textContent=o.status;
    activeRoot.querySelector('[data-r5-status]').className=`tir-status ${o.regime}`;
    activeRoot.querySelector('[data-r5-foot]').textContent=o.tir?'场存在 ≠ 法向平均能量传播。':'折射波仍携带能量进入 n₂。';
  }

  function updateAll(){
    if(!activeRoot?.isConnected)return;
    const o=outputFor(activeState);
    updateControlDisplays();updateMetrics(o);
    drawMain(activeRoot.querySelector('#r5MainCanvas'),activeState,o,performance.now()/1000);
    for(const id of activeModules){
      const canvas=activeRoot.querySelector(`[data-r5-canvas="${id}"]`);if(canvas)modules[id].draw(canvas,activeState,o);
      if(id==='validation'){const node=activeRoot.querySelector('[data-r5-html="validation"]');if(node)node.innerHTML=validationHtml(o,activeState);}
    }
    activeRoot.dataset.renderRevision=String((Number(activeRoot.dataset.renderRevision)||0)+1);
    window.R5TIRWorkbenchV019.lastOutput=o;
  }

  function renderBoard(){
    const board=activeRoot.querySelector('.tir-board');board.innerHTML=[...activeModules].map(moduleCard).join('');
    activeRoot.querySelectorAll('[data-r5-count]').forEach(n=>n.textContent=`${activeModules.size} / ${MAX_MODULES}`);
    activeRoot.querySelectorAll('.tir-module-selector input').forEach(input=>input.checked=activeModules.has(input.value));
    board.classList.toggle('is-focused',false);
    typeset(board);updateAll();
  }

  function setModules(ids){activeModules=new Set(ids.slice(0,MAX_MODULES));renderBoard();}
  function addModule(id){if(activeModules.has(id))return;if(activeModules.size>=MAX_MODULES)activeModules.delete(activeModules.values().next().value);activeModules.add(id);renderBoard();}
  function removeModule(id){activeModules.delete(id);renderBoard();}

  function openDrawer(side){
    const drawer=activeRoot.querySelector(`.tir-${side}-drawer`);const other=activeRoot.querySelector(`.tir-${side==='left'?'right':'left'}-drawer`);other?.classList.remove('is-open');drawer?.classList.add('is-open');activeRoot.querySelector('.tir-backdrop')?.classList.add('is-open');
  }
  function closeDrawers(){activeRoot.querySelectorAll('.tir-drawer').forEach(n=>n.classList.remove('is-open'));activeRoot.querySelector('.tir-backdrop')?.classList.remove('is-open');}

  function applyPreset(name){
    if(name==='below')Object.assign(activeState,{n1:1.52,n2:1,angle:30,lambda:633,probeDepth:320});
    if(name==='critical'){const crit=deg(Math.asin(1/1.52));Object.assign(activeState,{n1:1.52,n2:1,angle:crit-.08,lambda:633,probeDepth:320});}
    if(name==='tir')Object.assign(activeState,{n1:1.52,n2:1,angle:55,lambda:633,probeDepth:320});
    if(name==='invalid')Object.assign(activeState,{n1:1.2,n2:1.45,angle:55,lambda:633,probeDepth:320});
    updateAll();
  }

  function bindInteractions(){
    const canvas=activeRoot.querySelector('#r5MainCanvas');
    let drag=null,pointerId=null;
    canvas.addEventListener('pointerdown',event=>{
      const p=logicalPoint(canvas,event),x0=760,y0=390,L=270,ang=rad(activeState.angle),sx=x0-L*Math.sin(ang),sy=y0+L*Math.cos(ang),probeX=960,probeY=y0-clamp(activeState.probeDepth*.22,28,250);
      if(Math.hypot(p.x-sx,p.y-sy)<38)drag='angle';else if(Math.hypot(p.x-probeX,p.y-probeY)<38)drag='probe';else return;
      pointerId=event.pointerId;canvas.setPointerCapture?.(pointerId);event.preventDefault();
    });
    canvas.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==pointerId)return;const p=logicalPoint(canvas,event);
      if(drag==='angle'){const dx=760-p.x,dy=p.y-390;if(dy>8)activeState.angle=clamp(deg(Math.atan2(Math.max(0,dx),dy)),0,89);}
      else activeState.probeDepth=clamp((390-p.y)/.22,0,3000);
      updateAll();event.preventDefault();
    });
    const stop=event=>{if(event.pointerId===pointerId){drag=null;pointerId=null;}};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);

    activeRoot.addEventListener('input',event=>{
      const node=event.target.closest('[data-r5-param]');if(!node)return;const key=node.dataset.r5Param;activeState[key]=node.tagName==='SELECT'?node.value:Number(node.value);updateAll();
    });
    activeRoot.addEventListener('change',event=>{
      const box=event.target.closest('.tir-module-selector input');if(box){box.checked?addModule(box.value):removeModule(box.value);}
    });
    activeRoot.addEventListener('click',event=>{
      if(event.target.closest('.tir-left-handle'))return openDrawer('left');
      if(event.target.closest('.tir-right-handle'))return openDrawer('right');
      if(event.target.closest('[data-r5-close]')||event.target.closest('.tir-backdrop'))return closeDrawers();
      if(event.target.closest('[data-r5-reset]')){activeState=freshState();updateAll();return;}
      const statePreset=event.target.closest('[data-r5-state-preset]');if(statePreset)return applyPreset(statePreset.dataset.r5StatePreset);
      const preset=event.target.closest('[data-r5-preset]');if(preset){const map={mechanism:['transition','decay'],apparatus:['apparatus','decay'],proof:['derivation','validation'],clear:[]};setModules(map[preset.dataset.r5Preset]);return;}
      const remove=event.target.closest('[data-r5-remove]');if(remove)return removeModule(remove.dataset.r5Remove);
      const focus=event.target.closest('[data-r5-focus]');if(focus){const board=activeRoot.querySelector('.tir-board');const card=focus.closest('.tir-module');board.classList.toggle('is-focused');card.classList.toggle('is-focus-target');}
    });
  }

  function animate(){
    cancelAnimationFrame(animationFrame);
    const tick=()=>{
      if(!activeRoot?.isConnected)return;
      const o=outputFor(activeState);drawMain(activeRoot.querySelector('#r5MainCanvas'),activeState,o,performance.now()/1000);animationFrame=requestAnimationFrame(tick);
    };
    animationFrame=requestAnimationFrame(tick);
  }

  function mount(){
    cleanup();activeState=freshState();activeModules=new Set(['transition','decay']);renderShell();animate();
    cleanup=()=>{cancelAnimationFrame(animationFrame);document.getElementById('view')?.classList.remove('r5-v019-mounted');document.querySelector('.app')?.classList.remove('r5-v019-active');activeRoot=null;};
  }

  window.renderModel=function renderWithR5(id){
    cleanup();
    if(id===MODEL_ID)mount();else previousRenderModel(id);
  };

  window.R5TIRWorkbenchV019={version:'0.19.0',compute:outputFor,freshState,getState:()=>activeState,getTextAudit:()=>structuredClone(textAudit),lastOutput:null};

  if(decodeURIComponent(location.hash.slice(1))===`model:${MODEL_ID}`)setTimeout(()=>window.renderModel(MODEL_ID),0);
})();
