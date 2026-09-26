// 理論：正弦波と実効値。電圧の瞬時値 v と、その2乗（熱の出方）をならした高さから、実効値の意味を見る。直流を重ねることもできる
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const WAVE = { left: 44, right: 344, top: 18, bottom: 146, low: -160, high: 260 };
  const HEAT = { top: 172, bottom: 240 }; // v² は、いまの山の高さ（最大の v²）に合わせて描く
  const HEATER_R = 10; // 熱の比べ方の例に使う電熱線 [Ω]
  const PERIODS = 2;
  const PERIOD_SECONDS = 2.4; // 動く縦線が1周期を進む秒数（見やすい速さ。本当の 50 Hz は 0.02 秒）

  function compute(p) {
    const Vm = AcWave.peakFromRms(p.Va);
    return { Vm, peak: p.Vd + Vm, rms: AcWave.mixedRms(p.Vd, p.Va), P: AcWave.mixedRms(p.Vd, p.Va) ** 2 / HEATER_R };
  }

  const toX = (phase) => WAVE.left + (phase / (2 * Math.PI * PERIODS)) * (WAVE.right - WAVE.left);
  const toY = (v) => WAVE.bottom - ((v - WAVE.low) / (WAVE.high - WAVE.low)) * (WAVE.bottom - WAVE.top);
  const voltAt = (p, r, phase) => p.Vd + r.Vm * Math.sin(phase);

  function curve(p, r, map) {
    const points = [];
    for (let i = 0; i <= 240; i++) {
      const phase = (2 * Math.PI * PERIODS * i) / 240;
      points.push([toX(phase), map(voltAt(p, r, phase))]);
    }
    return points;
  }

  // v² の縦の位置（いまの波の v² の最大を上端に）。正弦波だけなら、ならした高さはちょうど半分
  function heatScale(p, r) {
    const top = Math.max(r.peak ** 2, (p.Vd - r.Vm) ** 2, 1e-9);
    return (v2) => HEAT.bottom - (v2 / top) * (HEAT.bottom - HEAT.top);
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const toHeat = heatScale(p, r);
    const g = Svg.el(svg, 'g');
    const { left, right } = WAVE;
    // 電圧の瞬時値
    Svg.guide(g, left, toY(0), right, toY(0), 'axis');
    Svg.note(g, left - 4, toY(0), '0', { cls: 'faint', anchor: 'end' });
    Svg.note(g, left, WAVE.top - 4, '電圧の瞬時値 v [V]', { cls: 'faint' });
    Svg.polyline(g, curve(p, r, toY), 'q-voltage thick');
    if (p.Vd > 0) {
      Svg.guide(g, left, toY(p.Vd), right, toY(p.Vd));
      Svg.note(g, left - 4, toY(p.Vd), `直流 ${Notation.number(p.Vd, 0)}`, { cls: 'faint', anchor: 'end' });
    }
    Svg.el(g, 'line', { x1: left, y1: toY(r.rms), x2: right, y2: toY(r.rms), class: 'curve reference q-voltage' });
    Svg.note(g, right, toY(r.rms) - 8, `実効値 ${Notation.number(r.rms, 1)} V`, { cls: 'value q-voltage', anchor: 'end' });
    const top = toX(Math.PI / 2);
    Svg.note(g, top, toY(r.peak) - 8, `最大 ${Notation.number(r.peak, 1)} V`, { cls: 'value q-voltage', anchor: 'middle' });
    // 2乗（熱の出方）と、そのならした高さ
    Svg.guide(g, left, HEAT.bottom, right, HEAT.bottom, 'axis');
    Svg.note(g, left, HEAT.top - 8, 'v²（熱の出方）', { cls: 'faint' });
    Svg.polyline(g, curve(p, r, (v) => toHeat(v * v)), 'q-active');
    Svg.el(g, 'line', { x1: left, y1: toHeat(r.rms ** 2), x2: right, y2: toHeat(r.rms ** 2), class: 'curve reference q-active' });
    Svg.note(g, right, HEAT.top - 8, '点線＝ならした高さ（実効値²）', { cls: 'value q-active', anchor: 'end' });
    Svg.note(g, 16, HEIGHT - 12, `${HEATER_R} Ω の電熱線なら ${Notation.number(r.P, 0)} W（直流 ${Notation.number(r.rms, 1)} V と同じ熱）`, { cls: 'faint' });
  }

  // 動く縦線：いまの時刻の瞬時値
  function drawNow(g, p, r, time) {
    const toHeat = heatScale(p, r);
    const phase = ((time / PERIOD_SECONDS) * 2 * Math.PI) % (2 * Math.PI * PERIODS);
    const x = toX(phase);
    const v = voltAt(p, r, phase);
    // 点を先に置く（縦線は幅が 0 なので、動く層の最初の要素にしない）
    Svg.el(g, 'circle', { cx: x, cy: toY(v), r: 4.5, class: 'dot q-voltage' });
    Svg.el(g, 'circle', { cx: x, cy: toHeat(v * v), r: 4, class: 'dot q-active' });
    Svg.guide(g, x, WAVE.top, x, HEAT.bottom);
    Svg.note(g, Math.min(x + 6, WAVE.right - 40), toY(v) + 14, `${Notation.number(v, 0)} V`, { cls: 'value q-voltage' });
  }

  global.TopicAcRms = {
    id: 'ac-rms',
    title: '正弦波と実効値',
    lead: '実効値は、同じ熱を出す直流の値。正弦波では最大値 ÷ √2。直流と重なると √(Vd² + Va²)。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'Va', name: '交流の実効値', symbol: 'V_a', unit: 'V', min: 0, max: 100, step: 10, value: 100 },
      { key: 'Vd', name: '重ねる直流', symbol: 'V_d', unit: 'V', min: 0, max: 100, step: 10, value: 0 },
    ],
    presets: [
      { name: '直流 30 V + 交流 40 V', apply: () => ({ Vd: 30, Va: 40 }) },
    ],
    compute,
    draw,
    motion: { draw: drawNow },
    caption(p, r) {
      if (p.Vd > 0 && p.Va > 0) return `√(${p.Vd}² + ${p.Va}²) = ${Notation.number(r.rms, 1)} V。実効値は足し算しない。`;
      if (p.Va > 0) return `最大 ${Notation.number(r.Vm, 1)} V ÷ √2 = 実効値 ${p.Va} V（直流 ${p.Va} V と同じ熱）。`;
      return `直流だけなら、実効値は ${p.Vd} V そのもの。`;
    },
    readouts: (p, r) => [
      { name: '交流分の最大値', symbol: 'V_m', value: Notation.number(r.Vm, 1), unit: 'V', cls: 'q-voltage' },
      { name: '実効値', symbol: 'V', value: Notation.number(r.rms, 1), unit: 'V', cls: 'q-voltage' },
      { name: '平均値（直流分）', symbol: 'V_d', value: Notation.number(p.Vd, 0), unit: 'V', cls: 'q-voltage' },
      { name: `${HEATER_R} Ω の電熱線の電力`, symbol: 'P', value: Notation.number(r.P, 0), unit: 'W', cls: 'q-active' },
    ],
    terms: [
      ['瞬時値 <var>v</var>', 'ある時刻の電圧。交流では時々刻々変わる（動く縦線の点）。'],
      ['最大値 <var>V</var><sub>m</sub>', '瞬時値のいちばん高い所（山の高さ）。'],
      ['実効値 <var>V</var>', '同じ抵抗で同じ熱を出す直流の値。計器の 100 V はこれ。'],
      ['平均値', '正弦波をそのまま平均すると 0。全波整流（負を折り返す）して平均すると最大値の 2/π 倍。'],
      ['角周波数 ω', '1秒に進む角度。ω = 2π<var>f</var>（50 Hz なら 100π ≒ 314 rad/s）。'],
    ],
    tries: [
      { text: '交流の実効値を 100 → 50 V にすると、最大値は？', choices: ['約 71 V', '100 V', '約 141 V'], answer: 0, set: { Va: 50 }, look: '最大値も半分の約 70.7 V。実効値 = 最大値 ÷ √2 の比はいつも同じ。' },
      { text: '交流 100 V に直流 100 V を重ねると、実効値は？', choices: ['100 V', '約 141 V', '200 V'], answer: 1, set: { Vd: 100 }, look: '√(100² + 100²) ≒ 141 V。2乗のならした高さ（熱）が、直流の分と交流の分の足し算になる。200 V ではない。' },
      { text: '交流を 0、直流を 100 V にすると、実効値は？', choices: ['0 V', '100 V', '約 141 V'], answer: 1, set: { Va: 0, Vd: 100 }, look: '直流だけなら、実効値は直流の値そのもの。v² も一定の高さになる。' },
    ],
    quiz: [
      { q: '<var>v</var> = 141 sin(100π<var>t</var>) [V] の実効値は？', choices: ['70.7 V', '100 V', '141 V', '200 V'], answer: 1, why: '最大値 141 V ÷ √2 ≒ 100 V。' },
      { q: '同じ式の周波数は？', choices: ['50 Hz', '100 Hz', '314 Hz', '100π Hz'], answer: 0, why: 'ω = 2π<var>f</var> = 100π なので <var>f</var> = 50 Hz。' },
      { q: '直流 30 V と、実効値 40 V の交流を重ねた電圧の実効値は？', choices: ['10 V', '35 V', '50 V', '70 V'], answer: 2, why: '√(30² + 40²) = 50 V。実効値は足し算しない。' },
    ],
    exam: {
      lead: '交流の問題の入口。瞬時値の式から最大値・実効値・周波数を読む問題や、整流形の計器、直流と交流を重ねた波形の実効値として出る。',
      often: [
        '正弦波は 実効値 = 最大値 ÷ √2、平均値（全波整流）= 最大値 × 2/π（約 0.637 倍）。',
        '直流 $V_d$ と交流（実効値 $V_a$）を重ねた実効値は √($V_d$² + $V_a$²)。',
      ],
      traps: [
        '実効値は足し算しない（30 V と 40 V で 70 V ではなく 50 V）。',
        '整流形の計器は平均値を 1.11 倍して目盛ってある。正弦波でない波形では実効値とずれる。',
      ],
    },
    conditions: `周波数 50 Hz の正弦波を2周期描く（動く縦線は見やすい速さ）。熱の比べ方の例に ${HEATER_R} Ω の電熱線を使う`,
    explain: {
      points: [
        '実効値は、同じ抵抗で同じ熱を出す直流の値。$v$² をならした高さの平方根。',
        '正弦波は、実効値 = 最大値 ÷ √2（約 0.707 倍）。100 V の交流の山は約 141 V。',
        '直流と交流を重ねた実効値は √($V_d$² + $V_a$²)。足し算ではない。',
      ],
      look: [
        ['curve', 'q-voltage', '青い曲線＝電圧の瞬時値 $v$。点線が実効値、山の高さが最大値。'],
        ['curve', 'q-active', '緑の曲線＝$v$²（熱の出方。山を上端に描く）。点線はそのならした高さ＝実効値²で、正弦波なら山のちょうど半分。'],
        ['line', 'ink', '動く縦線＝いまの時刻。瞬時値は時々刻々変わる。'],
      ],
      formulas: [
        ['V = V_m ÷ √2', '正弦波の実効値。', '最大値から実効値を出す時'],
        ['v = V_m sin(ωt + θ)', '瞬時値の式。ω = 2πf。', '式から最大値・周波数を読む時'],
        ['V_{av} = 2V_m ÷ π', '全波整流の平均値（約 0.637 倍）。', '平均値・整流形の計器の時'],
        ['V = √(V_d² + V_a²)', '直流と交流を重ねた実効値。', '重ね合わせた波形の時'],
      ],
      symbols: [
        ['v', '瞬時値', 'V'],
        ['V_m', '最大値', 'V'],
        ['V', '実効値', 'V'],
        ['ω', '角周波数（2πf）', 'rad/s'],
        ['V_d・V_a', '直流分・交流分の実効値', 'V'],
      ],
    },
  };
})(this);
