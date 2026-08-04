'use strict';
(() => {
  const P=window.ThinFilmV08Physics;if(!P)return;
  const oldSingle=P.singlePol,oldSolve=P.solve;
  const dummy=pol=>({tir:true,pol,R:1,T:0,A:0,twoR:1,phase:0,energy:1,exactError:0,r:P.C(1),t:P.C(),first:P.C(1),second:P.C(),factor:P.C(),beams:[P.C(1)],partials:[P.C(1)]});
  P.singlePol=function(s,lambda,pol,d=s.d,angle=s.angle){if(P.angles({...s,d,angle}).tir)return dummy(pol);return oldSingle(s,lambda,pol,d,angle)};
  P.solve=function(s,lambda=s.lambda){if(P.angles(s).tir)return dummy(s.pol);return oldSolve(s,lambda)};
  P.spectrum=function(s,step=5){
    const rows=[];let X=0,Y=0,Z=0,Yw=0,maxSPD=0;
    for(let w=380;w<=780;w+=step)maxSPD=Math.max(maxSPD,P.sourceSPD(s,w));
    for(let w=380;w<=780;w+=step){const q=P.solve(s,w),spd=P.sourceSPD(s,w)/maxSPD,c=P.cmf(w),p=spd*q.R;X+=p*c.x;Y+=p*c.y;Z+=p*c.z;Yw+=spd*c.y;rows.push({w,R:q.R,T:q.T,A:q.A,Rs:P.solve({...s,pol:'s'},w).R,Rp:P.solve({...s,pol:'p'},w).R,spd})}
    const norm=Math.max(Yw,1e-12);return{rows,xyz:{X:X/norm,Y:Y/norm,Z:Z/norm},rgb:P.xyzToSrgb(X/norm,Y/norm,Z/norm)};
  };
  P.heatmap=function(s,nx=80,ny=48){const vals=new Float32Array(nx*ny);let max=0;for(let j=0;j<ny;j++){const angle=j/(ny-1)*80;for(let i=0;i<nx;i++){const d=i/(nx-1)*1200,v=P.solve({...s,mode:'ideal',angle,d,pol:'unpolarized'},s.lambda).R;vals[j*nx+i]=v;max=Math.max(max,v)}}return{vals,nx,ny,max}};
  P.generateMeasurement=function(s,trueD,noise=.01,seed=12345){let x=seed|0;const rand=()=>{x=(1664525*x+1013904223)|0;return(x>>>0)/4294967296},rows=[];for(let w=420;w<=720;w+=5){const clean=P.solve({...s,d:trueD,mode:'real'},w).R,u=Math.max(1e-12,rand()),v=Math.max(1e-12,rand()),z=Math.sqrt(-2*Math.log(u))*Math.cos(P.TAU*v);rows.push({w,clean,measured:P.clamp(clean+noise*z,0,1)})}return rows};
  P.fitThickness=function(s,rows,min=0,max=1500){const loss=d=>rows.reduce((e,r)=>e+Math.pow(P.solve({...s,d,mode:'real'},r.w).R-r.measured,2),0)/rows.length;let bestD=min,best=Infinity;for(let d=min;d<=max;d+=5){const e=loss(d);if(e<best){best=e;bestD=d}}for(let d=Math.max(min,bestD-8);d<=Math.min(max,bestD+8);d+=.1){const e=loss(d);if(e<best){best=e;bestD=d}}return{d:bestD,rmse:Math.sqrt(best)}};
})();
