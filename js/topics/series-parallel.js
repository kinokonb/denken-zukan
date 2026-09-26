// 理論：直列と並列（合成抵抗・分圧・分流）。同じ2本の抵抗を、左は直列・右は並列にして見比べる
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const SERIES = { left: 28, right: 158, top: 50, bottom: 134 };
  const PARALLEL = { left: 202, branch: 267, right: 332, top: 50, bottom: 134 };
  const MID_Y = 92;
  const DOT_SPEED = 10; // 電流 1 A あたり、点が1秒に進む長さ

  // 故障探しでタップできる抵抗。x・y は抵抗の中心
  const TARGETS = [
    { id: 'series-R1', x: (SERIES.left + SERIES.right) / 2, y: SERIES.top, vertical: false },
    { id: 'series-R2', x: SERIES.right, y: MID_Y, vertical: true },
    { id: 'parallel-R1', x: PARALLEL.branch, y: MID_Y, vertical: true },
    { id: 'parallel-R2', x: PARALLEL.right, y: MID_Y, vertical: true },
  ];

  // fault（故障探しの時だけ）：{ open: 'parallel-R1' など切れた抵抗, revealed: 答え合わせ後か, marks: { タップした所: 'hit' | 'miss' } }
  function compute(p, fault) {
    const open = {};
    if (fault) {
      const [circuit, part] = fault.open.split('-');
      open[circuit] = part;
    }
    return DcCircuit.seriesAndParallel({ V: p.V, R1: p.R1, R2: p.R2 }, open);
  }

  const resistorSymbol = (part) => Notation.html(part === 'R1' ? 'R_1' : 'R_2');
  const amperes = (value) => Notation.number(value, 2);

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

  // 故障探しの間は、合成抵抗と分かれ方を隠して電池のそばの電流計と部品の値だけを手がかりにし、抵抗をタップできるようにする。
  // 答え合わせの後は、切れた回路での分かれ方を見せ、タップしなかった所の枠を消す
  function draw(svg, p, r, fault) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    drawCircuits(g);
    if (fault) drawMeters(g, r);
    else drawTotals(g, r);
    if (!fault || fault.revealed) drawSplits(g, p, r);
    else Svg.note(g, WIDTH / 2, 212, `部品はどちらも 電池 ${p.V} V・R₁ ${p.R1} Ω・R₂ ${p.R2} Ω`, { cls: 'value', anchor: 'middle' });
    if (fault) {
      for (const target of TARGETS) {
        if (fault.revealed && !fault.marks[target.id]) continue;
        const [w, h] = target.vertical ? [44, 60] : [60, 40];
        Svg.tapTarget(g, { id: target.id, x: target.x, y: target.y, w, h, mark: fault.marks[target.id] });
      }
    }
  }

  function drawCircuits(g) {
    // 直列：R1 を上の導線、R2 を右の導線に
    Svg.note(g, (SERIES.left + SERIES.right) / 2, 20, '直列', { cls: 'value', anchor: 'middle' });
    Svg.wire(g, seriesPath());
    Svg.battery(g, SERIES.left, MID_Y);
    Svg.resistor(g, (SERIES.left + SERIES.right) / 2, SERIES.top);
    Svg.resistor(g, SERIES.right, MID_Y, { vertical: true });
    Svg.label(g, (SERIES.left + SERIES.right) / 2, SERIES.top + 20, 'R_1', { cls: 'q-active', size: 13 });
    Svg.label(g, SERIES.right - 14, MID_Y, 'R_2', { cls: 'q-active', anchor: 'end', size: 13 });

    // 並列：R1 と R2 を枝分かれに
    Svg.note(g, (PARALLEL.left + PARALLEL.right) / 2, 20, '並列', { cls: 'value', anchor: 'middle' });
    for (const path of Object.values(parallelPaths())) Svg.wire(g, path);
    Svg.battery(g, PARALLEL.left, MID_Y);
    Svg.resistor(g, PARALLEL.branch, MID_Y, { vertical: true });
    Svg.resistor(g, PARALLEL.right, MID_Y, { vertical: true });
    Svg.label(g, PARALLEL.branch - 14, MID_Y, 'R_1', { cls: 'q-active', anchor: 'end', size: 13 });
    Svg.label(g, PARALLEL.right - 14, MID_Y, 'R_2', { cls: 'q-active', anchor: 'end', size: 13 });
  }

  function drawTotals(g, r) {
    Svg.note(g, (SERIES.left + SERIES.right) / 2, 154, `合成 ${Notation.number(r.series.R, 1)} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, (SERIES.left + SERIES.right) / 2, 170, `電流 ${amperes(r.series.I)} A`, { cls: 'value q-current', anchor: 'middle' });
    Svg.note(g, (PARALLEL.left + PARALLEL.right) / 2, 154, `合成 ${Notation.number(r.parallel.R, 1)} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, (PARALLEL.left + PARALLEL.right) / 2, 170, `電流 ${amperes(r.parallel.I)} A`, { cls: 'value q-current', anchor: 'middle' });
  }

  // 電流計は、電池と枝分かれの間（全体の電流が通る所）に置く
  function drawMeters(g, r) {
    Svg.meter(g, (SERIES.left + SERIES.right) / 2, SERIES.bottom, 'A');
    Svg.meter(g, (PARALLEL.left + PARALLEL.branch) / 2, PARALLEL.bottom, 'A');
    Svg.note(g, (SERIES.left + SERIES.right) / 2, 160, `電流計 ${amperes(r.series.I)} A`, { cls: 'value q-current', anchor: 'middle' });
    Svg.note(g, (PARALLEL.left + PARALLEL.right) / 2, 160, `電流計 ${amperes(r.parallel.I)} A`, { cls: 'value q-current', anchor: 'middle' });
  }

  // 分かれ方：直列は電圧が R1 : R2 に、並列は電流が R2 : R1（抵抗の小さい方に多く）に分かれる
  function drawSplits(g, p, r) {
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

  // 故障探しの間は電流の点を出さない（電流計だけが手がかり）。答え合わせの後は、電流の流れない所に点を置かない
  function drawFlow(g, p, r, time, fault) {
    if (fault && !fault.revealed) return;
    const move = time * DOT_SPEED;
    const paths = parallelPaths();
    const flows = [
      [seriesPath(), r.series.I],
      [paths.out, r.parallel.I],
      [paths.branch1, r.parallel.I1],
      [paths.branch2, r.parallel.I2],
      [paths.back, r.parallel.I],
    ];
    for (const [path, current] of flows) {
      if (current > 0) Svg.flowDots(g, path, move * current);
    }
  }

  global.TopicSeriesParallel = {
    id: 'series-parallel',
    title: '直列と並列',
    lead: '直列は電流が共通で電圧が分かれる。並列は電圧が共通で電流が分かれる。',
    viewBox: [WIDTH, HEIGHT],
    targets: TARGETS.map((target) => target.id),
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
    // ミッション：つまみを動かして目標に合わせる（答えがつまみの目盛りに乗る数だけを出す）
    missions: [
      {
        free: 'R2',
        cases: [[6, 4], [12, 4], [10, 5], [4, 3], [20, 12], [6, 3], [30, 10], [12, 8], [15, 10], [8, 6]].map(([R1, Rp]) => ({ R1, Rp })),
        setup: ({ R1 }) => ({ V: 12, R1 }),
        answer: ({ R1, Rp }) => (R1 * Rp) / (R1 - Rp),
        text: ({ Rp }) => `並列の合成抵抗をちょうど ${Rp} Ω にしよう`,
        how: ({ R1 }) => `<var>R</var><sub>1</sub> は ${R1} Ω のまま。<var>R</var><sub>2</sub> を動かす`,
        now: (r) => `いま ${Notation.number(r.parallel.R, 2)} Ω`,
        hit: (r, { Rp }) => Math.abs(r.parallel.R - Rp) < 1e-9,
        reason: ({ R1, Rp }) => {
          const R2 = (R1 * Rp) / (R1 - Rp);
          return `和分の積 ${R1}×${R2}÷(${R1}+${R2}) = ${Rp} Ω。小さい方の ${Math.min(R1, R2)} Ω より小さい。`;
        },
      },
      {
        free: 'R2',
        cases: [[12, 4, 3], [12, 4, 4], [12, 4, 6], [12, 4, 8], [24, 6, 8], [24, 10, 12], [24, 6, 6], [12, 10, 4], [12, 6, 3]].map(([V, R1, V1]) => ({ V, R1, V1 })),
        setup: ({ V, R1 }) => ({ V, R1 }),
        answer: ({ V, R1, V1 }) => (R1 * (V - V1)) / V1,
        text: ({ V1 }) => `直列で <var>R</var><sub>1</sub> にかかる電圧をちょうど ${V1} V にしよう`,
        how: ({ V, R1 }) => `電池 ${V} V・<var>R</var><sub>1</sub> ${R1} Ω のまま。<var>R</var><sub>2</sub> を動かす`,
        now: (r) => `いま ${Notation.number(r.series.V1, 2)} V`,
        hit: (r, { V1 }) => Math.abs(r.series.V1 - V1) < 1e-9,
        reason: ({ V, R1, V1 }) => {
          const R2 = (R1 * (V - V1)) / V1;
          return `電圧は ${R1} : ${R2} に分かれ、<var>R</var><sub>1</sub> には ${V} V の ${R1}/${R1 + R2} = ${V1} V。`;
        },
      },
      {
        free: 'R1',
        cases: [[12, 12, 4], [12, 12, 3], [12, 12, 5], [12, 12, 7], [12, 6, 5], [12, 6, 3], [24, 24, 5], [24, 12, 4]].map(([V, R2, I]) => ({ V, R2, I })),
        setup: ({ V, R2 }) => ({ V, R2 }),
        answer: ({ V, R2, I }) => V / (I - V / R2),
        text: ({ I }) => `並列の全体の電流をちょうど ${I} A にしよう`,
        how: ({ V, R2 }) => `電池 ${V} V・<var>R</var><sub>2</sub> ${R2} Ω のまま。<var>R</var><sub>1</sub> を動かす`,
        now: (r) => `いま ${Notation.number(r.parallel.I, 2)} A`,
        hit: (r, { I }) => Math.abs(r.parallel.I - I) < 1e-9,
        reason: ({ V, R2, I }) => `<var>R</var><sub>2</sub> の枝 ${V}÷${R2} = ${V / R2} A、<var>R</var><sub>1</sub> の枝 ${V}÷${V / (I - V / R2)} = ${I - V / R2} A。合わせて ${I} A。`,
      },
      {
        // 故障探し：並列の抵抗が1本切れている。電流計の値から、どれが切れたかを当てる
        tap: true,
        cases: [[12, 4, 12], [12, 6, 3], [24, 8, 12], [20, 5, 20], [18, 6, 9], [12, 3, 4]]
          .flatMap(([V, R1, R2]) => ['R1', 'R2'].map((part) => ({ V, R1, R2, part }))),
        setup: ({ V, R1, R2 }) => ({ V, R1, R2 }),
        answer: ({ part }) => `parallel-${part}`,
        fault: (target) => ({ open: target }),
        text: () => '切れた抵抗を1本タップしよう',
        how: () => 'どれか1本だけ切れている',
        now: (r) => `電流計 直列 ${amperes(r.series.I)} A・並列 ${amperes(r.parallel.I)} A`,
        reason: ({ V, R1, R2, part }) => {
          const [other, R] = part === 'R1' ? ['R2', R2] : ['R1', R1];
          return `並列の ${resistorSymbol(part)} が切れていた。流れるのは ${resistorSymbol(other)} の枝だけで ${V}÷${R} = ${V / R} A。`;
        },
        // ちがう所をタップした時：「そこが切れていたら電流計はいくつのはずか」を見せる
        miss: ({ V, R1, R2 }, target, ifBroken, now) => {
          const [circuit, part] = target.split('-');
          if (circuit === 'series') {
            return `直列の ${resistorSymbol(part)} が切れたら、通り道がなくなり直列は 0 A のはず。いまは ${amperes(now.series.I)} A。`;
          }
          const [other, R] = part === 'R1' ? ['R2', R2] : ['R1', R1];
          return `並列の ${resistorSymbol(part)} が切れたら、${resistorSymbol(other)} の枝だけで ${V}÷${R} = ${ifBroken.parallel.I} A のはず。いまは ${amperes(now.parallel.I)} A。`;
        },
      },
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
    exam: `<p>抵抗の合成や分圧・分流を使う直流回路の計算は、理論で約35問（過去12回）。ブリッジ回路やキルヒホッフの法則の問題も、まずここで回路を簡単にしてから解く。</p>
      <ul>
        <li>並列2本は「和分の積」：${Notation.html('R_{1}R_{2}')} / (${Notation.html('R_1')} + ${Notation.html('R_2')})。3本以上は 1/${Notation.html('R')} = 1/${Notation.html('R_1')} + 1/${Notation.html('R_2')} + 1/${Notation.html('R_3')}。</li>
        <li>並列の合成抵抗は、いちばん小さい抵抗より必ず小さい。検算に使える。</li>
      </ul>`,
    conditions: '電池の中の抵抗と、導線の抵抗は 0 とする',
    notesHtml: `
      <h2>しくみ</h2>
      <p>直列では電流の通り道が1本なので、どの抵抗にも同じ電流が流れ、電池の電圧が抵抗の比で分かれる。抵抗をつなぐほど流れにくくなる（合成抵抗は足し算）。</p>
      <p>並列ではどの枝にも同じ電圧がかかり、電流が枝に分かれる。通り道が増えるので流れやすくなり、合成抵抗はどの枝の抵抗よりも小さくなる。</p>
      <h2>公式</h2>
      <ul class="formulas">
        <li>直列：${Notation.html('R')} = ${Notation.html('R_1')} + ${Notation.html('R_2')}</li>
        <li>並列：${Notation.html('R')} = ${Notation.html('R_{1}R_{2}')} / (${Notation.html('R_1')} + ${Notation.html('R_2')})</li>
        <li>分圧：${Notation.html('V_1')} = ${Notation.html('R_1')} / (${Notation.html('R_1')} + ${Notation.html('R_2')}) × ${Notation.html('V')}</li>
        <li>分流：${Notation.html('I_1')} = ${Notation.html('R_2')} / (${Notation.html('R_1')} + ${Notation.html('R_2')}) × ${Notation.html('I')}</li>
      </ul>
      <p class="symbols">${Notation.html('R')}：合成抵抗［Ω］、${Notation.html('R_1')}・${Notation.html('R_2')}：それぞれの抵抗［Ω］、${Notation.html('V')}：電池の電圧［V］、${Notation.html('V_1')}：${Notation.html('R_1')} にかかる電圧［V］、${Notation.html('I')}：全体の電流［A］、${Notation.html('I_1')}：${Notation.html('R_1')} の枝の電流［A］</p>`,
  };
})(this);
