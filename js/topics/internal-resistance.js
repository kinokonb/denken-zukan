// 理論：電池の内部抵抗。電池の中の抵抗 r で電圧が下がり（端子電圧 V = E − rI）、負荷の電力は R = r の時に最大になる
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const C = { left: 40, right: 160, top: 60, bottom: 180, box: [12, 42, 84, 156] };
  const PLOT = { left: 214, right: 340, top: 44, bottom: 176 };
  const DOT_SPEED = 14; // 電流 1 A あたり、点が1秒に進む長さ

  function compute(p) {
    return DcCircuit.batteryLoad({ E: p.E, r: p.r, R: p.R });
  }

  const fixed = (value, digits = 2) => Notation.number(value, digits);

  function loopPath() {
    const { left, right, top, bottom } = C;
    return [[left, 130], [left, top], [right, top], [right, bottom], [left, bottom], [left, 130]];
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const { left, right, top, bottom, box } = C;
    Svg.wire(g, loopPath());
    // 電池の中（起電力 E と内部抵抗 r）
    Svg.el(g, 'rect', { x: box[0], y: box[1], width: box[2], height: box[3], rx: 4, class: 'building dashed-box' });
    Svg.note(g, box[0] + 4, box[1] - 8, '電池の中', { cls: 'faint' });
    Svg.battery(g, left, 146);
    Svg.resistor(g, left, 94, { vertical: true });
    Svg.note(g, left + 14, 146, `E ${fixed(p.E, 1)} V`, { cls: 'value q-voltage' });
    Svg.note(g, left + 14, 94, `r ${fixed(p.r, 1)} Ω`, { cls: 'value q-active' });
    // 端子と負荷
    for (const y of [top, bottom]) Svg.el(g, 'circle', { cx: box[0] + box[2], cy: y, r: 3, class: 'dot ink' });
    Svg.resistor(g, right, 120, { vertical: true });
    Svg.note(g, right + 14, 110, `R ${fixed(p.R, 1)} Ω`, { cls: 'value q-active' });
    Svg.note(g, right + 14, 128, `V ${fixed(r.V)} V`, { cls: 'value q-voltage' });
    Svg.note(g, 132, top - 12, `I ${fixed(r.I)} A →`, { cls: 'value q-current', anchor: 'middle' });
    Svg.note(g, left + 14, 112, `rI ${fixed(r.drop)} V`, { cls: 'value q-voltage' });

    // 端子電圧と電流のグラフ（V = E − rI の右下がりの線）
    const Imax = r.shortCircuit;
    const toX = (I) => PLOT.left + (Math.min(I, Imax) / Imax) * (PLOT.right - PLOT.left);
    const toY = (V) => PLOT.bottom - (V / p.E) * (PLOT.bottom - PLOT.top);
    Svg.guide(g, PLOT.left, PLOT.bottom, PLOT.right, PLOT.bottom, 'axis');
    Svg.guide(g, PLOT.left, PLOT.top - 6, PLOT.left, PLOT.bottom, 'axis');
    Svg.polyline(g, [[toX(0), toY(p.E)], [toX(Imax), toY(0)]], 'q-voltage');
    Svg.note(g, PLOT.left - 4, toY(p.E), 'E', { cls: 'value q-voltage', anchor: 'end' });
    Svg.note(g, PLOT.left, PLOT.top - 16, '端子電圧 V', { cls: 'faint' });
    Svg.note(g, PLOT.right, PLOT.bottom + 14, `電流 I（右端 E ÷ r = ${fixed(Imax, 1)} A）`, { cls: 'faint', anchor: 'end' });
    const [px, py] = [toX(r.I), toY(r.V)];
    Svg.guide(g, px, toY(p.E), px, py);
    Svg.note(g, px + 6, (toY(p.E) + py) / 2, 'rI', { cls: 'value q-voltage' });
    Svg.el(g, 'circle', { cx: px, cy: py, r: 5, class: 'dot q-voltage' });

    Svg.note(g, 16, bottom + 42, `負荷の電力 P = V × I = ${fixed(r.V)} × ${fixed(r.I)} = ${fixed(r.P)} W`, { cls: 'value q-active' });
    Svg.note(g, 16, bottom + 62, `R = r の時が最大 ${fixed(r.Pmax)} W。電池の中の熱 rI² = ${fixed(r.loss)} W`, { cls: 'faint' });
  }

  function drawFlow(g, p, r, time) {
    Svg.flowDots(g, loopPath(), time * DOT_SPEED * r.I);
  }

  global.TopicInternalResistance = {
    id: 'internal-resistance',
    title: '電池の内部抵抗',
    lead: '電池の中にも抵抗 r がある。電流を流すと端子電圧は V = E − rI に下がる。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'E', name: '起電力', symbol: 'E', unit: 'V', min: 1, max: 12, step: 0.5, value: 6 },
      { key: 'r', name: '内部抵抗', symbol: 'r', unit: 'Ω', min: 0.5, max: 5, step: 0.5, value: 1 },
      { key: 'R', name: '負荷の抵抗', symbol: 'R', unit: 'Ω', min: 0.5, max: 20, step: 0.5, value: 5 },
    ],
    presets: [
      { name: 'R = r にする', apply: (p) => ({ R: p.r }) },
    ],
    compute,
    draw,
    motion: { draw: drawFlow },
    caption(p, r) {
      return `端子電圧 ${fixed(r.V)} V は、起電力 ${fixed(p.E, 1)} V から電池の中の ${fixed(r.drop)} V（<var>rI</var>）を引いた値。`;
    },
    readouts: (p, r) => [
      { name: '電流', symbol: 'I', value: fixed(r.I), unit: 'A', cls: 'q-current' },
      { name: '端子電圧', symbol: 'V', value: fixed(r.V), unit: 'V', cls: 'q-voltage' },
      { name: '負荷の電力', symbol: 'P', value: fixed(r.P), unit: 'W', cls: 'q-active' },
      { name: '電池の中の電圧降下', symbol: 'rI', value: fixed(r.drop), unit: 'V', cls: 'q-voltage' },
    ],
    terms: [
      ['起電力 <var>E</var>', '電池が電気を押し上げる力（電圧）。電流 0 の時の電池の電圧と同じ。'],
      ['内部抵抗 <var>r</var>', '電池の中の抵抗。古い電池や寒い時ほど大きい。'],
      ['端子電圧 <var>V</var>', '電池の外に出てくる電圧。電流が流れると、電池の中で <var>rI</var> 下がった分だけ小さい。'],
      ['負荷', '電池につないで電気を使うもの（電球・ヒーター・モーター）。'],
      ['短絡', '負荷なしで端子をつなぐこと。電流は <var>E</var> ÷ <var>r</var> まで流れ、電池の中が熱くなって危ない。'],
    ],
    tries: [
      { text: '負荷 <var>R</var> を 5 → 1 Ω（<var>r</var> と同じ）にすると、負荷の電力は？', choices: ['増える', '減る', '変わらない'], answer: 0, set: { R: 1 }, look: '電流 3 A、端子電圧 3 V（<var>E</var> の半分）で、電力は 5 → 9 W。<var>R</var> = <var>r</var> の時がいちばん大きい。' },
      { text: '<var>R</var> をさらに 0.5 Ω に小さくすると、負荷の電力は？', choices: ['増える', '減る', '変わらない'], answer: 1, set: { R: 0.5 }, look: '電流は 4 A に増えるが、端子電圧が 2 V に下がり、電力は 8 W に減る。電池の中の熱 <var>rI</var>² は 16 W に増える。' },
      { text: '<var>R</var> = 5 Ω のまま、内部抵抗 <var>r</var> を 1 → 0.5 Ω にすると、端子電圧は？', choices: ['E に近づく', '下がる', '変わらない'], answer: 0, set: { r: 0.5 }, look: '端子電圧は約 5.45 V に上がる。内部抵抗の小さい電池ほど、電流を流しても電圧が下がりにくい。' },
    ],
    quiz: [
      { q: '<var>E</var> = 1.5 V、<var>r</var> = 0.5 Ω の電池に 2.5 Ω をつないだ。電流は？', choices: ['0.5 A', '0.6 A', '1 A', '3 A'], answer: 0, why: '<var>I</var> = <var>E</var> ÷ (<var>R</var> + <var>r</var>) = 1.5 ÷ 3 = 0.5 A。電池の中の <var>r</var> も直列に入る。' },
      { q: '電流 0 で 12 V の電池が、2 A 流すと 11 V になった。内部抵抗は？', choices: ['0.5 Ω', '1 Ω', '5.5 Ω', '6 Ω'], answer: 0, why: '下がった 1 V が <var>rI</var>。<var>r</var> = 1 ÷ 2 = 0.5 Ω。' },
      { q: '負荷の電力がいちばん大きくなるのは？', choices: ['<var>R</var> = 0（短絡）', '<var>R</var> = <var>r</var>', '<var>R</var> がとても大きい時', '<var>R</var> = 2<var>r</var>'], answer: 1, why: '<var>R</var> = <var>r</var> で最大 <var>E</var>² ÷ 4<var>r</var>。短絡では電流は最大でも、負荷の電圧が 0 で電力も 0。' },
    ],
    exam: {
      lead: '理論の直流回路で、2つの測定から電池の起電力と内部抵抗を求める形や、負荷の電力が最大になる条件として出る。',
      often: [
        '端子電圧 $V$ = $E$ − $rI$。電流を流すほど下がる。',
        '2つの測定 ($V_1$, $I_1$)・($V_2$, $I_2$) から $r$ = ($V_1$ − $V_2$) ÷ ($I_2$ − $I_1$)、$E$ = $V_1$ + $rI_1$。',
      ],
      traps: [
        '負荷の電力が最大になるのは $R$ = $r$ の時。電流が最大の短絡（$R$ = 0）ではない。',
        '起電力 $E$ は電流 0 の時の電圧。電流が流れている時の電圧計の値は、それより $rI$ 小さい。',
      ],
    },
    conditions: '導線の抵抗は 0 とする。電池の中は、起電力 E と内部抵抗 r の直列として表す',
    explain: {
      points: [
        '電池の中にも抵抗 $r$ があり、電流 $I$ が流れると中で $rI$ だけ電圧が下がる。',
        '端子電圧は $V$ = $E$ − $rI$。電流を多く流すほど下がる（グラフの右下がりの線）。',
        '負荷の抵抗 $R$ が $r$ と等しい時、負荷の電力がいちばん大きい（$E$² ÷ 4$r$）。',
      ],
      look: [
        ['dots', 'q-current', '赤い点＝電流の流れ。'],
        ['line', 'q-voltage', '青い線＝端子電圧と電流の関係（$V$ = $E$ − $rI$）。青い点がいまの値。'],
        ['dashed', 'ink', '点線＝電池の中で下がる電圧 $rI$（$E$ との差）。'],
        ['area', 'ink', '点線の四角＝電池の中。起電力 $E$ と内部抵抗 $r$ の直列と考える。'],
      ],
      formulas: [
        ['I = E ÷ (R + r)', '電池の中の r も直列に入る。', '電流を求める時'],
        ['V = E − rI', '端子電圧（電池の外に出てくる電圧）。', '電圧計の値を求める時'],
        ['P_{max} = E² ÷ 4r', 'R = r の時の負荷の電力（最大）。', '最大の電力を求める時'],
      ],
      symbols: [
        ['E', '起電力（電流 0 の時の電圧）', 'V'],
        ['r', '内部抵抗', 'Ω'],
        ['R', '負荷の抵抗', 'Ω'],
        ['V', '端子電圧', 'V'],
        ['I', '電流', 'A'],
      ],
    },
  };
})(this);
