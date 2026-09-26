// 法規（施設管理）：進相コンデンサによる力率改善。P は kW、Q は kvar、S は kV·A。
(function (global) {
  'use strict';

  function tanOf(powerFactor) {
    return Math.sqrt(1 - powerFactor * powerFactor) / powerFactor;
  }

  function analyze({ P, powerFactor1, Qc }) {
    const Q1 = P * tanOf(powerFactor1);
    const Q2 = Q1 - Qc;
    const S1 = Math.hypot(P, Q1);
    const S2 = Math.hypot(P, Q2);
    return {
      Q1, Q2, S1, S2,
      powerFactor2: P / S2,
      leading: Q2 < 0,
      // 電圧が同じなら電流は皮相電力に比例し、線路損失は電流の2乗に比例する
      currentRatio: S2 / S1,
      lossRatio: (S2 / S1) ** 2,
    };
  }

  function capacitorFor(P, powerFactor1, powerFactor2) {
    return P * (tanOf(powerFactor1) - tanOf(powerFactor2));
  }

  const PowerFactor = { tanOf, analyze, capacitorFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = PowerFactor;
  else global.PowerFactor = PowerFactor;
})(this);
