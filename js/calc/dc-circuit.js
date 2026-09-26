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

  // 直列の回路。open に 'R1' か 'R2' を渡すと、その抵抗が切れた回路（電流は流れず、電池の電圧が全部その切れ目にかかる）
  function series({ V, R1, R2 }, open = null) {
    if (open) return { R: Infinity, I: 0, V1: open === 'R1' ? V : 0, V2: open === 'R2' ? V : 0 };
    const R = seriesResistance(R1, R2);
    const I = V / R;
    return { R, I, V1: R1 * I, V2: R2 * I };
  }

  // 並列の回路。open に渡した抵抗の枝は切れていて流れず、残りの枝だけに流れる
  function parallel({ V, R1, R2 }, open = null) {
    const I1 = open === 'R1' ? 0 : V / R1;
    const I2 = open === 'R2' ? 0 : V / R2;
    const R = open === 'R1' ? R2 : open === 'R2' ? R1 : parallelResistance(R1, R2);
    return { R, I: I1 + I2, I1, I2 };
  }

  // 同じ2本の抵抗の直列と並列。open は故障探し用で、{ series: 'R1' } のように切れた抵抗を回路ごとに渡す
  function seriesAndParallel(values, open = {}) {
    return { series: series(values, open.series), parallel: parallel(values, open.parallel) };
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
