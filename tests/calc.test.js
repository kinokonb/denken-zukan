// 計算の確かめ。期待値は手計算・教科書の典型値で、実装の式を写したものではない。
const test = require('node:test');
const assert = require('node:assert/strict');
const RlcCircuit = require('../js/calc/rlc.js');
const VoltageDrop = require('../js/calc/voltage-drop.js');
const InductionMotor = require('../js/calc/induction-motor.js');
const PowerFactor = require('../js/calc/power-factor.js');
const DcCircuit = require('../js/calc/dc-circuit.js');

const near = (actual, expected, tolerance, label) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} は ${expected}±${tolerance} ではない`);

test('RLC：R=40Ω・XL=40Ω・XC=10Ω なら Z=50Ω、I=2A、力率0.8の遅れ', () => {
  const f = 50;
  const omega = 2 * Math.PI * f;
  const r = RlcCircuit.analyze({ V: 100, R: 40, L: 40 / omega, C: 1 / (10 * omega), f });
  near(r.Z, 50, 1e-9, 'Z');
  near(r.I, 2, 1e-9, 'I');
  near(r.powerFactor, 0.8, 1e-9, 'cosφ');
  near(r.VR, 80, 1e-9, 'VR');
  near(r.VL - r.VC, 60, 1e-9, 'VL−VC');
  assert.ok(r.phi > 0, '誘導性なので電流は遅れる');
});

test('RLC：共振周波数 L=0.1H・C=100μF で約50.3Hz、共振では Z=R で位相差なし', () => {
  near(RlcCircuit.resonantFrequency(0.1, 100e-6), 50.33, 0.01, 'f0');
  const f0 = RlcCircuit.resonantFrequency(0.1, 100e-6);
  const r = RlcCircuit.analyze({ V: 100, R: 10, L: 0.1, C: 100e-6, f: f0 });
  near(r.Z, 10, 1e-9, 'Z');
  near(r.phi, 0, 1e-9, 'φ');
  near(r.VL, r.VC, 1e-9, 'VL=VC');
});

test('RLC：共振より低い周波数では容量性（電流が進む）', () => {
  const r = RlcCircuit.analyze({ V: 100, R: 10, L: 0.1, C: 100e-6, f: 30 });
  assert.ok(r.phi < 0);
});

test('電圧降下：I=100A・R=1Ω・X=2Ω・力率0.8 で約346V、6600Vに対して約5.25%', () => {
  const r = VoltageDrop.analyze({ Vr: 6600, I: 100, R: 1, X: 2, powerFactor: 0.8 });
  near(r.drop, 346.4, 0.1, '降下');
  near(r.dropRate, 5.249, 0.001, '降下率');
  near(r.lineLoss, 30000, 1e-9, '線路損失');
  // 正確な値は近似よりわずかに大きいが、差は数V
  assert.ok(r.VsExact >= r.VsApprox);
  assert.ok(r.VsExact - r.VsApprox < 5);
});

test('電圧降下：力率1でXがなければ近似式と正確な値は一致する', () => {
  const r = VoltageDrop.analyze({ Vr: 6600, I: 200, R: 1.5, X: 0, powerFactor: 1 });
  near(r.VsExact, r.VsApprox, 1e-9, 'Vs');
  near(r.drop, Math.sqrt(3) * 200 * 1.5, 1e-9, '降下');
});

const motor = { V: 200, f: 50, poles: 4, r1: 0.3, x: 1.2 };

test('誘導電動機：4極50Hzの同期速度は1500 min⁻¹、s=0.04 で 1440 min⁻¹', () => {
  assert.equal(InductionMotor.synchronousSpeed(50, 4), 1500);
  const r = InductionMotor.analyze({ ...motor, r2: 0.3, s: 0.04 });
  near(r.N, 1440, 1e-9, 'N');
});

test('誘導電動機：P2 : Pc2 : Po = 1 : s : (1−s)、T = Po / ω', () => {
  const s = 0.05;
  const r = InductionMotor.analyze({ ...motor, r2: 0.3, s });
  near(r.Pc2 / r.P2, s, 1e-12, 'Pc2/P2');
  near(r.Po / r.P2, 1 - s, 1e-12, 'Po/P2');
  const omega = (2 * Math.PI * r.N) / 60;
  near(r.T, r.Po / omega, 1e-9, 'T');
});

test('誘導電動機：比例推移（r2 と s を同じ倍率にするとトルクは同じ）', () => {
  const a = InductionMotor.analyze({ ...motor, r2: 0.3, s: 0.1 });
  const b = InductionMotor.analyze({ ...motor, r2: 0.9, s: 0.3 });
  near(a.T, b.T, 1e-9, 'T');
});

test('誘導電動機：最大トルクのすべりと大きさは、細かく探した最大値と合う', () => {
  for (const r2 of [0.2, 0.5, 1.2]) {
    let best = { s: 0, T: 0 };
    for (let s = 0.001; s <= 1; s += 0.0005) {
      const T = InductionMotor.analyze({ ...motor, r2, s }).T;
      if (T > best.T) best = { s, T };
    }
    near(InductionMotor.maxTorqueSlip({ ...motor, r2 }), best.s, 0.001, `r2=${r2} の s_m`);
    near(InductionMotor.maxTorque(motor), best.T, 0.01, `r2=${r2} の Tm`);
  }
});

test('力率改善：400kW・力率0.8 を 0.95 にするには約168kvar', () => {
  near(PowerFactor.capacitorFor(400, 0.8, 0.95), 168.5, 0.1, 'Qc');
  const r = PowerFactor.analyze({ P: 400, powerFactor1: 0.8, Qc: PowerFactor.capacitorFor(400, 0.8, 0.95) });
  near(r.powerFactor2, 0.95, 1e-9, 'cosθ2');
  near(r.S1, 500, 1e-9, 'S1');
});

test('力率改善：Qc=Q1 で力率1、入れすぎると進み力率', () => {
  const exact = PowerFactor.analyze({ P: 400, powerFactor1: 0.8, Qc: 300 });
  near(exact.powerFactor2, 1, 1e-12, '力率1');
  near(exact.lossRatio, 0.64, 1e-12, '損失は (0.8/1)² 倍');
  const over = PowerFactor.analyze({ P: 400, powerFactor1: 0.8, Qc: 400 });
  assert.equal(over.leading, true);
  near(over.powerFactor2, 400 / Math.hypot(400, 100), 1e-12, '進み力率');
});

test('オームの法則：12 V・4 Ω で 3 A、コンダクタンスは 0.25 S', () => {
  const r = DcCircuit.ohm({ V: 12, R: 4 });
  near(r.I, 3, 1e-12, 'I');
  near(r.G, 0.25, 1e-12, 'G');
});

test('直列と並列：10 Ω 2本は直列 20 Ω・並列 5 Ω、3 Ω と 6 Ω の並列は 2 Ω', () => {
  assert.equal(DcCircuit.seriesResistance(10, 10), 20);
  assert.equal(DcCircuit.parallelResistance(10, 10), 5);
  assert.equal(DcCircuit.parallelResistance(3, 6), 2);
});

test('分圧と分流：4 Ω と 6 Ω の直列に 20 V で 8 V と 12 V、並列では 5 A と約 3.33 A', () => {
  const r = DcCircuit.seriesAndParallel({ V: 20, R1: 4, R2: 6 });
  near(r.series.I, 2, 1e-12, '直列の I');
  near(r.series.V1, 8, 1e-12, 'V1');
  near(r.series.V2, 12, 1e-12, 'V2');
  near(r.parallel.I1, 5, 1e-12, 'I1');
  near(r.parallel.I2, 20 / 6, 1e-12, 'I2');
  near(r.parallel.I, r.parallel.I1 + r.parallel.I2, 1e-12, '分流の和');
});

test('電力と電力量：100 V・20 Ω で 5 A・500 W、2 時間で 1 kWh = 3,600 kJ', () => {
  const r = DcCircuit.power({ V: 100, R: 20, hours: 2 });
  near(r.I, 5, 1e-12, 'I');
  near(r.P, 500, 1e-12, 'P');
  near(r.energyKWh, 1, 1e-12, 'W');
  near(r.heatKJ, 3600, 1e-9, '熱量');
  // P = I²R = V²/R
  near(r.P, r.I * r.I * 20, 1e-9, 'I²R');
});
