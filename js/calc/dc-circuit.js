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

  // 2つの電池の回路（キルヒホッフの法則）：電池1 − R1 − 点A − R2 − 電池2、点A から R3 を通って下の導線（0 V）へ。
  // 電流の向きは、I1・I2 が点A へ流れこむ向き、I3 が R3 を下へ流れる向きを正とする（負なら反対向き）。
  // 点A の電位 VA は、点A に流れこむ電流の和 = 出る電流（第1法則）から求める
  function twoSources({ E1, E2, R1, R2, R3 }) {
    const VA = (E1 / R1 + E2 / R2) / (1 / R1 + 1 / R2 + 1 / R3);
    return { VA, I1: (E1 - VA) / R1, I2: (E2 - VA) / R2, I3: VA / R3 };
  }

  // ブリッジ回路：上の点から左の辺 R1・R2（間が点C）と右の辺 R3・R4（間が点D）が下の点へ。C と D の間に検流計（抵抗 Rg）。
  // 検流計を外した時の C・D の電位（分圧）と、テブナンの定理でまとめた検流計の電流 Ig（C → D を正）を求め、
  // Ig が流れた後の C・D の電位と4本の辺の電流、電池の電流を返す。R1R4 = R2R3（対辺の積が等しい）なら Ig = 0（つり合い）
  function bridge({ E, R1, R2, R3, R4, Rg }) {
    const openC = (E * R2) / (R1 + R2);
    const openD = (E * R4) / (R3 + R4);
    const RC = (R1 * R2) / (R1 + R2);
    const RD = (R3 * R4) / (R3 + R4);
    const Ig = (openC - openD) / (RC + RD + Rg);
    const VC = openC - Ig * RC;
    const VD = openD + Ig * RD;
    const I1 = (E - VC) / R1;
    const I3 = (E - VD) / R3;
    return { openC, openD, Ig, VC, VD, I1, I2: VC / R2, I3, I4: VD / R4, I: I1 + I3 };
  }

  // 内部抵抗 r のある電池（起電力 E）に負荷 R をつなぐ。電流 I = E ÷ (R + r)、端子電圧 V = E − rI。
  // 負荷の電力 P は R = r の時に最大（E² ÷ 4r）
  function batteryLoad({ E, r, R }) {
    const I = E / (R + r);
    const V = E - r * I;
    return { I, V, drop: r * I, P: V * I, loss: r * I * I, Pmax: (E * E) / (4 * r), shortCircuit: E / r };
  }

  const DcCircuit = {
    ohm, seriesResistance, parallelResistance, seriesAndParallel, power,
    lampWithSeriesResistor, parallelLamps, seriesLampsWithBreak, twoSources, bridge, batteryLoad,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DcCircuit;
  else global.DcCircuit = DcCircuit;
})(this);
