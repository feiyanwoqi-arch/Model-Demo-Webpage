'use strict';
(() => {
  domains.diffraction = {
    index: '03',
    title: '衍射',
    sub: '有限波前的不同部分如何重新分配传播方向与空间频率',
    desc: '衍射不是光线在边缘“拐弯”，而是有限孔径或障碍物截断、调制波前后，波前各部分在后续空间中连续相干叠加。近场由菲涅耳传播描述，远场则成为孔径函数的傅里叶图样；同一机制同时解释单缝、光栅、艾里斑、泊松亮斑、波带片和成像分辨极限。',
    chain: ['波前被孔径调制', '次级波相干叠加', '近场传播', '远场频谱', '成像与器件'],
    glow: '#dce9ff',
    note: '同一孔径传播问题，从惠更斯–菲涅耳构造、菲涅耳近场、夫琅禾费远场，一直展开到分辨率与衍射器件。',
    models: ['huygens-fresnel','near-far-diffraction','single-slit-diffraction','double-slit-diffraction','diffraction-grating','aperture-fourier','airy-resolution','knife-edge-diffraction','poisson-spot','zone-plate','talbot-effect','bragg-diffraction']
  };
  Object.assign(modelMeta, {
    'huygens-fresnel': {domain:'diffraction',num:'D1',title:'惠更斯–菲涅耳原理',sub:'把孔径内每一点看成带相位的次级波源，观察波前如何重新展开',level:'基础',tags:['波前','次级波','相干积分'],equation:'U(P) ∝ ∬A U(Q)eⁱᵏʳ/r · dA'},
    'near-far-diffraction': {domain:'diffraction',num:'D2',title:'菲涅耳近场与夫琅禾费远场',sub:'用菲涅耳数连续观察“几何影子”如何演化为稳定远场图样',level:'大学基础',tags:['菲涅耳数','近场','远场'],equation:'N_F = a²/(λz)'},
    'single-slit-diffraction': {domain:'diffraction',num:'D3',title:'单缝夫琅禾费衍射',sub:'从缝内连续相量相消推出宽中央主极大与 sinc² 强度',level:'大学基础',tags:['sinc²','中央主极大','第一暗纹'],equation:'I/I₀ = (sinβ/β)²'},
    'double-slit-diffraction': {domain:'diffraction',num:'D4',title:'有限缝宽双缝衍射',sub:'区分快速双缝条纹与缓慢单缝包络，并识别缺级',level:'大学基础',tags:['包络','缺级','有限缝宽'],equation:'I ∝ sinc²α · cos²β'},
    'diffraction-grating': {domain:'diffraction',num:'D5',title:'衍射光栅与光谱分辨',sub:'大量周期单元把不同波长送往不同方向，并形成窄主极大',level:'大学基础—进阶',tags:['光谱','级次','分辨本领'],equation:'d sinθₘ = mλ'},
    'aperture-fourier': {domain:'diffraction',num:'D6',title:'二维孔径与傅里叶衍射图样',sub:'切换矩形、圆孔、环孔和双孔，直接对应孔径形状与远场空间频谱',level:'进阶',tags:['傅里叶光学','二维孔径','空间频率'],equation:'U_far(kₓ,kᵧ) ∝ 𝓕{A(x,y)}'},
    'airy-resolution': {domain:'diffraction',num:'D7',title:'圆孔艾里斑与瑞利判据',sub:'有限口径把点物体扩展成点扩散函数，并限制两个点的可分辨性',level:'大学基础',tags:['艾里斑','瑞利判据','分辨率'],equation:'θ_R = 1.22λ/D'},
    'knife-edge-diffraction': {domain:'diffraction',num:'D8',title:'刀口菲涅耳衍射',sub:'观察几何明暗边界附近为何出现振荡条纹，并连接到菲涅耳积分',level:'大学基础—进阶',tags:['半平面','菲涅耳积分','影区'],equation:'I(u) ∝ [½+C(u)]²+[½+S(u)]²'},
    'poisson-spot': {domain:'diffraction',num:'D9',title:'圆盘障碍与泊松亮斑',sub:'理解不透明圆盘阴影中心为何反而出现亮点，以及巴比涅原理的作用',level:'大学基础—进阶',tags:['泊松亮斑','巴比涅原理','圆盘障碍'],equation:'U_disk = U_free − U_aperture'},
    'zone-plate': {domain:'diffraction',num:'D10',title:'菲涅耳波带片',sub:'选择性保留同相菲涅耳半波带，用衍射而不是折射形成焦点',level:'进阶',tags:['衍射透镜','焦点','色差'],equation:'rₙ² ≈ nλf'},
    'talbot-effect': {domain:'diffraction',num:'D11',title:'泰伯自成像与泰伯毯',sub:'周期光栅在特定近场距离重现自身，并在分数距离形成更细结构',level:'进阶',tags:['自成像','周期结构','近场衍射'],equation:'z_T = 2d²/λ'},
    'bragg-diffraction': {domain:'diffraction',num:'D12',title:'布拉格衍射与晶格测量',sub:'把三维周期晶格化为相邻晶面散射波的路径差条件',level:'大学基础—进阶',tags:['X射线','晶格间距','布拉格条件'],equation:'nλ = 2d sinθ'}
  });
  Object.assign(modelMeta['multi-slit'], {title:'N 个相干源的离散叠加',sub:'先只研究有限个等间距相干源怎样形成主极大，再到衍射域加入真实孔径包络与光谱',tags:['N 源','离散相量','主极大'],equation:'I ∝ (sin Nβ/sin β)²'});
  renderHome = function(){
    view.innerHTML = `<section class="hero"><div><div class="eyebrow">BASIC OPTICS · CONCEPT ATLAS</div><h1>从反射、干涉与衍射三条主干建立光学模型体系</h1><p>主页先进入物理概念域，再沿着“底层机制 → 标准实验 → 器件与测量”的路径选择具体模型。反射研究边界如何改变单束光，干涉研究少数相干振幅如何相加，衍射研究连续波前被有限孔径调制后的空间传播。</p></div><div class="equation-card"><b>统一底层表达</b><code>边界条件 + 复振幅传播 → 可观测强度</code><small>三类现象不是彼此割裂：衍射本质上也是波前不同部分的干涉，只是参与叠加的自由度从少数离散光束扩展到连续孔径。</small></div></section><section class="home-grid">${Object.entries(domains).map(([id,d])=>`<article class="domain-card" data-route="category:${id}" style="--glow:${d.glow}"><div class="domain-head"><div><span class="domain-index">${d.index}</span><h2>${d.title}</h2><p>${d.desc}</p></div><span class="domain-index">${d.models.length} 个模型</span></div><div class="domain-chain">${d.chain.map(x=>`<span>${x}</span>`).join('')}</div><div class="model-preview">${d.models.slice(0,6).map(mid=>`<div class="mini"><b>${modelMeta[mid].title}</b><small>${modelMeta[mid].sub}</small></div>`).join('')}</div><div class="domain-foot"><span>进入${d.title}模型图谱</span><span>→</span></div></article>`).join('')}</section><section class="principles"><h3>统一建模规范</h3><div class="principle-grid"><div class="principle"><b>直接操作</b><span>优先拖动光源、孔径、屏幕和检测点本身；拖动方向必须与物理变化方向一致。</span></div><div class="principle"><b>多重表征同步</b><span>几何、波前、相量、强度曲线和实际观察图样使用一致颜色并同步更新。</span></div><div class="principle"><b>从局部贡献到全局结果</b><span>先看到每个边界或孔径单元贡献什么，再看到积分或求和怎样生成最终强度。</span></div><div class="principle"><b>明确传播区间</b><span>主动显示近轴、标量、远场、相干与薄元件近似；用无量纲参数提示模型何时失效。</span></div></div></section>`;
  };
  renderCategory = function(id){
    const d=domains[id];if(!d){renderHome();return;}
    view.innerHTML=`<div class="page-header"><div><div class="crumb" data-route="home">← 返回主页</div><div class="eyebrow">${d.index} · CONCEPT DOMAIN</div><h1>${d.title}模型图谱</h1><p>${d.desc}</p></div><div class="equation-card"><b>本域统一链条</b><code>${d.chain.join(' → ')}</code><small>${d.note||''}</small></div></div><div class="category-layout"><aside class="concept-map"><h3>学习路径</h3>${d.models.map((m,i)=>`<div class="concept-node ${i===0?'active':''}">${modelMeta[m].num}　${modelMeta[m].title}</div>`).join('')}</aside><main class="category-main"><div class="category-toolbar"><h2>${d.models.length} 个可交互模型</h2><label class="search">⌕ <input id="categorySearch" placeholder="搜索本域模型或概念"></label></div><div class="model-grid" id="cards">${d.models.map(mid=>{const m=modelMeta[mid];return`<article class="model-card" data-model="${mid}" data-search="${m.title} ${m.sub} ${m.tags.join(' ')}"><div class="num">${m.num}</div><h3>${m.title}</h3><p>${m.sub}</p><div class="tags"><span class="tag">${m.level}</span>${m.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div><span class="enter">进入模型 →</span></article>`}).join('')}</div></main></div>`;
    document.querySelectorAll('[data-model]').forEach(x=>x.onclick=()=>route('model:'+x.dataset.model));const q=document.getElementById('categorySearch');q.oninput=()=>{const s=q.value.trim().toLowerCase();document.querySelectorAll('[data-model]').forEach(c=>c.style.display=c.dataset.search.toLowerCase().includes(s)?'':'none')};
  };
})();