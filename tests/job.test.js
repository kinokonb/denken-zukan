// ミッション（現場の依頼）と準備（前提の知識）の前提：どの問題も、決められる入力のうち成功するのはちょうど1つ（答え）で、
// 文や計器の読みに計算できない値が出ない。ミッションは5問で、始めの入力は成功せず、同じ型が3問続かない。準備は決まった順に出る。
const test = require('node:test');
const assert = require('node:assert/strict');

// レッスンのファイルは画面用（読み込み時に Notation、計算で DcCircuit などを使う）なので、先に用意する
globalThis.Notation = require('../js/notation.js');
globalThis.DcCircuit = require('../js/calc/dc-circuit.js');
globalThis.VoltageDrop = require('../js/calc/voltage-drop.js');
globalThis.InductionMotor = require('../js/calc/induction-motor.js');
globalThis.PowerFactor = require('../js/calc/power-factor.js');
globalThis.AcWave = require('../js/calc/ac-wave.js');
globalThis.Phasor = require('../js/calc/phasor.js');
globalThis.PlayKit = require('../js/plays/kit.js');
const Job = require('../js/job.js');
const lessons = [
  ['オームの法則', require('../js/plays/ohm.js')],
  ['直列と並列', require('../js/plays/series-parallel.js')],
  ['電力と電力量', require('../js/plays/electric-power.js')],
  ['キルヒホッフの法則', require('../js/plays/kirchhoff.js')],
  ['ブリッジ回路', require('../js/plays/bridge.js')],
  ['電池の内部抵抗', require('../js/plays/internal-resistance.js')],
  ['正弦波と実効値', require('../js/plays/ac-rms.js')],
  ['位相とフェーザ', require('../js/plays/phasor.js')],
  ['RLC直列回路', require('../js/plays/rlc.js')],
  ['送電線の電圧降下', require('../js/plays/voltage-drop.js')],
  ['誘導電動機', require('../js/plays/induction-motor.js')],
  ['力率改善', require('../js/plays/power-factor.js')],
];

// 再現できる乱数（mulberry32）
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BAD = /NaN|Infinity|undefined/;

function checkTemplates(templates, name) {
  templates.forEach((template, t) => {
    assert.ok(template.cases.length >= 5, `${name}${t + 1} の候補が少ない`);
    const inputs = Job.inputs(template);
    for (const values of template.cases) {
      const label = `${name}${t + 1} ${JSON.stringify(values)}`;
      const answer = template.answer(values);
      const oks = inputs.filter((input) => template.run(values, input).ok);
      assert.equal(oks.length, 1, `${label}：成功する入力が ${oks.join(', ')}`);
      assert.ok(Math.abs(oks[0] - answer) < 1e-9, `${label}：成功する入力 ${oks[0]} が答え ${answer} でない`);
      assert.doesNotMatch(`${template.request(values)} ${template.know ?? ''}`, BAD, label);
      for (const input of inputs) {
        const result = template.run(values, input);
        assert.doesNotMatch(`${result.reason} ${result.reading ?? ''}`, BAD, `${label} 入力 ${input}`);
        assert.ok(Number.isFinite(result.meter) && result.lamps.every(Number.isFinite), `${label} 入力 ${input} の計器・明るさ`);
        if (template.kind === 'probe') assert.ok(Number.isFinite(template.probe.measure(values, input)), `${label} ${input} の測定`);
      }
    }
  });
}

for (const [title, play] of lessons) {
  test(`${title}：ミッションのどの問題も、成功する入力はちょうど1つ（答え）で、文に計算できない値が出ない`, () => {
    assert.ok(play.jobs.length >= 2, '型が2つ以上');
    checkTemplates(play.jobs, 'ミッションの型');
  });

  test(`${title}：準備のどの問題も、成功する入力はちょうど1つ（答え）で、使う知識と文に計算できない値が出ない`, () => {
    assert.ok(play.basics.length >= 1, '準備がある');
    for (const template of play.basics) assert.ok(template.title && template.know, `準備「${template.title}」に使う知識がない`);
    checkTemplates(play.basics, '準備');
  });

  test(`${title}：準備は指定の段から最後まで決まった順に出て、始めの入力は成功しない。ミッションの「準備から」の段がある`, () => {
    for (let start = 0; start < play.basics.length; start++) {
      for (let seed = 1; seed <= 20; seed++) {
        const ladder = Job.buildLadder(play.basics, start, seeded(seed));
        assert.deepEqual(ladder.map((step) => step.templateIndex), play.basics.map((_, i) => i).slice(start));
        for (const step of ladder) {
          assert.equal(play.basics[step.templateIndex].run(step.values, step.start).ok, false, `段${step.templateIndex + 1} seed ${seed}：始めから成功する`);
        }
      }
    }
    for (const template of play.jobs) {
      assert.ok(Number.isInteger(template.needs) && template.needs >= 0 && template.needs < play.basics.length, `ミッションの型 ${template.kind} の needs が準備の段にない`);
    }
  });

  test(`${title}：ミッションの1セットは5問、始めの入力は成功せず、同じ型が3問続かない`, () => {
    for (let seed = 1; seed <= 50; seed++) {
      const set = Job.buildSet(play.jobs, seeded(seed));
      assert.equal(set.length, Job.SET_SIZE);
      for (const job of set) {
        if (job.start === null) continue; // テスターの型は、まだ何も選んでいない所から始まる
        assert.equal(play.jobs[job.templateIndex].run(job.values, job.start).ok, false, `seed ${seed}：始めから成功する`);
      }
      for (let i = 2; i < set.length; i++) {
        const same = set[i].templateIndex === set[i - 1].templateIndex && set[i].templateIndex === set[i - 2].templateIndex;
        assert.equal(same, false, `seed ${seed}：同じ型が3問続く`);
      }
    }
  });
}
