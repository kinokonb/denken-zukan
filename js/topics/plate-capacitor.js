// 理論：平行平板コンデンサ。極板の間隔・誘電体・電池をつないだまま／外してからで、C・Q・V・E・W がどう変わるかを見る
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const AREA_CM2 = 100; // 極板の面積 [cm²]
  const PLATE = { left: 92, right: 252, top: 44, pxPerMm: 32 };
  const START_D_MM = 1; // 外す時は、間隔 1 mm・空気で充電してから外す

  function compute(p) {
    const S = AREA_CM2 * 1e-4;
    const d = p.d * 1e-3;
    const C = Capacitor.capacitance({ S, d, er: p.er });
    const C0 = Capacitor.capacitance({ S, d: START_D_MM * 1e-3 });
    return Capacitor.state({ C, C0, V0: p.V0, connected: p.mode === 0, d });
  }

  const pico = (farad) => Notation.number(farad * 1e12, 1);
  const nano = (coulomb) => Notation.number(coulomb * 1e9, 2);

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const { left, right, top, pxPerMm } = PLATE;
    const bottom = top + p.d * pxPerMm;
    // 誘電体
    if (p.er > 1) {
      Svg.el(g, 'rect', { x: left, y: top, width: right - left, height: bottom - top, class: 'black-box closed' });
      Svg.note(g, right - 6, (top + bottom) / 2, `誘電体 εr = ${p.er}`, { cls: 'faint', anchor: 'end' });
    }
    // 電界の線（本数 ∝ E。1 本 ≒ 25 kV/m）
    const lines = Math.max(0, Math.min(14, Math.round(r.E / 25000)));
    for (let i = 0; i < lines; i++) {
      const x = left + ((i + 0.5) * (right - left)) / lines;
      Svg.arrow(g, x, top + 4, x, bottom - 4, { cls: 'q-voltage', width: 1.2 });
    }
    // 極板と電荷（個数 ∝ Q）
    for (const [y, sign] of [[top, '+'], [bottom, '−']]) {
      Svg.el(g, 'rect', { x: left, y: y - 3, width: right - left, height: 6, class: 'plate-bar' });
      const count = Math.max(0, Math.min(16, Math.round((r.Q * 1e9) / 1)));
      for (let i = 0; i < count; i++) {
        const x = left + ((i + 0.5) * (right - left)) / count;
        Svg.note(g, x, y + (sign === '+' ? -10 : 12), sign, { cls: 'value', anchor: 'middle' });
      }
    }
    Svg.note(g, (left + right) / 2, bottom + 30, `間隔 d = ${p.d} mm`, { cls: 'value', anchor: 'middle' });
    // 電池（つないだまま／外した）
    const bx = 40;
    Svg.wire(g, [[left, top], [bx, top], [bx, 90]]);
    Svg.wire(g, [[left, bottom], [bx, bottom], [bx, 110]]);
    Svg.battery(g, bx, 100);
    Svg.knifeSwitch(g, 66, top, { on: p.mode === 0 ? 1 : 0 });
    Svg.note(g, bx - 4, 132, `${p.V0} V`, { cls: 'value q-voltage', anchor: 'middle' });
    Svg.note(g, 16, top - 20, p.mode === 0 ? '電池をつないだまま（V 一定）' : `1 mm で充電して外した（Q 一定）`, { cls: 'faint' });
    // 値
    const rows = [
      [`C = ${pico(r.C)} pF`, 'q-reactive'],
      [`Q = ${nano(r.Q)} nC`, ''],
      [`V = ${Notation.number(r.V, 1)} V`, 'q-voltage'],
      [`E = ${Notation.number(r.E / 1000, 1)} kV/m`, 'q-voltage'],
      [`W = ${Notation.number(r.W * 1e9, 1)} nJ`, 'q-active'],
    ];
    rows.forEach(([text, cls], i) => Svg.note(g, 266, 60 + i * 20, text, { cls: `value ${cls}` }));
    Svg.note(g, 16, HEIGHT - 12, `C = ε₀εr S ÷ d（S = ${AREA_CM2} cm²、ε₀ = 8.85 × 10⁻¹² F/m）`, { cls: 'faint' });
  }

  global.TopicPlateCapacitor = {
    id: 'plate-capacitor',
    title: '平行平板コンデンサ',
    lead: 'C = εS ÷ d。電池をつないだままは V が一定、外すと Q が一定。どちらかで変わり方がちがう。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'V0', name: '電池の電圧', symbol: 'V_0', unit: 'V', min: 10, max: 100, step: 10, value: 100 },
      { key: 'd', name: '極板の間隔', symbol: 'd', unit: 'mm', min: 0.5, max: 4, step: 0.5, value: 1 },
      { key: 'er', name: '比誘電率', symbol: 'ε_r', unit: '', min: 1, max: 10, step: 1, value: 1 },
      { key: 'mode', name: '電池（0 つないだまま・1 外した）', symbol: 'mode', unit: '', min: 0, max: 1, step: 1, value: 0 },
    ],
    presets: [
      { name: 'つないだまま', apply: () => ({ mode: 0 }) },
      { name: '1 mm で充電して外す', apply: () => ({ mode: 1 }) },
    ],
    compute,
    draw,
    caption(p, r) {
      return p.mode === 0
        ? `V が ${p.V0} V のまま。間隔や誘電体で C が変わり、Q = CV も変わる。`
        : `Q が ${nano(r.Q)} nC のまま。C が変わると V = Q ÷ C が変わる。`;
    },
    readouts: (p, r) => [
      { name: '静電容量', symbol: 'C', value: pico(r.C), unit: 'pF', cls: 'q-reactive' },
      { name: '電荷', symbol: 'Q', value: nano(r.Q), unit: 'nC' },
      { name: '電圧', symbol: 'V', value: Notation.number(r.V, 1), unit: 'V', cls: 'q-voltage' },
      { name: '電界', symbol: 'E', value: Notation.number(r.E / 1000, 1), unit: 'kV/m', cls: 'q-voltage' },
    ],
    terms: [
      ['静電容量 <var>C</var>', '電荷のためやすさ。<var>C</var> = <var>Q</var> ÷ <var>V</var>。単位 F（ファラド）。pF は 10⁻¹² F。'],
      ['電界 <var>E</var>', '極板の間の電気の力の強さ。平行平板では <var>E</var> = <var>V</var> ÷ <var>d</var>（V/m）。'],
      ['誘電率 ε', 'ε = ε₀εr。ε₀ は真空（空気）の値 8.85 × 10⁻¹² F/m、εr は比誘電率（空気で 1）。'],
      ['誘電体', '極板の間に入れる絶縁物（紙・雲母・油など）。εr 倍だけ <var>C</var> が大きくなる。'],
      ['静電エネルギー <var>W</var>', 'コンデンサにたまるエネルギー。<var>W</var> = <var>CV</var>² ÷ 2 = <var>QV</var> ÷ 2。'],
    ],
    tries: [
      { text: '電池をつないだまま、間隔 <var>d</var> を 1 → 2 mm にすると、電荷 <var>Q</var> は？', choices: ['半分', 'そのまま', '2倍'], answer: 0, set: { d: 2 }, look: '<var>C</var> が半分、<var>V</var> は 100 V のままなので <var>Q</var> = <var>CV</var> も半分。電界 <var>E</var> = <var>V</var> ÷ <var>d</var> も半分。' },
      { text: '1 mm で充電して電池を外し、間隔を 2 mm にすると、電圧 <var>V</var> は？', choices: ['半分', 'そのまま', '2倍'], answer: 2, set: { mode: 1, d: 2 }, look: '<var>Q</var> はそのまま、<var>C</var> が半分なので <var>V</var> = <var>Q</var> ÷ <var>C</var> は 200 V に。電界は 100 kV/m のまま、エネルギーは2倍（広げる仕事の分）。' },
      { text: 'つないだまま、比誘電率 5 の誘電体を入れると、<var>C</var> は？', choices: ['5分の1', 'そのまま', '5倍'], answer: 2, set: { er: 5 }, look: '<var>C</var> は約 88.5 → 443 pF（5倍）。<var>V</var> が同じなので <var>Q</var> も5倍。' },
    ],
    quiz: [
      { q: '平行平板コンデンサの間隔 <var>d</var> を半分にすると、<var>C</var> は？', choices: ['半分', 'そのまま', '2倍', '4倍'], answer: 2, why: '<var>C</var> = ε<var>S</var> ÷ <var>d</var> は <var>d</var> に反比例。' },
      { q: '充電して電池を外したコンデンサの間隔を広げると、電界 <var>E</var> は？', choices: ['弱くなる', '変わらない', '強くなる'], answer: 1, why: '<var>Q</var> 一定なら <var>E</var> = <var>Q</var> ÷ (ε<var>S</var>) で <var>d</var> によらない（<var>V</var> は <var>d</var> に比例して増える）。' },
      { q: '100 pF のコンデンサに 100 V。たまる電荷は？', choices: ['1 nC', '10 nC', '100 nC', '1 μC'], answer: 1, why: '<var>Q</var> = <var>CV</var> = 100 × 10⁻¹² × 100 = 10⁻⁸ C = 10 nC。' },
    ],
    exam: {
      lead: '理論でいちばん多く出るテーマ（過去12回で約25問）。間隔・面積・誘電体を変えた時の C・Q・V・E・W の変わり方を問う形が中心。',
      often: [
        '電池をつないだまま（$V$ 一定）か、外してから（$Q$ 一定）かで、変わり方が逆になる。まずどちらかを確かめる。',
        '誘電体を一部に入れた時は、直列（重ねて入れる）か並列（横に並べる）のコンデンサに分けて考える。',
      ],
      traps: [
        '$E$ = $V$ ÷ $d$。$Q$ 一定なら $d$ を変えても $E$ は変わらない。',
        '単位：pF = 10⁻¹² F、μF = 10⁻⁶ F、cm² = 10⁻⁴ m²、mm = 10⁻³ m。',
      ],
    },
    conditions: `極板の面積 ${AREA_CM2} cm²、端の乱れは考えない。「外した」は、間隔 1 mm・空気で電池の電圧まで充電してから外した状態`,
    explain: {
      points: [
        '静電容量 $C$ = ε$S$ ÷ $d$。広いほど・近いほど・誘電体があるほど大きい。',
        '電池をつないだままなら $V$ が一定、$Q$ = $CV$ が変わる。',
        '外してからなら $Q$ が一定、$V$ = $Q$ ÷ $C$ が変わり、電界 $E$ は変わらない。',
      ],
      look: [
        ['text', 'ink', '＋と−の数＝たまった電荷 $Q$（1 個 ≒ 1 nC）。'],
        ['arrow', 'q-voltage', '青い矢印の本数＝電界 $E$ の強さ（1 本 ≒ 25 kV/m）。'],
        ['area', 'ink', '灰色の四角＝誘電体。比誘電率 εr 倍だけ $C$ が大きい。'],
      ],
      formulas: [
        ['C = ε_0ε_r S ÷ d', '平行平板コンデンサの静電容量。', '形から容量を求める時'],
        ['Q = CV', '電荷 = 容量 × 電圧。', 'たまる電荷を求める時'],
        ['E = V ÷ d', '極板の間の電界。', '電界の強さを求める時'],
        ['W = CV² ÷ 2', 'たまるエネルギー。', 'エネルギーを求める時'],
      ],
      symbols: [
        ['C', '静電容量', 'F'],
        ['Q', '電荷', 'C'],
        ['S・d', '極板の面積・間隔', 'm²・m'],
        ['ε_0・ε_r', '真空の誘電率・比誘電率', 'F/m・―'],
        ['E', '電界', 'V/m'],
      ],
    },
  };
})(this);
