// 基礎：2乗とルート。正方形（辺 a、面積 a²）で、2乗が面積、ルートがその逆（面積から辺）だと見せる。
// 数学の数なので量の色は使わない（墨で描く）
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 300;
  const CELL = 13; // 1 の長さ
  const ORIGIN = { x: 56, y: 256 }; // 正方形の左下

  const format = (value) => String(Number(value.toFixed(2))); // 小数2けたまで、余分な 0 なし

  function compute(p) {
    return { a: p.a, area: p.a * p.a, doubled: (2 * p.a) ** 2 };
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    drawSquare(svg, r);
    drawRules(svg, r);
  }

  // 辺 a の正方形を 1 × 1 のマスで埋める（はんぱは、はんぱの大きさのマス）
  function drawSquare(svg, { a, area }) {
    const g = Svg.el(svg, 'g');
    const { x, y } = ORIGIN;
    const count = Math.ceil(a);
    Svg.note(g, 12, 14, 'マス1つ＝1 × 1。面積（マスの数）＝ 辺 × 辺', { cls: 'faint' });
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        const w = Math.min(1, a - col) * CELL;
        const h = Math.min(1, a - row) * CELL;
        Svg.el(g, 'rect', { x: x + col * CELL, y: y - row * CELL - h, width: w, height: h, class: 'tile ink' });
      }
    }
    const side = a * CELL;
    Svg.el(g, 'line', { x1: x, y1: y + 3, x2: x + side, y2: y + 3, class: 'side ink' });
    Svg.el(g, 'line', { x1: x - 3, y1: y, x2: x - 3, y2: y - side, class: 'side ink' });
    Svg.note(g, x + side / 2, y + 20, `辺 a = ${format(a)}`, { cls: 'value', anchor: 'middle' });
    Svg.note(g, x + side / 2, y - side - 12, `面積 ${format(area)}`, { cls: 'value', anchor: 'middle' });
  }

  // 2乗とルートの行き帰りと、よく出るルートの値
  function drawRules(svg, { a, area }) {
    const g = Svg.el(svg, 'g');
    const x = 282;
    Svg.note(g, x, 60, '2乗（辺 → 面積）', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, x, 80, `${format(a)}² = ${format(a)} × ${format(a)} = ${format(area)}`, { cls: 'value', anchor: 'middle' });
    Svg.arrow(g, x - 30, 96, x - 30, 122, { cls: 'ink', width: 1.5 });
    Svg.arrow(g, x + 30, 122, x + 30, 96, { cls: 'ink', width: 1.5 });
    Svg.note(g, x, 140, 'ルート（面積 → 辺）', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, x, 160, `√${format(area)} = ${format(a)}`, { cls: 'value', anchor: 'middle' });
    Svg.note(g, x, 204, 'よく出るルート', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, x, 224, '√2 ≒ 1.41', { cls: 'value', anchor: 'middle' });
    Svg.note(g, x, 244, '√3 ≒ 1.73', { cls: 'value', anchor: 'middle' });
  }

  global.TopicMathSquare = {
    id: 'math-square',
    title: '2乗とルート',
    lead: '2乗は同じ数を2回かけること（正方形の面積）。ルートはその逆で、面積から辺を出す。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'a', name: '辺', symbol: 'a', unit: '', min: 1, max: 10, step: 0.5, value: 3 },
    ],
    presets: [],
    compute,
    draw,
    caption(p, r) {
      return `辺 ${format(r.a)} の正方形の面積は ${format(r.a)}² = ${format(r.area)}。逆に √${format(r.area)} = ${format(r.a)}。`;
    },
    readouts: (p, r) => [
      { name: '辺', symbol: 'a', value: format(r.a), unit: '' },
      { name: '面積', symbol: 'a²', value: format(r.area), unit: '' },
      { name: 'ルート', symbol: '√(a²)', value: format(r.a), unit: '' },
      { name: '辺を2倍にすると面積', symbol: '', value: format(r.doubled), unit: '（4倍）' },
    ],
    terms: [
      ['2乗', '同じ数を2回かけること。3² = 3 × 3 = 9。辺 3 の正方形の面積。'],
      ['ルート √（平方根）', '2乗するとその数になる数。√9 = 3（3 × 3 = 9 だから）。'],
      ['√2・√3', '割り切れないルート。√2 ≒ 1.41、√3 ≒ 1.73。√3 は三相交流でよく出る。'],
      ['2乗に比例', '一方が2倍になると、もう一方は4倍（2 × 2）になる関係。電流と電力 <var>P</var> = <var>I</var>²<var>R</var> など。'],
    ],
    tries: [
      { text: '辺を 3 → 6（2倍）にすると、面積は？', choices: ['2倍', '3倍', '4倍', '6倍'], answer: 2, set: { a: 6 }, look: '9 → 36 と4倍。縦も横も2倍になるので 2 × 2 = 4倍（2乗に比例）。' },
      { text: '面積 16 の正方形の辺は？（√16）', choices: ['4', '8', '16', '256'], answer: 0, set: { a: 4 }, look: '4 × 4 = 16 なので √16 = 4。ルートは「2乗するとその数になる数」。' },
      { text: '辺を 1.5 にすると、面積は？', choices: ['1.5', '2.25', '3', '4.5'], answer: 1, set: { a: 1.5 }, look: '1.5 × 1.5 = 2.25。はんぱのマスも数えると 2.25 マス分。' },
    ],
    quiz: [
      { q: '抵抗が同じまま電流が3倍になると、電力 <var>P</var> = <var>I</var>²<var>R</var> は？', choices: ['3倍', '6倍', '9倍', '27倍'], answer: 2, why: '電力は電流の2乗に比例。3² = 9倍。' },
      { q: '√(3² + 4²) は？', choices: ['5', '7', '12', '25'], answer: 0, why: '9 + 16 = 25、√25 = 5。理論4のインピーダンスで使う形。3 + 4 = 7 ではない。' },
      { q: '√2 に近いのは？', choices: ['1.41', '1.73', '2', '4'], answer: 0, why: '1.41 × 1.41 ≒ 2。√3 ≒ 1.73 と区別して覚える。' },
    ],
    exam: {
      lead: '2乗とルートは、電力 $P$ = $I$²$R$、インピーダンス $Z$ = √($R$² + $X$²)、三相の √3 など、毎回のように使う。',
      often: [
        '$P$ = $I$²$R$：電流が2倍で電力（損失）は4倍。',
        '√2 ≒ 1.41、√3 ≒ 1.73 は覚えておく。',
      ],
      traps: [
        '√($a$² + $b$²) は $a$ + $b$ ではない（√(3² + 4²) = 5、3 + 4 = 7）。',
        '2乗は2倍ではない（3² = 9、3 × 2 = 6）。',
      ],
    },
    conditions: 'マス1つ＝1 × 1。辺は 0.5 ずつ動く',
    explain: {
      points: [
        '2乗は同じ数を2回かけること。$a$² = $a$ × $a$ は正方形の面積。',
        '辺が2倍なら面積は4倍。これが「2乗に比例」。',
        'ルートは2乗の逆。√9 = 3。√2 ≒ 1.41、√3 ≒ 1.73。',
      ],
      look: [
        ['area', 'ink', 'マス＝正方形の面積 $a$²。'],
        ['line', 'ink', '太い辺＝辺 $a$。'],
        ['arrow', 'ink', '右の矢印＝2乗（辺 → 面積）とルート（面積 → 辺）の行き帰り。'],
      ],
      formulas: [
        ['a² = a × a', '2乗。同じ数を2回かける。', '電力 $P$ = $I$²$R$ など'],
        ['√(a²) = a', 'ルートは2乗の逆。', '面積から辺、$Z$ = √($R$² + $X$²) など'],
        ['√2 ≒ 1.41、√3 ≒ 1.73', 'よく出るルートの値。', '三相交流、最大値と実効値'],
      ],
      symbols: [
        ['a', '辺の長さ', '—'],
        ['a²', '面積（$a$ の2乗）', '—'],
        ['√', 'ルート（平方根）', '—'],
      ],
    },
  };
})(this);
