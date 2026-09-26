// 基礎：直角三角形（三平方の定理）。直角をはさむ2辺 a・b の正方形の面積の和が、斜辺 c の正方形の面積になることを見せる。
// 交流の Z = √(R² + X²) や、電圧を矢印で足す計算はこの形。数学の図なので量の色は使わない（墨で描く）
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 300;
  // 3つの正方形が左上の枠（幅 230・高さ 270）に収まる大きさで描く。1 の長さは最大 24
  const FRAME = { left: 10, top: 20, width: 230, height: 270 };

  const format = (value) => String(Number(value.toFixed(2)));

  function compute(p) {
    const c2 = p.a * p.a + p.b * p.b;
    return { a: p.a, b: p.b, a2: p.a * p.a, b2: p.b * p.b, c2, c: Math.sqrt(c2) };
  }

  const square = (g, points) => Svg.el(g, 'path', { d: `M${points.map(([x, y]) => `${x},${y}`).join('L')}Z`, class: 'tile ink' });

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const UNIT = Math.min(FRAME.width / (r.a + 2 * r.b), FRAME.height / (2 * r.a + r.b), 24);
    const O = { x: FRAME.left + r.b * UNIT, y: FRAME.top + (r.a + r.b) * UNIT }; // 直角の頂点
    const A = [O.x + r.a * UNIT, O.y]; // 横の辺の先
    const B = [O.x, O.y - r.b * UNIT]; // 縦の辺の先
    // 斜辺の外側に向く辺（斜辺 A→B を90°回した向き）
    const n = [B[1] - A[1], A[0] - B[0]];
    square(g, [[O.x, O.y], A, [A[0], O.y + r.a * UNIT], [O.x, O.y + r.a * UNIT]]);
    square(g, [[O.x, O.y], B, [O.x - r.b * UNIT, B[1]], [O.x - r.b * UNIT, O.y]]);
    square(g, [A, B, [B[0] - n[0], B[1] - n[1]], [A[0] - n[0], A[1] - n[1]]]);
    Svg.polyline(g, [[O.x, O.y], A, B, [O.x, O.y]], 'ink thick');
    Svg.el(g, 'path', { d: `M${O.x + 8},${O.y}L${O.x + 8},${O.y - 8}L${O.x},${O.y - 8}`, class: 'right-angle' });
    // 面積の文字は各正方形の中心に
    Svg.note(g, O.x + (r.a * UNIT) / 2, O.y + (r.a * UNIT) / 2, `a² = ${r.a2}`, { cls: 'value', anchor: 'middle' });
    Svg.note(g, O.x - (r.b * UNIT) / 2, O.y - (r.b * UNIT) / 2, `b² = ${r.b2}`, { cls: 'value', anchor: 'middle' });
    const center = [(A[0] + B[0]) / 2 - n[0] / 2, (A[1] + B[1]) / 2 - n[1] / 2];
    Svg.note(g, center[0], center[1], `c² = ${r.c2}`, { cls: 'value', anchor: 'middle' });
    // 右の計算
    const rows = [
      [`a = ${r.a}、b = ${r.b}`, 'faint'],
      ['a² + b² = c²', 'faint'],
      [`${r.a2} + ${r.b2} = ${r.c2}`, 'value'],
      [`c = √${r.c2}`, 'value'],
      [`${Number.isInteger(r.c) ? '=' : '≒'} ${format(r.c)}`, 'value'],
      [`（a + b = ${r.a + r.b} ではない）`, 'faint'],
    ];
    rows.forEach(([text, cls], i) => Svg.note(g, 352, 180 + i * 20, text, { cls, anchor: 'end' }));
  }

  global.TopicMathPythagoras = {
    id: 'math-pythagoras',
    title: '直角三角形（三平方の定理）',
    lead: '直角三角形では a² + b² = c²。交流の Z = √(R² + X²) はこの形。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'a', name: '横の辺', symbol: 'a', unit: '', min: 1, max: 8, step: 1, value: 3 },
      { key: 'b', name: '縦の辺', symbol: 'b', unit: '', min: 1, max: 8, step: 1, value: 4 },
    ],
    presets: [],
    compute,
    draw,
    caption(p, r) {
      return `${r.a}² + ${r.b}² = ${r.c2} なので、斜めの辺 <var>c</var> = √${r.c2} ${Number.isInteger(r.c) ? '=' : '≒'} ${format(r.c)}。`;
    },
    readouts: (p, r) => [
      { name: '斜めの辺', symbol: 'c', value: format(r.c), unit: '' },
      { name: '斜めの正方形', symbol: 'c²', value: String(r.c2), unit: '' },
      { name: '横の辺', symbol: 'a', value: String(r.a), unit: '' },
      { name: '縦の辺', symbol: 'b', value: String(r.b), unit: '' },
    ],
    terms: [
      ['直角三角形', '1つの角が直角（90°）の三角形。交流の図（インピーダンス・電圧・電力の三角形）はほとんどこれ。'],
      ['斜辺', '直角の向かいの、いちばん長い辺。'],
      ['三平方の定理', '直角をはさむ2辺を <var>a</var>・<var>b</var>、斜辺を <var>c</var> とすると、<var>a</var>² + <var>b</var>² = <var>c</var>²。'],
      ['3・4・5', '3² + 4² = 5² になる、辺がすべて整数の直角三角形。6・8・10 や 5・12・13 も同じ仲間。'],
    ],
    tries: [
      { text: '<var>a</var> と <var>b</var> を両方2倍（6・8）にすると、斜めの辺 <var>c</var> は？', choices: ['5 のまま', '10（2倍）', '14'], answer: 1, set: { a: 6, b: 8 }, look: '6² + 8² = 100、<var>c</var> = 10。形は同じで、大きさが2倍（3・4・5 の2倍）。' },
      { text: '<var>b</var> を 1 にすると（<var>a</var> = 3）、<var>c</var> は？', choices: ['3 より少し長い', '4', 'ちょうど 1'], answer: 0, set: { b: 1 }, look: '3² + 1² = 10、<var>c</var> ≒ 3.16。縦が短いと、斜めの辺は横とほぼ同じ長さ。' },
      { text: '<var>a</var> = 1・<var>b</var> = 1 のとき、<var>c</var> は？', choices: ['1', '√2 ≒ 1.41', '2'], answer: 1, set: { a: 1, b: 1 }, look: '1² + 1² = 2、<var>c</var> = √2 ≒ 1.41。基礎4 の √2 がここで出る。' },
    ],
    quiz: [
      { q: '直角をはさむ2辺が 6 と 8 の直角三角形の斜辺は？', choices: ['10', '14', '48', '100'], answer: 0, why: '6² + 8² = 36 + 64 = 100、√100 = 10。' },
      { q: '<var>R</var> = 30 Ω・<var>X</var> = 40 Ω の直列のインピーダンス <var>Z</var> は？', choices: ['10 Ω', '50 Ω', '70 Ω', '1,200 Ω'], answer: 1, why: '<var>Z</var> = √(30² + 40²) = √2,500 = 50 Ω。3・4・5 の10倍。' },
      { q: '斜辺 13、1辺 5 の直角三角形の残りの辺は？', choices: ['8', '12', '18'], answer: 1, why: '13² − 5² = 169 − 25 = 144、√144 = 12。残りの辺は引き算。' },
    ],
    exam: {
      lead: '交流の計算（インピーダンス・電圧・電力の三角形）は、ほぼすべて直角三角形。三平方の定理を毎回使う。',
      often: [
        '$Z$ = √($R$² + $X$²)、$S$ = √($P$² + $Q$²)（皮相電力・有効電力・無効電力）。',
        '3・4・5 と 5・12・13 の組は、数字を見ただけで気づけるようにする。',
      ],
      traps: [
        '斜辺は足し算ではない（3 + 4 ≠ 5）。',
        '残りの1辺は引き算：√($c$² − $a$²)。',
      ],
    },
    conditions: '直角は左下。辺が長い時は図を小さく描く',
    explain: {
      points: [
        '直角三角形では、2辺の2乗の和が斜辺の2乗になる（三平方の定理）。',
        '$c$ = √($a$² + $b$²)。斜辺は $a$ + $b$ ではない。',
        '交流の $Z$ = √($R$² + $X$²) や、電圧を矢印で足す計算もこの形。',
      ],
      look: [
        ['area', 'ink', '下と左の正方形＝$a$² と $b$²。'],
        ['area', 'ink', '斜めの正方形＝$c$²。面積は2つの正方形の和と同じ。'],
        ['line', 'ink', '太い線＝直角三角形。直角は左下（小さなかぎの印）。'],
      ],
      formulas: [
        ['a² + b² = c²', '2辺の2乗の和が、斜辺の2乗。', '直角三角形の辺を求める時'],
        ['c = √(a² + b²)', '斜辺はルートで出す。', '$Z$・$V$・$S$ を求める時'],
        ['a = √(c² − b²)', '斜辺と1辺から、残りの辺。', '$X$ や $Q$ を求める時'],
      ],
      symbols: [
        ['a・b', '直角をはさむ2辺', '—'],
        ['c', '斜辺（直角の向かいの辺）', '—'],
      ],
    },
  };
})(this);
