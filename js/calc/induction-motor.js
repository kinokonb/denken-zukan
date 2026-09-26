// 機械：三相誘導電動機。励磁回路を省いたL形等価回路（1相分、一次換算）で求める。
// V は線間電圧、r1 は一次抵抗、x は一次＋二次の漏れリアクタンス、r2 は一次換算の二次抵抗。
(function (global) {
  'use strict';

  function synchronousSpeed(f, poles) {
    return (120 * f) / poles; // min⁻¹
  }

  function analyze({ V, f, poles, r1, x, r2, s }) {
    const phaseVoltage = V / Math.sqrt(3);
    const Ns = synchronousSpeed(f, poles);
    const omegaS = (2 * Math.PI * Ns) / 60;
    const I2 = phaseVoltage / Math.hypot(r1 + r2 / s, x);
    const P2 = 3 * I2 * I2 * (r2 / s); // 二次入力（同期ワット）
    return {
      Ns, omegaS, I2, P2,
      N: Ns * (1 - s),
      Pc2: s * P2,
      Po: (1 - s) * P2,
      T: P2 / omegaS,
    };
  }

  function maxTorqueSlip({ r1, x, r2 }) {
    return r2 / Math.hypot(r1, x);
  }

  // 比例推移のため r2 によらない
  function maxTorque({ V, f, poles, r1, x }) {
    const phaseVoltage = V / Math.sqrt(3);
    const omegaS = (2 * Math.PI * synchronousSpeed(f, poles)) / 60;
    return (3 * phaseVoltage * phaseVoltage) / (2 * omegaS * (r1 + Math.hypot(r1, x)));
  }

  const InductionMotor = { analyze, synchronousSpeed, maxTorqueSlip, maxTorque };
  if (typeof module !== 'undefined' && module.exports) module.exports = InductionMotor;
  else global.InductionMotor = InductionMotor;
})(this);
