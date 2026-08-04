'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');

global.TAU=Math.PI*2;
global.C0=299792458;
global.clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
global.rad=d=>d*Math.PI/180;
global.deg=r=>r*180/Math.PI;
global.fmt=(x,n=2)=>Number.isFinite(x)?Number(x).toFixed(n):'—';
global.sinc=x=>Math.abs(x)<1e-8?1:Math.sin(x)/x;
global.mod=(x,m)=>((x%m)+m)%m;
global.wlColor=()=> '#ffffff';
const models={};
global.define=(id,obj)=>{if(models[id])throw new Error(`duplicate model id: ${id}`);models[id]=obj};

const files=[
 'assets/js/reflection-models.js',
 'assets/js/interference-wave.js',
 'assets/js/interference-double.js',
 'assets/js/interference-multi.js',
 'assets/js/interference-helpers.js',
 'assets/js/interference-thin.js',
 'assets/js/interference-newton.js',
 'assets/js/interference-michelson.js',
 'assets/js/interference-fabry.js',
 'assets/js/diffraction-foundations.js',
 'assets/js/diffraction-periodic.js',
 'assets/js/diffraction-imaging.js',
 'assets/js/diffraction-advanced.js'
];
for(const file of files){
 const source=fs.readFileSync(path.join(process.cwd(),file),'utf8');
 vm.runInThisContext(source,{filename:file});
}
const expected=[
 'reflection-law','plane-mirror','spherical-mirror','fresnel-brewster','total-internal','optical-fiber',
 'wave-superposition','double-slit','multi-slit','thin-film','newton-rings','michelson','fabry-perot',
 'huygens-fresnel','near-far-diffraction','single-slit-diffraction','double-slit-diffraction','diffraction-grating','aperture-fourier','airy-resolution','knife-edge-diffraction','poisson-spot','zone-plate','talbot-effect','bragg-diffraction'
];
for(const id of expected){
 const model=models[id];
 if(!model)throw new Error(`missing model: ${id}`);
 if(!model.defaults||!model.compute||!model.draw)throw new Error(`incomplete model: ${id}`);
 const out=model.compute(structuredClone(model.defaults));
 if(!out||!Array.isArray(out.metrics)||typeof out.status!=='string')throw new Error(`invalid compute output: ${id}`);
}
if(Object.keys(models).length!==expected.length)throw new Error(`model count mismatch: ${Object.keys(models).length} != ${expected.length}`);
console.log(`Validated ${expected.length} interactive models.`);
