// 電力：三相3線式の送電線の電圧降下。R・X は1線あたり、Vr は受電端の線間電圧。
(function (global) {
  'use strict';

  const SQRT3 = Math.sqrt(3);

  function analyze({ Vr, I, R, X, powerFactor }) {
    const cos = powerFactor;
    const sin = Math.sqrt(1 - cos * cos);
    const Er = Vr / SQRT3;
    const RI = R * I;
    const XI = X * I;
    // 受電端の相電圧 Er を基準（実軸）に、遅れ電流 I∠−θ を流す。Es = Er + (R + jX)·I
    const EsRe = Er + RI * cos + XI * sin;
    const EsIm = XI * cos - RI * sin;
    const drop = SQRT3 * I * (R * cos + X * sin);
    return {
      Er, cos, sin, RI, XI, EsRe, EsIm,
      drop,
      dropRate: (drop / Vr) * 100,
      VsApprox: Vr + drop,
      VsExact: SQRT3 * Math.hypot(EsRe, EsIm),
      lineLoss: 3 * I * I * R,
    };
  }

  const VoltageDrop = { analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = VoltageDrop;
  else global.VoltageDrop = VoltageDrop;
})(this);
