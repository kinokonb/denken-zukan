// 理論：R・L・C それぞれの交流。同じ交流電圧を抵抗・コイル・コンデンサに別々にかけ、電流の大きさと位相（同相・遅れ・進み）、
// リアクタンスの周波数による変わり方を並べて見る
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const R = 50; // Ω
  const L = 0.5 / Math.PI; // H（500/π mH：X_L = f [Ω]）
  const C = 1 / (5000 * Math.PI); // F（200/π μF：X_C = 2500 ÷ f [Ω]）
  const PANELS = [
    { x: 62, key: 'R', name: '抵抗 R', phase: 0, word: '同相' },
    { x: 180, key: 'L', name: 'コイル L', phase: -90, word: '電流は 90° 遅れ' },
    { x: 298, key: 'C', name: 'コンデンサ C', phase: 90, word: '電流は 90° 進み' },
  ];
  const CIRCLE = { y: 66, r: 32 };
  const GRAPH = { left: 44, right: 340, top: 190, bottom: 250, fMax: 200, xMax: 150 };
  const TURN_SECONDS = 3;

  function compute(p) {
    const XL = RlcCircuit.inductiveReactance(p.f, L);
    const XC = RlcCircuit.capacitiveReactance(p.f, C);
    return { XL, XC, IR: p.V / R, IL: p.V / XL, IC: p.V / XC };
  }

  const fixed = (value, digits = 2) => Notation.number(value, digits);
  const currentOf = (r, key) => ({ R: r.IR, L: r.IL, C: r.IC })[key];
  const ohmOf = (r, key) => ({ R, L: r.XL, C: r.XC })[key];

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    for (const panel of PANELS) {
      const { x } = panel;
      Svg.note(g, x, 18, panel.name, { cls: 'value', anchor: 'middle' });
      Svg.el(g, 'circle', { cx: x, cy: CIRCLE.y, r: CIRCLE.r, class: 'stator' });
      Svg.wire(g, [[x - 26, 118], [x + 26, 118]]);
      if (panel.key === 'R') Svg.resistor(g, x, 118);
      else if (panel.key === 'L') Svg.coil(g, x, 118);
      else Svg.capacitor(g, x, 118);
      if (panel.key === 'R') {
        Svg.note(g, x, 140, `R ${R} Ω`, { cls: 'value q-active', anchor: 'middle' });
      } else {
        Svg.label(g, x - 16, 140, panel.key === 'L' ? 'X_L' : 'X_C', { cls: 'q-reactive', anchor: 'end', size: 13 });
        Svg.note(g, x - 12, 140, `${fixed(ohmOf(r, panel.key), 1)} Ω`, { cls: 'value q-reactive' });
      }
      Svg.note(g, x, 156, `I ${fixed(currentOf(r, panel.key))} A`, { cls: 'value q-current', anchor: 'middle' });
      Svg.note(g, x, 172, panel.word, { cls: 'faint', anchor: 'middle' });
    }
    // 周波数とリアクタンス
    const { left, right, top, bottom, fMax, xMax } = GRAPH;
    const toX = (f) => left + (f / fMax) * (right - left);
    const toY = (ohm) => bottom - (Math.min(ohm, xMax) / xMax) * (bottom - top);
    Svg.guide(g, left, bottom, right, bottom, 'axis');
    Svg.guide(g, left, top - 4, left, bottom, 'axis');
    Svg.note(g, right, bottom + 12, '周波数 f [Hz]', { cls: 'faint', anchor: 'end' });
    Svg.note(g, left - 4, top, 'Ω', { cls: 'faint', anchor: 'end' });
    Svg.polyline(g, [[toX(0), toY(R)], [toX(fMax), toY(R)]], 'q-active');
    const xl = [];
    const xc = [];
    for (let f = 2; f <= fMax; f += 2) {
      xl.push([toX(f), toY(RlcCircuit.inductiveReactance(f, L))]);
      xc.push([toX(f), toY(RlcCircuit.capacitiveReactance(f, C))]);
    }
    Svg.polyline(g, xl, 'q-reactive');
    Svg.polyline(g, xc, 'q-reactive dashed');
    Svg.note(g, right - 2, toY(R) - 6, 'R', { cls: 'value q-active', anchor: 'end' });
    Svg.label(g, toX(136), toY(136) - 10, 'X_L', { cls: 'q-reactive', anchor: 'end', size: 13 });
    Svg.label(g, toX(30), toY(RlcCircuit.capacitiveReactance(30, C)) - 2, 'X_C', { cls: 'q-reactive', anchor: 'start', size: 13 });
    Svg.guide(g, toX(p.f), top - 4, toX(p.f), bottom);
  }

  // 回る矢印：電圧（青）と電流（赤）。電流の長さは3つの中でいちばん大きい電流をそろえる
  function drawTurning(g, p, r, time) {
    const turn = (2 * Math.PI * time) / TURN_SECONDS;
    const most = Math.max(r.IR, r.IL, r.IC);
    for (const panel of PANELS) {
      const { x } = panel;
      const y = CIRCLE.y;
      const length = CIRCLE.r * 0.95;
      const current = (currentOf(r, panel.key) / most) * length;
      const a = turn;
      const b = turn + (panel.phase * Math.PI) / 180;
      Svg.arrow(g, x, y, x + length * Math.cos(a), y - length * Math.sin(a), { cls: 'q-voltage', width: 2.2 });
      Svg.arrow(g, x, y, x + current * Math.cos(b), y - current * Math.sin(b), { cls: 'q-current', width: 2.2 });
    }
  }

  global.TopicRlcElements = {
    id: 'rlc-elements',
    title: 'R・L・C それぞれの交流',
    lead: '抵抗は電圧と同じ向き、コイルの電流は 90° 遅れ、コンデンサの電流は 90° 進む。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'V', name: '電圧の実効値', symbol: 'V', unit: 'V', min: 10, max: 200, step: 10, value: 100 },
      { key: 'f', name: '周波数', symbol: 'f', unit: 'Hz', min: 10, max: 200, step: 10, value: 50 },
    ],
    presets: [
      { name: '50 Hz', apply: () => ({ f: 50 }) },
      { name: '100 Hz', apply: () => ({ f: 100 }) },
    ],
    compute,
    draw,
    motion: { draw: drawTurning },
    caption(p, r) {
      return `${p.f} Hz：X<sub>L</sub> ${fixed(r.XL, 1)} Ω、X<sub>C</sub> ${fixed(r.XC, 1)} Ω。高い周波数ほど L は流れにくく C は流れやすい。`;
    },
    readouts: (p, r) => [
      { name: '抵抗の電流', symbol: 'I_R', value: fixed(r.IR), unit: 'A', cls: 'q-current' },
      { name: 'コイルの電流', symbol: 'I_L', value: fixed(r.IL), unit: 'A', cls: 'q-current' },
      { name: 'コンデンサの電流', symbol: 'I_C', value: fixed(r.IC), unit: 'A', cls: 'q-current' },
      { name: 'リアクタンス', symbol: 'X_L', value: fixed(r.XL, 1), unit: 'Ω', cls: 'q-reactive' },
    ],
    terms: [
      ['リアクタンス <var>X</var>', 'コイル・コンデンサの、交流の流れにくさ。単位は Ω。周波数で変わる。'],
      ['誘導性（コイル）', '<var>X</var><sub>L</sub> = 2π<var>fL</var>。周波数が高いほど流れにくい。電流は電圧より 90° 遅れる。'],
      ['容量性（コンデンサ）', '<var>X</var><sub>C</sub> = 1 ÷ (2π<var>fC</var>)。周波数が高いほど流れやすい。電流は 90° 進む。'],
      ['同相', '電圧と電流の山が同時に来ること（抵抗）。'],
      ['H・μF', 'インダクタンスの単位ヘンリー、静電容量の単位マイクロファラド（1 μF = 10⁻⁶ F）。'],
    ],
    tries: [
      { text: '周波数を 50 → 100 Hz にすると、コイルの電流は？', choices: ['半分', 'そのまま', '2倍'], answer: 0, set: { f: 100 }, look: '<var>X</var><sub>L</sub> が 50 → 100 Ω と2倍になり、電流は 2 → 1 A と半分。' },
      { text: '同じく 100 Hz で、コンデンサの電流は？', choices: ['半分', 'そのまま', '2倍'], answer: 2, set: { f: 100 }, look: '<var>X</var><sub>C</sub> が 50 → 25 Ω と半分になり、電流は 2 → 4 A と2倍。' },
      { text: '周波数を 50 → 20 Hz にすると、抵抗の電流は？', choices: ['減る', 'そのまま', '増える'], answer: 1, set: { f: 20 }, look: '抵抗は周波数によらず 50 Ω で、電流は 2 A のまま。コイルは 5 A に増え、コンデンサは 0.8 A に減る。' },
    ],
    quiz: [
      { q: 'コイルだけの回路で、電流は電圧にくらべて？', choices: ['同相', '90° 進み', '90° 遅れ', '180° ずれ'], answer: 2, why: 'コイルは電流の変化をじゃまするので、電流は電圧より 90° 遅れる。' },
      { q: '<var>L</var> = 100/π mH のコイルの、50 Hz でのリアクタンスは？', choices: ['5 Ω', '10 Ω', '31.4 Ω', '100 Ω'], answer: 1, why: '2π × 50 × (0.1 ÷ π) = 10 Ω。' },
      { q: 'コンデンサの周波数を2倍にすると、<var>X</var><sub>C</sub> は？', choices: ['2倍', '半分', '4倍', '変わらない'], answer: 1, why: '<var>X</var><sub>C</sub> = 1 ÷ (2π<var>fC</var>) は周波数に反比例。' },
    ],
    exam: {
      lead: '交流回路の基本。コイルとコンデンサの電流の位相（遅れ・進み）と、リアクタンスの周波数特性は、RLC 回路・共振・力率改善の問題の前提になる。',
      often: [
        '$X_L$ = 2π$f$$L$（周波数に比例）、$X_C$ = 1 ÷ (2π$f$$C$)（周波数に反比例）。',
        'コイルの電流は電圧より 90° 遅れ、コンデンサの電流は 90° 進む。',
      ],
      traps: [
        'μF は 10⁻⁶ F、mH は 10⁻³ H。$X_C$ の計算で桁を落とさない。',
        '直流（$f$ = 0）では、コイルは導線と同じ（$X_L$ = 0）、コンデンサは電流を通さない。',
      ],
    },
    conditions: `<var>R</var> = ${R} Ω、<var>L</var> = 500/π mH（<var>X</var><sub>L</sub> = <var>f</var> Ω）、<var>C</var> = 200/π μF（<var>X</var><sub>C</sub> = 2500 ÷ <var>f</var> Ω）に、同じ電圧を別々にかける`,
    explain: {
      points: [
        '抵抗の電流は電圧と同相。コイルの電流は 90° 遅れ、コンデンサの電流は 90° 進む。',
        'コイルのリアクタンス $X_L$ = 2π$f$$L$ は周波数に比例し、高い周波数ほど流れにくい。',
        'コンデンサのリアクタンス $X_C$ = 1 ÷ (2π$f$$C$) は反比例し、高い周波数ほど流れやすい。',
      ],
      look: [
        ['arrow', 'q-voltage', '青い矢印＝電圧。3つとも同じ大きさで回る。'],
        ['arrow', 'q-current', '赤い矢印＝電流。抵抗は重なり、コイルは 90° 後ろ、コンデンサは 90° 前を回る。'],
        ['curve', 'q-reactive', '下のグラフ＝周波数とリアクタンス。実線が $X_L$（右上がり）、点線が $X_C$（右下がり）、緑が $R$（一定）。縦線がいまの周波数。'],
      ],
      formulas: [
        ['X_L = 2πfL', 'コイルのリアクタンス（周波数に比例）。', 'コイルの流れにくさを求める時'],
        ['X_C = 1 ÷ 2πfC', 'コンデンサのリアクタンス（周波数に反比例）。', 'コンデンサの流れにくさを求める時'],
        ['I = V ÷ X', 'リアクタンスでも電流は電圧 ÷ 流れにくさ（位相は ±90°）。', '電流の大きさを求める時'],
      ],
      symbols: [
        ['X_L・X_C', 'コイル・コンデンサのリアクタンス', 'Ω'],
        ['L', 'インダクタンス', 'H'],
        ['C', '静電容量', 'F'],
        ['f', '周波数', 'Hz'],
      ],
    },
  };
})(this);
