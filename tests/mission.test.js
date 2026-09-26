// ミッションの前提：つまみの問題は、目盛りの上に答えがあり、そこで当たりになる。始めの値は当たりでない。
// 故障探しの問題は、答え（壊れた所）が図に出る計器の値だけで1つに決まる。
const test = require('node:test');
const assert = require('node:assert/strict');

// レッスンのファイルは画面用（読み込み時に Notation、計算で DcCircuit などを使う）なので、先に用意する
globalThis.Notation = require('../js/notation.js');
globalThis.DcCircuit = require('../js/calc/dc-circuit.js');
globalThis.RlcCircuit = require('../js/calc/rlc.js');
globalThis.VoltageDrop = require('../js/calc/voltage-drop.js');
globalThis.InductionMotor = require('../js/calc/induction-motor.js');
globalThis.PowerFactor = require('../js/calc/power-factor.js');
const Mission = require('../js/mission.js');
const lessons = [
  require('../js/topics/ohm.js').TopicOhm,
  require('../js/topics/series-parallel.js').TopicSeriesParallel,
  require('../js/topics/electric-power.js').TopicElectricPower,
  require('../js/topics/rlc.js').TopicRlc,
  require('../js/topics/voltage-drop.js').TopicVoltageDrop,
  require('../js/topics/induction-motor.js').TopicInductionMotor,
  require('../js/topics/power-factor.js').TopicPowerFactor,
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
      if (template.tap) return;
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

  const tapTemplates = topic.missions.filter((template) => template.tap);
  if (tapTemplates.length > 0) {
    test(`${topic.title}：故障探しは、壊れた所が計器の値だけで1つに決まり、ちがう所の説明に計算できない値が出ない`, () => {
      for (const template of tapTemplates) {
        assert.ok(template.cases.length >= 5, '候補が少ない');
        for (const values of template.cases) {
          const answer = template.answer(values);
          const label = `${JSON.stringify(values)}（答え ${answer}）`;
          assert.ok(topic.targets.includes(answer), `${label}：答えがタップできる所にない`);
          const fixed = template.setup(values);
          for (const [key, value] of Object.entries(fixed)) {
            assert.ok(Mission.onGrid(topic.params.find((p) => p.key === key), value), `固定値 ${key}=${value} が目盛りにない`);
          }
          const params = { ...Mission.initialParams(topic), ...fixed };
          const now = topic.compute(params, template.fault(answer));
          const seen = template.now(now);
          assert.doesNotMatch(`${seen} ${template.reason(values)}`, /NaN|Infinity|undefined/, label);
          for (const other of topic.targets.filter((target) => target !== answer)) {
            const ifBroken = topic.compute(params, template.fault(other));
            assert.notEqual(template.now(ifBroken), seen, `${label}：${other} が壊れても計器が同じ値（${seen}）`);
            assert.doesNotMatch(template.miss(values, other, ifBroken, now), /NaN|Infinity|undefined/, `${label}：${other} の説明`);
          }
        }
      }
    });
  }

  test(`${topic.title}：1セットは5問、始めの値は当たりでなく、同じ型が3問続かない`, () => {
    for (let seed = 1; seed <= 50; seed++) {
      const set = Mission.buildSet(topic, seeded(seed));
      assert.equal(set.length, Mission.SET_SIZE);
      set.forEach((mission) => {
        if (mission.tap) return;
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
