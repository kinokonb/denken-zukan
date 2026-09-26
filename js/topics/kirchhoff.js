// 理論：キルヒホッフの法則。2つの電池と3本の抵抗の回路で、点A の電流（第1法則）と、1周の電圧（第2法則）を見る
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const C = { left: 40, mid: 180, right: 320, top: 58, bottom: 172, y: 115 };
  const DOT_SPEED = 12; // 電流 1 A あたり、点が1秒に進む長さ

  function compute(p) {
    return DcCircuit.twoSources({ E1: p.E1, E2: p.E2, R1: p.R1, R2: p.R2, R3: p.R3 });
  }

  const amps = (value) => Notation.number(value, 2);

  // 電流の点の通り道。I1・I2 は電池から点A へ向かう道と、下の導線を電池へ戻る道。I3 は点A から下へ
  function paths() {
    const { left, mid, right, top, bottom, y } = C;
    return {
      out1: [[left, y], [left, top], [mid, top]],
      back1: [[mid, bottom], [left, bottom], [left, y]],
      out2: [[right, y], [right, top], [mid, top]],
      back2: [[mid, bottom], [right, bottom], [right, y]],
      down: [[mid, top], [mid, bottom]],
    };
  }

  // 閉回路を1周まわる向きの印（丸い矢印と番号）
  function loopMark(g, cx, cy, text) {
    Svg.angleArc(g, cx, cy, 15, 0.6, 5.6, { cls: 'arc-angle' });
    const end = 5.6;
    const [ex, ey] = [cx + 15 * Math.cos(end), cy - 15 * Math.sin(end)];
    Svg.arrow(g, ex - 5, ey - 5, ex + 1, ey + 1, { cls: 'ink', width: 1.4 });
    Svg.note(g, cx, cy, text, { cls: 'faint', anchor: 'middle' });
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const { left, mid, right, top, bottom, y } = C;
    for (const path of Object.values(paths())) Svg.wire(g, path);
    Svg.battery(g, left, y);
    Svg.battery(g, right, y);
    Svg.note(g, left + 20, y + 20, `E₁ ${Notation.number(p.E1, 0)} V`, { cls: 'value q-voltage' });
    Svg.note(g, right - 20, y + 20, `E₂ ${Notation.number(p.E2, 0)} V`, { cls: 'value q-voltage', anchor: 'end' });
    Svg.resistor(g, 104, top);
    Svg.resistor(g, 256, top);
    Svg.resistor(g, mid, y, { vertical: true });
    Svg.note(g, 104, top - 16, `R₁ ${Notation.number(p.R1, 0)} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, 256, top - 16, `R₂ ${Notation.number(p.R2, 0)} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, mid + 14, y, `R₃ ${Notation.number(p.R3, 0)} Ω`, { cls: 'value q-active' });
    // 抵抗の電圧（R × I）
    Svg.note(g, 104, top + 16, `${Notation.number(p.R1 * Math.abs(r.I1), 1)} V`, { cls: 'value q-voltage', anchor: 'middle' });
    Svg.note(g, 256, top + 16, `${Notation.number(p.R2 * Math.abs(r.I2), 1)} V`, { cls: 'value q-voltage', anchor: 'middle' });
    Svg.note(g, mid - 14, y, `${Notation.number(p.R3 * Math.abs(r.I3), 1)} V`, { cls: 'value q-voltage', anchor: 'end' });
    // 仮に決めた電流の向き（点A へ流れこむ I1・I2、下へ流れる I3）
    Svg.arrow(g, 136, top - 10, 156, top - 10, { cls: 'q-current', width: 1.6 });
    Svg.label(g, 146, top - 22, 'I_1', { cls: 'q-current', size: 13 });
    Svg.arrow(g, 224, top - 10, 204, top - 10, { cls: 'q-current', width: 1.6 });
    Svg.label(g, 214, top - 22, 'I_2', { cls: 'q-current', size: 13 });
    Svg.arrow(g, mid + 10, 142, mid + 10, 160, { cls: 'q-current', width: 1.6 });
    Svg.label(g, mid + 22, 152, 'I_3', { cls: 'q-current', anchor: 'start', size: 13 });
    Svg.el(g, 'circle', { cx: mid, cy: top, r: 4, class: 'dot ink' });
    Svg.note(g, mid, top - 12, 'A', { cls: 'value', anchor: 'middle' });
    loopMark(g, 116, y - 16, '①');
    loopMark(g, 266, y - 16, '②');
    // 2つの法則を、いまの値で
    const sign = (value) => (value < 0 ? `(${amps(value)})` : amps(value));
    Svg.note(g, 16, bottom + 30, `点A：I₁ + I₂ = I₃　${sign(r.I1)} + ${sign(r.I2)} = ${amps(r.I3)} A`, { cls: 'value' });
    Svg.note(g, 16, bottom + 52, `① E₁ = R₁I₁ + R₃I₃　${Notation.number(p.E1, 0)} = ${Notation.number(p.R1 * r.I1, 1)} + ${Notation.number(p.R3 * r.I3, 1)}`, { cls: 'value' });
    Svg.note(g, 16, bottom + 74, `② E₂ = R₂I₂ + R₃I₃　${Notation.number(p.E2, 0)} = ${Notation.number(p.R2 * r.I2, 1)} + ${Notation.number(p.R3 * r.I3, 1)}`, { cls: 'value' });
  }

  function drawFlow(g, p, r, time) {
    const move = time * DOT_SPEED;
    const ps = paths();
    Svg.flowDots(g, ps.out1, move * r.I1);
    Svg.flowDots(g, ps.back1, move * r.I1);
    Svg.flowDots(g, ps.out2, move * r.I2);
    Svg.flowDots(g, ps.back2, move * r.I2);
    Svg.flowDots(g, ps.down, move * r.I3);
  }

  global.TopicKirchhoff = {
    id: 'kirchhoff',
    title: 'キルヒホッフの法則',
    lead: '点に入る電流の和 = 出る電流の和。1周まわると、電池の電圧 = 抵抗の電圧の和。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'E1', name: '電池1の電圧', symbol: 'E_1', unit: 'V', min: 0, max: 30, step: 1, value: 20 },
      { key: 'E2', name: '電池2の電圧', symbol: 'E_2', unit: 'V', min: 0, max: 30, step: 1, value: 10 },
      { key: 'R1', name: '抵抗', symbol: 'R_1', unit: 'Ω', min: 1, max: 10, step: 1, value: 4 },
      { key: 'R2', name: '抵抗', symbol: 'R_2', unit: 'Ω', min: 1, max: 10, step: 1, value: 2 },
      { key: 'R3', name: '抵抗', symbol: 'R_3', unit: 'Ω', min: 1, max: 10, step: 1, value: 2 },
    ],
    presets: [],
    compute,
    draw,
    motion: { draw: drawFlow },
    caption(p, r) {
      if (r.I2 < -1e-9) return `<var>I</var><sub>2</sub> が負：仮の向きと反対に流れ、電池2 に流れこむ（充電される向き）。`;
      if (r.I1 < -1e-9) return `<var>I</var><sub>1</sub> が負：仮の向きと反対に流れ、電池1 に流れこむ（充電される向き）。`;
      return `点A に流れこむ ${amps(r.I1)} + ${amps(r.I2)} A が、<var>R</var><sub>3</sub> を下へ流れる ${amps(r.I3)} A と等しい。`;
    },
    readouts: (p, r) => [
      { name: '電流', symbol: 'I_1', value: amps(r.I1), unit: 'A', cls: 'q-current' },
      { name: '電流', symbol: 'I_2', value: amps(r.I2), unit: 'A', cls: 'q-current' },
      { name: '電流', symbol: 'I_3', value: amps(r.I3), unit: 'A', cls: 'q-current' },
      { name: '点A の電位', symbol: 'V_A', value: Notation.number(r.VA, 2), unit: 'V', cls: 'q-voltage' },
    ],
    terms: [
      ['点（節点）', '3本以上の導線がつながる所。図の A。電流はここで合流したり分かれたりする。'],
      ['閉回路', '回路の中で、ぐるっと1周して元に戻れる道。図の①（電池1・R₁・R₃）と②（電池2・R₂・R₃）。'],
      ['起電力 <var>E</var>', '電池が電気を押し上げる電圧。電池の中の抵抗は 0 とする。'],
      ['第1法則', '点に流れこむ電流の和と、出ていく電流の和は等しい（電気は途中で消えない）。'],
      ['第2法則', '閉回路を1周すると、電池が上げた電圧の和と、抵抗で下がった電圧（<var>R</var> × <var>I</var>）の和は等しい。'],
      ['仮の向き', '電流の向きは、式を立てる前に仮に決めてよい。答えが負なら、実際は反対向き。'],
    ],
    tries: [
      { text: '電池2 の <var>E</var><sub>2</sub> を 10 → 0 V にすると、<var>R</var><sub>3</sub> の電流 <var>I</var><sub>3</sub> は？', choices: ['増える', '減る', '変わらない'], answer: 1, set: { E2: 0 }, look: '<var>I</var><sub>3</sub> は 4 → 2 A に減る。<var>I</var><sub>1</sub> = 4 A、<var>I</var><sub>2</sub> = −2 A（点A から電池2 の方へ流れる）。4 + (−2) = 2 で第1法則も合う。' },
      { text: '<var>E</var><sub>2</sub> を 10 → 16 V にすると、電池1 から流れる <var>I</var><sub>1</sub> は？', choices: ['増える', '減る', '変わらない'], answer: 1, set: { E2: 16 }, look: '電池2 が点A の電位を 10.4 V に押し上げ、<var>I</var><sub>1</sub> = (20 − 10.4) ÷ 4 = 2.4 A に減る。<var>I</var><sub>2</sub> = 2.8 A、<var>I</var><sub>3</sub> = 5.2 A。' },
      { text: '<var>E</var><sub>2</sub> を 10 → 6 V に下げると、<var>I</var><sub>2</sub> の向きは？', choices: ['点A へ（仮の向きのまま）', '反対（電池2 へ流れこむ）', '0 になる'], answer: 1, set: { E2: 6 }, look: '点A の電位 6.4 V が <var>E</var><sub>2</sub> の 6 V より高いので、<var>I</var><sub>2</sub> = −0.2 A。電池2 は充電される向きになる。' },
    ],
    quiz: [
      { q: '点に 2 A と 5 A が流れこみ、1本の導線から出ていく。出ていく電流は？', choices: ['3 A', '5 A', '7 A', '10 A'], answer: 2, why: '第1法則：流れこむ和 = 出る和。2 + 5 = 7 A。' },
      { q: '12 V の電池と2本の抵抗の閉回路。1本の抵抗の電圧が 5 V なら、もう1本は？', choices: ['5 V', '7 V', '12 V', '17 V'], answer: 1, why: '第2法則：1周で、電池の 12 V = 5 + 7 V。' },
      { q: '電流の向きを仮に決めて解いたら <var>I</var> = −1.5 A になった。意味は？', choices: ['計算ミス', '仮の向きと反対に 1.5 A', '電流は 0', '1.5 A の半分'], answer: 1, why: '負の答えは、仮に決めた向きと反対向きに 1.5 A 流れているということ。' },
    ],
    exam: {
      lead: '直流回路の計算の土台で、ブリッジ回路・三相交流・過渡現象の問題でも使う。2つの電池をもつ回路の電流や、抵抗の電圧から値を求める形で出る。',
      often: [
        '未知の電流が3つなら、第1法則を1本と、第2法則を2本（閉回路①②）で式を立てる。',
        '点A の電位 $V_A$ を未知にすると式が1本ですむ：($E_1$ − $V_A$) ÷ $R_1$ + ($E_2$ − $V_A$) ÷ $R_2$ = $V_A$ ÷ $R_3$。',
      ],
      traps: [
        '閉回路を回る向きと、仮に決めた電流の向きが逆の抵抗は、電圧を引き算する。',
        '答えの電流が負でも計算ミスではない。仮の向きと反対に流れている。',
      ],
    },
    conditions: '電池の中の抵抗と、導線の抵抗は 0 とする。下の導線を 0 V とする',
    explain: {
      points: [
        '点に流れこむ電流の和は、出ていく電流の和に等しい（第1法則）。',
        '1周まわると、電池の電圧の和 = 抵抗の電圧 $R$ × $I$ の和（第2法則）。',
        '電流の向きは仮に決めてよい。計算で負になったら、実際は反対向き。',
      ],
      look: [
        ['dots', 'q-current', '赤い点＝電流の流れ。赤い矢印は仮に決めた向きで、点が逆に動けば電流は負。'],
        ['dot', 'ink', '黒い点 A＝3本の電流が出会う点。$I_1$ + $I_2$ = $I_3$。'],
        ['arc', 'ink', '丸い矢印①②＝1周まわる閉回路。まわる向きに電圧を足していく。'],
        ['text', 'q-voltage', '青い字＝抵抗の電圧（$R$ × $I$）。下の3行は、いまの値で2つの法則を確かめた式。'],
      ],
      formulas: [
        ['I_1 + I_2 = I_3', '点A に入る電流の和 = 出る電流（第1法則）。', '枝分かれ・合流する点で'],
        ['E_1 = R_1I_1 + R_3I_3', '閉回路①で、電池の電圧 = 抵抗の電圧の和（第2法則）。', '1周まわる道で'],
        ['E_2 = R_2I_2 + R_3I_3', '閉回路②も同じ。', '未知の電流が3つの時は、この3本の式で'],
      ],
      symbols: [
        ['E_1・E_2', '電池の電圧（起電力）', 'V'],
        ['I_1・I_2・I_3', '仮に決めた向きの電流', 'A'],
        ['R_1・R_2・R_3', '抵抗', 'Ω'],
        ['V_A', '点A の電位（下の導線を 0 V）', 'V'],
      ],
    },
  };
})(this);
