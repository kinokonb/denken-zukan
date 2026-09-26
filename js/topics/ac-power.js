// 理論：交流の電力と力率。電圧と、θ だけ遅れた電流をかけた瞬時電力 p = v × i の波と、そのならした高さ（有効電力 P）を見る
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const WAVE = { left: 40, right: 346, y: 68, amplitude: 40 };
  const POWER = { top: 118, bottom: 206 };
  const PERIODS = 2;
  const PERIOD_SECONDS = 2.4; // 動く縦線が1周期を進む秒数（見やすい速さ）

  function compute(p) {
    return { ...AcWave.power({ V: p.V, I: p.I, pf: p.pf }), theta: Math.acos(p.pf) };
  }

  const fixed = (value, digits = 0) => Notation.number(value, digits);
  const toX = (phase) => WAVE.left + (phase / (2 * Math.PI * PERIODS)) * (WAVE.right - WAVE.left);
  // 瞬時値（最大値 = 実効値 × √2）
  const voltAt = (p, phase) => p.V * Math.SQRT2 * Math.sin(phase);
  const ampAt = (p, r, phase) => p.I * Math.SQRT2 * Math.sin(phase - r.theta);
  // 瞬時電力の縦：いまの S × 2（p の山の高さの上限）を上端に
  function powerScale(r) {
    const top = 2 * r.S;
    const zero = POWER.top + ((POWER.bottom - POWER.top) * top) / (top + r.S);
    return { zero, toY: (w) => zero - (w / (top + r.S)) * (POWER.bottom - POWER.top) };
  }

  function curve(map) {
    const points = [];
    for (let i = 0; i <= 240; i++) {
      const phase = (2 * Math.PI * PERIODS * i) / 240;
      points.push([toX(phase), map(phase)]);
    }
    return points;
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const { left, right, y, amplitude } = WAVE;
    Svg.guide(g, left, y, right, y, 'axis');
    Svg.note(g, left, 14, '電圧 v と電流 i（i は θ 遅れ）', { cls: 'faint' });
    Svg.polyline(g, curve((phase) => y - amplitude * Math.sin(phase)), 'q-voltage thick');
    Svg.polyline(g, curve((phase) => y - amplitude * 0.7 * Math.sin(phase - r.theta)), 'q-current');
    Svg.label(g, toX(Math.PI / 2) + 6, y - amplitude - 4, 'v', { cls: 'q-voltage', anchor: 'start', size: 14 });
    Svg.label(g, toX(Math.PI / 2 + r.theta) + 6, y - amplitude * 0.7 - 2, 'i', { cls: 'q-current', anchor: 'start', size: 14 });
    // 瞬時電力と、そのならした高さ（有効電力）
    const { zero, toY } = powerScale(r);
    Svg.guide(g, left, zero, right, zero, 'axis');
    Svg.note(g, left, POWER.top - 6, '瞬時電力 p = v × i', { cls: 'faint' });
    Svg.note(g, left - 4, zero, '0', { cls: 'faint', anchor: 'end' });
    Svg.polyline(g, curve((phase) => toY(voltAt(p, phase) * ampAt(p, r, phase))), 'q-active thick');
    Svg.el(g, 'line', { x1: left, y1: toY(r.P), x2: right, y2: toY(r.P), class: 'curve reference' });
    Svg.note(g, right, toY(r.P) - 8, `ならした高さ＝有効電力 ${fixed(r.P)} W`, { cls: 'value q-active', anchor: 'end' });
    Svg.note(g, 16, 228, `P = VI cosθ = ${p.V} × ${p.I} × ${Notation.number(p.pf, 2)} = ${fixed(r.P)} W`, { cls: 'value q-active' });
    Svg.note(g, 16, 248, `S = ${fixed(r.S)} VA、Q = ${fixed(r.Q)} var。p が 0 より下は電源へもどる電力`, { cls: 'faint' });
  }

  function drawNow(g, p, r, time) {
    const phase = ((time / PERIOD_SECONDS) * 2 * Math.PI) % (2 * Math.PI * PERIODS);
    const x = toX(phase);
    const { toY } = powerScale(r);
    Svg.el(g, 'circle', { cx: x, cy: toY(voltAt(p, phase) * ampAt(p, r, phase)), r: 4.5, class: 'dot q-active' });
    Svg.el(g, 'circle', { cx: x, cy: WAVE.y - WAVE.amplitude * Math.sin(phase), r: 3.5, class: 'dot q-voltage' });
    Svg.guide(g, x, WAVE.y - WAVE.amplitude - 6, x, POWER.bottom);
  }

  global.TopicAcPower = {
    id: 'ac-power',
    title: '交流の電力と力率',
    lead: '交流の電力は v × i の平均。電流が θ 遅れると平均が減り、P = VI cosθ になる。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'V', name: '電圧の実効値', symbol: 'V', unit: 'V', min: 50, max: 200, step: 10, value: 100 },
      { key: 'I', name: '電流の実効値', symbol: 'I', unit: 'A', min: 1, max: 10, step: 1, value: 5 },
      { key: 'pf', name: '力率（遅れ）', symbol: 'cosθ', unit: '', min: 0, max: 1, step: 0.05, value: 0.8 },
    ],
    presets: [
      { name: '力率 1（抵抗だけ）', apply: () => ({ pf: 1 }) },
      { name: '力率 0（コイルだけ）', apply: () => ({ pf: 0 }) },
    ],
    compute,
    draw,
    motion: { draw: drawNow },
    caption(p, r) {
      return `v × i の平均が ${fixed(r.P)} W（見かけの ${fixed(r.S)} VA の ${Notation.number(p.pf, 2)} 倍）。これが力率。`;
    },
    readouts: (p, r) => [
      { name: '有効電力', symbol: 'P', value: fixed(r.P), unit: 'W', cls: 'q-active' },
      { name: '無効電力', symbol: 'Q', value: fixed(r.Q), unit: 'var', cls: 'q-reactive' },
      { name: '皮相電力', symbol: 'S', value: fixed(r.S), unit: 'VA' },
      { name: '電流の遅れ', symbol: 'θ', value: fixed((r.theta * 180) / Math.PI, 1), unit: '°' },
    ],
    terms: [
      ['瞬時電力 <var>p</var>', 'ある瞬間の電圧 × 電流。交流では時々刻々変わり、負（電源へもどる）の時もある。'],
      ['有効電力 <var>P</var>', '瞬時電力の平均。実際に熱や仕事になる電力。単位 W。'],
      ['無効電力 <var>Q</var>', 'コイル・コンデンサと電源の間を行き来するだけの電力。単位 var（バール）。'],
      ['皮相電力 <var>S</var>', '電圧 × 電流の見かけの電力。単位 VA。電線や変圧器の大きさはこれで決まる。'],
      ['力率 cosθ', '<var>P</var> ÷ <var>S</var>。電流の遅れ（進み）θ の cos。'],
    ],
    tries: [
      { text: '力率を 0.8 → 1 にすると、有効電力は？', choices: ['減る', '変わらない', '増える'], answer: 2, set: { pf: 1 }, look: '電流が電圧と同相になり、p はいつも 0 以上。平均は 400 → 500 W に増える。' },
      { text: '力率を 0（コイルだけ、θ = 90°）にすると、有効電力は？', choices: ['0 W', '250 W', '500 W'], answer: 0, set: { pf: 0 }, look: 'p は正と負が同じだけ出て、平均は 0。電力は電源とコイルの間を行き来するだけ（無効電力 500 var）。' },
      { text: '力率 0.6 にすると、有効電力は？', choices: ['300 W', '400 W', '500 W'], answer: 0, set: { pf: 0.6 }, look: '100 × 5 × 0.6 = 300 W。p が負になる所が増える。無効電力は 400 var。' },
    ],
    quiz: [
      { q: '100 V・5 A・力率 0.8（遅れ）の有効電力は？', choices: ['300 W', '400 W', '500 W', '625 W'], answer: 1, why: '<var>P</var> = <var>VI</var> cosθ = 100 × 5 × 0.8 = 400 W。' },
      { q: '同じ条件の無効電力は？', choices: ['200 var', '300 var', '400 var', '500 var'], answer: 1, why: 'sinθ = 0.6 なので <var>Q</var> = 100 × 5 × 0.6 = 300 var。' },
      { q: 'コイルだけの回路の有効電力は？', choices: ['0', '<var>VI</var>', '<var>VI</var> ÷ 2', '<var>VI</var> × 0.8'], answer: 0, why: '電流が 90° 遅れ（cosθ = 0）。瞬時電力の平均は 0。' },
    ],
    exam: {
      lead: '交流の電力の基本。単相・三相の電力、力率改善、電圧降下（電力科目）、電力量の計算の土台になる。',
      often: [
        '$P$ = $VI$ cosθ [W]、$Q$ = $VI$ sinθ [var]、$S$ = $VI$ [VA]、$S$² = $P$² + $Q$²。',
        'RL 直列なら cosθ = $R$ ÷ $Z$、有効電力は抵抗だけで使われ $P$ = $I$²$R$。',
      ],
      traps: [
        '単位を分ける：W（有効）・var（無効）・VA（皮相）。',
        '有効電力は電圧 × 電流ではない（cosθ をかける）。コイル・コンデンサは電力を使わない。',
      ],
    },
    conditions: '単相の交流で、電流は電圧より θ 遅れる（遅れ力率）。波は2周期を描く（動く縦線は見やすい速さ）',
    explain: {
      points: [
        '交流の電力は、瞬時電力 $v$ × $i$ の平均（有効電力 $P$）。',
        '電流が θ ずれると、$p$ が負（電源へもどる）の時ができて平均が減る：$P$ = $VI$ cosθ。',
        'cosθ を力率という。行き来するだけの分が無効電力 $Q$ = $VI$ sinθ。',
      ],
      look: [
        ['curve', 'q-voltage', '上の青い波＝電圧 $v$。赤い波＝電流 $i$（θ 遅れ）。'],
        ['curve', 'q-active', '下の緑の波＝瞬時電力 $p$ = $v$ × $i$。点線がそのならした高さ＝有効電力。'],
        ['line', 'ink', '動く縦線＝いまの時刻。0 より下の所は、電力が電源へもどっている。'],
      ],
      formulas: [
        ['P = VI cosθ', '有効電力（瞬時電力の平均）。', '消費する電力を求める時'],
        ['Q = VI sinθ', '無効電力（行き来するだけ）。', '力率改善・電圧降下の問題で'],
        ['S = VI = √(P² + Q²)', '皮相電力（見かけの電力）。', '電線・変圧器の大きさを考える時'],
      ],
      symbols: [
        ['P', '有効電力', 'W'],
        ['Q', '無効電力', 'var'],
        ['S', '皮相電力', 'VA'],
        ['cosθ', '力率', '―'],
      ],
    },
  };
})(this);
