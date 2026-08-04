'use strict';
(() => {
  const registry={};
  const enhancedDomains=new Set(['reflection','interference']);
  const oldRenderModel=renderModel;
  let renderToken=0;
  const h=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const tex=(s,display=false)=>display?`<div class="math-display">\\[${s}\\]</div>`:`<span class="math-inline">\\(${s}\\)</span>`;
  function typeset(root=document){
    const run=()=>window.MathJax?.typesetPromise?MathJax.typesetPromise([root]).catch(()=>{}):null;
    if(window.MathJax?.startup?.promise)MathJax.startup.promise.then(run);else setTimeout(run,80);
  }
  function register(id,cfg){registry[id]=cfg}
  window.ModelUpgradeV07={register,registry,tex};

  function genericView(title,subtitle){return{title,subtitle,caption:'该视图随右侧参数同步更新，用来连接几何、局部机制与最终观测。',draw:(a,s,o)=>{a.clear();a.text(title,a.W/2,90,'#0b3040',19,'center',700);a.text(subtitle,a.W/2,125,'#66808a',13,'center',500);const cx=a.W/2,cy=a.H/2+25;a.circle(cx,cy,105,'#f3fbf9','#0b8589',2);a.text('参数',cx,cy-30,'#0b8589',15,'center');a.text(Object.keys(s).slice(0,4).map(k=>`${k}=${typeof s[k]==='number'?fmt(s[k],2):s[k]}`).join('  ·  '),cx,cy+5,'#516d74',12,'center');a.text('观测',cx,cy+48,'#d56d2c',15,'center');a.text((o.metrics||[]).slice(0,2).map(x=>x.join(' ')).join('  ·  '),cx,cy+78,'#516d74',11,'center')}}}

  renderModel=function(id){
    const m=models[id],meta=modelMeta[id];
    if(!m||!meta)return;
    if(!enhancedDomains.has(meta.domain)||!registry[id])return oldRenderModel(id);
    const cfg=registry[id],state=structuredClone(m.defaults),token=++renderToken;
    const panels=(cfg.panels||[]).length?cfg.panels:[genericView('实验装置','从真实器件看输入与输出'),genericView('局部机制','放大最关键的物理过程'),genericView('观测结果','把状态量映射为可测信号')];
    const causal=(cfg.causal||['输入','局部作用','状态变化','传播/叠加','观测']).map(x=>`<span>${h(x)}</span>`).join('');
    view.innerHTML=`<div class="model-hero"><div><div class="crumb" data-route="category:${meta.domain}">← 返回${domains[meta.domain].title}模型图谱</div><div class="eyebrow">${meta.num} · ${domains[meta.domain].title} · v0.7</div><h1>${h(meta.title)}</h1><p>${h(meta.sub)}</p></div><div class="equation-card"><b>核心关系</b>${tex(cfg.mainEquation||meta.equation,true)}<small>${h(m.equationNote||'')}</small></div></div>
    <div class="causal-summary">${causal}</div>
    <div class="model-shell enhanced-shell"><main class="enhanced-main">
      <section class="card enhanced-primary"><div class="card-head"><div class="head-title"><span class="section-num">01</span><div><b>${h(m.canvasTitle)}</b><small>${h(m.canvasSub)}</small></div></div><div class="legend">${(m.legend||[]).map(l=>`<span><i style="background:${l[1]}"></i>${h(l[0])}</span>`).join('')}</div></div><div class="view-tabs"><span class="view-chip">主交互模型</span><span class="view-chip">参数双向绑定</span><span class="view-chip">实时物理判据</span></div><div class="canvas-wrap"><canvas id="modelCanvas" class="model-canvas" width="1080" height="675"></canvas></div><div class="canvas-foot"><span>${h(m.dragHint||'拖动图中的高亮控制点，或使用右侧参数。')}</span><span id="canvasFootState"></span></div></section>
      <section class="multi-view-grid">${panels.map((p,i)=>`<article class="evidence-card ${p.wide?'wide':''}"><div class="card-head"><div class="head-title"><span class="section-num">${String(i+2).padStart(2,'0')}</span><div><div class="panel-kicker">${h(p.kicker||'linked representation')}</div><b>${h(p.title)}</b><small>${h(p.subtitle||'')}</small></div></div></div><div class="evidence-canvas-wrap"><canvas id="evidenceCanvas${i}" class="evidence-canvas" width="720" height="450"></canvas></div><div class="evidence-caption"><b>读图：</b>${h(p.caption||'')}</div></article>`).join('')}</section>
      <section class="card reasoning-card"><div class="card-head"><div class="head-title"><span class="section-num">${String(panels.length+2).padStart(2,'0')}</span><div><b>从图到公式：推导链与误区校正</b><small>公式不是装饰，而是前面几何或边界机制的压缩表达</small></div></div></div><div class="panel-body"><div class="reasoning-grid"><div><div class="derivation-list">${(cfg.derivation||[]).map((d,i)=>`<div class="derivation-step"><i>${i+1}</i><div>${tex(d.tex,true)}<p>${h(d.why)}</p></div></div>`).join('')}</div><div class="procedure-box"><h4>推荐操作顺序</h4><ol>${(cfg.procedure||[]).map(x=>`<li>${h(x)}</li>`).join('')}</ol></div></div><div><div class="misconception-box"><h4>批判性检查：常见错误</h4>${(cfg.misconceptions||[]).map(x=>`<div class="misconception"><b>× ${h(x[0])}</b><span>✓ ${h(x[1])}</span></div>`).join('')}</div><div class="reference-strip"><b>核验来源：</b> ${(cfg.references||[]).map(r=>`<a href="${h(r.url)}" target="_blank" rel="noreferrer">${h(r.label)}</a>`).join('')}</div></div></div></div></section>
    </main><aside class="side"><section class="card panel"><div class="card-head"><div class="head-title"><span class="section-num">P</span><div><b>实验参数</b><small>所有视图同步重算</small></div></div><button class="ghost" id="resetModel">重置</button></div><div class="panel-body" id="controls">${m.params.map(p=>controlHtml(p,state[p.key])).join('')}<div class="preset-row">${(m.presets||[]).map((p,i)=>`<button class="preset" data-preset="${i}">${h(p.name)}</button>`).join('')}</div></div></section><section class="card panel"><div class="card-head"><div class="head-title"><span class="section-num">R</span><div><b>实时数值与判据</b><small>不是只给最终答案</small></div></div></div><div class="panel-body"><div class="metric-grid" id="metrics"></div><div class="status" id="modelStatus"></div></div></section><section class="card panel"><div class="card-head"><div class="head-title"><span class="section-num">M</span><div><b>物理本质与边界</b><small>区分模型、近似与现实</small></div></div></div><div class="panel-body"><div class="essence">${(m.essence||[]).map((x,i)=>`<div class="essence-step"><i>${String(i+1).padStart(2,'0')}</i><div><b>${h(x[0])}</b><span>${h(x[1])}</span></div></div>`).join('')}</div><div class="boundary">${h(m.boundary||'')}</div><div class="formula-list">${(cfg.formulas||m.formulas||[]).map(f=>tex(f,true)).join('')}</div></div></section></aside></div>`;

    const canvas=document.getElementById('modelCanvas'),api=canvasAPI(canvas),support=panels.map((p,i)=>canvasAPI(document.getElementById('evidenceCanvas'+i))),controls=document.getElementById('controls'),metrics=document.getElementById('metrics'),status=document.getElementById('modelStatus'),foot=document.getElementById('canvasFootState');
    let drag=null,anim=0,lastTypeset=false;
    function update(){const out=m.compute(state);m.draw(api,state,out,anim);panels.forEach((p,i)=>p.draw(support[i],state,out,anim));metrics.innerHTML=(out.metrics||[]).map((x,i)=>`<div class="metric ${i===0?'highlight':''}"><div class="k">${h(x[0])}</div><div class="v">${h(x[1])}</div></div>`).join('');status.className='status '+(out.statusType||'');status.textContent=out.status||'';foot.textContent=out.foot||'';m.params.forEach(p=>{const outEl=document.querySelector(`[data-output="${p.key}"]`);if(outEl)outEl.textContent=p.format?p.format(state[p.key]):state[p.key];const c=document.querySelector(`[data-param="${p.key}"]`);if(c&&String(c.value)!==String(state[p.key]))c.value=state[p.key]});if(!lastTypeset){lastTypeset=true;typeset(view)}}
    controls.querySelectorAll('[data-param]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{state[el.dataset.param]=el.tagName==='SELECT'?el.value:+el.value;update()}));
    document.getElementById('resetModel').onclick=()=>{Object.assign(state,structuredClone(m.defaults));update()};controls.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{Object.assign(state,m.presets[+b.dataset.preset].values);update()});
    canvas.addEventListener('pointerdown',e=>{const p=getPointer(canvas,e);drag=m.hit?m.hit(p,state,m.compute(state)):null;if(drag){canvas.setPointerCapture(e.pointerId);e.preventDefault()}});canvas.addEventListener('pointermove',e=>{if(!drag||!m.drag)return;m.drag(drag,getPointer(canvas,e),state);update()});canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
    function loop(){if(token!==renderToken)return;anim+=.035;if(m.animate||panels.some(p=>p.animate)){const out=m.compute(state);if(m.animate)m.draw(api,state,out,anim);panels.forEach((p,i)=>{if(p.animate)p.draw(support[i],state,out,anim)})}requestAnimationFrame(loop)}
    update();loop();
  };
})();
