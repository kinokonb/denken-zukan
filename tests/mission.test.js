// ミッション（つまみの型）の前提：どの問題も、つまみの目盛りの上に答えがあり、そこで当たりになる。始めの値は当たりでない。
const test = require('node:test');
const assert = require('node:assert/strict');

// レッスンのファイルは画面用（読み込み時に Notation、計算で DcCircuit などを使う）なので、先に用意する
globalThis.Notation = require('../js/notation.js');
globalThis.DcCircuit = require('../js/calc/dc-circuit.js');
globalThis.RlcCircuit = require('../js/calc/rlc.js');
globalThis.InductionMotor = require('../js/calc/induction-motor.js');
globalThis.PowerFactor = require('../js/calc/power-factor.js');
const Mission = require('../js/mission.js');
const lessons = [
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

for (const topic of lessons) {
  test(`${topic.title}：どの問題も答えがつまみの目盛りにあり、そこで当たりになる`, () => {
    assert.ok(topic.missions.length >= 2, '型が2つ以上');
    topic.missions.forEach((template, t) => {
      const param = topic.params.find((p) => p.key === template.free);
      assert.ok(param, `型${t + 1} の free がつまみにない`);
      assert.ok(template.cases.length >= 5, `型${t + 1} の候補が少ない`);
      for (const values of template.cases) {
        const answer = template.answer(values);
        assert.ok(Mission.onGrid(param, answer), `型${t + 1} ${JSON.stringify(values)} の答え ${answer} が目盛りにない`);
        const fixed = template.setup(values);
        for (const [key, value] of Object.entries(fixed)) {
          assert.ok(Mission.onGrid(topic.params.find((p) => p.key === key), value), `固定値 ${key}=${value} が目盛りにない`);
        }
        const result = topic.compute({ ...Mission.initialParams(topic), ...fixed, [param.key]: answer });
        assert.ok(template.hit(result, values), `型${t + 1} ${JSON.stringify(values)} が答えで当たりにならない`);
      }
    });
  });

  test(`${topic.title}：1セットは5問、始めの値は当たりでなく、同じ型が3問続かない`, () => {
    for (let seed = 1; seed <= 50; seed++) {
      const set = Mission.buildSet(topic, seeded(seed));
      assert.equal(set.length, Mission.SET_SIZE);
      set.forEach((mission) => {
        const params = { ...Mission.initialParams(topic), ...mission.fixed, [mission.free]: mission.start };
        assert.equal(Mission.isHit(topic, mission, params), false, `seed ${seed}：始めから当たっている`);
      });
      for (let i = 2; i < set.length; i++) {
        const same = set[i].templateIndex === set[i - 1].templateIndex && set[i].templateIndex === set[i - 2].templateIndex;
        assert.equal(same, false, `seed ${seed}：同じ型が3問続く`);
      }
    }
  });
}
