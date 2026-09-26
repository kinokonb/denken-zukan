// ミッション（現場の依頼）：依頼を読む → 値や個数を決める（計器は結果が出るまで見えない）→ スイッチを入れる → 目の前で結果が起きる。
// 5問で1セット。準備（basics：ミッションの前提の知識を1つずつ）は決まった順に出す。
// ここは出題の組み立てと、決められる入力の一覧だけを持つ（DOMなし）。画面と演出は js/job-play.js。
// レッスンごとの遊び（js/plays/<レッスンid>.js）の jobs は「型」の並び。型の kind で決め方が変わる：
// - dial：つまみで値を決める（dial: { name, symbol, unit, min, max, step }）
// - count：個数を決める（count: { min, max }）
// - probe：図の部品をタップしてテスターで測り、選んだ1つを交換する（probe: { parts, hint（案内の文）, measure(values, i)（針の値）, reading(値)（読みの文） }）
// どの型も cases（数値の組）、request(values)（依頼の文）、answer(values)（正しい入力）、
// run(values, input)（スイッチを入れた結果：ok・計器の針 meter・電球の明るさ lamps・壊れる所 burst・計器の読み reading・理由 reason）、draw(g, values, input, look)（現場の図）を持つ。
(function (global) {
  'use strict';

  const Mission = typeof module !== 'undefined' && module.exports ? require('./mission.js') : global.Mission;
  const SET_SIZE = 5;

  function range(min, max) {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }

  // 決められる入力の一覧
  function inputs(template) {
    if (template.kind === 'dial') return Mission.gridValues(template.dial);
    if (template.kind === 'count') return range(template.count.min, template.count.max);
    return range(0, template.probe.parts - 1);
  }

  // 始めの入力。dial は成功しない値のうち答えから目盛りの1/4以上離れた値、count はいちばん少ない数、probe はまだ選ばない
  function startInput(template, values, rng) {
    if (template.kind === 'count') return template.count.min;
    if (template.kind === 'probe') return null;
    const { min, max } = template.dial;
    const answer = template.answer(values);
    const misses = inputs(template).filter((v) => !template.run(values, v).ok);
    const far = misses.filter((v) => Math.abs(v - answer) >= (max - min) / 4);
    const pool = far.length > 0 ? far : misses;
    return pool[Math.floor(rng() * pool.length)];
  }

  function buildSet(templates, rng = Math.random, size = SET_SIZE) {
    return Mission.pickCases(templates, rng, size).map(({ t, values }) => ({
      templateIndex: t,
      values,
      start: startInput(templates[t], values, rng),
    }));
  }

  // 準備の組み立て：start 番目から最後まで、決まった順に1問ずつ（数値の組はそれぞれの候補から1つ選ぶ）
  function buildLadder(templates, start = 0, rng = Math.random) {
    return templates.slice(start).map((template, i) => {
      const values = template.cases[Math.floor(rng() * template.cases.length)];
      return { templateIndex: start + i, values, start: startInput(template, values, rng) };
    });
  }

  const Job = { SET_SIZE, inputs, buildSet, buildLadder };
  if (typeof module !== 'undefined' && module.exports) module.exports = Job;
  else global.Job = Job;
})(this);
