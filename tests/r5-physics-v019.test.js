'use strict';
const assert=require('node:assert/strict');
global.window={renderModel(){}};
global.location={hash:''};
global.document={};
require('../assets/js/r5-workbench-v019.js');
const api=window.R5TIRWorkbenchV019;
assert(api,'R5 API missing');

const base=api.freshState();
const critical=api.compute({...base,angle:Math.asin(base.n2/base.n1)*180/Math.PI});
assert(Math.abs(critical.critical-41.1395)<.01,'critical angle mismatch');
assert(critical.criticalState,'critical state not detected');

const below=api.compute({...base,angle:30});
assert.equal(below.tir,false);
assert(below.T>0&&below.R<1,'below-critical energy split invalid');
assert(Math.abs(below.R+below.T-1)<1e-10,'lossless energy conservation failed');

const tir=api.compute({...base,angle:55});
assert.equal(tir.tir,true);
assert(Math.abs(tir.R-1)<1e-12&&Math.abs(tir.T)<1e-12,'TIR energy invalid');
assert(tir.depth>0&&Number.isFinite(tir.depth),'penetration depth invalid');
assert(tir.probeAmplitude<1&&tir.probeAmplitude>0,'probe decay invalid');

const longer=api.compute({...base,angle:55,lambda:1266});
assert(Math.abs(longer.depth/tir.depth-2)<.02,'penetration depth must scale with wavelength');

const steeper=api.compute({...base,angle:70});
assert(steeper.depth<tir.depth,'penetration depth should decrease farther above critical angle');

const invalid=api.compute({...base,n1:1.2,n2:1.45,angle:70});
assert.equal(invalid.valid,false);
assert.equal(invalid.regime,'no-tir');
assert(!Number.isFinite(invalid.critical),'invalid index order should have no critical angle');

const nearGap=api.compute({...base,angle:55,gap:100});
const farGap=api.compute({...base,angle:55,gap:1200});
assert(nearGap.coupling>farGap.coupling,'FTIR coupling should decrease with gap');

console.log('R5 v0.19 physics tests passed');
