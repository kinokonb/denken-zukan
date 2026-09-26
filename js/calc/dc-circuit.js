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

  // ---- ミッション（現場の依頼）用。電球の抵抗は明るさで変わらないものとする（本物は冷えている時に小さい） ----

  // 定格 Vr [V]・Ir [A] の電球に、直列の抵抗 R をつないで電池 V で光らせる。明るさは定格の電力に対する比
  function lampWithSeriesResistor({ V, Vr, Ir, R }) {
    const lampR = Vr / Ir;
    const I = V / (R + lampR);
    const lampV = I * lampR;
    return { lampR, I, lampV, resistorV: I * R, brightness: (lampV / Vr) ** 2 };
  }

  // 同じ電球 n 個の並列。どの電球にも電池の電圧がそのままかかり、全体の電流は1個分の n 倍
  function parallelLamps({ V, lampR, n }) {
    const each = V / lampR;
    return { each, I: each * n };
  }

  // 同じ電球 n 個の直列で、broken 番目（0から）が切れている。電流は流れず、切れ目に電池の電圧が全部かかる
  function seriesLampsWithBreak({ V, n, broken }) {
    return { I: 0, voltages: Array.from({ length: n }, (_, i) => (i === broken ? V : 0)) };
  }

  const DcCircuit = {
    ohm, seriesResistance, parallelResistance, seriesAndParallel, power,
    lampWithSeriesResistor, parallelLamps, seriesLampsWithBreak,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DcCircuit;
  else global.DcCircuit = DcCircuit;
})(this);
