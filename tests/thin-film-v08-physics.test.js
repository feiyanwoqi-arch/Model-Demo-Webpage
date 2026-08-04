'use strict';
const assert = require('node:assert/strict');
global.window = global;
require('../assets/js/thin-film-v08-physics.js');
require('../assets/js/thin-film-v08-patch.js');
const P = global.ThinFilmV08Physics;
const close=(a,b,tol,msg)=>assert.ok(Math.abs(a-b)<=tol,`${msg}: ${a} vs ${b}`);
const base={n1:1,n2:1.46,n3:1.52,angle:0,d:360,lambda:550,pol:'unpolarized',mode:'ideal',roughness:0,thicknessSigma:0,angleSigma:0,source:'mono',bandwidth:2};

for(const pol of ['s','p','unpolarized']){
  for(const angle of [0,15,30,50,65]){
    const q=P.solve({...base,pol,angle});
    close(q.R+q.T+q.A,1,2e-9,`lossless energy conservation ${pol} ${angle}deg`);
    assert.ok(q.R>=-1e-10&&q.R<=1+1e-10,'R must be physical');
    assert.ok(q.T>=-1e-10&&q.T<=1+1e-10,'T must be physical');
  }
}

const equal=P.solve({...base,n1:1.4,n2:1.4,n3:1.4,angle:37,d:713,pol:'s'});
close(equal.R,0,1e-12,'equal-index medium must have zero reflection');
close(equal.T,1,1e-12,'equal-index medium must transmit all power');

for(const pol of ['s','p']){
  const s={...base,n1:1,n2:1.31,n3:1.52,d:0,angle:35,pol};
  const q=P.solve(s),a=P.angles(s),direct=P.interfaceCoefficients(pol,s.n1,s.n3,a.t1,a.t3);
  close(q.R,direct.r*direct.r,3e-10,`zero-thickness layer must reduce to direct interface ${pol}`);
}

const n1=1,n3=1.52,n2=Math.sqrt(n1*n3),lambda=550,d=lambda/(4*n2);
const ar=P.solve({...base,n1,n2,n3,lambda,d,angle:0,pol:'unpolarized'});
assert.ok(ar.R<1e-8,`quarter-wave matched coating should suppress reflection, got ${ar.R}`);

const q=P.solve(base),single=P.singlePol(base,base.lambda,'s');
let partial=P.C();
for(const beam of single.beams) partial=P.add(partial,beam);
assert.ok(P.abs(P.add(partial,P.scale(single.r,-1)))<1e-7,'beam-series partial sum should converge to exact amplitude');
assert.ok(Number.isFinite(q.twoR),'two-beam approximation must be finite');

const real=P.solve({...base,mode:'real',thicknessSigma:25,angleSigma:1.2,roughness:3});
close(real.R+real.T+real.A,1,3e-8,'real-mode averaged energy bookkeeping');

const rows=P.generateMeasurement({...base,mode:'real'},612.4,0.003,20260804);
assert.equal(rows.length,61,'measurement spectrum must contain 61 samples');
const fit=P.fitThickness({...base,mode:'real'},rows,500,720);
assert.ok(Math.abs(fit.d-612.4)<3,`blind thickness fit should recover truth, got ${fit.d}`);

const tir=P.solve({...base,n1:1.52,n2:1.2,n3:1,angle:70});
assert.equal(tir.tir,true,'TIR state must be identified');
close(tir.R,1,1e-12,'TIR fallback reflectance');

console.log('thin-film-v08 physics tests passed');
