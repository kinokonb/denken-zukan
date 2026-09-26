// 理論：正弦波交流の値（最大値・実効値・平均値・瞬時値）と、直流を重ねた波形の実効値。
(function (global) {
  'use strict';

  // 正弦波の実効値 = 最大値 ÷ √2、全波整流した平均値 = 最大値 × 2/π
  const rmsFromPeak = (Vm) => Vm / Math.SQRT2;
  const peakFromRms = (V) => V * Math.SQRT2;
  const averageFromPeak = (Vm) => (2 * Vm) / Math.PI;

  // 瞬時値 v = Vm sin(角度)。角度は度
  const instantaneous = (Vm, degrees) => Vm * Math.sin((degrees * Math.PI) / 180);

  // 直流 Vd と交流（実効値 Va）を重ねた波形の実効値：熱は足し算になるので √(Vd² + Va²)
  const mixedRms = (Vd, Va) => Math.hypot(Vd, Va);

  // 1周期を n 等分した v(t) = Vd + √2 Va sin(2π t/T) の並び（図と、実効値を数値で確かめる用）
  function samples(Vd, Va, n = 360) {
    return Array.from({ length: n }, (_, i) => Vd + peakFromRms(Va) * Math.sin((2 * Math.PI * i) / n));
  }

  // 交流の電力：皮相電力 S = VI、有効電力 P = VI cosθ（平均の電力）、無効電力 Q = VI sinθ（遅れ力率 pf = cosθ）
  function power({ V, I, pf }) {
    const S = V * I;
    return { S, P: S * pf, Q: S * Math.sqrt(1 - pf * pf) };
  }

  const AcWave = { rmsFromPeak, peakFromRms, averageFromPeak, instantaneous, mixedRms, samples, power };
  if (typeof module !== 'undefined' && module.exports) module.exports = AcWave;
  else global.AcWave = AcWave;
})(this);
