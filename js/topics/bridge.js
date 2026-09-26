// 理論：ブリッジ回路。4つの抵抗の左右の辺の間（点C・D）に検流計を渡し、つり合い（対辺の積が等しい）を見る
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const B = { battery: 30, left: 110, right: 280, top: 44, bottom: 212, mid: 128, meter: 205 };
  const GALVANOMETER_R = 10; // 検流計の抵抗 [Ω]
  const DOT_SPEED = 40; // 電流 1 A あたり、点が1秒に進む長さ

  function compute(p) {
    return DcCircuit.bridge({ E: p.E, R1: p.R1, R2: p.R2, R3: p.R3, R4: p.R4, Rg: GALVANOMETER_R });
  }

  const milli = (amperes) => Notation.number(amperes * 1000, 1);
  const balanced = (p) => Math.abs(p.R1 * p.R4 - p.R2 * p.R3) < 1e-9;

  function paths() {
    const { battery, left, right, top, bottom, mid } = B;
    return {
      supply: [[battery, mid], [battery, top], [left, top]],
      toRight: [[left, top], [right, top]],
      arm1: [[left, top], [left, mid]],
      arm2: [[left, mid], [left, bottom]],
      arm3: [[right, top], [right, mid]],
      arm4: [[right, mid], [right, bottom]],
      fromRight: [[right, bottom], [left, bottom]],
      back: [[left, bottom], [battery, bottom], [battery, mid]],
      galvanometer: [[left, mid], [right, mid]],
    };
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const { battery, left, right, top, bottom, mid, meter } = B;
    for (const [name, path] of Object.entries(paths())) if (name !== 'galvanometer') Svg.wire(g, path);
    Svg.wire(g, [[left, mid], [meter - 24, mid]]);
    Svg.wire(g, [[meter + 24, mid], [right, mid]]);
    Svg.battery(g, battery, mid);
    Svg.note(g, battery + 18, mid + 44, `E ${Notation.number(p.E, 0)} V`, { cls: 'value q-voltage' });
    // 辺の文字はどれも抵抗の右に書く（左の辺は内側、右の辺は外側）
    const arms = [[left, 86, 'R₁', p.R1], [left, 170, 'R₂', p.R2], [right, 86, 'R₃', p.R3], [right, 170, 'R₄', p.R4]];
    for (const [x, y, name, value] of arms) {
      Svg.resistor(g, x, y, { vertical: true });
      Svg.note(g, x + 14, y, `${name} ${Notation.number(value, 0)} Ω`, { cls: 'value q-active' });
    }
    for (const [x, name, V, anchor] of [[left, 'C', r.VC, 'end'], [right, 'D', r.VD, 'start']]) {
      Svg.el(g, 'circle', { cx: x, cy: mid, r: 3.5, class: 'dot ink' });
      Svg.note(g, anchor === 'end' ? x - 10 : x + 10, mid - 10, name, { cls: 'value', anchor });
      Svg.note(g, anchor === 'end' ? x - 10 : x + 10, mid + 8, `${Notation.number(V, 2)} V`, { cls: 'value q-voltage', anchor });
    }
    Svg.gauge(g, meter, mid, { value: r.Ig * 1000, min: -50, max: 50, letter: 'G', cls: 'q-current', mark: 0 });
    Svg.note(g, meter, mid + 40, `${milli(r.Ig)} mA`, { cls: 'value q-current', anchor: 'middle' });
    const same = balanced(p);
    Svg.note(g, 16, bottom + 22, `対辺の積：R₁R₄ = ${Notation.number(p.R1 * p.R4, 0)}、R₂R₃ = ${Notation.number(p.R2 * p.R3, 0)}${same ? '（等しい）' : ''}`, { cls: 'value' });
    Svg.note(g, 16, bottom + 42, same ? 'つり合い：C と D の電位が同じで、検流計は 0' : `つり合っていない：${r.Ig > 0 ? 'C → D' : 'D → C'} に電流`, { cls: same ? 'value' : 'faint' });
  }

  function drawFlow(g, p, r, time) {
    const move = time * DOT_SPEED;
    const ps = paths();
    const flows = { supply: r.I, toRight: r.I3, arm1: r.I1, arm2: r.I2, arm3: r.I3, arm4: r.I4, fromRight: r.I4, back: r.I };
    for (const [name, current] of Object.entries(flows)) Svg.flowDots(g, ps[name], move * current);
    if (Math.abs(r.Ig) > 1e-9) {
      Svg.flowDots(g, [[B.left, B.mid], [B.meter - 24, B.mid]], move * r.Ig);
      Svg.flowDots(g, [[B.meter + 24, B.mid], [B.right, B.mid]], move * r.Ig);
    }
  }

  global.TopicBridge = {
    id: 'bridge',
    title: 'ブリッジ回路',
    lead: '向かい合う辺の抵抗の積が等しいと（R₁R₄ = R₂R₃）、真ん中の検流計に電流が流れない。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'E', name: '電池の電圧', symbol: 'E', unit: 'V', min: 1, max: 24, step: 1, value: 12 },
      { key: 'R1', name: '抵抗', symbol: 'R_1', unit: 'Ω', min: 1, max: 40, step: 1, value: 10 },
      { key: 'R2', name: '抵抗', symbol: 'R_2', unit: 'Ω', min: 1, max: 40, step: 1, value: 20 },
      { key: 'R3', name: '抵抗', symbol: 'R_3', unit: 'Ω', min: 1, max: 40, step: 1, value: 15 },
      { key: 'R4', name: '抵抗', symbol: 'R_4', unit: 'Ω', min: 1, max: 60, step: 1, value: 30 },
    ],
    presets: [],
    compute,
    draw,
    motion: { draw: drawFlow },
    caption(p, r) {
      if (balanced(p)) return `C・D とも ${Notation.number(r.VC, 2)} V。電位が同じなので、検流計の線には電流が流れない。`;
      return `C は ${Notation.number(r.VC, 2)} V、D は ${Notation.number(r.VD, 2)} V。高い方から低い方へ、検流計に ${milli(Math.abs(r.Ig))} mA。`;
    },
    readouts: (p, r) => [
      { name: '検流計の電流', symbol: 'I_g', value: milli(r.Ig), unit: 'mA', cls: 'q-current' },
      { name: '点C の電位', symbol: 'V_C', value: Notation.number(r.VC, 2), unit: 'V', cls: 'q-voltage' },
      { name: '点D の電位', symbol: 'V_D', value: Notation.number(r.VD, 2), unit: 'V', cls: 'q-voltage' },
      { name: '電池の電流', symbol: 'I', value: Notation.number(r.I, 3), unit: 'A', cls: 'q-current' },
    ],
    terms: [
      ['ブリッジ回路', '4つの抵抗を四角につなぎ、左右の辺のまん中（点C・D）の間に計器を渡した回路。'],
      ['検流計', 'ごく小さい電流を、向きも含めて測る計器。針は真ん中が 0。'],
      ['電位', '下の導線（0 V）から測った、その点の電圧。'],
      ['つり合い', 'C と D の電位が等しく、検流計に電流が流れない状態。'],
      ['対辺', 'ブリッジで向かい合う辺。<var>R</var><sub>1</sub> と <var>R</var><sub>4</sub>、<var>R</var><sub>2</sub> と <var>R</var><sub>3</sub>。'],
      ['ホイートストンブリッジ', 'つり合いを使って未知の抵抗を測る道具。可変抵抗を回して検流計を 0 にする（零位法）。'],
    ],
    tries: [
      { text: '<var>R</var><sub>4</sub> を 30 → 40 Ω にすると、検流計の電流は？', choices: ['C から D へ', 'D から C へ', '流れない'], answer: 1, set: { R4: 40 }, look: 'D の方が C より電位が高くなり、D → C に約 26 mA 流れる。対辺の積 10 × 40 = 400 と 20 × 15 = 300 が等しくない。' },
      { text: '<var>R</var><sub>1</sub> を 20 Ω、<var>R</var><sub>3</sub> を 30 Ω（どちらも2倍）にすると？', choices: ['流れない（つり合ったまま）', 'C から D へ流れる', 'D から C へ流れる'], answer: 0, set: { R1: 20, R3: 30 }, look: '対辺の積 20 × 30 = 600、20 × 30 = 600 で等しいまま。左右とも上下の比が 1 : 1 で、C・D は 6 V どうし。' },
      { text: '電池を 12 → 24 V にすると、つり合いは？', choices: ['つり合ったまま', 'くずれる'], answer: 0, set: { E: 24 }, look: 'C・D の電位はどちらも 16 V になり、差は 0 のまま。つり合いは抵抗の比だけで決まり、電池の電圧によらない。' },
    ],
    quiz: [
      { q: '<var>R</var><sub>1</sub> = 2 Ω、<var>R</var><sub>2</sub> = 4 Ω、<var>R</var><sub>3</sub> = 3 Ω。つり合う <var>R</var><sub>4</sub> は？', choices: ['1.5 Ω', '6 Ω', '8 Ω', '12 Ω'], answer: 1, why: '対辺の積：<var>R</var><sub>1</sub><var>R</var><sub>4</sub> = <var>R</var><sub>2</sub><var>R</var><sub>3</sub>。2 × <var>R</var><sub>4</sub> = 4 × 3 = 12 で 6 Ω。' },
      { q: 'つり合ったブリッジで、検流計に流れる電流は？', choices: ['0', '電池の電流の半分', '電池の電流と同じ', '検流計の抵抗で決まる'], answer: 0, why: 'C と D の電位が同じなので、その間に電流は流れない。' },
      { q: 'つり合ったブリッジの、検流計の線を切ると電池の電流は？', choices: ['増える', '減る', '変わらない', '0 になる'], answer: 2, why: 'もともと電流が流れていない線なので、切っても（つないでも）ほかの電流は変わらない。' },
    ],
    exam: {
      lead: '直流回路のブリッジは、未知の抵抗を測る方法（ホイートストンブリッジ）として、また回路を簡単にする見方として出る。交流のインピーダンスのブリッジにも広がる。',
      often: [
        'つり合いの条件は「対辺の積が等しい」：$R_1$ × $R_4$ = $R_2$ × $R_3$。',
        'つり合っていれば、検流計（やスイッチ）の枝は無いものとして回路を計算できる。開いても閉じても電流は同じ。',
      ],
      traps: [
        '「となりどうしの積」ではなく「向かい合う辺の積」。どの辺が向かい合うかを図で確かめる。',
        'つり合いは電池の電圧によらない。電圧を変えても 0 のまま。',
      ],
    },
    conditions: `電池の中の抵抗と導線の抵抗は 0、検流計の抵抗は ${GALVANOMETER_R} Ω とする。下の導線を 0 V とする`,
    explain: {
      points: [
        '検流計の両端 C・D の電位が等しいと、検流計に電流は流れない（つり合い）。',
        'つり合いの条件は、向かい合う辺の抵抗の積が等しいこと：$R_1$ × $R_4$ = $R_2$ × $R_3$。',
        'つり合いを使うと、未知の抵抗を測れる（ホイートストンブリッジ）。',
      ],
      look: [
        ['dots', 'q-current', '赤い点＝電流の流れ。つり合うと、真ん中の検流計の線には流れない。'],
        ['text', 'q-voltage', '青い字＝点C・D の電位（下の導線を 0 V）。等しい時がつり合い。'],
        ['ring', 'q-current', '真ん中の計器＝検流計（mA）。真ん中が 0 で、C → D に流れると右に振れる。'],
      ],
      formulas: [
        ['R_{1}R_{4} = R_{2}R_{3}', 'つり合いの条件（対辺の積が等しい）。', '検流計が 0 の時'],
        ['V_C = E × R_2 ÷ (R_1 + R_2)', '点C の電位（左の辺の分圧）。D も同じ形。', 'つり合っているか確かめる時'],
        ['R_4 = R_{2}R_{3} ÷ R_1', 'つり合った時の未知の抵抗（R₄ を測りたい時）。', '抵抗を測る時'],
      ],
      symbols: [
        ['R_1〜R_4', 'ブリッジの4つの辺の抵抗', 'Ω'],
        ['V_C・V_D', '点C・D の電位', 'V'],
        ['I_g', '検流計の電流（C → D を正）', 'A'],
        ['E', '電池の電圧', 'V'],
      ],
    },
  };
})(this);
