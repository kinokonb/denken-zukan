// 理論：直流回路の基本（オームの法則、直列・並列、電力と電力量）。SI単位（V・A・Ω・W）、時間だけは時間 [h]。
(function (global) {
  'use strict';

  function ohm({ V, R }) {
    return { I: V / R, G: 1 / R };
  }

  function seriesResistance(R1, R2) {
    return R1 + R2;
  }

  // 和分の積
  function parallelResistance(R1, R2) {
    return (R1 * R2) / (R1 + R2);
  }

  function seriesAndParallel({ V, R1, R2 }) {
    const Rs = seriesResistance(R1, R2);
    const Is = V / Rs;
    const Rp = parallelResistance(R1, R2);
    return {
      series: { R: Rs, I: Is, V1: R1 * Is, V2: R2 * Is },
      parallel: { R: Rp, I: V / Rp, I1: V / R1, I2: V / R2 },
    };
  }

  function power({ V, R, hours }) {
    const I = V / R;
    const P = V * I;
    const energyWh = P * hours;
    return { I, P, energyKWh: energyWh / 1000, heatKJ: (P * hours * 3600) / 1000 };
  }

  const DcCircuit = { ohm, seriesResistance, parallelResistance, seriesAndParallel, power };
  if (typeof module !== 'undefined' && module.exports) module.exports = DcCircuit;
  else global.DcCircuit = DcCircuit;
})(this);
