from pathlib import Path


def replace_many(path, pairs):
    p = Path(path)
    text = p.read_text()
    for old, new in pairs:
        if old in text:
            text = text.replace(old, new)
        elif new not in text:
            raise SystemExit(f"R5 repair anchor missing in {path}: {old[:90]!r}")
    p.write_text(text)


replace_many('assets/js/r5-workbench-v019.js', [
    (r'\\[k_x=k_0n_1\sin\theta_i\\]', r'\\[k_x=k_0n_1\\sin\\theta_i\\]'),
    (r'\\[k_{z,2}^2=k_0^2\left(n_2^2-n_1^2\sin^2\theta_i\right)\\]', r'\\[k_{z,2}^2=k_0^2\\left(n_2^2-n_1^2\\sin^2\\theta_i\\right)\\]'),
    (r'\\[\theta_i>\theta_c\Rightarrow k_{z,2}=i\kappa,\quad \kappa=k_0\sqrt{n_1^2\sin^2\theta_i-n_2^2}\\]', r'\\[\\theta_i>\\theta_c\\Rightarrow k_{z,2}=i\\kappa,\\quad \\kappa=k_0\\sqrt{n_1^2\\sin^2\\theta_i-n_2^2}\\]'),
    (r'\\[E(z)=E(0)e^{-\kappa z},\qquad \delta_E=\frac1\kappa\\]', r'\\[E(z)=E(0)e^{-\\kappa z},\\qquad \\delta_E=\\frac1{\\kappa}\\]'),
    (r'\\[\sin\theta_c=\frac{n_2}{n_1},\qquad \delta_E=\frac{1}{\kappa}\\]', r'\\[\\sin\\theta_c=\\frac{n_2}{n_1},\\qquad \\delta_E=\\frac{1}{\\kappa}\\]'),
    ("a.text('界面法线',x0+18,y0-207,C.muted,14,'left',700);", "a.text('界面法线',x0+18,y0-207,C.muted,17,'left',700);"),
    ("a.text('拖动入射方向',sx,Math.min(H-30,sy+31),C.greenDark,15,'center',800);", "a.text('拖动入射方向',sx,Math.min(H-30,sy+31),C.greenDark,17,'center',800);"),
    ("a.text(`传播折射波  T≈${fmt(o.T*100,1)}%`,tx,Math.max(34,ty-24),C.orangeDark,15,'center',800);", "a.text(`传播折射波  T≈${fmt(o.T*100,1)}%`,tx,Math.max(34,ty-24),C.orangeDark,17,'center',800);"),
    ("a.text('倏逝场沿界面有相位传播',675,y0-140,C.purple,16,'center',800);", "a.text('倏逝场沿界面有相位传播',675,y0-140,C.purple,19,'center',800);"),
    ("a.text('离开界面：场幅 ∝ e⁻ᵏᶻ',675,y0-82,C.purple,15,'center',700);", "a.text('离开界面：场幅 ∝ e⁻ᵏᶻ',675,y0-82,C.purple,17,'center',700);"),
    ("a.text('场探针',probeX,probeY-25,C.purple,15,'center',800);", "a.text('场探针',probeX,probeY-27,C.purple,17,'center',800);"),
    ("a.mono(`${Math.round(s.probeDepth)} nm`,probeX+18,(probeY+y0)/2,C.purple,14,'left',800);", "a.mono(`${Math.round(s.probeDepth)} nm`,probeX+18,(probeY+y0)/2,C.purple,16,'left',800);"),
    ("a.text(`θᵢ=${fmt(s.angle,1)}°`,x0-92,y0+70,C.greenDark,16,'center',800);", "a.text(`θᵢ=${fmt(s.angle,1)}°`,x0-92,y0+70,C.greenDark,18,'center',800);"),
    ("if(o.valid)a.text(`θc=${fmt(o.critical,2)}°`,x0+98,y0+70,C.purple,16,'center',800);", "if(o.valid)a.text(`θᵣ=θᵢ=${fmt(s.angle,1)}°`,x0+116,y0+70,C.purple,18,'center',800);"),
    ("a.text(o.regimeLabel,82,132,stateColor,20,'left',850);", "a.text(o.regimeLabel,82,132,stateColor,22,'left',850);"),
    ("a.text(o.valid?`临界角  ${fmt(o.critical,2)}°`:'临界角  不存在',82,170,C.ink,16,'left',800);", "a.text(o.valid?`临界角  ${fmt(o.critical,2)}°`:'临界角  不存在',82,170,C.ink,18,'left',800);"),
    ("a.text(o.tir?`振幅穿透深度  ${fmt(o.depth,0)} nm`:`能量透射率  ${fmt(o.T*100,1)}%`,82,201,C.ink,16,'left',700);", "a.text(o.tir?`振幅穿透深度  ${fmt(o.depth,0)} nm`:`能量透射率  ${fmt(o.T*100,1)}%`,82,201,C.ink,18,'left',700);"),
    ("a.text(o.tir?`探针场幅  ${(o.probeAmplitude*100).toFixed(1)}%`:'上方存在传播折射波',82,232,C.muted,15,'left',700);", "a.text(o.tir?`探针场幅  ${(o.probeAmplitude*100).toFixed(1)}%`:'上方存在传播折射波',82,232,C.muted,17,'left',700);"),
    ("a.rect(355,H-86,500,54,'rgba(255,255,255,.93)','#d8e5e2',14,1.5);", "a.rect(340,H-92,530,60,'rgba(255,255,255,.93)','#d8e5e2',14,1.5);"),
    ("a.text('实线：传播波方向',465,H-59,C.tealDark,14,'center',700);", "a.text('实线：传播波方向',465,H-62,C.tealDark,16,'center',700);"),
    ("a.text('紫色波列：倏逝场（平均法向能流为 0）',685,H-59,C.purple,14,'center',700);", "a.text('紫色波列：倏逝场（平均法向能流为 0）',700,H-62,C.purple,16,'center',700);"),
    ("const x0=68,y0=225,w=590,h=145;", "const x0=68,y0=200,w=590,h=120;"),
    ("a.text('横向波数守恒；法向波数平方跨过 0',686,27,C.muted,14,'right',700);", "a.text('横向波数守恒；法向波数平方跨过 0',686,27,C.muted,16,'right',700);"),
    ("if(o.valid){const cx=mapX(o.critical);a.line(cx,58,cx,y0+42,C.orange,2,[6,5]);a.text('θc',cx,y0+31,C.orangeDark,14,'center',800);}", "if(o.valid){const cx=mapX(o.critical);a.line(cx,58,cx,y0+36,C.orange,2,[6,5]);a.text('θc',cx,y0+27,C.orangeDark,16,'center',800);}"),
    ("const px=mapX(s.angle),py=mapY(currentQ);a.circle(px,py,9,C.green,C.paper,3);a.text('当前状态',px,Math.max(60,py-24),C.greenDark,14,'center',800);", "const px=mapX(s.angle),py=mapY(currentQ);a.circle(px,py,9,C.green,C.paper,3);a.text('当前状态',px,Math.max(60,py-25),C.greenDark,16,'center',800);"),
    ("a.text('kz² > 0：传播折射波',175,71,C.teal,15,'center',800);", "a.text('kz² > 0：传播折射波',175,71,C.teal,17,'center',800);"),
    ("a.text('kz² < 0：kz=iκ，指数衰减',505,71,C.purple,15,'center',800);", "a.text('kz² < 0：kz=iκ，指数衰减',505,71,C.purple,17,'center',800);"),
    ("a.text('入射角 θᵢ',x0+w/2,270,C.muted,14,'center',700);", "a.text('入射角 θᵢ',x0+w/2,258,C.muted,16,'center',700);"),
    ("a.text(o.tir?`δE=${fmt(o.depth,0)} nm`:'仅在全反射区定义',686,27,o.tir?C.purple:C.muted,14,'right',800);", "a.text(o.tir?`δE=${fmt(o.depth,0)} nm`:'仅在全反射区定义',686,27,o.tir?C.purple:C.muted,16,'right',800);"),
    ("const x0=76,y0=232,w=560,h=145;", "const x0=76,y0=205,w=560,h=125;"),
    ("a.text('1.0',x0-14,y0-h,C.muted,13,'right',700);a.text('0',x0-14,y0,C.muted,13,'right',700);", "a.text('1.0',x0-14,y0-h,C.muted,15,'right',700);a.text('0',x0-14,y0,C.muted,15,'right',700);"),
    ("a.text(`探针 ${(o.probeAmplitude*100).toFixed(1)}%`,px,Math.max(60,py-23),C.greenDark,14,'center',800);", "a.text(`探针 ${(o.probeAmplitude*100).toFixed(1)}%`,px,Math.max(60,py-24),C.greenDark,16,'center',800);"),
    ("a.text('δE',dx,y0+27,C.orangeDark,14,'center',800);", "a.text('δE',dx,y0+26,C.orangeDark,16,'center',800);"),
    ("a.text(`离界面深度 z（0–${Math.round(maxZ)} nm）`,x0+w/2,276,C.muted,14,'center',700);", "a.text(`离界面深度 z（0–${Math.round(maxZ)} nm）`,x0+w/2,258,C.muted,16,'center',700);"),
    ("a.text('当前上方是传播解，不应画成指数衰减曲线。',355,166,C.muted,14,'center',700);", "a.text('当前上方是传播解，不应画成指数衰减曲线。',355,166,C.muted,16,'center',700);"),
])

css = Path('assets/css/r5-workbench-v019.css')
text = css.read_text()
marker = '/* R5 v0.19.1 focused screenshot repair */'
if marker not in text:
    text += r'''

/* R5 v0.19.1 focused screenshot repair */
.tir-hero>div>span,.tir-hero aside>b,.tir-primary>header span,.tir-analysis>header span,.tir-module>header span,.tir-drawer>header span{font-size:13px!important}
.tir-hero aside p{font-size:14px!important}
.tir-hero-eq mjx-container[display="true"]{font-size:1.2em!important}
.tir-legend{font-size:13px!important}
.tir-primary-guide summary,.tir-module-guide summary{font-size:14px!important}
.tir-primary-guide p,.tir-module-guide p{font-size:14px!important;line-height:1.65!important}
.tir-primary-guide b,.tir-module-guide b{font-size:13px!important}
.tir-live-strip span{font-size:13px!important}
.tir-module-actions button,.tir-module-presets button,.tir-presets button,.tir-reset,.tir-drawer button{font-size:13px!important}
.tir-derivation article>i{width:32px;height:32px;font-size:14px!important}
.tir-eq mjx-container[display="true"]{font-size:1.22em!important}
.tir-edge span{font-size:13px!important}
.tir-drawer>header button{font-size:13px!important}
.tir-module-selector small,.tir-budget p{font-size:13px!important}
.tir-board:has([data-module-id="derivation"]) .tir-module{height:auto!important;min-height:620px!important}
.tir-board:has([data-module-id="derivation"]) .tir-module-html{height:auto!important;min-height:0!important;overflow:visible!important}
@media(min-width:1880px){
  .tir-workspace{height:min(calc(100dvh - 245px),1020px)!important}
  .tir-module h3{font-size:21px!important}
  .tir-module>header p{font-size:14px!important}
  .tir-module-guide summary{font-size:14px!important}
  .tir-module-guide p{font-size:13.5px!important}
  .tir-analysis:has([data-module-id="derivation"]),.tir-board:has([data-module-id="derivation"]){height:auto!important;grid-template-rows:auto auto!important}
}
@media(max-height:820px) and (min-width:761px) and (max-width:1879px){
  .tir-primary{min-height:790px!important;grid-template-rows:auto auto minmax(600px,1fr) auto auto!important}
  .tir-main-canvas-wrap{min-height:600px!important}
  #r5MainCanvas{width:min(100%,1080px)!important}
}
'''
css.write_text(text)

replace_many('tests/visual-audit-r5-v019.mjs', [
    ("if(n.children.length||/^(SCRIPT|STYLE|CANVAS|SVG|PATH|INPUT|OPTION)$/i.test(n.tagName)||n.tagName.toLowerCase().startsWith('mjx-'))return false;", "if(n.children.length||/^(SCRIPT|STYLE|CANVAS|SVG|PATH|INPUT|OPTION)$/i.test(n.tagName)||n.tagName.toLowerCase().startsWith('mjx-')||n.closest('mjx-container'))return false;"),
    ("r.fontFailures.analysis=await fontAudit(page,'.tir-analysis',12.5);", "const mathError=await page.locator('.mjx-merror').count()||await page.getByText('Math input error',{exact:true}).count();if(mathError)r.assertions.push(`MathJax input errors ${mathError}`);const eqSizes=await page.evaluate(()=>[...document.querySelectorAll('.tir-hero-eq mjx-container,.tir-eq mjx-container')].map(n=>parseFloat(getComputedStyle(n).fontSize)));if(!eqSizes.length||Math.min(...eqSizes)<17)r.assertions.push(`formula display too small or missing: ${JSON.stringify(eqSizes)}`);const proofOverflow=await page.evaluate(()=>[...document.querySelectorAll('[data-module-id=\"derivation\"] .tir-module-html,[data-module-id=\"validation\"] .tir-module-html')].map(n=>({scroll:n.scrollHeight,client:n.clientHeight})));if(proofOverflow.some(x=>x.scroll>x.client+3))r.assertions.push(`proof module content clipped: ${JSON.stringify(proofOverflow)}`);r.fontFailures.analysis=await fontAudit(page,'.tir-analysis',13);"),
    ("r.fontFailures.drawer=await fontAudit(page,'.tir-right-drawer',12.5);", "r.fontFailures.drawer=await fontAudit(page,'.tir-right-drawer',13);"),
])
