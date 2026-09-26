// 理論：RLC直列回路。入力も出力もSI単位（Ω・H・F・Hz・V・A）。
(function (global) {
  'use strict';

  function resonantFrequency(L, C) {
    return 1 / (2 * Math.PI * Math.sqrt(L * C));
  }

  function analyze({ V, R, L, C, f }) {
    const omega = 2 * Math.PI * f;
    const XL = omega * L;
    const XC = 1 / (omega * C);
    const X = XL - XC;
    const Z = Math.hypot(R, X);
    const I = V / Z;
    return {
      XL, XC, X, Z, I,
      VR: R * I,
      VL: XL * I,
      VC: XC * I,
      // 電流を基準にした電圧の角度。正なら電流が遅れ（誘導性）、負なら進み（容量性）
      phi: Math.atan2(X, R),
      powerFactor: R / Z,
      f0: resonantFrequency(L, C),
    };
  }

  const RlcCircuit = { analyze, resonantFrequency };
  if (typeof module !== 'undefined' && module.exports) module.exports = RlcCircuit;
  else global.RlcCircuit = RlcCircuit;
})(this);
