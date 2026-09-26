// 遊び（js/plays/<レッスンid>.js）で共通に使う道具：数の書き方、予想とくらべる判定、針の計器とその読み。
// 図の部品そのもの（電池・電球・計器の形）は js/svg.js。
(function (global) {
  'use strict';

  // 小数2けたまでで、余分な 0 を付けない（1.50 → 1.5）
  const num = (value) => String(Number(value.toFixed(2)));
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  // 予想の針とくらべる問いの結果（当たりは同じ値のときだけ）。why は計算の理由
  function predicted(input, truth, unit, why) {
    if (near(input, truth)) return { ok: true, reason: `ぴったり！ ${why}` };
    return { ok: false, reason: `本物は ${num(truth)} ${unit}（予想 ${num(input)} ${unit}）。${why}` };
  }

  // 針の計器（look.meter を指す）と、その下の読み（結果が出るまで「？ 単位」）。ghost は予想の針、mark は目盛りの印
  function meter(g, x, y, look, { max, letter, cls, mark = null, ghost = null, readingY = y + 40 }) {
    Svg.gauge(g, x, y, { value: look.meter, max, letter, cls, mark, ghost });
    Svg.note(g, x, readingY, look.reading ?? `？ ${letter}`, { cls: look.reading ? `value ${cls}` : 'faint', anchor: 'middle' });
  }

  const PlayKit = { num, near, predicted, meter };
  if (typeof module !== 'undefined' && module.exports) module.exports = PlayKit;
  else global.PlayKit = PlayKit;
})(this);
