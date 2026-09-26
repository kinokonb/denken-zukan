// 理論：電力と電力量（P = VI、W = Pt、ジュール熱）
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 300;
  const MAX_P = 2000; // W（上下のグラフで同じ縮尺）
  const CURVE = { x: 56, y: 36, w: 284, h: 88, maxV: 200 };
  const ENERGY = { x: 56, y: 182, w: 284, h: 88, maxHours: 10 };

  function compute(p) {
    return { ...DcCircuit.power({ V: p.V, R: p.R, hours: p.t }), V: p.V, R: p.R, hours: p.t };
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    drawPowerCurve(svg, r);
    drawEnergyArea(svg, r);
  }

  // 抵抗が同じなら P = V²/R：電圧を2倍にすると電力は4倍
  function drawPowerCurve(svg, r) {
    const { x, y, w, h, maxV } = CURVE;
    const g = Svg.el(svg, 'g');
    const toX = (V) => x + (V / maxV) * w;
    const toY = (P) => y + h - (Math.min(P, MAX_P) / MAX_P) * h;
    Svg.note(g, 12, 14, `電圧と電力の関係（抵抗 ${Notation.number(r.R, 0)} Ω のとき P = V²/R）`, { cls: 'faint' });
    axes(g, x, y, w, h);
    for (const V of [0, 50, 100, 150, 200]) Svg.note(g, toX(V), y + h + 12, String(V), { cls: 'faint', anchor: 'middle' });
    Svg.note(g, x + w, y + h + 25, 'V [V]', { cls: 'faint', anchor: 'end' });
    const points = [];
    for (let V = 0; V <= maxV; V += 4) {
      if ((V * V) / r.R > MAX_P) break;
      points.push([toX(V), toY((V * V) / r.R)]);
    }
    Svg.polyline(g, points, 'q-active thick');
    Svg.guide(g, toX(r.V), toY(r.P), toX(r.V), y + h, 'q-voltage');
    Svg.guide(g, x, toY(r.P), toX(r.V), toY(r.P), 'q-active');
    Svg.el(g, 'circle', { cx: toX(r.V), cy: toY(r.P), r: 5, class: 'dot ink' });
  }

  // 電力量 W = P × t は、横が時間・縦が電力の長方形の面積
  function drawEnergyArea(svg, r) {
    const { x, y, w, h, maxHours } = ENERGY;
    const g = Svg.el(svg, 'g');
    const toX = (hours) => x + (hours / maxHours) * w;
    const height = (Math.min(r.P, MAX_P) / MAX_P) * h;
    Svg.note(g, 12, y - 22, '電力量 = 電力 × 時間（長方形の面積）', { cls: 'faint' });
    axes(g, x, y, w, h);
    for (const hours of [0, 2, 4, 6, 8, 10]) Svg.note(g, toX(hours), y + h + 12, String(hours), { cls: 'faint', anchor: 'middle' });
    Svg.note(g, x + w, y + h + 25, '時間 t [h]', { cls: 'faint', anchor: 'end' });
    Svg.el(g, 'rect', { x, y: y + h - height, width: toX(r.hours) - x, height, class: 'area q-active' });
    const text = `W = ${Notation.number(r.energyKWh, 2)} kWh`;
    Svg.note(g, toX(r.hours) + 6, y + h - height - 10, text, { cls: 'value q-active', anchor: 'start' });
  }

  function axes(g, x, y, w, h) {
    Svg.guide(g, x, y + h, x + w, y + h, 'axis');
    Svg.guide(g, x, y - 4, x, y + h, 'axis');
    for (const P of [1000, 2000]) Svg.note(g, x - 6, y + h - (P / MAX_P) * h, Notation.number(P, 0), { cls: 'faint', anchor: 'end' });
    Svg.note(g, x + 6, y - 8, 'P [W]', { cls: 'faint' });
  }

  global.TopicElectricPower = {
    id: 'electric-power',
    title: '電力と電力量',
    lead: '電力は1秒あたりの仕事、電力量は使った合計。P = VI、W = Pt。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'V', name: '電圧', symbol: 'V', unit: 'V', min: 10, max: 200, step: 10, value: 100 },
      { key: 'R', name: '抵抗（電気器具）', symbol: 'R', unit: 'Ω', min: 20, max: 100, step: 1, value: 25 },
      { key: 't', name: '使う時間', symbol: 't', unit: 'h', min: 0.5, max: 10, step: 0.5, value: 2.5 },
    ],
    presets: [],
    compute,
    draw,
    caption(p, r) {
      return `${Notation.html('P')} = ${Notation.html('VI')} = ${Notation.number(r.V, 0)} × ${Notation.number(r.I, 1)} = ${Notation.number(r.P, 0)} W。${Notation.number(r.hours, 1)} 時間で ${Notation.html('W')} = ${Notation.html('Pt')} = ${Notation.number(r.energyKWh, 2)} kWh。`;
    },
    readouts: (p, r) => [
      { name: '電流', symbol: 'I', value: Notation.number(r.I, 1), unit: 'A', cls: 'q-current' },
      { name: '電力', symbol: 'P', value: Notation.number(r.P, 0), unit: 'W', cls: 'q-active' },
      { name: '電力量', symbol: 'W', value: Notation.number(r.energyKWh, 2), unit: 'kWh', cls: 'q-active' },
      { name: '出る熱', symbol: 'Q', value: Notation.number(r.heatKJ, 0), unit: 'kJ' },
    ],
    terms: [
      ['電力 <var>P</var>', '1秒あたりに電気がする仕事（熱・光・動力）の量。単位は W（ワット）。1,000 W = 1 kW。'],
      ['電力量 <var>W</var>', '電力 × 使った時間。電気料金はこれで決まる。単位は kWh（キロワット時）。記号の <var>W</var>（電力量）と単位の W（ワット）は別もの。'],
      ['ジュール熱', '抵抗に電流が流れて出る熱。電気ストーブの熱や、電線が温まるのはこれ。'],
      ['J（ジュール）', '仕事や熱の量の単位。1 W で1秒間の仕事が 1 J。1 kWh = 3,600,000 J = 3,600 kJ。'],
    ],
    tries: [
      { text: '電圧 <var>V</var> を 100 V → 200 V（2倍）にする', set: { V: 200 }, look: '電流も2倍（8 A）になるので、電力は 2 × 2 = 4倍の 1,600 W。上のグラフの点が放物線を駆け上がり、下の長方形も4倍の高さになる。' },
      { text: '抵抗 <var>R</var> を 25 Ω → 50 Ω（2倍）にする', set: { R: 50 }, look: '電圧が同じなら電流が半分（2 A）になり、電力も半分の 200 W。上の放物線がねる。' },
      { text: '使う時間 <var>t</var> を 2.5 時間 → 7.5 時間にする', set: { t: 7.5 }, look: '電力は 400 W のまま。下の長方形が横に3倍に伸び、電力量（面積）は 1 kWh → 3 kWh。' },
    ],
    quiz: [
      { q: '100 V で 10 A 流れる電気器具の消費電力は？', choices: ['10 W', '100 W', '1,000 W', '10,000 W'], answer: 2, why: '<var>P</var> = <var>VI</var> = 100 × 10 = 1,000 W（1 kW）。' },
      { q: '1 kW の電気器具を 3 時間使ったときの電力量は？', choices: ['0.33 kWh', '1 kWh', '3 kWh', '3,000 kWh'], answer: 2, why: '<var>W</var> = <var>Pt</var> = 1 kW × 3 h = 3 kWh。' },
      { q: '10 Ω の抵抗に 2 A 流れているときの消費電力は？', choices: ['5 W', '20 W', '40 W', '200 W'], answer: 2, why: '<var>P</var> = <var>I</var>²<var>R</var> = 2² × 10 = 40 W（電圧は <var>RI</var> = 20 V なので <var>VI</var> = 40 W とも求まる）。' },
    ],
    exam: `<p>電力・電力量・ジュール熱は、理論だけでなく、電力科目の送電損失、機械科目の効率、法規の電力量や負荷率の計算でも毎回のように使う。</p>
      <ul>
        <li>${Notation.html('P')} = ${Notation.html('VI')} = ${Notation.html('I')}²${Notation.html('R')} = ${Notation.html('V')}²/${Notation.html('R')}。わかっている量に合わせて使い分ける。</li>
        <li>電線の損失は ${Notation.html('I')}²${Notation.html('R')}。電流が2倍なら損失は4倍になる（送電で高い電圧を使う理由）。</li>
        <li>kWh と J の換算：1 kWh = 3.6 × 10⁶ J。</li>
      </ul>`,
    conditions: '電圧は電池や電源の電圧、抵抗は電気器具（ヒーターなど）と考える',
    notesHtml: `
      <h2>しくみ</h2>
      <p>電圧が大きいほど、電流が大きいほど、電気は1秒あたりに多くの仕事をする。これが電力 ${Notation.html('P')} = ${Notation.html('VI')}。オームの法則と組み合わせると ${Notation.html('I')}²${Notation.html('R')} や ${Notation.html('V')}²/${Notation.html('R')} とも書ける。</p>
      <p>電力量はその電力を何時間使ったかの合計で、横が時間・縦が電力のグラフの面積になる。抵抗で使われた電力量は、そのまま熱（ジュール熱）になる。</p>
      <h2>公式</h2>
      <ul class="formulas">
        <li>${Notation.html('P')} = ${Notation.html('VI')} = ${Notation.html('I')}²${Notation.html('R')} = ${Notation.html('V')}² / ${Notation.html('R')}</li>
        <li>${Notation.html('W')} = ${Notation.html('Pt')}</li>
        <li>ジュール熱：${Notation.html('Q')} = ${Notation.html('I')}²${Notation.html('Rt')}［J］（${Notation.html('t')} は秒）</li>
      </ul>
      <p class="symbols">${Notation.html('P')}：電力［W］、${Notation.html('V')}：電圧［V］、${Notation.html('I')}：電流［A］、${Notation.html('R')}：抵抗［Ω］、${Notation.html('W')}：電力量［W·h・kWh］、${Notation.html('t')}：時間［h（ジュール熱の式では s）］、${Notation.html('Q')}：熱量［J］</p>`,
  };
})(this);
