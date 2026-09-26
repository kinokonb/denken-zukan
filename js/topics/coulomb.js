// 理論：クーロンの法則と電界。2つの点電荷の間の力（同符号は反発・異符号は引き合う）と、電荷のまわりの電界の強さを見る
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const LINE = { y: 110, left: 40, right: 320, pxPerM: 280 };

  function compute(p) {
    return { F: Coulomb.force(p.q1, p.q2, p.r), E1: Coulomb.field(Math.abs(p.q1), p.r) };
  }

  const fixed = (value, digits = 3) => Notation.number(value, digits);
  const signed = (q) => `${q > 0 ? '+' : q < 0 ? '−' : ''}${Math.abs(q)} μC`;

  function drawCharge(g, x, q, name) {
    Svg.el(g, 'circle', { cx: x, cy: LINE.y, r: 14, class: q === 0 ? 'motor' : 'rotor q-mech' });
    Svg.note(g, x, LINE.y + 1, q > 0 ? '+' : q < 0 ? '−' : '0', { cls: 'value', anchor: 'middle' });
    Svg.note(g, x, LINE.y + 32, `${name} ${signed(q)}`, { cls: 'value', anchor: 'middle' });
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const x1 = LINE.left + 20;
    const x2 = x1 + p.r * LINE.pxPerM;
    // 電荷1のまわりの電界の線（外向き：正、内向き：負）。本数は電荷の大きさ
    const lines = Math.abs(p.q1) * 2;
    for (let i = 0; i < lines; i++) {
      const a = (2 * Math.PI * i) / lines;
      const [ax, ay] = [x1 + 18 * Math.cos(a), LINE.y - 18 * Math.sin(a)];
      const [bx, by] = [x1 + 44 * Math.cos(a), LINE.y - 44 * Math.sin(a)];
      if (p.q1 > 0) Svg.arrow(g, ax, ay, bx, by, { cls: 'q-voltage', width: 1.2 });
      else Svg.arrow(g, bx, by, ax, ay, { cls: 'q-voltage', width: 1.2 });
    }
    Svg.guide(g, x1, LINE.y + 50, x2, LINE.y + 50);
    Svg.note(g, (x1 + x2) / 2, LINE.y + 64, `r = ${p.r} m`, { cls: 'value', anchor: 'middle' });
    drawCharge(g, x1, p.q1, 'Q₁');
    drawCharge(g, x2, p.q2, 'Q₂');
    // 力の矢印（長さは力の大きさ。反発なら外向き、引き合うなら内向き）
    const length = Math.min(60, Math.abs(r.F) * 300);
    if (length > 0.5) {
      const out = r.F > 0 ? 1 : -1;
      Svg.arrow(g, x2 + out * 16 * (out > 0 ? 1 : 1), LINE.y - 26, x2 + out * (16 + length), LINE.y - 26, { cls: 'q-mech', width: 2.5 });
      Svg.arrow(g, x1 - out * 16, LINE.y - 26, x1 - out * (16 + length), LINE.y - 26, { cls: 'q-mech', width: 2.5 });
    }
    Svg.note(g, 16, 30, r.F > 0 ? '同符号：反発する' : r.F < 0 ? '異符号：引き合う' : '力は 0', { cls: 'value q-mech' });
    Svg.note(g, 16, 214, `F = kQ₁Q₂ ÷ r² = 9×10⁻³ × ${Math.abs(p.q1)} × ${Math.abs(p.q2)} ÷ ${p.r}² = ${fixed(Math.abs(r.F))} N`, { cls: 'value q-mech' });
    Svg.note(g, 16, 236, `Q₁ が距離 r の所につくる電界 E = kQ₁ ÷ r² = ${Notation.number(r.E1 / 1000, 1)} kV/m`, { cls: 'faint' });
  }

  global.TopicCoulomb = {
    id: 'coulomb',
    title: 'クーロンの法則と電界',
    lead: '2つの電荷の力は、電荷の積に比例し、距離の2乗に反比例する。同符号は反発、異符号は引き合う。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'q1', name: '電荷', symbol: 'Q_1', unit: 'μC', min: -5, max: 5, step: 1, value: 1 },
      { key: 'q2', name: '電荷', symbol: 'Q_2', unit: 'μC', min: -5, max: 5, step: 1, value: 1 },
      { key: 'r', name: '距離', symbol: 'r', unit: 'm', min: 0.1, max: 0.8, step: 0.1, value: 0.3 },
    ],
    presets: [],
    compute,
    draw,
    caption(p, r) {
      return `力 ${fixed(Math.abs(r.F))} N（${r.F > 0 ? '反発' : r.F < 0 ? '引き合う' : '0'}）。距離を2倍にすると 1/4 になる。`;
    },
    readouts: (p, r) => [
      { name: '力の大きさ', symbol: 'F', value: fixed(Math.abs(r.F)), unit: 'N', cls: 'q-mech' },
      { name: 'Q₁ がつくる電界', symbol: 'E', value: Notation.number(r.E1 / 1000, 1), unit: 'kV/m', cls: 'q-voltage' },
    ],
    terms: [
      ['点電荷', '大きさを考えない、点に集まった電荷。単位 C（クーロン）。μC は 10⁻⁶ C。'],
      ['クーロン力', '電荷どうしが押し合う・引き合う力。同じ符号は反発、ちがう符号は引き合う。'],
      ['電界 <var>E</var>', 'その場所に +1 C を置いた時に受ける力。単位 V/m（N/C と同じ）。'],
      ['<var>k</var>', '比例定数 1 ÷ (4πε₀) ≒ 9 × 10⁹（真空・空気）。'],
    ],
    tries: [
      { text: '距離 <var>r</var> を 0.3 → 0.6 m（2倍）にすると、力は？', choices: ['半分', '4分の1', '2倍'], answer: 1, set: { r: 0.6 }, look: '0.1 → 0.025 N。距離の2乗に反比例するので 1/4。' },
      { text: '<var>Q</var><sub>1</sub> を 1 → 2 μC にすると、力は？', choices: ['2倍', '4倍', 'そのまま'], answer: 0, set: { q1: 2 }, look: '電荷の積に比例するので 2倍の 0.2 N。電界の線も2倍の本数になる。' },
      { text: '<var>Q</var><sub>2</sub> を −1 μC にすると？', choices: ['反発する', '引き合う', '力が 0'], answer: 1, set: { q2: -1 }, look: '符号がちがうので引き合う。大きさは同じ 0.1 N。' },
    ],
    quiz: [
      { q: '2つの電荷の距離を3倍にすると、力は？', choices: ['3分の1', '9分の1', '3倍', '9倍'], answer: 1, why: '距離の2乗に反比例：1 ÷ 3² = 1/9。' },
      { q: '1 μC と 1 μC が 1 m はなれている。力は？（k = 9 × 10⁹）', choices: ['9 × 10⁻³ N', '9 N', '9 × 10³ N', '1 N'], answer: 0, why: '9 × 10⁹ × 10⁻⁶ × 10⁻⁶ ÷ 1² = 9 × 10⁻³ N。' },
      { q: '正の電荷のまわりの電界の向きは？', choices: ['電荷へ向かう', '電荷から外へ', '向きはない'], answer: 1, why: '+1 C を置くと反発されるので、外向き。' },
    ],
    exam: {
      lead: '静電気の基本。2つの電荷の力、電荷のまわりの電界・電位を求める問題として出る。平行平板コンデンサの電界の考え方の土台。',
      often: [
        '$F$ = $k$$Q_1$$Q_2$ ÷ $r$²（$k$ = 9 × 10⁹）。距離の2乗に反比例。',
        '点電荷の電界は $E$ = $k$$Q$ ÷ $r$²。いくつかの電荷の電界は、向きをつけて足す。',
      ],
      traps: [
        'μC は 10⁻⁶ C。2つかけると 10⁻¹²。',
        '同符号は反発、異符号は引き合う。力の向きを図で確かめる。',
      ],
    },
    conditions: '真空（空気）中の点電荷。k = 9 × 10⁹ N·m²/C²',
    explain: {
      points: [
        '2つの電荷の間の力は、電荷の積に比例し、距離の2乗に反比例する（クーロンの法則）。',
        '同じ符号は反発し、ちがう符号は引き合う。',
        '電荷のまわりには電界 $E$ = $k$$Q$ ÷ $r$² ができ、そこに置いた電荷が力を受ける。',
      ],
      look: [
        ['arrow', 'q-mech', '橙の矢印＝2つの電荷が受ける力。外向きは反発、内向きは引き合う。'],
        ['arrow', 'q-voltage', '青い矢印＝$Q_1$ のまわりの電界の向き（正なら外向き）。本数は電荷の大きさ。'],
      ],
      formulas: [
        ['F = kQ_{1}Q_{2} ÷ r²', 'クーロンの法則（k ≒ 9 × 10⁹）。', '2つの電荷の力'],
        ['E = kQ ÷ r²', '点電荷の電界。', '電荷のまわりの電界'],
        ['F = QE', '電界の中の電荷が受ける力。', '電界から力を求める時'],
      ],
      symbols: [
        ['Q_1・Q_2', '電荷', 'C'],
        ['r', '距離', 'm'],
        ['F', '力', 'N'],
        ['E', '電界', 'V/m'],
      ],
    },
  };
})(this);
