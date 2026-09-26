// ミッション：つまみを動かして目標に合わせる、短い1セット（5問）。出題の組み立てと当たりの判定だけを持つ（DOMなし）。
// 各レッスンの missions は「型」の並び。型は、動かすつまみ（free）、数値の組の候補（cases）、固定する値（setup）、
// 正解のつまみの値（answer）、当たりの判定（hit）を持つ。画面は js/app.js が組み立てる。
(function (global) {
  'use strict';

  const SET_SIZE = 5;

  function decimalsOf(step) {
    const text = String(step);
    return text.includes('.') ? text.split('.')[1].length : 0;
  }

  // つまみの目盛りに乗る値の一覧
  function gridValues(param) {
    const count = Math.round((param.max - param.min) / param.step);
    const digits = decimalsOf(param.step);
    return Array.from({ length: count + 1 }, (_, i) => Number((param.min + i * param.step).toFixed(digits)));
  }

  function onGrid(param, value) {
    return gridValues(param).some((v) => Math.abs(v - value) < 1e-9);
  }

  function initialParams(topic) {
    return Object.fromEntries(topic.params.map((param) => [param.key, param.value]));
  }

  function shuffle(items, rng) {
    const list = [...items];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  // 1問を作る。始めの値は当たりにならない値から選び、答えから目盛りの1/4以上離れたものを優先する
  function makeMission(topic, templateIndex, values, rng) {
    const template = topic.missions[templateIndex];
    const fixed = template.setup(values);
    const base = { ...initialParams(topic), ...fixed };
    const param = topic.params.find((p) => p.key === template.free);
    const answer = template.answer(values);
    const misses = gridValues(param).filter((v) => !template.hit(topic.compute({ ...base, [param.key]: v }), values));
    const far = misses.filter((v) => Math.abs(v - answer) >= (param.max - param.min) / 4);
    const pool = far.length > 0 ? far : misses;
    return { templateIndex, values, fixed, free: param.key, answer, start: pool[Math.floor(rng() * pool.length)] };
  }

  // 1セットを作る。同じ型が3問続かないようにする
  function buildSet(topic, rng = Math.random, size = SET_SIZE) {
    const pool = shuffle(
      topic.missions.flatMap((template, t) => template.cases.map((values) => ({ t, values }))),
      rng,
    );
    const picked = [];
    while (picked.length < size && pool.length > 0) {
      const lastTwo = picked.slice(-2).map((c) => c.t);
      const repeats = (c) => lastTwo.length === 2 && lastTwo.every((t) => t === c.t);
      const index = pool.findIndex((c) => !repeats(c));
      picked.push(pool.splice(index >= 0 ? index : 0, 1)[0]);
    }
    return picked.map((c) => makeMission(topic, c.t, c.values, rng));
  }

  function isHit(topic, mission, params) {
    return topic.missions[mission.templateIndex].hit(topic.compute(params), mission.values);
  }

  const Mission = { SET_SIZE, gridValues, onGrid, initialParams, buildSet, isHit };
  if (typeof module !== 'undefined' && module.exports) module.exports = Mission;
  else global.Mission = Mission;
})(this);
