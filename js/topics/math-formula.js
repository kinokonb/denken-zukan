// 基礎：かけ算・割り算と式の変形。長方形のマス（面積 = 縦 × 横）で、かけ算と割り算が同じ関係の言いかえだと見せる。
// 電気の V = R × I と同じ形なので、縦を R、横を I、面積を V と呼ぶ（右の三角で、隠した文字の求め方を見せる）
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 300;
  const CELL = 18; // マス1つの大きさ
  const ORIGIN = { x: 72, y: 262 }; // 長方形の左下
  const TRIANGLE = { x: 292, top: 40, divide: 92, base: 130, half: 52 };

  function compute(p) {
    return { R: p.R, I: p.I, V: p.R * p.I };
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    drawRectangle(svg, r);
    drawTriangle(svg, r);
  }

  // 面積 V のマスを、縦 R 段 × 横 I 列に並べる
  function drawRectangle(svg, { R, I, V }) {
    const g = Svg.el(svg, 'g');
    const { x, y } = ORIGIN;
    Svg.note(g, 12, 14, 'マス1つ＝1。面積（マスの数）＝ 縦 × 横', { cls: 'faint' });
    for (let row = 0; row < R; row++) {
      for (let col = 0; col < I; col++) {
        Svg.el(g, 'rect', { x: x + col * CELL, y: y - (row + 1) * CELL, width: CELL, height: CELL, class: 'tile q-voltage' });
      }
    }
    Svg.el(g, 'line', { x1: x, y1: y + 3, x2: x + I * CELL, y2: y + 3, class: 'side q-current' });
    Svg.el(g, 'line', { x1: x - 3, y1: y, x2: x - 3, y2: y - R * CELL, class: 'side q-active' });
    Svg.note(g, x + (I * CELL) / 2, y + 20, `横 I = ${I}`, { cls: 'value q-current', anchor: 'middle' });
    Svg.note(g, x - 10, y - (R * CELL) / 2, `縦 R = ${R}`, { cls: 'value q-active', anchor: 'end' });
    Svg.note(g, x + (I * CELL) / 2, y - R * CELL - 12, `面積 V = ${V}`, { cls: 'value q-voltage', anchor: 'middle' });
  }

  // 隠すと式が出る三角：上の V は下の2つのかけ算、下の R・I は V を残りで割る
  function drawTriangle(svg, { R, I, V }) {
    const g = Svg.el(svg, 'g');
    const { x, top, divide, base, half } = TRIANGLE;
    Svg.polyline(g, [[x, top], [x + half, base], [x - half, base], [x, top]], 'ink');
    const dividerHalf = (half * (divide - top)) / (base - top);
    Svg.guide(g, x - dividerHalf, divide, x + dividerHalf, divide, 'axis');
    Svg.guide(g, x, divide, x, base, 'axis');
    Svg.note(g, x, 72, 'V', { cls: 'value q-voltage', anchor: 'middle' });
    Svg.note(g, x - 20, 114, 'R', { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, x + 20, 114, 'I', { cls: 'value q-current', anchor: 'middle' });
    Svg.note(g, x, base + 16, 'よこ線＝割る', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, x, base + 32, 'たて線＝かける', { cls: 'faint', anchor: 'middle' });
    const rows = [
      [`V = R × I = ${V}`, 'q-voltage'],
      [`I = V ÷ R = ${I}`, 'q-current'],
      [`R = V ÷ I = ${R}`, 'q-active'],
    ];
    rows.forEach(([text, cls], i) => Svg.note(g, x, 196 + i * 24, text, { cls: `value ${cls}`, anchor: 'middle' }));
  }

  global.TopicMathFormula = {
    id: 'math-formula',
    title: 'かけ算・割り算と式の変形',
    lead: 'V = R × I がわかれば、I = V ÷ R も R = V ÷ I も出せる。長方形のマスで考える。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'R', name: '縦', symbol: 'R', unit: '', min: 1, max: 8, step: 1, value: 3 },
      { key: 'I', name: '横', symbol: 'I', unit: '', min: 1, max: 8, step: 1, value: 4 },
    ],
    presets: [],
    compute,
    draw,
    caption(p, r) {
      return `面積 ${r.V} = 縦 ${r.R} × 横 ${r.I}。割り算で 横 ${r.I} = ${r.V} ÷ ${r.R}、縦 ${r.R} = ${r.V} ÷ ${r.I}。`;
    },
    readouts: (p, r) => [
      { name: '面積', symbol: 'V', value: String(r.V), unit: '', cls: 'q-voltage' },
      { name: '縦', symbol: 'R', value: String(r.R), unit: '', cls: 'q-active' },
      { name: '横', symbol: 'I', value: String(r.I), unit: '', cls: 'q-current' },
      { name: '横を分数で書くと', symbol: 'I', value: `${r.V}/${r.R}`, unit: '' },
    ],
    terms: [
      ['かけ算 ×', '同じ数を何回も足すこと。3 × 4 は 3 を4回足して 12。長方形なら 縦 × 横 ＝ マスの数（面積）。'],
      ['割り算 ÷', 'かけ算の逆。12 ÷ 3 は「3 に何をかけると 12？」の答えで 4。'],
      ['式と ＝', '＝ の左と右が同じ大きさ、という約束。天びんがつり合っている状態。'],
      ['式の変形', '＝ の両側に同じこと（同じ数で割る など）をして、知りたい文字を1つだけ片側に残すこと。つり合いはくずれない。'],
      ['分数', '割り算の書き方の1つ。12 ÷ 3 を 12/3 とも書く（横線の上が割られる数、下が割る数）。'],
    ],
    tries: [
      { text: '縦 <var>R</var> を 3 → 6（2倍）にすると、面積 <var>V</var> は？（横はそのまま）', choices: ['半分', 'そのまま', '2倍', '4倍'], answer: 2, set: { R: 6 }, look: '面積は 12 → 24 と2倍。マスが縦に2倍積み上がる。横が同じなら、面積は縦に比例する。' },
      { text: '面積 12 のまま、縦 <var>R</var> を 6 にしたい。横 <var>I</var> はいくつ？', choices: ['2', '4', '6', '72'], answer: 0, set: { R: 6, I: 2 }, look: '横 ＝ 面積 ÷ 縦 ＝ 12 ÷ 6 ＝ 2。縦が2倍なら、同じ面積にするには横が半分。' },
      { text: '縦と横を入れかえて 縦 4・横 3 にすると、面積は？', choices: ['減る', '同じ', '増える'], answer: 1, set: { R: 4, I: 3 }, look: 'かけ算は順番を入れかえても同じ（3 × 4 ＝ 4 × 3 ＝ 12）。長方形を横に倒しただけ。' },
    ],
    quiz: [
      { q: '<var>V</var> = <var>R</var> × <var>I</var> を「<var>I</var> = …」に変形すると？', choices: ['<var>I</var> = <var>V</var> × <var>R</var>', '<var>I</var> = <var>V</var> ÷ <var>R</var>', '<var>I</var> = <var>R</var> ÷ <var>V</var>', '<var>I</var> = <var>V</var> − <var>R</var>'], answer: 1, why: '両側を <var>R</var> で割ると、右は <var>I</var> だけが残る。' },
      { q: '20 = 4 × □ の □ は？', choices: ['5', '16', '24', '80'], answer: 0, why: '□ = 20 ÷ 4 = 5。確かめ：4 × 5 = 20。' },
      { q: '<var>P</var> = <var>V</var> × <var>I</var> で、<var>P</var> = 600・<var>V</var> = 100 のとき <var>I</var> は？', choices: ['6', '500', '700', '60,000'], answer: 0, why: '<var>I</var> = <var>P</var> ÷ <var>V</var> = 600 ÷ 100 = 6。文字がちがっても形は同じ。' },
    ],
    exam: {
      lead: '式の変形だけの問題は出ない。でも電験の計算は、ほぼすべて「式を知りたい文字について変形して、数を入れる」で解く。',
      often: ['$A$ = $B$ × $C$ なら $B$ = $A$ ÷ $C$、$C$ = $A$ ÷ $B$。3つの形をすぐ出せるようにする。'],
      traps: [
        '割る向きに注意。$I$ = $V$ ÷ $R$ を $R$ ÷ $V$ にすると、答えが逆数になる。',
        '1 より小さい数で割ると、答えは大きくなる（6 ÷ 0.5 = 12）。',
      ],
    },
    conditions: '電気の V = R × I と同じ形なので、縦を R、横を I、面積を V と呼ぶ',
    explain: {
      points: [
        'かけ算の式 $A$ = $B$ × $C$ は、割り算に言いかえられる。',
        '面積 = 縦 × 横。面積を縦で割ると横、横で割ると縦。',
        '電気の $V$ = $R$ × $I$ も同じ形。$I$ = $V$ ÷ $R$、$R$ = $V$ ÷ $I$。',
      ],
      look: [
        ['area', 'q-voltage', '青いマス＝面積 $V$。数えると 縦 × 横 の数になる。'],
        ['line', 'q-active', '緑の辺＝縦 $R$。'],
        ['line', 'q-current', '赤い辺＝横 $I$。'],
        ['text', 'ink', '右の三角＝知りたい文字を指で隠すと、残りが式になる。'],
      ],
      formulas: [
        ['A = B × C', 'かけ算の形。3つのうち2つがわかれば、残りが出せる。', 'もとの式'],
        ['B = A ÷ C', '両側を $C$ で割ると、$B$ だけが残る。', '$B$ を知りたい時'],
        ['C = A ÷ B', '両側を $B$ で割ると、$C$ だけが残る。', '$C$ を知りたい時'],
        ['V = R × I', '電気の式も同じ形（オームの法則）。', '理論1で電流・電圧・抵抗を求める時'],
      ],
      symbols: [
        ['V', '面積（電気では電圧）', 'V'],
        ['R', '縦（電気では抵抗）', 'Ω'],
        ['I', '横（電気では電流）', 'A'],
      ],
    },
  };
})(this);
