// 電力：送電線・配電線の電圧降下。R・X は1線あたり、Vr は受電端の線間電圧。
// 電圧降下は近似式（送電端と受電端の電圧の位相差を無視）：1線あたり I(R cosθ + X sinθ)、遅れ力率。
(function (global) {
  'use strict';

  const SQRT3 = Math.sqrt(3);

  // 1線あたりの電圧降下 I(R cosθ + X sinθ)。力率 cos を省くと 1（抵抗だけの負荷）
  function lineDrop({ I, R, X = 0, cos = 1 }) {
    return I * (R * cos + X * Math.sqrt(1 - cos * cos));
  }

  // 単相2線式は行きと帰りの2本で 2 倍、三相3線式は線間電圧で √3 倍
  const singlePhaseDrop = (line) => 2 * lineDrop(line);
  const threePhaseDrop = (line) => SQRT3 * lineDrop(line);

  // 電圧降下率 [%]。分母は受電端
  const dropRate = ({ Vs, Vr }) => ((Vs - Vr) / Vr) * 100;

  // 途中に家（抵抗だけの負荷）が並ぶ単相2線式の配電線。loads は送り出しに近い順の家の電流、
  // top・bottom は区間ごとの行き・帰りの電線の抵抗（区間 k は k 番目の家の手前）。
  // 区間の電流はその先の家の電流の合計で、家の電圧は手前の区間の降下を順に引いたもの
  function feeder({ V0, loads, top, bottom }) {
    const spans = loads.map((_, k) => loads.slice(k).reduce((sum, I) => sum + I, 0));
    let V = V0;
    const voltages = spans.map((I, k) => (V -= I * (top[k] + bottom[k])));
    return { spans, voltages };
  }

  function analyze({ Vr, I, R, X, powerFactor }) {
    const cos = powerFactor;
    const sin = Math.sqrt(1 - cos * cos);
    const Er = Vr / SQRT3;
    const RI = R * I;
    const XI = X * I;
    // 受電端の相電圧 Er を基準（実軸）に、遅れ電流 I∠−θ を流す。Es = Er + (R + jX)·I
    const EsRe = Er + RI * cos + XI * sin;
    const EsIm = XI * cos - RI * sin;
    const drop = threePhaseDrop({ I, R, X, cos });
    return {
      Er, cos, sin, RI, XI, EsRe, EsIm,
      drop,
      dropRate: (drop / Vr) * 100,
      VsApprox: Vr + drop,
      VsExact: SQRT3 * Math.hypot(EsRe, EsIm),
      lineLoss: 3 * I * I * R,
    };
  }

  const VoltageDrop = { lineDrop, singlePhaseDrop, threePhaseDrop, dropRate, feeder, analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = VoltageDrop;
  else global.VoltageDrop = VoltageDrop;
})(this);
