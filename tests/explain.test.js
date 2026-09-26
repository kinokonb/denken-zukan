// 説明の形：どのレッスンも「3行でわかる（3つ）・図の見かた・式（式｜ことばで｜使う時）・記号（記号｜意味｜単位）・試験では（よく出る形・まちがえやすい所）」がそろい、
// 文は短く、量記号の $…$ が閉じている。
const test = require('node:test');
const assert = require('node:assert/strict');

// レッスンのファイルは画面用（読み込み時に Notation、計算で DcCircuit などを使う）なので、先に用意する
globalThis.Notation = require('../js/notation.js');
globalThis.DcCircuit = require('../js/calc/dc-circuit.js');
globalThis.RlcCircuit = require('../js/calc/rlc.js');
globalThis.VoltageDrop = require('../js/calc/voltage-drop.js');
globalThis.InductionMotor = require('../js/calc/induction-motor.js');
globalThis.PowerFactor = require('../js/calc/power-factor.js');
globalThis.AcWave = require('../js/calc/ac-wave.js');
globalThis.Phasor = require('../js/calc/phasor.js');
globalThis.Capacitor = require('../js/calc/capacitor.js');
globalThis.Coulomb = require('../js/calc/coulomb.js');
const lessons = [
  require('../js/topics/math-formula.js').TopicMathFormula,
  require('../js/topics/math-proportion.js').TopicMathProportion,
  require('../js/topics/math-prefix.js').TopicMathPrefix,
  require('../js/topics/math-square.js').TopicMathSquare,
  require('../js/topics/science-charge.js').TopicScienceCharge,
  require('../js/topics/science-energy.js').TopicScienceEnergy,
  require('../js/topics/math-pythagoras.js').TopicMathPythagoras,
  require('../js/topics/math-trig.js').TopicMathTrig,
  require('../js/topics/math-vector.js').TopicMathVector,
  require('../js/topics/math-wave.js').TopicMathWave,
  require('../js/topics/ohm.js').TopicOhm,
  require('../js/topics/series-parallel.js').TopicSeriesParallel,
  require('../js/topics/electric-power.js').TopicElectricPower,
  require('../js/topics/kirchhoff.js').TopicKirchhoff,
  require('../js/topics/bridge.js').TopicBridge,
  require('../js/topics/internal-resistance.js').TopicInternalResistance,
  require('../js/topics/ac-rms.js').TopicAcRms,
  require('../js/topics/phasor.js').TopicPhasor,
  require('../js/topics/rlc-elements.js').TopicRlcElements,
  require('../js/topics/rlc.js').TopicRlc,
  require('../js/topics/ac-power.js').TopicAcPower,
  require('../js/topics/coulomb.js').TopicCoulomb,
  require('../js/topics/plate-capacitor.js').TopicPlateCapacitor,
  require('../js/topics/voltage-drop.js').TopicVoltageDrop,
  require('../js/topics/induction-motor.js').TopicInductionMotor,
  require('../js/topics/power-factor.js').TopicPowerFactor,
];

// 画面で読む長さ（$…$ の記号は中身だけ数える）
const plain = (text) => text.replace(/\$([^$]*)\$/g, '$1');
const balanced = (text) => (text.match(/\$/g) || []).length % 2 === 0;
const filled = (row, n) => Array.isArray(row) && row.length === n && row.every((cell) => typeof cell === 'string' && cell.trim() !== '');

for (const topic of lessons) {
  test(`${topic.title}：説明と試験では の形がそろい、文が短く、量記号が閉じている`, () => {
    const { points, look, formulas, symbols } = topic.explain;
    assert.equal(points.length, 3, '3行でわかる は3つ');
    for (const point of points) assert.ok(plain(point).length <= 60, `3行でわかる が長い：${point}`);
    assert.ok(look.length >= 2 && look.every((row) => filled(row, 3)), '図の見かた は [印, 色, 文] を2つ以上');
    assert.ok(formulas.length >= 1 && formulas.every((row) => filled(row, 3)), '式 は [式, ことばで, 使う時]');
    assert.ok(symbols.length >= 1 && symbols.every((row) => filled(row, 3)), '記号 は [記号, 意味, 単位]');
    const { lead, often, traps } = topic.exam;
    assert.ok(lead && often.length >= 1 && traps.length >= 1, '試験では は lead・よく出る形・まちがえやすい所');
    const texts = [...points, ...look.map((row) => row[2]), ...formulas.flatMap((row) => row.slice(1)), ...symbols.map((row) => row[1]), lead, ...often, ...traps];
    for (const text of texts) {
      assert.ok(balanced(text), `$ が閉じていない：${text}`);
      assert.doesNotMatch(text, /\$\{|undefined/, text);
    }
  });
}
