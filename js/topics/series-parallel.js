// 理論：直列と並列（合成抵抗・分圧・分流）。同じ2本の抵抗を、左は直列・右は並列にして見比べる
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const SERIES = { left: 28, right: 158, top: 50, bottom: 134 };
  const PARALLEL = { left: 202, branch: 267, right: 332, top: 50, bottom: 134 };
  const MID_Y = 92;
  const DOT_SPEED = 10; // 電流 1 A あたり、点が1秒に進む長さ

  function compute(p) {
    return DcCircuit.seriesAndParallel({ V: p.V, R1: p.R1, R2: p.R2 });
  }

  function seriesPath() {
    const { left, right, top, bottom } = SERIES;
    return [[left, MID_Y], [left, top], [right, top], [right, bottom], [left, bottom], [left, MID_Y]];
  }

  // 並列は、電流の大きさがちがう区間ごとに分ける
  function parallelPaths() {
    const { left, branch, right, top, bottom } = PARALLEL;
    return {
      out: [[left, MID_Y], [left, top], [branch, top]],
      branch1: [[branch, top], [branch, bottom]],
      branch2: [[branch, top], [right, top], [right, bottom], [branch, bottom]],
      back: [[branch, bottom], [left, bottom], [left, MID_Y]],
    };
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');

    // 直列：R1 を上の導線、R2 を右の導線に
    Svg.note(g, (SERIES.left + SERIES.right) / 2, 20, '直列', { cls: 'value', anchor: 'middle' });
    Svg.wire(g, seriesPath());
    Svg.battery(g, SERIES.left, MID_Y);
    Svg.resistor(g, (SERIES.left + SERIES.right) / 2, SERIES.top);
    Svg.resistor(g, SERIES.right, MID_Y, { vertical: true });
    Svg.label(g, (SERIES.left + SERIES.right) / 2, SERIES.top + 20, 'R_1', { cls: 'q-active', size: 13 });
    Svg.label(g, SERIES.right - 14, MID_Y, 'R_2', { cls: 'q-active', anchor: 'end', size: 13 });
    Svg.note(g, (SERIES.left + SERIES.right) / 2, 154, `合成 ${Notation.number(r.series.R, 1)} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, (SERIES.left + SERIES.right) / 2, 170, `電流 ${Notation.number(r.series.I, 2)} A`, { cls: 'value q-current', anchor: 'middle' });

    // 並列：R1 と R2 を枝分かれに
    const paths = parallelPaths();
    Svg.note(g, (PARALLEL.left + PARALLEL.right) / 2, 20, '並列', { cls: 'value', anchor: 'middle' });
    for (const path of Object.values(paths)) Svg.wire(g, path);
    Svg.battery(g, PARALLEL.left, MID_Y);
    Svg.resistor(g, PARALLEL.branch, MID_Y, { vertical: true });
    Svg.resistor(g, PARALLEL.right, MID_Y, { vertical: true });
    Svg.label(g, PARALLEL.branch - 14, MID_Y, 'R_1', { cls: 'q-active', anchor: 'end', size: 13 });
    Svg.label(g, PARALLEL.right - 14, MID_Y, 'R_2', { cls: 'q-active', anchor: 'end', size: 13 });
    Svg.note(g, (PARALLEL.left + PARALLEL.right) / 2, 154, `合成 ${Notation.number(r.parallel.R, 1)} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, (PARALLEL.left + PARALLEL.right) / 2, 170, `電流 ${Notation.number(r.parallel.I, 2)} A`, { cls: 'value q-current', anchor: 'middle' });

    // 分かれ方：直列は電圧が R1 : R2 に、並列は電流が R2 : R1（抵抗の小さい方に多く）に分かれる
    const barY = 212;
    const seriesWidth = SERIES.right - SERIES.left;
    Svg.note(g, SERIES.left, barY - 14, `電圧 ${Notation.number(p.V, 0)} V の分かれ方`, { cls: 'faint' });
    Svg.splitBar(g, SERIES.left, barY, seriesWidth, 22, [
      { value: r.series.V1, label: '', cls: 'q-voltage' },
      { value: r.series.V2, label: '', cls: 'q-voltage alt' },
    ]);
    Svg.note(g, SERIES.left, barY + 36, `R₁ ${Notation.number(r.series.V1, 1)} V`, { cls: 'value q-voltage' });
    Svg.note(g, SERIES.right, barY + 36, `R₂ ${Notation.number(r.series.V2, 1)} V`, { cls: 'value q-voltage', anchor: 'end' });

    const parallelWidth = PARALLEL.right - PARALLEL.left;
    Svg.note(g, PARALLEL.left, barY - 14, '電流の分かれ方', { cls: 'faint' });
    Svg.splitBar(g, PARALLEL.left, barY, parallelWidth, 22, [
      { value: r.parallel.I1, label: '', cls: 'q-current' },
      { value: r.parallel.I2, label: '', cls: 'q-current alt' },
    ]);
    Svg.note(g, PARALLEL.left, barY + 36, `R₁ ${Notation.number(r.parallel.I1, 2)} A`, { cls: 'value q-current' });
    Svg.note(g, PARALLEL.right, barY + 36, `R₂ ${Notation.number(r.parallel.I2, 2)} A`, { cls: 'value q-current', anchor: 'end' });
  }

  function drawFlow(g, p, r, time) {
    const move = time * DOT_SPEED;
    Svg.flowDots(g, seriesPath(), move * r.series.I);
    const paths = parallelPaths();
    Svg.flowDots(g, paths.out, move * r.parallel.I);
    Svg.flowDots(g, paths.branch1, move * r.parallel.I1);
    Svg.flowDots(g, paths.branch2, move * r.parallel.I2);
    Svg.flowDots(g, paths.back, move * r.parallel.I);
  }

  global.TopicSeriesParallel = {
    id: 'series-parallel',
    title: '直列と並列',
    lead: '直列は電流が共通で電圧が分かれる。並列は電圧が共通で電流が分かれる。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'V', name: '電池の電圧', symbol: 'V', unit: 'V', min: 1, max: 24, step: 1, value: 12 },
      { key: 'R1', name: '抵抗', symbol: 'R_1', unit: 'Ω', min: 2, max: 30, step: 1, value: 4 },
      { key: 'R2', name: '抵抗', symbol: 'R_2', unit: 'Ω', min: 2, max: 30, step: 1, value: 12 },
    ],
    presets: [],
    compute,
    draw,
    motion: { draw: drawFlow },
    caption(p, r) {
      const smaller = Math.min(p.R1, p.R2);
      return `並列の合成 ${Notation.number(r.parallel.R, 1)} Ω は、小さい方の ${Notation.number(smaller, 0)} Ω よりさらに小さい（通り道が増えるから）。`;
    },
    readouts: (p, r) => [
      { name: '直列の合成抵抗', symbol: 'R', value: Notation.number(r.series.R, 1), unit: 'Ω', cls: 'q-active' },
      { name: '直列の電流', symbol: 'I', value: Notation.number(r.series.I, 2), unit: 'A', cls: 'q-current' },
      { name: '並列の合成抵抗', symbol: 'R', value: Notation.number(r.parallel.R, 1), unit: 'Ω', cls: 'q-active' },
      { name: '並列の電流', symbol: 'I', value: Notation.number(r.parallel.I, 2), unit: 'A', cls: 'q-current' },
    ],
    terms: [
      ['直列', '抵抗を1列につなぐこと。電流の通り道は1本なので、どの抵抗にも同じ電流が流れる。'],
      ['並列', '抵抗を枝分かれさせてつなぐこと。どの枝にも電池の電圧がそのままかかる。'],
      ['合成抵抗', 'いくつかの抵抗を、同じはたらきをする1本の抵抗に置きかえた値。'],
      ['分圧', '直列の抵抗に、電池の電圧が抵抗の大きさの比で分かれること。'],
      ['分流', '並列の枝に、電流が分かれて流れること。抵抗が小さい枝ほど多く流れる。'],
      ['断線', '抵抗や導線が切れて、電流が通れなくなること。直列ではどこが切れても全体が止まり、並列では切れた枝だけが止まる。'],
    ],
    tries: [
      { text: '<var>R</var><sub>1</sub> と <var>R</var><sub>2</sub> を両方 10 Ω にすると、並列の合成抵抗は？', choices: ['5 Ω', '10 Ω', '20 Ω'], answer: 0, set: { R1: 10, R2: 10 }, look: '直列の合成は 20 Ω（足し算）、並列の合成は 5 Ω（半分）。電圧・電流はちょうど半分ずつに分かれる。' },
      { text: '<var>R</var><sub>1</sub> = 6 Ω、<var>R</var><sub>2</sub> = 18 Ω にすると、直列の <var>R</var><sub>1</sub> にかかる電圧は？（電池は 12 V）', choices: ['3 V', '6 V', '9 V'], answer: 0, set: { R1: 6, R2: 18 }, look: '直列の電圧は抵抗の比 6 : 18 = 1 : 3 で、12 V が 3 V と 9 V に分かれる。並列の電流は逆に 3 : 1（2 A と 0.67 A）。' },
      { text: '<var>R</var><sub>2</sub> を 30 Ω にすると（<var>R</var><sub>1</sub> は 4 Ω のまま）、並列の合成抵抗は？', choices: ['4 Ω より小さい', '4 Ω と 30 Ω の間', '30 Ω より大きい'], answer: 0, set: { R2: 30 }, look: '並列の合成は約 3.5 Ω で、小さい方の 4 Ω に近づく。電流はほとんど <var>R</var><sub>1</sub> の枝を流れる（3 A と 0.4 A）。' },
    ],
    quiz: [
      { q: '10 Ω と 10 Ω を並列につないだ合成抵抗は？', choices: ['5 Ω', '10 Ω', '20 Ω', '100 Ω'], answer: 0, why: '同じ抵抗2本の並列は半分。和分の積で (10 × 10)/(10 + 10) = 5 Ω。' },
      { q: '4 Ω と 6 Ω を直列にして 20 V をかけた。4 Ω の抵抗にかかる電圧は？', choices: ['4 V', '8 V', '10 V', '12 V'], answer: 1, why: '合成 10 Ω で電流 2 A。4 Ω には 4 × 2 = 8 V（電圧は 4 : 6 に分かれる）。' },
      { q: '3 Ω と 6 Ω の並列の合成抵抗は？', choices: ['2 Ω', '4.5 Ω', '9 Ω', '18 Ω'], answer: 0, why: '和分の積：(3 × 6)/(3 + 6) = 18/9 = 2 Ω。並列の合成は、小さい方の 3 Ω より必ず小さくなる。' },
    ],
    exam: {
      lead: '抵抗の合成・分圧・分流を使う直流回路の計算は、理論で約35問（過去12回）。ブリッジ回路やキルヒホッフの法則の問題も、まずここで回路を簡単にしてから解く。',
      often: [
        '並列2本は「和分の積」。3本以上は 1/$R$ = 1/$R_1$ + 1/$R_2$ + 1/$R_3$。',
        '直列の部分と並列の部分に分け、内側から1つずつまとめていく。',
      ],
      traps: [
        '並列の合成抵抗は、いちばん小さい抵抗より必ず小さい。大きくなったら計算ミス（検算に使える）。',
        '分流の式は、自分ではなく「相手」の抵抗が分子に来る。',
      ],
    },
    conditions: '電池の中の抵抗と、導線の抵抗は 0 とする',
    explain: {
      points: [
        '直列は、電流がどこも同じで、電圧が分かれる。',
        '並列は、電圧がどこも同じで、電流が分かれる。',
        '直列の合成抵抗は足し算。並列の合成抵抗は、いちばん小さい抵抗より小さい。',
      ],
      look: [
        ['dots', 'q-current', '赤い点＝電流の流れ。並列では、抵抗の小さい枝ほど速く流れる。'],
        ['text', 'q-active', '緑の字＝合成抵抗。赤い字＝全体の電流。'],
        ['bar', 'q-voltage', '青い帯＝直列で、電池の電圧が $R_1$ : $R_2$ に分かれるようす。'],
        ['bar', 'q-current', '赤い帯＝並列で、電流が分かれるようす（抵抗の小さい方に多く）。'],
      ],
      formulas: [
        ['R = R_1 + R_2', '直列の合成抵抗は足し算。', '直列の全体の抵抗を求める時'],
        ['R = R_{1}R_{2} ÷ (R_1 + R_2)', '並列2本は「和分の積」。', '並列の全体の抵抗を求める時'],
        ['V_1 = R_1 ÷ (R_1 + R_2) × V', '直列の電圧は、抵抗の比で分かれる（分圧）。', '1本にかかる電圧を求める時'],
        ['I_1 = R_2 ÷ (R_1 + R_2) × I', '並列の電流は、相手の抵抗の比で分かれる（分流）。', '1本の枝の電流を求める時'],
      ],
      symbols: [
        ['R', '合成抵抗', 'Ω'],
        ['R_1・R_2', 'それぞれの抵抗', 'Ω'],
        ['V', '電池の電圧', 'V'],
        ['V_1', '$R_1$ にかかる電圧', 'V'],
        ['I', '全体の電流', 'A'],
        ['I_1', '$R_1$ の枝の電流', 'A'],
      ],
    },
  };
})(this);
