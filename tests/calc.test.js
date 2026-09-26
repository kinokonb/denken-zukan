// 計算の確かめ。期待値は手計算・教科書の典型値で、実装の式を写したものではない。
const test = require('node:test');
const assert = require('node:assert/strict');
const RlcCircuit = require('../js/calc/rlc.js');
const VoltageDrop = require('../js/calc/voltage-drop.js');
const InductionMotor = require('../js/calc/induction-motor.js');
const PowerFactor = require('../js/calc/power-factor.js');
const DcCircuit = require('../js/calc/dc-circuit.js');
const AcWave = require('../js/calc/ac-wave.js');
const Phasor = require('../js/calc/phasor.js');

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

test('電圧降下：単相2線式は往復で 2IR。10 A・1線 0.25 Ω なら 5 V、105 V の送り出しで家は 100 V', () => {
  near(VoltageDrop.singlePhaseDrop({ I: 10, R: 0.25 }), 5, 1e-9, '降下');
  // 遅れ力率 0.8（sin 0.6）のモーター：2 × 10 × (0.25 × 0.8 + 0.5 × 0.6) = 10 V
  near(VoltageDrop.singlePhaseDrop({ I: 10, R: 0.25, X: 0.5, cos: 0.8 }), 10, 1e-9, '力率つきの降下');
});

test('電圧降下：三相3線式は √3 倍。100 A・R=1Ω・X=2Ω・力率0.8 で約346V、降下率は受電端が分母', () => {
  near(VoltageDrop.threePhaseDrop({ I: 100, R: 1, X: 2, cos: 0.8 }), 346.4, 0.1, '降下');
  near(VoltageDrop.dropRate({ Vs: 6930, Vr: 6600 }), 5, 1e-9, '降下率');
});

test('電圧降下：家が並ぶ配電線。区間の電流は先の家の合計で、家の電圧は手前から順に下がる', () => {
  // 4軒とも 10 A、区間の電線は行き・帰りとも 0.05 Ω：区間の電流 40・30・20・10 A、降下 4・3・2・1 V
  const r = VoltageDrop.feeder({ V0: 105, loads: [10, 10, 10, 10], top: [0.05, 0.05, 0.05, 0.05], bottom: [0.05, 0.05, 0.05, 0.05] });
  assert.deepEqual(r.spans, [40, 30, 20, 10]);
  r.voltages.forEach((V, k) => near(V, [101, 98, 96, 95][k], 1e-9, `家${k + 1}`));
});

test('キルヒホッフ：E1=20V・E2=10V・R1=4Ω・R2=2Ω・R3=2Ω で I1=3A・I2=1A・I3=4A、E2 を 0 にすると I2 は -2A（反対向き）', () => {
  const r = DcCircuit.twoSources({ E1: 20, E2: 10, R1: 4, R2: 2, R3: 2 });
  near(r.I1, 3, 1e-12, 'I1');
  near(r.I2, 1, 1e-12, 'I2');
  near(r.I3, 4, 1e-12, 'I3');
  near(r.I1 + r.I2, r.I3, 1e-12, '第1法則');
  near(4 * r.I1 + 2 * r.I3, 20, 1e-12, '第2法則（閉回路1）');
  const zero = DcCircuit.twoSources({ E1: 20, E2: 0, R1: 4, R2: 2, R3: 2 });
  near(zero.I2, -2, 1e-12, 'I2');
  near(zero.I3, 2, 1e-12, 'I3');
});

test('ブリッジ：R1R4 = R2R3（10×30 = 20×15）なら検流計の電流は 0、電池の電流は左右の辺の並列（30 Ω と 45 Ω → 18 Ω）で決まる', () => {
  const r = DcCircuit.bridge({ E: 12, R1: 10, R2: 20, R3: 15, R4: 30, Rg: 10 });
  near(r.Ig, 0, 1e-12, 'Ig');
  near(r.VC, 8, 1e-12, 'VC');
  near(r.VD, 8, 1e-12, 'VD');
  near(r.I, 12 / 18, 1e-12, '電池の電流');
  // R4 を 40 Ω にすると D の電位が上がり、検流計に D → C の向き（負）の電流。点C・D で第1法則が合う
  const u = DcCircuit.bridge({ E: 12, R1: 10, R2: 20, R3: 15, R4: 40, Rg: 10 });
  assert.ok(u.Ig < 0);
  near(u.I1, u.I2 + u.Ig, 1e-12, '点C');
  near(u.I3 + u.Ig, u.I4, 1e-12, '点D');
});

test('内部抵抗：E=6V・r=1Ω・R=5Ω で I=1A・V=5V・P=5W、R=r=1Ω で最大の 9W（端子電圧は E の半分）', () => {
  const r = DcCircuit.batteryLoad({ E: 6, r: 1, R: 5 });
  near(r.I, 1, 1e-12, 'I');
  near(r.V, 5, 1e-12, 'V');
  near(r.P, 5, 1e-12, 'P');
  near(r.Pmax, 9, 1e-12, 'Pmax');
  const best = DcCircuit.batteryLoad({ E: 6, r: 1, R: 1 });
  near(best.P, 9, 1e-12, 'R = r の電力');
  near(best.V, 3, 1e-12, 'R = r の端子電圧');
  near(r.shortCircuit, 6, 1e-12, '短絡電流');
});

test('正弦波：最大値 141.4 V の実効値は 100 V、平均値は約 90 V、30° の瞬時値は最大値の半分', () => {
  near(AcWave.rmsFromPeak(100 * Math.SQRT2), 100, 1e-9, '実効値');
  near(AcWave.averageFromPeak(100 * Math.SQRT2), 90.03, 0.01, '平均値');
  near(AcWave.instantaneous(200, 30), 100, 1e-9, '瞬時値');
  near(AcWave.instantaneous(200, 210), -100, 1e-9, '負の瞬時値');
});

test('直流と交流を重ねた実効値：30 V と 40 V で 50 V（2乗の平均の平方根を数値でも確かめる）', () => {
  near(AcWave.mixedRms(30, 40), 50, 1e-12, '式');
  const v = AcWave.samples(30, 40);
  const rms = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0) / v.length);
  near(rms, 50, 1e-9, '数値');
});

test('フェーザ：90° ずれた 100 V どうしの和は 141 V、120° なら 100 V、180° なら 0。成分の足し算でも同じ', () => {
  near(Phasor.sumMagnitude(100, 100, 90), 141.42, 0.01, '90°');
  near(Phasor.sumMagnitude(100, 100, 120), 100, 1e-9, '120°');
  near(Phasor.sumMagnitude(100, 100, 180), 0, 1e-6, '180°');
  near(Phasor.sumMagnitude(30, 50, 60), 70, 1e-9, '60°');
  const sum = Phasor.add(Phasor.fromPolar(100, 0), Phasor.fromPolar(100, 90));
  near(Phasor.magnitude(sum), 141.42, 0.01, '成分');
  near(Phasor.angle(sum), 45, 1e-9, '角度');
  near(Phasor.magnitude({ re: 60, im: 80 }), 100, 1e-12, '60 + j80');
  assert.equal(Phasor.piText(-30), '−π/6');
});

test('リアクタンス：L = 100/π mH は 50 Hz で 10 Ω、C = 100/π μF は 50 Hz で 100 Ω。周波数2倍で X_L は2倍、X_C は半分', () => {
  near(RlcCircuit.inductiveReactance(50, 0.1 / Math.PI), 10, 1e-9, 'X_L');
  near(RlcCircuit.capacitiveReactance(50, 100e-6 / Math.PI), 100, 1e-9, 'X_C');
  near(RlcCircuit.inductiveReactance(100, 0.1 / Math.PI), 20, 1e-9, 'X_L 2倍');
  near(RlcCircuit.capacitiveReactance(100, 100e-6 / Math.PI), 50, 1e-9, 'X_C 半分');
});

const motor = { V: 200, f: 50, poles: 4, r1: 0.3, x: 1.2 };

test('誘導電動機（一次の抵抗を省いた式）：すべりが sm で最大トルク、sm=0.2 の起動トルクは最大の約 38%、二次抵抗 4 倍なら同じトルクのすべりも 4 倍', () => {
  near(InductionMotor.torqueRatio(0.2, 0.2), 1, 1e-12, '最大');
  near(InductionMotor.torqueRatio(1, 0.2), 2 * 0.2 / 1.04, 1e-12, '起動');
  near(InductionMotor.torqueRatio(0.05, 0.2), InductionMotor.torqueRatio(0.2, 0.8), 1e-12, '比例推移');
  near(InductionMotor.torqueRatio(1, 1), 1, 1e-12, 'sm=1 なら起動で最大');
});

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

test('電球と直列の抵抗：12 V で 6 V・0.5 A の電球（12 Ω）に 12 Ω をつなぐと定格、6 Ω では 8 V で明るさ 16/9 倍', () => {
  const rated = DcCircuit.lampWithSeriesResistor({ V: 12, Vr: 6, Ir: 0.5, R: 12 });
  near(rated.lampR, 12, 1e-12, '電球の抵抗');
  near(rated.I, 0.5, 1e-12, '電流');
  near(rated.lampV, 6, 1e-12, '電球の電圧');
  near(rated.resistorV, 6, 1e-12, '抵抗の電圧');
  near(rated.brightness, 1, 1e-12, '定格の明るさ');
  const over = DcCircuit.lampWithSeriesResistor({ V: 12, Vr: 6, Ir: 0.5, R: 6 });
  near(over.lampV, 8, 1e-12, '抵抗が小さいと電球の電圧が上がる');
  near(over.brightness, 16 / 9, 1e-12, '電力は電圧の2乗');
});

test('電球の並列：12 V で 20 Ω の電球は1個 0.6 A、3個で 1.8 A', () => {
  const r = DcCircuit.parallelLamps({ V: 12, lampR: 20, n: 3 });
  near(r.each, 0.6, 1e-12, '1個');
  near(r.I, 1.8, 1e-12, '3個');
});

test('電球の直列で1個切れる：電流 0、切れた電球だけに電池の 12 V', () => {
  const r = DcCircuit.seriesLampsWithBreak({ V: 12, n: 4, broken: 2 });
  assert.equal(r.I, 0);
  assert.deepEqual(r.voltages, [0, 0, 12, 0]);
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
