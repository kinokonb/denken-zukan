// 基礎：比例と反比例。同じ a と x で、比例 y = a × x（原点を通る直線）と反比例 y = a ÷ x（曲線）を上下に並べて見せる。
// 数学の x・y なので量の色は使わない（墨で描く）
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 332;
  const MAX_X = 6;
  const TOP = { x: 50, y: 34, w: 280, h: 100, maxY: 36, ticks: [12, 24, 36] };
  const BOTTOM = { x: 50, y: 196, w: 280, h: 100, maxY: 12, ticks: [4, 8, 12] };

  const format = (value) => String(Number(value.toFixed(2))); // 小数2けたまで、余分な 0 なし

  function compute(p) {
    return { a: p.a, x: p.x, direct: p.a * p.x, inverse: p.a / p.x };
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    drawGraph(svg, TOP, '比例 y = a × x（x が2倍 → y も2倍）', (x) => r.a * x, r.x, r.direct, 0, 'below');
    drawGraph(svg, BOTTOM, '反比例 y = a ÷ x（x が2倍 → y は半分）', (x) => r.a / x, r.x, r.inverse, r.a / BOTTOM.maxY, 'above');
  }

  // グラフ1つ。from は線を描き始める x（反比例は y が上の端をこえない所から）。
  // 値の文字は線と重ならない側に置く（右上がりの直線は右下、右下がりの曲線は右上）
  function drawGraph(svg, area, title, f, x, y, from, labelSide) {
    const g = Svg.el(svg, 'g');
    const toX = (value) => area.x + (value / MAX_X) * area.w;
    const toY = (value) => area.y + area.h - (Math.min(value, area.maxY) / area.maxY) * area.h;
    Svg.note(g, 12, area.y - 20, title, { cls: 'faint' });
    Svg.guide(g, area.x, area.y + area.h, area.x + area.w, area.y + area.h, 'axis');
    Svg.guide(g, area.x, area.y - 4, area.x, area.y + area.h, 'axis');
    for (let tick = 0; tick <= MAX_X; tick++) Svg.note(g, toX(tick), area.y + area.h + 12, String(tick), { cls: 'faint', anchor: 'middle' });
    for (const tick of area.ticks) Svg.note(g, area.x - 6, toY(tick), String(tick), { cls: 'faint', anchor: 'end' });
    Svg.note(g, area.x + area.w, area.y + area.h + 25, 'x', { cls: 'faint', anchor: 'end' });
    Svg.note(g, area.x + 6, area.y - 6, 'y', { cls: 'faint' });
    const points = [];
    for (let i = 0; i <= 120; i++) {
      const value = from + ((MAX_X - from) * i) / 120;
      points.push([toX(value), toY(f(value))]);
    }
    Svg.polyline(g, points, 'ink thick');
    Svg.guide(g, toX(x), toY(y), toX(x), area.y + area.h, 'ink');
    Svg.guide(g, area.x, toY(y), toX(x), toY(y), 'ink');
    Svg.el(g, 'circle', { cx: toX(x), cy: toY(y), r: 5, class: 'dot ink' });
    Svg.note(g, toX(x) + 8, toY(y) + (labelSide === 'below' ? 14 : -10), `y = ${format(y)}`, { cls: 'value', anchor: 'start' });
  }

  global.TopicMathProportion = {
    id: 'math-proportion',
    title: '比例と反比例',
    lead: '2倍で2倍が比例、2倍で半分が反比例。オームの法則には両方ある。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'a', name: 'きまった数', symbol: 'a', unit: '', min: 1, max: 6, step: 1, value: 2 },
      { key: 'x', name: '変える数', symbol: 'x', unit: '', min: 0.5, max: 6, step: 0.5, value: 2 },
    ],
    presets: [],
    compute,
    draw,
    caption(p, r) {
      return `比例 <var>y</var> = ${r.a} × ${format(r.x)} = ${format(r.direct)}、反比例 <var>y</var> = ${r.a} ÷ ${format(r.x)} = ${format(r.inverse)}。`;
    },
    readouts: (p, r) => [
      { name: '比例の', symbol: 'y', value: format(r.direct), unit: '' },
      { name: '反比例の', symbol: 'y', value: format(r.inverse), unit: '' },
      { name: 'きまった数', symbol: 'a', value: String(r.a), unit: '' },
      { name: '変える数', symbol: 'x', value: format(r.x), unit: '' },
    ],
    terms: [
      ['比例', '一方を2倍・3倍にすると、もう一方も2倍・3倍になる関係。<var>y</var> = <var>a</var> × <var>x</var>。'],
      ['反比例', '一方を2倍・3倍にすると、もう一方は半分・3分の1になる関係。<var>y</var> = <var>a</var> ÷ <var>x</var>。かけると、いつも同じ数（<var>x</var> × <var>y</var> = <var>a</var>）。'],
      ['きまった数 <var>a</var>', '式の中で変わらない数（比例定数）。オームの法則 <var>I</var> = <var>V</var> ÷ <var>R</var> で <var>R</var> を変えない時の 1/<var>R</var> など。'],
      ['グラフ', '横に <var>x</var>、縦に <var>y</var> をとって、対応する点を結んだ図。関係の形がひと目でわかる。'],
      ['原点', 'グラフの (0, 0) の点。比例の直線は必ずここを通る。'],
    ],
    tries: [
      { text: '<var>x</var> を 2 → 4（2倍）にすると、比例の <var>y</var> は？', choices: ['半分', 'そのまま', '2倍', '4倍'], answer: 2, set: { x: 4 }, look: '比例の <var>y</var> は 4 → 8 と2倍。下の反比例の <var>y</var> は 1 → 0.5 と半分になる。' },
      { text: '<var>x</var> を 2 → 1（半分）にすると、反比例の <var>y</var> は？', choices: ['半分', 'そのまま', '2倍'], answer: 2, set: { x: 1 }, look: '反比例の <var>y</var> は 1 → 2 と2倍。<var>x</var> × <var>y</var> はいつも <var>a</var>（= 2）のまま。' },
      { text: 'きまった数 <var>a</var> を 2 → 4 にすると、比例の直線は？', choices: ['ねる', 'そのまま', '急になる'], answer: 2, set: { a: 4 }, look: '直線の傾きが <var>a</var>。<var>a</var> が大きいほど急になるが、どれも原点 (0, 0) を通る。' },
    ],
    quiz: [
      { q: '抵抗が同じまま、電圧を3倍にすると電流は？', choices: ['3分の1', 'そのまま', '3倍', '9倍'], answer: 2, why: '<var>I</var> = <var>V</var> ÷ <var>R</var> で <var>R</var> が同じなら、<var>I</var> は <var>V</var> に比例する。' },
      { q: '<var>y</var> = 12 ÷ <var>x</var> で、<var>x</var> = 3 と <var>x</var> = 6 のときの <var>y</var> は？', choices: ['4 と 2', '4 と 8', '36 と 72', '9 と 6'], answer: 0, why: '12 ÷ 3 = 4、12 ÷ 6 = 2。<var>x</var> が2倍で <var>y</var> は半分（反比例）。' },
      { q: '比例のグラフの形は？', choices: ['原点を通る直線', '右下がりの曲線', '山の形'], answer: 0, why: '比例 <var>y</var> = <var>a</var> × <var>x</var> は原点を通るまっすぐな線。右下がりの曲線は反比例。' },
    ],
    exam: {
      lead: '「〜に比例」「〜に反比例」は問題文にも選択肢にもいつも出る。式を見て言えると、計算しなくても選択肢をしぼれる。',
      often: ['$R$ が同じなら $I$ は $V$ に比例、$V$ が同じなら $I$ は $R$ に反比例（$I$ = $V$ ÷ $R$）。'],
      traps: [
        '「2乗に比例」（2倍で4倍）とまちがえない。$P$ = $I$²$R$ は $I$ の2乗に比例する。',
        '反比例は「2倍で半分」。引き算で減るのではない。',
      ],
    },
    conditions: 'a と x は数（単位なし）。電気では y を電流、x を電圧や抵抗と読む',
    explain: {
      points: [
        '比例：$x$ が2倍なら $y$ も2倍。グラフは原点を通る直線。',
        '反比例：$x$ が2倍なら $y$ は半分。$x$ × $y$ はいつも $a$。',
        'オームの法則は両方ある。$I$ は $V$ に比例し、$R$ に反比例する。',
      ],
      look: [
        ['line', 'ink', '上の直線＝比例 $y$ = $a$ × $x$。原点 (0, 0) を通る。'],
        ['curve', 'ink', '下の曲線＝反比例 $y$ = $a$ ÷ $x$。$x$ が大きいほど 0 に近づく。'],
        ['dot', 'ink', '黒い点＝いまの $x$ と $y$。'],
      ],
      formulas: [
        ['y = a × x', '比例。$x$ が k 倍なら $y$ も k 倍。', '電流と電圧（抵抗が同じ時）'],
        ['y = a ÷ x', '反比例。$x$ が k 倍なら $y$ は k 分の1。', '電流と抵抗（電圧が同じ時）'],
        ['x × y = a', '反比例は、かけるといつも同じ数。', '反比例かどうか確かめる時'],
      ],
      symbols: [
        ['x', '変える数', '—'],
        ['y', '$x$ で決まる数', '—'],
        ['a', 'きまった数（比例定数）', '—'],
      ],
    },
  };
})(this);
