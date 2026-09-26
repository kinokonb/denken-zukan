// 理論：電圧・電流・抵抗とオームの法則（直流回路の入口）
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 290;
  const LOOP = { left: 80, right: 280, top: 44, bottom: 132 };
  const BATTERY_Y = 88;
  const GRAPH = { x: 56, y: 172, w: 284, h: 88, maxV: 24, maxI: 12 };
  const DOT_SPEED = 10; // 電流 1 A あたり、点が1秒に進む長さ

  function compute(p) {
    return { ...DcCircuit.ohm({ V: p.V, R: p.R }), V: p.V, R: p.R };
  }

  function loopPath() {
    const { left, right, top, bottom } = LOOP;
    return [[left, BATTERY_Y], [left, top], [right, top], [right, bottom], [left, bottom], [left, BATTERY_Y]];
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const { left, right, top } = LOOP;
    Svg.note(g, 12, 14, '赤い点が電流の流れ（電池の＋から出て、回路を回り −へ戻る）', { cls: 'faint' });
    Svg.wire(g, loopPath());
    Svg.battery(g, left, BATTERY_Y);
    Svg.resistor(g, right, BATTERY_Y, { vertical: true });
    Svg.note(g, left - 22, BATTERY_Y, `V = ${Notation.number(r.V, 0)} V`, { cls: 'value q-voltage', anchor: 'end' });
    Svg.note(g, right + 16, BATTERY_Y, `R = ${Notation.number(r.R, 0)} Ω`, { cls: 'value q-active', anchor: 'start' });
    Svg.arrow(g, (left + right) / 2 - 16, top - 12, (left + right) / 2 + 16, top - 12, { cls: 'q-current', width: 1.5 });
    Svg.note(g, (left + right) / 2 + 24, top - 12, `I = ${Notation.number(r.I, 2)} A`, { cls: 'value q-current', anchor: 'start' });
    drawGraph(svg, r);
  }

  // V–I グラフ：抵抗が一定なら電流は電圧に比例（原点を通る直線、傾き 1/R）
  function drawGraph(svg, r) {
    const { x, y, w, h, maxV, maxI } = GRAPH;
    const g = Svg.el(svg, 'g');
    const toX = (V) => x + (V / maxV) * w;
    const toY = (I) => y + h - (I / maxI) * h;
    Svg.note(g, 12, y - 26, '電圧と電流の関係（V–I グラフ）', { cls: 'faint' });
    Svg.guide(g, x, y + h, x + w, y + h, 'axis');
    Svg.guide(g, x, y - 4, x, y + h, 'axis');
    for (const V of [0, 6, 12, 18, 24]) Svg.note(g, toX(V), y + h + 12, String(V), { cls: 'faint', anchor: 'middle' });
    for (const I of [4, 8, 12]) Svg.note(g, x - 6, toY(I), String(I), { cls: 'faint', anchor: 'end' });
    Svg.note(g, x + w, y + h + 25, 'V [V]', { cls: 'faint', anchor: 'end' });
    Svg.note(g, x + 6, y - 8, 'I [A]', { cls: 'faint' });
    const endV = Math.min(maxV, maxI * r.R);
    Svg.polyline(g, [[toX(0), toY(0)], [toX(endV), toY(endV / r.R)]], 'q-active');
    Svg.note(g, toX(endV) - 4, toY(endV / r.R) - 10, '傾き 1/R', { cls: 'faint', anchor: 'end' });
    Svg.guide(g, toX(r.V), toY(r.I), toX(r.V), y + h, 'q-voltage');
    Svg.guide(g, x, toY(r.I), toX(r.V), toY(r.I), 'q-current');
    Svg.el(g, 'circle', { cx: toX(r.V), cy: toY(r.I), r: 5, class: 'dot ink' });
  }

  function drawFlow(g, p, r, time) {
    Svg.flowDots(g, loopPath(), time * DOT_SPEED * r.I);
  }

  global.TopicOhm = {
    id: 'ohm',
    title: '電圧・電流・抵抗とオームの法則',
    lead: '電流は、電圧に比例して、抵抗に反比例する。電験のほとんどの計算はここから始まる。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'V', name: '電池の電圧', symbol: 'V', unit: 'V', min: 1, max: 24, step: 1, value: 12 },
      { key: 'R', name: '抵抗', symbol: 'R', unit: 'Ω', min: 2, max: 24, step: 1, value: 6 },
    ],
    presets: [],
    compute,
    draw,
    motion: { draw: drawFlow },
    caption(p, r) {
      return `${Notation.html('I')} = ${Notation.html('V')} ÷ ${Notation.html('R')} = ${Notation.number(r.V, 0)} ÷ ${Notation.number(r.R, 0)} = ${Notation.number(r.I, 2)} A。電圧が大きいほど、抵抗が小さいほど、電流は大きい。`;
    },
    readouts: (p, r) => [
      { name: '電流', symbol: 'I', value: Notation.number(r.I, 2), unit: 'A', cls: 'q-current' },
      { name: '電圧', symbol: 'V', value: Notation.number(r.V, 0), unit: 'V', cls: 'q-voltage' },
      { name: '抵抗', symbol: 'R', value: Notation.number(r.R, 0), unit: 'Ω', cls: 'q-active' },
      { name: '流れやすさ', symbol: 'G', value: Notation.number(r.G, 3), unit: 'S' },
    ],
    // ミッション：つまみを動かして目標に合わせる（答えがつまみの目盛りに乗る数だけを出す）
    missions: [
      {
        free: 'R',
        cases: [[12, 1], [12, 2], [12, 3], [12, 4], [12, 6], [6, 1], [6, 2], [6, 3], [18, 2], [18, 3], [18, 6], [24, 2], [24, 3], [24, 4], [24, 6], [24, 8]].map(([V, I]) => ({ V, I })),
        setup: ({ V }) => ({ V }),
        answer: ({ V, I }) => V / I,
        text: ({ I }) => `電流をちょうど ${I} A にしよう`,
        how: ({ V }) => `電圧は ${V} V のまま。抵抗 <var>R</var> を動かす`,
        now: (r) => `いま ${Notation.number(r.I, 2)} A`,
        hit: (r, { I }) => Math.abs(r.I - I) < 1e-9,
        reason: ({ V, I }) => `<var>I</var> = <var>V</var> ÷ <var>R</var> = ${V} ÷ ${V / I} = ${I} A。電流を増やすには抵抗を小さくする。`,
      },
      {
        free: 'V',
        cases: [[2, 3], [2, 5], [3, 2], [3, 4], [3, 7], [4, 2], [4, 5], [6, 2], [6, 4], [8, 3]].map(([R, I]) => ({ R, I })),
        setup: ({ R }) => ({ R }),
        answer: ({ R, I }) => R * I,
        text: ({ I }) => `電流をちょうど ${I} A にしよう`,
        how: ({ R }) => `抵抗は ${R} Ω のまま。電池の電圧 <var>V</var> を動かす`,
        now: (r) => `いま ${Notation.number(r.I, 2)} A`,
        hit: (r, { I }) => Math.abs(r.I - I) < 1e-9,
        reason: ({ R, I }) => `<var>V</var> = <var>RI</var> = ${R} × ${I} = ${R * I} V にすると、<var>I</var> = ${I} A になる。`,
      },
    ],
    terms: [
      ['電圧 <var>V</var>', '電気を押し流す力。水にたとえると水位の差（高い所から低い所へ流れる）。単位は V（ボルト）。'],
      ['電流 <var>I</var>', '電気の流れの量。水にたとえると、1秒間に流れる水の量。単位は A（アンペア）。電池の＋から出て −へ戻る向きを電流の向きとする。'],
      ['抵抗 <var>R</var>', '電流の流れにくさ。水にたとえると細い管。単位は Ω（オーム）。'],
      ['回路', '電池などの電源から出て、また戻ってくる電気の通り道。どこかが切れていると電流は流れない。'],
      ['コンダクタンス <var>G</var>', '電流の流れやすさ。抵抗の逆数 <var>G</var> = 1/<var>R</var>。単位は S（ジーメンス）。'],
    ],
    tries: [
      { text: '電圧 <var>V</var> を 12 V → 24 V（2倍）にすると、電流 <var>I</var> は？', choices: ['半分', 'そのまま', '2倍', '4倍'], answer: 2, set: { V: 24 }, look: '電流が 2 A → 4 A と2倍になり、赤い点も2倍の速さで流れる。グラフの点は同じ直線の上を右上へ動く。' },
      { text: '抵抗 <var>R</var> を 6 Ω → 12 Ω（2倍）にすると、電流 <var>I</var> は？', choices: ['半分', 'そのまま', '2倍'], answer: 0, set: { R: 12 }, look: '電流は 2 A → 1 A と半分になり、点の流れもゆっくりになる。グラフの直線がねる（傾き 1/<var>R</var> が小さくなる）。' },
      { text: '<var>V</var> と <var>R</var> を両方2倍（24 V・12 Ω）にすると、電流 <var>I</var> は？', choices: ['半分', 'そのまま', '2倍', '4倍'], answer: 1, set: { V: 24, R: 12 }, look: '電流は 2 A のまま。<var>I</var> = <var>V</var>/<var>R</var> なので、<var>V</var> と <var>R</var> が同じ倍率なら <var>I</var> は変わらない。' },
    ],
    quiz: [
      { q: '12 V の電池に 4 Ω の抵抗をつなぐと、流れる電流は？', choices: ['0.33 A', '3 A', '16 A', '48 A'], answer: 1, why: '<var>I</var> = <var>V</var>/<var>R</var> = 12 ÷ 4 = 3 A。' },
      { q: '抵抗が同じまま電圧を3倍にすると、電流は？', choices: ['3分の1になる', '変わらない', '3倍になる', '9倍になる'], answer: 2, why: '<var>R</var> が同じなら、<var>I</var> = <var>V</var>/<var>R</var> は <var>V</var> に比例する。' },
      { q: '5 Ω の抵抗に 2 A の電流が流れている。抵抗の両端の電圧は？', choices: ['0.4 V', '2.5 V', '7 V', '10 V'], answer: 3, why: '式を変形して <var>V</var> = <var>RI</var> = 5 × 2 = 10 V。' },
    ],
    exam: {
      lead: 'オームの法則だけを問う問題は少ない。でも理論の直流回路（過去12回で約35問）も交流回路（約40問）も、計算はほぼこの式から始まる。',
      often: ['求めたいものに合わせて、$I$ = $V$ ÷ $R$、$V$ = $RI$、$R$ = $V$ ÷ $I$ と変形して使う。'],
      traps: [
        '単位をそろえる。mA（ミリアンペア）は 1/1000 A、kΩ（キロオーム）は 1000 Ω。',
        '抵抗が大きいほど電流は小さい（比例ではなく反比例）。',
      ],
    },
    conditions: '電池の中の抵抗と、導線の抵抗は 0 とする',
    explain: {
      points: [
        '電流は、電圧に比例し、抵抗に反比例する（オームの法則）。',
        '電圧を2倍にすると、電流も2倍になる。',
        '抵抗を2倍にすると、電流は半分になる。',
      ],
      look: [
        ['dots', 'q-current', '赤い点＝電流の流れ。速いほど電流が大きい。'],
        ['arrow', 'q-current', '赤い矢印と $I$＝回路を流れる電流の値。'],
        ['text', 'q-voltage', '青い字 $V$＝電池の電圧。緑の字 $R$＝抵抗。'],
        ['line', 'q-active', '緑の直線（下のグラフ）＝電圧と電流の関係。傾きは 1/$R$ で、抵抗が小さいほど急になる。'],
      ],
      formulas: [
        ['I = V ÷ R', '電流は、電圧を抵抗で割った値。', '電流を求める時'],
        ['V = RI', '電圧は、抵抗と電流のかけ算。', '抵抗にかかる電圧を求める時'],
        ['R = V ÷ I', '抵抗は、電圧を電流で割った値。', '抵抗を求める時'],
        ['G = 1 ÷ R', 'コンダクタンスは抵抗の逆数（流れやすさ）。', '並列の計算を楽にする時'],
      ],
      symbols: [['V', '電圧', 'V'], ['I', '電流', 'A'], ['R', '抵抗', 'Ω'], ['G', 'コンダクタンス（流れやすさ）', 'S']],
    },
  };
})(this);
