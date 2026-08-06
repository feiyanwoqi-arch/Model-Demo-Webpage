'use strict';
const assert=require('node:assert/strict');
global.window={renderModel(){}};
global.location={hash:''};
global.document={};
require('../assets/js/r5-workbench-v019.js');
const api=window.R5TIRWorkbenchV019;
assert(api,'R5 API missing');

const base=api.freshState();
const brewster=Math.atan(base.n2/base.n1)*180/Math.PI;
const pAtBrewster=api.compute({...base,pol:'p',angle:brewster});
const sAtBrewster=api.compute({...base,pol:'s',angle:brewster});
assert.equal(pAtBrewster.tir,false,'Brewster state must remain below critical angle');
assert(pAtBrewster.R<1e-9,`p reflectance should vanish at Brewster angle, got ${pAtBrewster.R}`);
assert(sAtBrewster.R>pAtBrewster.R+.01,'s reflectance must remain larger than p reflectance at Brewster angle');
assert(Math.abs(pAtBrewster.R+pAtBrewster.T-1)<1e-10,'p-polarized energy must be conserved');
assert(Math.abs(sAtBrewster.R+sAtBrewster.T-1)<1e-10,'s-polarized energy must be conserved');

const tir=api.compute({...base,angle:55,probeDepth:320,gap:650});
assert(tir.tir,'55° should be in the TIR regime for the default indices');
assert(Number.isFinite(tir.phaseS)&&Number.isFinite(tir.phaseP),'TIR phase shifts must be finite');
assert(Math.abs(tir.relativePhase)>1e-5,'s and p phase shifts should differ in TIR');
assert(Math.abs(tir.probeIntensity-tir.probeAmplitude**2)<1e-12,'field intensity must equal squared field amplitude');
assert(Math.abs(tir.coupling-Math.exp(-2*tir.kappa*base.gap))<1e-12,'FTIR scalar coupling must follow exp(-2κg)');

const near=api.compute({...base,angle:55,gap:80});
const far=api.compute({...base,angle:55,gap:1200});
assert(near.coupling>far.coupling*10,'FTIR coupling must strongly decrease as the gap increases');

console.log('R5 v0.19 extended physics tests passed');
