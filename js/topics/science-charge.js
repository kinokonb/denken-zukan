// 基礎（理科）：電気の正体。電流は電線の中の電子（マイナスの電気）の流れで、1秒あたりに通る電荷が電流（Q = I × t）。
// 電流の向き（＋→−、赤い矢印）と、電子の動く向き（−→＋、黒い点）が反対なことを、動く点で見せる
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 300;
  const E = 1.6e-19; // 電子1個の電荷 [C]（電験の問題でよく使う値）
  const LOOP = { left: 60, right: 300, top: 44, bottom: 124, mid: 84 };
  const AREA = { x: 56, y: 182, w: 270, h: 80, maxT: 10, maxI: 5 };
  const DOT_SPEED = 10; // 電流 1 A あたり、点が1秒に進む長さ
  const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';

  const format = (value) => String(Number(value.toFixed(2)));

  // 大きい数を「仮数 × 10 の n 乗」に分ける
  function scientific(value) {
    let exponent = Math.floor(Math.log10(value));
    let mantissa = value / 10 ** exponent;
    if (Number(mantissa.toFixed(2)) >= 10) {
      mantissa /= 10;
      exponent += 1;
    }
    return { mantissa: mantissa.toFixed(2), exponent };
  }

  const superscript = (n) => [...String(n)].map((digit) => SUPERSCRIPT[Number(digit)]).join('');

  function compute(p) {
    const Q = p.I * p.t;
    return { I: p.I, t: p.t, Q, electrons: scientific(Q / E) };
  }

  function loopPath() {
    const { left, right, top, bottom, mid } = LOOP;
    return [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]];
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const { left, right, top, mid } = LOOP;
    Svg.wire(g, loopPath());
    Svg.battery(g, left, mid);
    Svg.lamp(g, right, mid, { level: Math.min(r.I / 3, 1.2) });
    Svg.arrow(g, 96, top - 14, 136, top - 14, { cls: 'q-current', width: 2 });
    Svg.note(g, 144, top - 14, '電流の向き（＋→−）', { cls: 'value q-current', anchor: 'start' });
    Svg.arrow(g, 136, top + 16, 96, top + 16, { cls: 'ink', width: 1.5 });
    Svg.note(g, 144, top + 16, '電子の向き（−→＋）', { cls: 'value', anchor: 'start' });
    Svg.note(g, left + 20, mid + 22, `${format(r.I)} A`, { cls: 'value q-current' });
    drawCharge(svg, r);
  }

  // 電荷 Q = I × t は、縦が電流・横が時間の長方形の面積
  function drawCharge(svg, { I, t, Q, electrons }) {
    const { x, y, w, h, maxT, maxI } = AREA;
    const g = Svg.el(svg, 'g');
    const toX = (seconds) => x + (seconds / maxT) * w;
    const height = (I / maxI) * h;
    Svg.note(g, 12, y - 40, '通った電荷 Q ＝ 電流 × 時間（長方形の面積）', { cls: 'faint' });
    Svg.note(g, x, y - 22, `Q = ${format(Q)} C　電子 約 ${electrons.mantissa} × 10${superscript(electrons.exponent)} 個`, { cls: 'value', anchor: 'start' });
    Svg.guide(g, x, y + h, x + w, y + h, 'axis');
    Svg.guide(g, x, y - 4, x, y + h, 'axis');
    for (const seconds of [0, 2, 4, 6, 8, 10]) Svg.note(g, toX(seconds), y + h + 12, String(seconds), { cls: 'faint', anchor: 'middle' });
    for (const amperes of [0, 5]) Svg.note(g, x - 6, y + h - (amperes / maxI) * h, String(amperes), { cls: 'faint', anchor: 'end' });
    Svg.note(g, x + w, y + h + 25, '時間 t [s]', { cls: 'faint', anchor: 'end' });
    Svg.note(g, x + 6, y - 8, 'I [A]', { cls: 'faint' });
    Svg.el(g, 'rect', { x, y: y + h - height, width: toX(t) - x, height, class: 'tile ink' });
  }

  // 電子（黒い点）は電流と反対向きに流れる
  function drawFlow(g, p, r, time) {
    Svg.flowDots(g, loopPath(), -time * DOT_SPEED * r.I, { cls: 'ink' });
  }

  global.TopicScienceCharge = {
    id: 'science-charge',
    title: '電気の正体（電子・電荷・電流の向き）',
    lead: '電流の正体は、電線の中を動く電子の流れ。1秒あたりに通る電気の量が電流。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'I', name: '電流', symbol: 'I', unit: 'A', min: 0.5, max: 5, step: 0.5, value: 2 },
      { key: 't', name: '流す時間', symbol: 't', unit: 's', min: 1, max: 10, step: 1, value: 3 },
    ],
    presets: [],
    compute,
    draw,
    motion: { draw: drawFlow },
    caption(p, r) {
      return `${format(r.I)} A を ${r.t} 秒流すと、通った電荷 <var>Q</var> = ${format(r.I)} × ${r.t} = ${format(r.Q)} C。`;
    },
    readouts: (p, r) => [
      { name: '電流', symbol: 'I', value: format(r.I), unit: 'A', cls: 'q-current' },
      { name: '流す時間', symbol: 't', value: String(r.t), unit: 's' },
      { name: '通った電荷', symbol: 'Q', value: format(r.Q), unit: 'C' },
      { name: '電子の数', symbol: '', value: `${r.electrons.mantissa} × 10<sup>${r.electrons.exponent}</sup>`, unit: '個' },
    ],
    terms: [
      ['原子と電子', 'ものは原子でできていて、原子のまわりをマイナスの電気をもつ電子が回っている。金属の中には、原子からはなれて自由に動ける電子（自由電子）がたくさんある。'],
      ['電荷 <var>Q</var>', '電気の量。単位は C（クーロン）。電子1個の電荷はとても小さく、約 1.6 × 10⁻¹⁹ C（マイナス）。'],
      ['電流 <var>I</var>', '1秒あたりに通る電荷の量。1 A は、1秒に 1 C の電荷が通る流れ（1 A = 1 C/s）。'],
      ['電流の向き', '電池の＋から出て−へ戻る向きと決めてある。電子が見つかる前に決めたので、電子の動く向き（−→＋）とは反対。'],
      ['導体と絶縁体', '電子が動きやすい物が導体（銅・アルミなどの金属）、動きにくい物が絶縁体（ゴム・ビニル・ガラス）。電線は導体を絶縁体で包んである。'],
    ],
    tries: [
      { text: '電流を 2 A → 4 A にすると、電子（黒い点）の流れは？', choices: ['遅くなる', 'そのまま', '速くなる'], answer: 2, set: { I: 4 }, look: '1秒に通る電荷が2倍（4 C）になり、点の流れも2倍の速さになる。電球も明るくなる。' },
      { text: '時間を 3 秒 → 6 秒にすると、通った電荷 <var>Q</var> は？', choices: ['半分', 'そのまま', '2倍'], answer: 2, set: { t: 6 }, look: '<var>Q</var> = <var>I</var> × <var>t</var> = 2 × 6 = 12 C。下の長方形が横に2倍に伸びる。' },
      { text: '電流を 1 A にしたとき、電子が動く向きは電流の向きと？', choices: ['同じ', '反対'], answer: 1, set: { I: 1 }, look: '黒い点（電子）は電池の−から出て＋へ。赤い矢印（電流）と反対向きに回る。' },
    ],
    quiz: [
      { q: '2 A の電流が 5 秒流れた。通った電荷は？', choices: ['0.4 C', '2.5 C', '7 C', '10 C'], answer: 3, why: '<var>Q</var> = <var>I</var> × <var>t</var> = 2 × 5 = 10 C。' },
      { q: '電流の向きは？', choices: ['電池の＋から出て−へ戻る向き', '電子が動く向き', '決まっていない'], answer: 0, why: '電流の向きは＋→−と決めてある。電子はその反対に動く。' },
      { q: '1 A とは？', choices: ['1秒に 1 C の電荷が通る流れ', '1秒に電子が1個通る流れ', '1 V で流れる電流'], answer: 0, why: '1 A = 1 C/s。電子の数なら、1秒に約 6.25 × 10¹⁸ 個。' },
    ],
    exam: {
      lead: '電荷と電流の関係 $Q$ = $I$ × $t$ は、コンデンサ（$Q$ = $C$ × $V$）や電子の運動の問題の入口。電子1個の電荷は問題文に書かれることが多い。',
      often: ['$Q$ = $I$ × $t$。電流は1秒あたりに通る電荷（1 A = 1 C/s）。'],
      traps: [
        '電子の動く向きは電流と反対。',
        '$t$ は秒。分や時間で書かれていたら秒に直す（1 分 = 60 s）。',
      ],
    },
    conditions: '電子1個の電荷を 1.6 × 10⁻¹⁹ C とした。点の動きは見やすい速さ（本物の電子はとてもゆっくり動く）',
    explain: {
      points: [
        '電流の正体は、電線の中を動く電子（マイナスの電気）の流れ。',
        '電流は1秒あたりに通る電荷。$Q$ = $I$ × $t$、1 A は1秒に 1 C。',
        '電流の向きは＋→−。電子はその反対の−→＋へ動く。',
      ],
      look: [
        ['arrow', 'q-current', '赤い矢印＝電流の向き（電池の＋から出て−へ）。'],
        ['dots', 'ink', '黒い点＝電子。電流と反対の向きに動く。速いほど電流が大きい。'],
        ['area', 'ink', '下の長方形＝通った電荷 $Q$。縦が電流、横が時間で、面積が $Q$。'],
      ],
      formulas: [
        ['Q = I × t', '通った電荷は、電流と時間のかけ算。', '通った電気の量を求める時'],
        ['I = Q ÷ t', '電流は1秒あたりに通る電荷。', '電流の意味を確かめる時'],
      ],
      symbols: [
        ['Q', '電荷（電気の量）', 'C（クーロン）'],
        ['I', '電流', 'A'],
        ['t', '時間', 's（秒）'],
      ],
    },
  };
})(this);
