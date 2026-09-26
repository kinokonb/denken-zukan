// 理論：位相とフェーザ。位相のずれた2つの交流電圧を、回る矢印（フェーザ）と波で見て、矢印で足す（複素数でも同じ）
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const DIAGRAM = { x: 86, y: 112, r: 66 };
  const WAVE = { left: 176, right: 350, y: 112, amplitude: 60 };
  const TURN_SECONDS = 3; // 矢印が1回転する秒数（見やすい速さ）
  const WAVE_TURNS = 1.5; // 波の区間に入る回転の数

  function compute(p) {
    const v1 = Phasor.fromPolar(p.V1, 0);
    const v2 = Phasor.fromPolar(p.V2, p.theta);
    const sum = Phasor.add(v1, v2);
    return { v1, v2, sum, V: Phasor.magnitude(sum), phi: Phasor.magnitude(sum) < 1e-9 ? 0 : Phasor.angle(sum) };
  }

  const fixed = (value, digits = 1) => Notation.number(Math.abs(value) < 5e-10 ? 0 : value, digits);
  const complexText = ({ re, im }) => `${fixed(re, 1)} ${im < -1e-9 ? '−' : '+'} j${fixed(Math.abs(im), 1)}`;
  const leadText = (deg) => (Math.abs(deg) < 1e-9 ? '同じ位相' : `${Math.abs(deg)}° ${deg > 0 ? '進み' : '遅れ'}`);
  // 矢印と波の縮尺：いちばん長い矢印をそろえる
  const scaleOf = (p, r) => 1 / Math.max(p.V1, p.V2, r.V, 1);

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const { x, y, r: radius } = DIAGRAM;
    Svg.el(g, 'circle', { cx: x, cy: y, r: radius, class: 'stator' });
    Svg.guide(g, x - radius - 8, y, x + radius + 8, y, 'axis');
    Svg.guide(g, WAVE.left, WAVE.y, WAVE.right, WAVE.y, 'axis');
    Svg.note(g, x, 20, 'フェーザ（回る矢印）', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, WAVE.left, 20, '瞬時値の波（矢印の高さ）', { cls: 'faint' });
    Svg.note(g, 16, 208, `V₂ は ${leadText(p.theta)}。合成 ${fixed(r.V)} V（和の ${fixed(p.V1 + p.V2, 0)} V ではない）`, { cls: 'value' });
    Svg.note(g, 16, 228, `√(${p.V1}² + ${p.V2}² + 2×${p.V1}×${p.V2}×cos ${p.theta}°) = ${fixed(r.V)} V`, { cls: 'faint' });
    Svg.note(g, 16, 248, `複素数：V₁ = ${complexText(r.v1)}、V₂ = ${complexText(r.v2)}、V = ${complexText(r.sum)}`, { cls: 'faint' });
  }

  // 回る矢印（V₁ の先に V₂ をつなぎ、合成 V）と、左端がいまの時刻の波
  function drawTurning(g, p, r, time) {
    const { x, y, r: radius } = DIAGRAM;
    const turn = (2 * Math.PI * time) / TURN_SECONDS;
    const k = scaleOf(p, r);
    const tip = (magnitude, deg) => [x + radius * k * magnitude * Math.cos(turn + Phasor.toRad(deg)), y - radius * k * magnitude * Math.sin(turn + Phasor.toRad(deg))];
    const [ax, ay] = tip(p.V1, 0);
    const [bx, by] = [ax + radius * k * p.V2 * Math.cos(turn + Phasor.toRad(p.theta)), ay - radius * k * p.V2 * Math.sin(turn + Phasor.toRad(p.theta))];
    Svg.arrow(g, x, y, bx, by, { cls: 'q-voltage', width: 3 });
    Svg.arrow(g, x, y, ax, ay, { cls: 'q-voltage', width: 1.8 });
    Svg.arrow(g, ax, ay, bx, by, { cls: 'q-voltage', width: 1.8, dashed: true });
    Svg.label(g, (x + ax) / 2, (y + ay) / 2 - 10, 'V_1', { cls: 'q-voltage', size: 13 });
    Svg.label(g, (ax + bx) / 2 + 8, (ay + by) / 2, 'V_2', { cls: 'q-voltage', size: 13 });
    Svg.label(g, bx + 8, by - 8, 'V', { cls: 'q-voltage', size: 15 });
    // 波：左端が「いま」。右へ行くほど前の時刻
    const waves = [[p.V1, 0, 'q-voltage'], [p.V2, p.theta, 'q-voltage dashed'], [r.V, r.phi, 'q-voltage thick']];
    for (const [magnitude, deg, cls] of waves) {
      const points = [];
      for (let i = 0; i <= 120; i++) {
        const along = (WAVE.right - WAVE.left) * (i / 120);
        const phase = turn + Phasor.toRad(deg) - (2 * Math.PI * WAVE_TURNS * i) / 120;
        points.push([WAVE.left + along, WAVE.y - WAVE.amplitude * k * magnitude * Math.sin(phase)]);
      }
      Svg.polyline(g, points, cls);
    }
    Svg.guide(g, bx, by, WAVE.left, by);
  }

  global.TopicPhasor = {
    id: 'phasor',
    title: '位相とフェーザ',
    lead: '位相のずれた交流は、回る矢印（フェーザ）で表して、矢印の足し算で合わせる。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'V1', name: '電圧の実効値', symbol: 'V_1', unit: 'V', min: 50, max: 150, step: 10, value: 100 },
      { key: 'V2', name: '電圧の実効値', symbol: 'V_2', unit: 'V', min: 0, max: 150, step: 10, value: 100 },
      { key: 'theta', name: 'V₂ の位相（進み＋）', symbol: 'θ', unit: '°', min: -180, max: 180, step: 15, value: 90 },
    ],
    presets: [
      { name: '同じ位相', apply: () => ({ theta: 0 }) },
      { name: '反対（180°）', apply: () => ({ theta: 180 }) },
    ],
    compute,
    draw,
    motion: { draw: drawTurning },
    caption(p, r) {
      return `V₁ と V₂ の和は ${fixed(r.V)} V、向きは V₁ から ${fixed(r.phi, 0)}°。ずれが大きいほど和は小さい。`;
    },
    readouts: (p, r) => [
      { name: '合成の大きさ', symbol: 'V', value: fixed(r.V), unit: 'V', cls: 'q-voltage' },
      { name: '合成の向き', symbol: 'φ', value: fixed(r.phi, 0), unit: '°' },
      { name: '合成（複素数）', symbol: 'V', value: complexText(r.sum), unit: 'V', cls: 'q-voltage' },
      { name: '数字の和（くらべる用）', symbol: 'V_1 + V_2', value: fixed(p.V1 + p.V2, 0), unit: 'V' },
    ],
    terms: [
      ['位相', '波がどこまで進んでいるかを表す角度。sin(ω<var>t</var> + θ) の θ。'],
      ['進み・遅れ', '＋θ は先に山が来る（進み）、−θ は後に来る（遅れ）。'],
      ['フェーザ', '交流を、長さ＝実効値、向き＝位相の矢印で表したもの。図の矢印は、ω で回りながら高さが瞬時値になる。'],
      ['複素数表示', '矢印を横（実部 <var>a</var>）と縦（虚部 <var>b</var>）に分けて <var>a</var> + j<var>b</var> と書く。j は縦向きの印。'],
      ['合成', '直列の電圧のように、足し合わせたもの。矢印の先につないで足す。'],
    ],
    tries: [
      { text: '位相差 θ を 90 → 0° にすると、合成は？', choices: ['100 V', '約 141 V', '200 V'], answer: 2, set: { theta: 0 }, look: '同じ向きの矢印は、長さがそのまま足し算。100 + 100 = 200 V。波も山がそろう。' },
      { text: 'θ を 180°（反対向き）にすると、合成は？', choices: ['0 V', '100 V', '200 V'], answer: 0, set: { theta: 180 }, look: '反対向きの同じ長さの矢印は打ち消し合い、合成 0。波も山と谷が重なって消える。' },
      { text: 'θ を 120° にすると、合成は？', choices: ['0 V', '100 V', '約 141 V'], answer: 1, set: { theta: 120 }, look: '100 V どうしを 120° ずらすと、矢印が正三角形をつくり、合成も 100 V。三相交流で出てくる形。' },
    ],
    quiz: [
      { q: '<var>v</var><sub>1</sub> = 100√2 sin ω<var>t</var>、<var>v</var><sub>2</sub> = 100√2 sin(ω<var>t</var> + π/2) の和の実効値は？', choices: ['100 V', '約 141 V', '200 V', '0 V'], answer: 1, why: '90° ずれた 100 V どうしは √(100² + 100²) ≒ 141 V。' },
      { q: '60 + j80 [V] の大きさは？', choices: ['60 V', '80 V', '100 V', '140 V'], answer: 2, why: '√(60² + 80²) = 100 V。' },
      { q: 'sin(ω<var>t</var> − π/6) は、sin ω<var>t</var> にくらべて？', choices: ['30° 進み', '30° 遅れ', '60° 遅れ', '同じ'], answer: 1, why: '−π/6 = −30° なので 30° 遅れ（山が後から来る）。' },
    ],
    exam: {
      lead: '交流回路は、電圧・電流をフェーザ（矢印・複素数）で表して足し算する。RLC 回路・三相交流・電力の問題の土台になる。',
      often: [
        '位相のずれた電圧は、矢印で足す。90° ずれなら √($A$² + $B$²)。',
        '複素数 $a$ + j$b$ は、大きさ √($a$² + $b$²)、角度 tan⁻¹($b$ ÷ $a$)。足し算は実部どうし・虚部どうし。',
      ],
      traps: [
        '実効値の数字をそのまま足さない（90° ずれた 100 V どうしは 141 V）。',
        'sin(ω$t$ + θ) の +θ は進み、−θ は遅れ。π/6 = 30°、π/3 = 60°、π/2 = 90°。',
      ],
    },
    conditions: '同じ周波数の2つの正弦波。矢印の長さは実効値、角度は V₁ を基準に反時計回りを進みとする（回る速さは見やすくしてある）',
    explain: {
      points: [
        '位相のずれた交流は、長さ＝実効値、向き＝位相の矢印（フェーザ）で表す。',
        '合わせた電圧は、矢印の先につないだ矢印（ベクトルの和、基礎9）。数字の足し算ではない。',
        '複素数 $a$ + j$b$ で書くと、足し算は実部どうし・虚部どうしでできる。',
      ],
      look: [
        ['arrow', 'q-voltage', '細い矢印 $V_1$、点線の矢印 $V_2$、太い矢印 $V$（合成）。ω で回り、高さが瞬時値。'],
        ['curve', 'q-voltage', '右の波＝矢印の高さの変化。細い線 $v_1$、点線 $v_2$、太い線が合成。左端がいまの時刻。'],
        ['text', 'ink', '下の3行＝いまの位相差と、余弦定理・複素数での合成。'],
      ],
      formulas: [
        ['V = √(A² + B² + 2AB cos θ)', '位相差 θ の2つの矢印の和の大きさ（余弦定理）。', '2つの電圧・電流を合わせる時'],
        ['|a + jb| = √(a² + b²)', '複素数の大きさ（直角三角形の斜辺）。', '複素数で書かれた値の大きさ'],
        ['φ = tan⁻¹(b ÷ a)', '複素数の角度（位相）。', '進み・遅れの角度を求める時'],
      ],
      symbols: [
        ['V_1・V_2', '2つの電圧の実効値（矢印の長さ）', 'V'],
        ['θ', 'V₂ の位相差（進みを＋）', '°'],
        ['V', '合成の電圧', 'V'],
        ['a + jb', '複素数表示（実部 a・虚部 b）', 'V'],
      ],
    },
  };
})(this);
