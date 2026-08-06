'use strict';
const assert = require('node:assert/strict');
const physics = require('../assets/js/r4-fresnel-physics-v019.js');

function near(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

{
  const n1 = 1, n2 = 1.52;
  const result = physics.fresnel(n1, n2, 0);
  const expected = ((n1 - n2) / (n1 + n2)) ** 2;
  near(result.Rs, expected, 1e-12, 'normal-incidence Rs');
  near(result.Rp, expected, 1e-12, 'normal-incidence Rp');
}

for (const [n1, n2, angle] of [[1, 1.33, 37], [1, 1.52, 70], [1.52, 1, 30], [1.7, 1.2, 20]]) {
  const result = physics.fresnel(n1, n2, angle);
  assert.equal(result.tir, false, `unexpected TIR for ${n1}->${n2} at ${angle}`);
  near(result.Rs + result.Ts, 1, 1e-12, 's energy conservation');
  near(result.Rp + result.Tp, 1, 1e-12, 'p energy conservation');
}

{
  const n1 = 1, n2 = 1.52;
  const angle = physics.brewsterAngle(n1, n2);
  const result = physics.fresnel(n1, n2, angle);
  assert.ok(result.Rp < 1e-20, `Rp at Brewster angle should vanish, got ${result.Rp}`);
  near(angle + result.thetaT, 90, 1e-10, 'Brewster orthogonality');
}

{
  const critical = physics.criticalAngle(1.52, 1);
  assert.ok(critical > 41 && critical < 42, `unexpected critical angle ${critical}`);
  const result = physics.fresnel(1.52, 1, critical + 2);
  assert.equal(result.tir, true);
  assert.equal(result.Rs, 1);
  assert.equal(result.Rp, 1);
  assert.equal(result.Ts, 0);
  assert.equal(result.Tp, 0);
}

{
  const result = physics.fresnel(1, 1.52, 45);
  const pureS = physics.mixedPower(result, 0);
  const unpolarized = physics.mixedPower(result, 0.5);
  const pureP = physics.mixedPower(result, 1);
  near(pureS.R, result.Rs, 1e-12, 'pure s mixture');
  near(pureP.R, result.Rp, 1e-12, 'pure p mixture');
  assert.ok(unpolarized.R <= Math.max(result.Rs, result.Rp) + 1e-12);
  assert.ok(unpolarized.R >= Math.min(result.Rs, result.Rp) - 1e-12);
  near(unpolarized.R + unpolarized.T, 1, 1e-12, 'mixture energy conservation');
}

console.log('R4 Fresnel physics v0.19 tests passed');
