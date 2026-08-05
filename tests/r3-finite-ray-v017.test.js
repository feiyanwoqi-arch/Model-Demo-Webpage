'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('assets/js/r3-finite-ray-v017.js','utf8');
for (const token of ['traceFinite','mirrorResult','reflect(direction, normal)','dataset.legibilityVersion']) {
  assert.ok(source.includes(token), `missing R3 implementation token: ${token}`);
}

function mirror(type, f0, objectDistance) {
  const f = (type === 'concave' ? 1 : -1) * f0;
  const di = 1 / (1 / f - 1 / objectDistance);
  return { di, m:-di / objectDistance };
}
function normalize(x,y){const n=Math.hypot(x,y)||1;return{x:x/n,y:y/n}}
function reflect(d,n){const dot=d.x*n.x+d.y*n.y;return{x:d.x-2*dot*n.x,y:d.y-2*dot*n.y}}
function blurAtParaxialImage(aperture) {
  const f=150, objectDistance=260, objectHeight=110;
  const R=2*f, center=-R;
  const result=mirror('concave',f,objectDistance);
  const imageX=-result.di;
  const half=R*.58*aperture;
  const samples=[];
  for(const k of [-1,-.72,-.42,0,.42,.72,1]){
    const y=k*half;
    const x=center+Math.sqrt(R*R-y*y);
    const n=normalize(x-center,y);
    const d=normalize(x+objectDistance,y+objectHeight);
    const r=reflect(d,n);
    const t=(imageX-x)/r.x;
    samples.push(y+t*r.y);
  }
  return Math.max(...samples)-Math.min(...samples);
}

const real = mirror('concave',150,300);
assert.ok(real.di > 0 && real.m < 0, 'concave object beyond focus must form inverted real image');
assert.ok(Math.abs(real.di - 300) < 1e-9, 'object at 2F must image at 2F');

const virtual = mirror('concave',150,105);
assert.ok(virtual.di < 0 && virtual.m > 1, 'concave object inside focus must form enlarged upright virtual image');

const convex = mirror('convex',150,260);
assert.ok(convex.di < 0 && convex.m > 0 && convex.m < 1, 'convex mirror must form reduced upright virtual image');

const small = blurAtParaxialImage(.15);
const medium = blurAtParaxialImage(.42);
const large = blurAtParaxialImage(.9);
assert.ok(small < medium && medium < large, `finite-aperture blur must grow with aperture: ${small}, ${medium}, ${large}`);
assert.ok(small < 30 && large > small * 4, `small and large aperture regimes must remain distinguishable: ${small}, ${large}`);

console.log(JSON.stringify({real,virtual,convex,blur:{small,medium,large}},null,2));
