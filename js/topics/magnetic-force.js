// 理論：磁界と電磁力。平行な2本の電流を横から見て、I₁ がつくる磁界（右ねじ）と、その中の I₂ が受ける力（フレミングの左手）を見る。
// 磁界 H → 磁束密度 B → 力 F = BI₂l の順に、下の3行でつながる
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 290;
  const WIRE = { top: 60, bottom: 196, x1: 110, pxPerM: 360 };
  const MARK_YS = [82, 114, 182]; // I₁ の両側に描く磁界の印の高さ
  const FORCE_Y = 150;

  function compute(p) {
    const H = Magnetic.field(Math.abs(p.I1), p.r);
    return { H, B: Magnetic.fluxDensity(Math.abs(p.I1), p.r), F: Magnetic.parallelForce(p.I1, p.I2, p.r) };
  }

  // 有効数字3けたで、余分な 0 を付けない（79.577 → 79.6、100 → 100）
  const sig = (value) => String(Number(value.toPrecision(3)));
  const microTesla = (B) => B * 1e6;
  const milliNewton = (F) => Math.abs(F) * 1e3;
  const current = (name, I) => `${name} = ${Math.abs(I)} A${I > 0 ? '（上へ）' : I < 0 ? '（下へ）' : ''}`;

  function drawWire(g, x, I, name) {
    Svg.wire(g, [[x, WIRE.top], [x, WIRE.bottom]]);
    if (I > 0) Svg.arrow(g, x, 176, x, 84, { cls: 'q-current', width: 2.5 });
    if (I < 0) Svg.arrow(g, x, 84, x, 176, { cls: 'q-current', width: 2.5 });
    Svg.label(g, x + 9, WIRE.top + 6, name, { cls: 'q-current', anchor: 'start' });
  }

  // 導線が受ける力。2本の外側に描く（引き合う時は外から導線へ、反発する時は導線から外へ）
  function drawForces(g, x1, x2, F) {
    const length = Math.min(60, milliNewton(F) * 3);
    if (length < 0.5) return;
    const repel = F > 0;
    const [a1, b1] = repel ? [x1 - 4, x1 - 4 - length] : [x1 - 4 - length, x1 - 4];
    const [a2, b2] = repel ? [x2 + 4, x2 + 4 + length] : [x2 + 4 + length, x2 + 4];
    Svg.arrow(g, a1, FORCE_Y, b1, FORCE_Y, { cls: 'q-mech', width: 2.5 });
    Svg.arrow(g, a2, FORCE_Y, b2, FORCE_Y, { cls: 'q-mech', width: 2.5 });
    Svg.label(g, x1 - 30, FORCE_Y - 13, 'F', { cls: 'q-mech' });
    Svg.label(g, x2 + 30, FORCE_Y - 13, 'F', { cls: 'q-mech' });
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const x1 = WIRE.x1;
    const x2 = x1 + p.r * WIRE.pxPerM;
    Svg.note(g, 16, 18, r.F < 0 ? '同じ向き：引き合う' : r.F > 0 ? '反対向き：反発する' : '力は 0', { cls: 'value q-mech' });
    Svg.note(g, 16, 38, current('I₁', p.I1), { cls: 'value q-current' });
    Svg.note(g, WIDTH - 16, 38, current('I₂', p.I2), { cls: 'value q-current', anchor: 'end' });
    // I₁ がつくる磁界（右ねじ）：上向きの電流なら右側は奥へ、左側は手前へ
    if (p.I1 !== 0) {
      for (const y of MARK_YS) {
        Svg.dotCross(g, x1 - 24, y, p.I1 > 0);
        Svg.dotCross(g, x1 + 24, y, p.I1 < 0);
      }
      Svg.dotCross(g, x2 + 16, 100, p.I1 < 0);
      Svg.label(g, x2 + 28, 100, 'B', { anchor: 'start' });
    }
    drawWire(g, x1, p.I1, 'I_1');
    drawWire(g, x2, p.I2, 'I_2');
    drawForces(g, x1, x2, r.F);
    Svg.guide(g, x1, 210, x2, 210);
    Svg.note(g, (x1 + x2) / 2, 222, `r = ${p.r} m`, { cls: 'value', anchor: 'middle' });
    const B = microTesla(r.B);
    Svg.note(g, 16, 244, `H = I₁ ÷ 2πr = ${Math.abs(p.I1)} ÷ (2π × ${p.r}) = ${sig(r.H)} A/m`, { cls: 'faint' });
    Svg.note(g, 16, 262, `B = μ₀H = 4π×10⁻⁷ × ${sig(r.H)} = ${sig(B)} μT`, { cls: 'faint' });
    Svg.note(g, 16, 280, `F = BI₂l = ${sig(B)} μT × ${Math.abs(p.I2)} A × 1 m = ${sig(milliNewton(r.F))} mN`, { cls: 'value q-mech' });
  }

  global.TopicMagneticForce = {
    id: 'magnetic-force',
    title: '磁界と電磁力',
    lead: '電流のまわりには磁界ができ、磁界の中の電流は力を受ける。平行な電流は同じ向きなら引き合う。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'I1', name: '電流', symbol: 'I_1', unit: 'A', min: -100, max: 100, step: 10, value: 100 },
      { key: 'I2', name: '電流', symbol: 'I_2', unit: 'A', min: -100, max: 100, step: 10, value: 100 },
      { key: 'r', name: '距離', symbol: 'r', unit: 'm', min: 0.1, max: 0.5, step: 0.1, value: 0.2 },
    ],
    presets: [],
    compute,
    draw,
    caption(p, r) {
      if (r.F === 0) return 'どちらかの電流が 0 なので、力は 0。';
      return `1 m あたり ${sig(milliNewton(r.F))} mN で${r.F < 0 ? '引き合う' : '反発する'}。距離2倍で半分になる。`;
    },
    readouts: (p, r) => [
      { name: 'I₂ の所の磁界', symbol: 'H', value: sig(r.H), unit: 'A/m' },
      { name: '磁束密度', symbol: 'B', value: sig(microTesla(r.B)), unit: 'μT' },
      { name: '1 m あたりの力', symbol: 'F', value: sig(milliNewton(r.F)), unit: 'mN', cls: 'q-mech' },
    ],
    terms: [
      ['磁界 <var>H</var>', '電流や磁石のまわりにできる、磁石の力がはたらく場。まっすぐな電流のまわりでは同心円になる。単位 A/m。'],
      ['磁束密度 <var>B</var>', '磁界の中の電流が受ける力の強さを決める量。<var>B</var> = μ₀<var>H</var>。単位 T（テスラ）。μT は 10⁻⁶ T。'],
      ['透磁率 μ₀', '真空（空気）の値 4π × 10⁻⁷ H/m。<var>H</var> を <var>B</var> に換える比例定数。'],
      ['右ねじの法則', '電流の向きに右ねじを進めると、ねじを回す向きが磁界の向き。'],
      ['フレミングの左手の法則', '左手の中指を電流、人差し指を磁界に向けると、親指が力の向き（中指から「電・磁・力」）。'],
    ],
    tries: [
      { text: '距離 <var>r</var> を 0.2 → 0.4 m（2倍）にすると、力は？', choices: ['半分', '4分の1', '変わらない'], answer: 0, set: { r: 0.4 }, look: '10 → 5 mN。平行な電流の力は距離に反比例（2乗ではない）。磁界 <var>H</var> も半分になる。' },
      { text: '<var>I</var><sub>2</sub> を下向き（−100 A）にすると？', choices: ['引き合う', '反発する', '力が 0'], answer: 1, set: { I2: -100 }, look: '反対向きの電流は反発する。大きさは同じ 10 mN。電荷（同じ符号で反発）とは逆。' },
      { text: '<var>I</var><sub>1</sub> を下向き（−100 A）にすると、<var>I</var><sub>1</sub> の右側の磁界は？', choices: ['奥へ（⊗）のまま', '手前へ（⊙）になる', '0 になる'], answer: 1, set: { I1: -100 }, look: '電流が逆向きになると、磁界も逆向き（右ねじの法則）。<var>I</var><sub>2</sub> とは反対向きの電流になり、反発する。' },
    ],
    quiz: [
      { q: '平行な2本の電流の距離を2倍にすると、1 m あたりの力は？', choices: ['2倍', '半分', '4分の1', '変わらない'], answer: 1, why: '<var>F</var> = μ₀<var>I</var><sub>1</sub><var>I</var><sub>2</sub> ÷ 2π<var>r</var> は距離に反比例。クーロン力（2乗に反比例）とちがう。' },
      { q: '10 A の直線電流から 0.1 m の所の磁束密度は？（μ₀ = 4π × 10⁻⁷ H/m）', choices: ['2 × 10⁻⁵ T', '2 × 10⁻⁶ T', '6.28 × 10⁻⁵ T', '1.59 × 10⁻⁵ T'], answer: 0, why: '<var>B</var> = μ₀<var>I</var> ÷ 2π<var>r</var> = 2 × 10⁻⁷ × 10 ÷ 0.1 = 2 × 10⁻⁵ T。' },
      { q: 'フレミングの左手の法則で、親指が表すのは？', choices: ['電流の向き', '磁界の向き', '力の向き'], answer: 2, why: '中指＝電流、人差し指＝磁界、親指＝力（中指から「電・磁・力」）。' },
    ],
    exam: {
      lead: '磁気の基本。直線電流の磁界、磁界の中の導線の力、平行な導線の力が、計算と正誤の問題で出る。ループ状の導線の力や、ソレノイド・円形コイルの磁界も同じ仲間。',
      often: [
        '$H$ = $I$ ÷ 2π$r$、$B$ = $μ_0$$H$。直線電流の磁界は距離に反比例。',
        '平行な導線の 1 m あたりの力 $F$ = $μ_0$$I_1$$I_2$ ÷ 2π$r$。四角いループでは、近い辺と遠い辺の力の差になる。',
        '無限に長いソレノイドの内部は $H$ = $N$$I$（$N$ は 1 m あたりの巻数）、円形コイルの中心は $H$ = $I$ ÷ 2$r$。',
      ],
      traps: [
        '平行な導線の力は距離に反比例（2乗ではない）。クーロン力と混ぜない。',
        '電荷は同じ符号で反発するが、電流は同じ向きで引き合う。',
        '力の向きは左手（フレミングの左手）。右手は発電（誘導起電力）の向き。',
      ],
    },
    conditions: '真空（空気）中の、十分に長い平行な導線。μ₀ = 4π × 10⁻⁷ H/m。図の導線は 1 m 分、電流は上向きを ＋',
    explain: {
      points: [
        'まっすぐな電流のまわりには同心円の磁界ができ、強さは $H$ = $I$ ÷ 2π$r$。',
        '磁界の中の電流は力 $F$ = $B$$I$$l$ を受ける。向きはフレミングの左手。',
        '平行な電流は、同じ向きなら引き合い、反対向きなら反発する。力は距離に反比例。',
      ],
      look: [
        ['arrow', 'q-current', '赤い矢印＝電流の向き（上向きが ＋）。'],
        ['ring', 'ink', '墨の ⊗（紙の奥へ）・⊙（手前へ）＝ $I_1$ がつくる磁界の向き。$B$ は $I_2$ の所の向き。'],
        ['arrow', 'q-mech', '橙の矢印＝導線が受ける力。2本は同じ大きさで反対向き。'],
      ],
      formulas: [
        ['H = I ÷ 2πr', 'まっすぐな電流から $r$ の所の磁界（円周 2π$r$ に $I$ が分かれる）。', '電流のまわりの磁界'],
        ['B = μ_{0}H', '磁束密度 ＝ 透磁率 × 磁界。', '$H$ から $B$ を求める時'],
        ['F = BIl', '磁界と直角な導線が受ける力（電磁力）。', '磁界の中の導線の力'],
        ['F = μ_{0}I_{1}I_{2} ÷ 2πr', '平行な電流の 1 m あたりの力（= 2 × 10⁻⁷ × $I_1$$I_2$ ÷ $r$）。', '平行な導線の力'],
      ],
      symbols: [
        ['I', '電流', 'A'],
        ['r', '電流からの距離', 'm'],
        ['H', '磁界の強さ', 'A/m'],
        ['B', '磁束密度', 'T'],
        ['μ_0', '真空の透磁率（4π × 10⁻⁷）', 'H/m'],
        ['l', '導線の長さ', 'm'],
        ['F', '力', 'N'],
      ],
    },
  };
})(this);
