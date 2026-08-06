'use strict';
(function attachR4FresnelPhysics(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.R4FresnelPhysicsV019 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const EPS = 1e-12;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rad = degrees => degrees * Math.PI / 180;
  const deg = radians => radians * 180 / Math.PI;

  function assertIndex(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${name} must be a positive refractive index`);
    return number;
  }

  function brewsterAngle(n1, n2) {
    return deg(Math.atan2(assertIndex(n2, 'n2'), assertIndex(n1, 'n1')));
  }

  function criticalAngle(n1, n2) {
    const a = assertIndex(n1, 'n1');
    const b = assertIndex(n2, 'n2');
    return a > b ? deg(Math.asin(b / a)) : null;
  }

  function phaseFromSignedAmplitude(value) {
    if (!Number.isFinite(value) || Math.abs(value) < 1e-10) return null;
    return value < 0 ? 180 : 0;
  }

  function fresnel(n1Input, n2Input, thetaInput) {
    const n1 = assertIndex(n1Input, 'n1');
    const n2 = assertIndex(n2Input, 'n2');
    const thetaI = clamp(Number(thetaInput), 0, 89.9);
    const ti = rad(thetaI);
    const sinT = n1 / n2 * Math.sin(ti);
    const brewster = brewsterAngle(n1, n2);
    const critical = criticalAngle(n1, n2);

    if (Math.abs(sinT) > 1) {
      return {
        n1, n2, thetaI, thetaT: null, tir: true,
        rs: null, rp: null, Rs: 1, Rp: 1, Ts: 0, Tp: 0,
        phaseS: null, phaseP: null,
        brewster, critical, orthogonalityError: null,
        energyResidualS: 0, energyResidualP: 0
      };
    }

    const tt = Math.asin(clamp(sinT, -1, 1));
    const ci = Math.cos(ti);
    const ct = Math.cos(tt);

    // Signed reflected electric-field amplitudes in a fixed laboratory orientation.
    // This choice makes s and p share the same normal-incidence phase convention.
    const rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct);
    const rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci);
    const Rs = clamp(rs * rs, 0, 1);
    const Rp = clamp(rp * rp, 0, 1);
    const Ts = clamp(1 - Rs, 0, 1);
    const Tp = clamp(1 - Rp, 0, 1);
    const thetaT = deg(tt);

    return {
      n1, n2, thetaI, thetaT, tir: false,
      rs, rp, Rs, Rp, Ts, Tp,
      phaseS: phaseFromSignedAmplitude(rs),
      phaseP: phaseFromSignedAmplitude(rp),
      brewster, critical,
      orthogonalityError: Math.abs(thetaI + thetaT - 90),
      energyResidualS: Math.abs(Rs + Ts - 1),
      energyResidualP: Math.abs(Rp + Tp - 1)
    };
  }

  function mixedPower(result, pFractionInput) {
    const pFraction = clamp(Number(pFractionInput), 0, 1);
    const sFraction = 1 - pFraction;
    return {
      pFraction,
      sFraction,
      R: sFraction * result.Rs + pFraction * result.Rp,
      T: sFraction * result.Ts + pFraction * result.Tp
    };
  }

  function sampleCurves(n1, n2, step = 0.5) {
    const samples = [];
    for (let angle = 0; angle <= 89 + EPS; angle += step) {
      const result = fresnel(n1, n2, angle);
      samples.push({ angle, Rs: result.Rs, Rp: result.Rp, tir: result.tir });
    }
    return samples;
  }

  return Object.freeze({
    version: '0.19.0',
    fresnel,
    mixedPower,
    sampleCurves,
    brewsterAngle,
    criticalAngle
  });
});
