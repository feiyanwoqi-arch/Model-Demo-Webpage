'use strict';
(() => {
  const PI=Math.PI, TAU=2*PI;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const rad=d=>d*PI/180, deg=r=>r*180/PI;
  const C=(re=0,im=0)=>({re,im});
  const add=(a,b)=>C(a.re+b.re,a.im+b.im);
  const mul=(a,b)=>C(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
  const scale=(a,s)=>C(a.re*s,a.im*s);
  const div=(a,b)=>{const q=b.re*b.re+b.im*b.im||1e-30;return C((a.re*b.re+a.im*b.im)/q,(a.im*b.re-a.re*b.im)/q)};
  const expi=p=>C(Math.cos(p),Math.sin(p));
  const abs2=z=>z.re*z.re+z.im*z.im;
  const abs=z=>Math.hypot(z.re,z.im);
  const arg=z=>Math.atan2(z.im,z.re);
  function angles(s){
    const t1=rad(s.angle),q2=s.n1/s.n2*Math.sin(t1),q3=s.n1/s.n3*Math.sin(t1);
    if(Math.abs(q2)>1||Math.abs(q3)>1)return{tir:true,t1};
    return{tir:false,t1,t2:Math.asin(q2),t3:Math.asin(q3)};
  }
  function interfaceCoefficients(pol,ni,nj,ti,tj){
    const ci=Math.cos(ti),cj=Math.cos(tj);
    if(pol==='s'){
      const den=ni*ci+nj*cj;
      return{r:(ni*ci-nj*cj)/den,t:2*ni*ci/den};
    }
    const den=nj*ci+ni*cj;
    return{r:(nj*ci-ni*cj)/den,t:2*ni*ci/den};
  }
  function singlePol(s,lambda,pol,dOverride=s.d,angleOverride=s.angle){
    const local={...s,d:dOverride,angle:angleOverride};
    const a=angles(local);if(a.tir)return{tir:true,R:1,T:0,A:0,pol};
    const f12=interfaceCoefficients(pol,s.n1,s.n2,a.t1,a.t2);
    const f23=interfaceCoefficients(pol,s.n2,s.n3,a.t2,a.t3);
    const f21=interfaceCoefficients(pol,s.n2,s.n1,a.t2,a.t1);
    const beta=TAU*s.n2*dOverride*Math.cos(a.t2)/lambda;
    const e2=expi(beta), eb=expi(beta/2);
    const den=add(C(1),scale(e2,f12.r*f23.r));
    const r=div(add(C(f12.r),scale(e2,f23.r)),den);
    const t=div(scale(eb,f12.t*f23.t),den);
    let R=abs2(r),T=(s.n3*Math.cos(a.t3))/(s.n1*Math.cos(a.t1))*abs2(t);
    if(!Number.isFinite(T))T=0;
    const rough=Number(s.roughness||0);
    if(s.mode==='real'&&rough>0){
      const sigma=rough;
      const coherence=Math.exp(-Math.pow(4*PI*sigma*Math.cos(a.t2)/lambda,2));
      const R12=f12.r*f12.r,R23=f23.r*f23.r;
      const incoherent=R12+(1-R12)*(1-R12)*R23/(1-R12*R23);
      R=incoherent+coherence*(R-incoherent);
      T=Math.max(0,1-R);
    }
    const A=Math.max(-1e-9,1-R-T);
    const first=C(f12.r);
    const second=scale(e2,f12.t*f21.t*f23.r);
    const factor=scale(e2,f21.r*f23.r);
    const beams=[first];let z=second;
    for(let k=0;k<10;k++){beams.push(z);z=mul(z,factor)}
    let partial=C();const partials=beams.map(b=>(partial=add(partial,b),partial));
    const two=add(first,second);
    return{tir:false,pol,...a,beta,r,t,R,T,A,first,second,factor,beams,partials,twoR:abs2(two),phase:arg(r),f12,f23,f21};
  }
  function gaussianSamples(mu,sigma,count=7){
    if(!(sigma>0))return[[mu,1]];
    const out=[];let sum=0;
    for(let i=0;i<count;i++){const x=-3+6*i/(count-1),w=Math.exp(-.5*x*x);out.push([mu+x*sigma,w]);sum+=w}
    return out.map(([x,w])=>[x,w/sum]);
  }
  function solve(s,lambda=s.lambda){
    const ds=s.mode==='real'?gaussianSamples(s.d,Math.max(0,s.thicknessSigma||0),7):[[s.d,1]];
    const as=s.mode==='real'?gaussianSamples(s.angle,Math.max(0,s.angleSigma||0),5):[[s.angle,1]];
    const pols=s.pol==='unpolarized'?['s','p']:[s.pol];
    let R=0,T=0,A=0,twoR=0,phaseRe=0,phaseIm=0,base=null;
    for(const pol of pols)for(const [d,wd] of ds)for(const [ang,wa] of as){
      const q=singlePol(s,lambda,pol,Math.max(0,d),clamp(ang,0,89));
      const w=wd*wa/pols.length;
      R+=w*q.R;T+=w*q.T;A+=w*q.A;twoR+=w*q.twoR;
      phaseRe+=w*Math.cos(q.phase);phaseIm+=w*Math.sin(q.phase);
      if(!base&&Math.abs(d-s.d)<1e-9&&Math.abs(ang-s.angle)<1e-9)base=q;
    }
    base=base||singlePol(s,lambda,pols[0]);
    return{...base,R,T,A,twoR,phase:Math.atan2(phaseIm,phaseRe),energy:R+T+A,exactError:Math.abs(R-twoR)};
  }
  function planck(lambdaNm,T=6504){
    const l=lambdaNm*1e-9,c2=1.438776877e-2;
    const x=c2/(l*T);return 1/(Math.pow(l,5)*(Math.exp(Math.min(700,x))-1));
  }
  function sourceSPD(s,w){
    if(s.source==='mono'){const sig=Math.max(.4,s.bandwidth||2)/2.355;return Math.exp(-.5*Math.pow((w-s.lambda)/sig,2));}
    if(s.source==='sodium')return Math.exp(-.5*Math.pow((w-589.3)/.9,2))+0.5*Math.exp(-.5*Math.pow((w-589.0)/.9,2));
    return planck(w,6504);
  }
  function cmf(w){
    const g=(x,m,s1,s2)=>Math.exp(-.5*Math.pow((x-m)*(x<m?s1:s2),2));
    const x=1.056*g(w,599.8,.0264,.0323)+.362*g(w,442.0,.0624,.0374)-.065*g(w,501.1,.0490,.0382);
    const y=.821*g(w,568.8,.0213,.0247)+.286*g(w,530.9,.0613,.0322);
    const z=1.217*g(w,437.0,.0845,.0278)+.681*g(w,459.0,.0385,.0725);
    return{x:Math.max(0,x),y:Math.max(0,y),z:Math.max(0,z)};
  }
  function xyzToSrgb(X,Y,Z){
    let r=3.2406*X-1.5372*Y-0.4986*Z,g=-0.9689*X+1.8758*Y+0.0415*Z,b=0.0557*X-0.2040*Y+1.0570*Z;
    const comp=v=>{v=Math.max(0,v);return v<=.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-.055};
    r=comp(r);g=comp(g);b=comp(b);const mx=Math.max(r,g,b,1);r/=mx;g/=mx;b/=mx;
    const c=v=>Math.round(clamp(v,0,1)*255);
    return{r:c(r),g:c(g),b:c(b),css:`rgb(${c(r)},${c(g)},${c(b)})`};
  }
  function spectrum(s,step=5){
    const rows=[];let X=0,Y=0,Z=0,Yw=0,maxSPD=0;
    for(let w=380;w<=780;w+=step)maxSPD=Math.max(maxSPD,sourceSPD(s,w));
    for(let w=380;w<=780;w+=step){
      const q=solve(s,w),spd=sourceSPD(s,w)/maxSPD,c=cmf(w),p=spd*q.R;
      X+=p*c.x;Y+=p*c.y;Z+=p*c.z;Yw+=spd*c.y;
      rows.push({w,R:q.R,T:q.T,A:q.A,Rs:solve({...s,pol:'s'},w).R,Rp:solve({...s,pol:'p'},w).R,spd});
    }
    const norm=Math.max(Yw,1e-12);return{rows,xyz:{X:X/norm,Y:Y/norm,Z:Z/norm},rgb:xyzToSrgb(X/norm,Y/norm,Z/norm)};
  }
  function heatmap(s,nx=80,ny=48){
    const vals=new Float32Array(nx*ny);let max=0;
    for(let j=0;j<ny;j++){const ang=j/(ny-1)*80;for(let i=0;i<nx;i++){const d=i/(nx-1)*1200,q=solve({...s,mode:'ideal',angle:ang,d,pol:'unpolarized'},s.lambda),v=q.R;vals[j*nx+i]=v;max=Math.max(max,v)}}
    return{vals,nx,ny,max};
  }
  function seeded(seed){let x=seed|0;return()=>{x=(1664525*x+1013904223)|0;return((x>>>0)/4294967296)}}
  function generateMeasurement(s,trueD,noise=0.01,seed=12345){
    const rand=seeded(seed),rows=[];
    for(let w=420;w<=720;w+=5){const clean=solve({...s,d:trueD,mode:'real'},w).R;const u=Math.max(1e-12,rand()),v=Math.max(1e-12,rand());const z=Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v);rows.push({w,clean,measured:clamp(clean+noise*z,0,1)})}
    return rows;
  }
  function fitThickness(s,rows,min=0,max=1500){
    const loss=d=>{let e=0;for(const r of rows){const q=solve({...s,d,mode:'real'},r.w).R;e+=Math.pow(q-r.measured,2)}return e/rows.length};
    let bestD=min,best=Infinity;for(let d=min;d<=max;d+=5){const e=loss(d);if(e<best){best=e;bestD=d}}
    const lo=Math.max(min,bestD-8),hi=Math.min(max,bestD+8);for(let d=lo;d<=hi;d+=.1){const e=loss(d);if(e<best){best=e;bestD=d}}
    return{d:bestD,rmse:Math.sqrt(best)};
  }
  window.ThinFilmV08Physics={C,add,mul,scale,abs,abs2,arg,expi,angles,interfaceCoefficients,singlePol,solve,spectrum,heatmap,sourceSPD,cmf,xyzToSrgb,generateMeasurement,fitThickness,clamp,rad,deg,TAU};
})();
