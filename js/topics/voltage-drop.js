// 電力：三相3線式の送電線の電圧降下（1相分のフェーザ図）
(function (global) {
  'use strict';

  const RECEIVING_VOLTAGE = 6600; // V（線間）
  const DROP_MAGNIFY = 5; // RI・XI は小さすぎて見えないので拡大して描く
  const WIDTH = 360;
  const HEIGHT = 250;

  function compute(p) {
    return VoltageDrop.analyze({ Vr: RECEIVING_VOLTAGE, I: p.I, R: p.R, X: p.X, powerFactor: p.cos });
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const theta = Math.acos(r.cos);
    const m = DROP_MAGNIFY;
    const A = [r.Er, 0];
    const B = [A[0] + m * r.RI * r.cos, -m * r.RI * r.sin];
    const C = [B[0] + m * r.XI * r.sin, B[1] + m * r.XI * r.cos];
    const currentLength = 0.42 * r.Er;
    const Itip = [currentLength * r.cos, -currentLength * r.sin];

    const f = Svg.frame(
      {
        minX: 0,
        maxX: Math.max(A[0], B[0], C[0]),
        minY: Math.min(0, B[1], C[1], Itip[1]),
        maxY: Math.max(0, B[1], C[1]),
      },
      { x: 26, y: 34, w: 290, h: 170 },
    );
    const X = ([vx]) => f.x(vx);
    const Y = ([, vy]) => f.y(vy);
    const g = Svg.el(svg, 'g');
    const ox = f.x(0);
    const oy = f.y(0);

    Svg.guide(g, ox - 10, oy, WIDTH - 8, oy);

    // 近似式が見ている「横方向の成分」
    const bracketY = Math.max(oy, Y(B)) + 28;
    Svg.guide(g, X(A), oy, X(A), bracketY);
    Svg.guide(g, X(C), Y(C), X(C), bracketY);
    Svg.el(g, 'path', { d: `M${X(A)},${bracketY - 5} V${bracketY} H${X(C)} V${bracketY - 5}`, class: 'bracket' });
    Svg.note(g, X(C), bracketY + 13, '1相分の降下 ≒ RIcosθ + XIsinθ', { cls: 'faint', anchor: 'end' });

    Svg.arrow(g, ox, oy, X(A), oy, { cls: 'q-voltage', width: 2.5 });
    Svg.label(g, f.x(r.Er * 0.72), oy - 12, 'E_r', { cls: 'q-voltage' });

    Svg.arrow(g, X(A), oy, X(B), Y(B), { cls: 'q-active', width: 2.5 });
    Svg.label(g, X(B) - 6, Y(B) + 12, 'RI', { cls: 'q-active', anchor: 'end', size: 14 });

    Svg.arrow(g, X(B), Y(B), X(C), Y(C), { cls: 'q-reactive', width: 2.5 });
    Svg.label(g, (X(B) + X(C)) / 2 + 10, (Y(B) + Y(C)) / 2 + 4, 'jXI', { cls: 'q-reactive', anchor: 'start', size: 14 });

    Svg.arrow(g, ox, oy, X(C), Y(C), { cls: 'q-voltage', width: 3 });
    Svg.label(g, X(C) - 4, Y(C) - 14, 'E_s', { cls: 'q-voltage', anchor: 'end', size: 16 });

    Svg.arrow(g, ox, oy, X(Itip), Y(Itip), { cls: 'q-current', width: 2.5 });
    Svg.label(g, X(Itip) + 6, Y(Itip) + 10, 'I', { cls: 'q-current', anchor: 'start', size: 16 });

    if (theta > 0.05) {
      Svg.angleArc(g, ox, oy, 34, -theta, 0, { cls: 'arc-angle' });
      Svg.label(g, ox + 46 * Math.cos(-theta / 2), oy - 46 * Math.sin(-theta / 2), 'θ', { size: 14 });
    }

    Svg.note(g, 12, 16, `1相分。RI・jXI は${m}倍に拡大して描いています`, { cls: 'faint' });
  }

  global.TopicVoltageDrop = {
    id: 'voltage-drop',
    title: '送電線の電圧降下',
    lead: '降下はほぼ「RIcosθ + XIsinθ」。力率が悪いほど XIsinθ が効いて大きくなる。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'I', name: '負荷電流', symbol: 'I', unit: 'A', min: 10, max: 300, step: 5, value: 100 },
      { key: 'cos', name: '負荷の力率（遅れ）', symbol: 'cosθ', unit: '', min: 0.5, max: 1, step: 0.01, value: 0.8 },
      { key: 'R', name: '1線の抵抗', symbol: 'R', unit: 'Ω', min: 0.1, max: 3, step: 0.1, value: 1 },
      { key: 'X', name: '1線のリアクタンス', symbol: 'X', unit: 'Ω', min: 0.1, max: 3, step: 0.1, value: 2 },
    ],
    presets: [
      { name: '力率 1.0', apply: () => ({ cos: 1 }) },
      { name: '力率 0.6', apply: () => ({ cos: 0.6 }) },
    ],
    compute,
    draw,
    caption(p, r) {
      const diff = r.VsExact - r.VsApprox;
      return `正確に計算すると ${Notation.html('V_s')} = ${Notation.number(r.VsExact, 0)} V。近似式との差は ${Notation.number(diff, 1)} V だけ。`;
    },
    readouts: (p, r) => [
      { name: '電圧降下', symbol: 'v', value: Notation.number(r.drop, 0), unit: 'V', cls: 'q-voltage' },
      { name: '電圧降下率', symbol: 'ε', value: Notation.number(r.dropRate, 2), unit: '%' },
      { name: '送電端電圧', symbol: 'V_s', value: Notation.number(r.VsApprox, 0), unit: 'V' },
      { name: '線路損失', symbol: '3I²R', value: Notation.number(r.lineLoss / 1000, 1), unit: 'kW' },
    ],
    terms: [
      ['送電端・受電端', '電線で電気を送り出す側（発電所・変電所）と、受け取る側（工場など）。'],
      ['電圧降下', '電線の抵抗やリアクタンスのせいで、受電端の電圧が送電端より下がる分。'],
      ['力率 cos<var>θ</var>', '電流のうち、仕事に使われる向きの割合。モータが多いと電流が電圧より遅れて力率が下がる。'],
      ['相電圧・線間電圧', '三相の1相分の電圧と、2本の電線の間の電圧。線間電圧 = √3 × 相電圧（6,600 V なら相電圧は約 3,810 V）。'],
      ['三相3線式', '3本の電線で送る方式。送電線や高圧の配電線の基本。'],
    ],
    tries: [
      { text: '負荷電流 <var>I</var> を 100 A → 200 A（2倍）にする', set: { I: 200 }, look: '<var>RI</var>・<var>jXI</var> の矢印が2倍に伸び、電圧降下も約 346 V → 約 693 V と2倍になる。降下は電流に比例する。' },
      { text: '力率を 0.8 → 1.0 にする', set: { cos: 1 }, look: '電流 <var>I</var> が <var>E</var><sub>r</sub> と同じ向きになり、<var>jXI</var> は真上を向く。横の成分に効くのは <var>RI</var> だけになり、降下は約 173 V に減る。' },
      { text: '力率を 0.8 → 0.6 にする', set: { cos: 0.6 }, look: '電流の遅れ <var>θ</var> が大きくなり、<var>jXI</var> が横向きに近づく。<var>X</var> sin<var>θ</var> の分が増えて、降下は約 381 V に増える。' },
    ],
    quiz: [
      { q: '三相3線式で <var>I</var> = 100 A、<var>R</var> = 1 Ω、<var>X</var> = 0 Ω、力率 1 のとき、電圧降下はおよそ？', choices: ['100 V', '173 V', '200 V', '300 V'], answer: 1, why: '<var>v</var> ≒ √3 <var>I</var>(<var>R</var> cos<var>θ</var> + <var>X</var> sin<var>θ</var>) = 1.73 × 100 × 1 ≒ 173 V。' },
      { q: '電圧降下率の分母はどれ？', choices: ['送電端電圧', '受電端電圧', '電圧降下', '線電流'], answer: 1, why: '<var>ε</var> = (<var>V</var><sub>s</sub> − <var>V</var><sub>r</sub>) / <var>V</var><sub>r</sub> × 100 [%]。分母は受電端電圧。' },
      { q: '<var>X</var> が <var>R</var> より大きい送電線で、力率が悪く（<var>θ</var> が大きく）なると電圧降下は？', choices: ['小さくなる', '大きくなる', '変わらない', '0 になる'], answer: 1, why: '<var>X</var> sin<var>θ</var> の項が大きくなるため。つまみで力率を下げて確かめられる。' },
    ],
    exam: `<p>電力科目で送電は約50問、配電は約40問（過去12回、論点名から数えた目安）。電圧降下の計算は、そのどちらにもよく出てくる。</p>
      <ul>
        <li>${Notation.html('R')}・${Notation.html('X')} は1線あたりの値。三相は √3 倍、単相2線は 2 倍（往復）になる。</li>
        <li>電圧降下率の分母は受電端電圧 ${Notation.html('V_r')}。</li>
        <li>力率が悪い（θ が大きい）ほど ${Notation.html('X')} sin${Notation.html('θ')} の項が大きくなる。架空送電線は ${Notation.html('X')} が ${Notation.html('R')} より大きいことが多く、この差が効く。</li>
        <li>同じ電力を送るなら、力率を良くすると電流 ${Notation.html('I')} が減り、降下も損失も減る（法規の「力率改善」とつながる）。</li>
      </ul>`,
    conditions: `三相3線式、受電端電圧 ${Notation.html('V_r')} = ${Notation.number(RECEIVING_VOLTAGE, 0)} V（線間）`,
    notesHtml: `
      <h2>しくみ</h2>
      <p>1相分で考える。受電端の相電圧 ${Notation.html('E_r')} を基準にすると、遅れ力率の電流 ${Notation.html('I')} は θ だけ下を向く。線路の抵抗で ${Notation.html('RI')}（${Notation.html('I')} と同じ向き）、リアクタンスで ${Notation.html('jXI')}（${Notation.html('I')} より 90° 進む向き）の電圧が加わり、送電端の相電圧 ${Notation.html('E_s')} になる。</p>
      <p>${Notation.html('E_s')} の傾きは実際にはごく小さいので、横方向の成分だけを見れば大きさの差がほぼ求まる。これが近似式。</p>
      <h2>公式</h2>
      <ul class="formulas">
        <li>三相3線式：${Notation.html('v')} = ${Notation.html('V_s')} − ${Notation.html('V_r')} ≒ √3 ${Notation.html('I')}(${Notation.html('R')} cos${Notation.html('θ')} + ${Notation.html('X')} sin${Notation.html('θ')})</li>
        <li>単相2線式：${Notation.html('v')} ≒ 2${Notation.html('I')}(${Notation.html('R')} cos${Notation.html('θ')} + ${Notation.html('X')} sin${Notation.html('θ')})</li>
        <li>電圧降下率：${Notation.html('ε')} = (${Notation.html('V_s')} − ${Notation.html('V_r')}) / ${Notation.html('V_r')} × 100 [%]</li>
        <li>線路損失（三相3線式）：3${Notation.html('I')}²${Notation.html('R')}</li>
      </ul>
      <p class="symbols">${Notation.html('V_s')}・${Notation.html('V_r')}：送電端・受電端の線間電圧［V］、${Notation.html('E_s')}・${Notation.html('E_r')}：同じく相電圧［V］、${Notation.html('I')}：線電流［A］、${Notation.html('R')}・${Notation.html('X')}：1線の抵抗・リアクタンス［Ω］、cos${Notation.html('θ')}：負荷の力率</p>`,
  };
})(this);
