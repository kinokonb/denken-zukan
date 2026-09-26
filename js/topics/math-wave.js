// 基礎：sin の波（角度・周期・周波数・最大値と実効値）。まわる矢印の高さが sin の波になり、1回転＝1周期、
// 周波数は1秒の回転数、周期 T = 1 ÷ f。最大値は実効値の √2 倍。交流の電圧なので電圧の色（青）で描く
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 280;
  const CIRCLE = { x: 64, y: 130, r: 56 }; // 最大値の上限（200 V × √2）の時の半径
  const GRAPH = { x: 140, w: 206, y: 130, ms: 40 }; // 右の波：0〜40 ms
  const MAX_VM = 200 * Math.SQRT2;
  const SLOW = 200; // 表示の遅さ（本物の 1/200 の速さで回す）

  const format = (value) => String(Number(value.toFixed(1)));

  function compute(p) {
    const Vm = p.V * Math.SQRT2;
    return { V: p.V, f: p.f, Vm, T: 1 / p.f, radius: (Vm / MAX_VM) * CIRCLE.r };
  }

  const toY = (value) => GRAPH.y - (value / MAX_VM) * CIRCLE.r;
  const toX = (ms) => GRAPH.x + (ms / GRAPH.ms) * GRAPH.w;

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    Svg.note(g, 12, 14, 'まわる矢印の高さ＝その瞬間の電圧（ゆっくり回して表示）', { cls: 'faint' });
    Svg.el(g, 'circle', { cx: CIRCLE.x, cy: CIRCLE.y, r: r.radius, class: 'arc arc-guide' });
    Svg.guide(g, CIRCLE.x - CIRCLE.r - 4, CIRCLE.y, GRAPH.x + GRAPH.w, CIRCLE.y, 'axis');
    Svg.guide(g, GRAPH.x, CIRCLE.y - CIRCLE.r - 6, GRAPH.x, CIRCLE.y + CIRCLE.r + 6, 'axis');
    for (const ms of [0, 10, 20, 30, 40]) Svg.note(g, toX(ms), CIRCLE.y + CIRCLE.r + 18, String(ms), { cls: 'faint', anchor: 'middle' });
    Svg.note(g, GRAPH.x + GRAPH.w, CIRCLE.y + CIRCLE.r + 32, '時間 [ms]', { cls: 'faint', anchor: 'end' });
    // 最大値（山）と実効値の高さ
    Svg.guide(g, GRAPH.x, toY(r.Vm), GRAPH.x + GRAPH.w, toY(r.Vm), 'ink');
    Svg.guide(g, GRAPH.x, toY(r.V), GRAPH.x + GRAPH.w, toY(r.V), 'ink');
    Svg.note(g, GRAPH.x + GRAPH.w, toY(r.Vm) - 8, `最大値 ${format(r.Vm)} V`, { cls: 'value q-voltage', anchor: 'end' });
    Svg.note(g, GRAPH.x + GRAPH.w, toY(r.V) + 12, `実効値 ${r.V} V`, { cls: 'faint', anchor: 'end' });
    const points = [];
    for (let i = 0; i <= 200; i++) {
      const ms = (GRAPH.ms * i) / 200;
      points.push([toX(ms), toY(r.Vm * Math.sin(2 * Math.PI * r.f * (ms / 1000)))]);
    }
    Svg.polyline(g, points, 'q-voltage thick');
    // 1周期の幅（グラフの中に入る時だけ）
    const periodMs = r.T * 1000;
    if (periodMs <= GRAPH.ms) {
      const y = CIRCLE.y + CIRCLE.r + 44;
      Svg.arrow(g, toX(0), y, toX(periodMs), y, { cls: 'ink', width: 1.2 });
      Svg.note(g, toX(0), y + 16, `周期 T = ${format(periodMs)} ms（1回転で波1つ）`, { cls: 'value', anchor: 'start' });
    }
  }

  // まわる矢印（角 α）と、その高さが波のどこにあたるか
  function drawTurn(g, p, r, time) {
    const alpha = (2 * Math.PI * r.f * time) / SLOW;
    const tipX = CIRCLE.x + r.radius * Math.cos(alpha);
    const tipY = CIRCLE.y - r.radius * Math.sin(alpha);
    const ms = ((((alpha / (2 * Math.PI)) * r.T * 1000) % GRAPH.ms) + GRAPH.ms) % GRAPH.ms;
    const waveY = toY(r.Vm * Math.sin(alpha));
    Svg.arrow(g, CIRCLE.x, CIRCLE.y, tipX, tipY, { cls: 'q-voltage', width: 2.5 });
    Svg.guide(g, tipX, tipY, toX(ms), waveY, 'q-voltage');
    Svg.el(g, 'circle', { cx: toX(ms), cy: waveY, r: 4.5, class: 'dot q-voltage' });
    const degrees = Math.round(((alpha * 180) / Math.PI) % 360);
    Svg.note(g, CIRCLE.x, CIRCLE.y + CIRCLE.r + 18, `${degrees}°`, { cls: 'value', anchor: 'middle' });
  }

  global.TopicMathWave = {
    id: 'math-wave',
    title: 'sin の波（角度・周期・周波数）',
    lead: '交流は、まわる矢印の高さ。1回転で波1つ。100 V の交流の山は約 141 V。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'V', name: '実効値', symbol: 'V', unit: 'V', min: 50, max: 200, step: 10, value: 100 },
      { key: 'f', name: '周波数', symbol: 'f', unit: 'Hz', min: 25, max: 100, step: 5, value: 50 },
    ],
    presets: [],
    compute,
    draw,
    motion: { draw: drawTurn },
    caption(p, r) {
      return `${r.f} Hz：周期 <var>T</var> = ${format(r.T * 1000)} ms。最大値 = ${r.V} × √2 ≒ ${format(r.Vm)} V。`;
    },
    readouts: (p, r) => [
      { name: '周期', symbol: 'T', value: format(r.T * 1000), unit: 'ms' },
      { name: '周波数', symbol: 'f', value: String(r.f), unit: 'Hz' },
      { name: '最大値', symbol: 'V_m', value: format(r.Vm), unit: 'V', cls: 'q-voltage' },
      { name: '実効値', symbol: 'V', value: String(r.V), unit: 'V', cls: 'q-voltage' },
    ],
    terms: [
      ['角度 °（度）', '1回転を 360° とした角の大きさ。数学ではラジアンも使い、360° = 2π（ラジアン）。'],
      ['sin の波', 'まわる矢印の先の高さを、時間にそって描いた波。0° で 0、90° で山（最大）、180° で 0、270° で谷。'],
      ['周期 <var>T</var>', '波1つ（1回転）にかかる時間。単位は s（秒）。1 ms は 1,000分の1秒。'],
      ['周波数 <var>f</var>', '1秒に波が何回くり返すか（何回まわるか）。単位は Hz。東日本 50 Hz、西日本 60 Hz。<var>T</var> = 1 ÷ <var>f</var>。'],
      ['最大値と実効値', '最大値は波の山の高さ。実効値は同じ熱を出す直流の値で、最大値 ÷ √2。ふつう「100 V」と言うのは実効値。'],
    ],
    tries: [
      { text: '周波数を 50 Hz → 100 Hz にすると、周期 <var>T</var> は？', choices: ['半分', 'そのまま', '2倍'], answer: 0, set: { f: 100 }, look: '<var>T</var> = 1 ÷ 100 = 0.01 s = 10 ms。波の数が2倍になり、1つ分の幅は半分。矢印も2倍の速さで回る。' },
      { text: '実効値を 100 V → 200 V にすると、最大値は？', choices: ['200 V', '約 283 V', '400 V'], answer: 1, set: { V: 200 }, look: '最大値 = 実効値 × √2 = 200 × 1.41 ≒ 283 V。家の 100 V も、山の高さは約 141 V。' },
      { text: '周波数を 25 Hz にすると、グラフ（0〜40 ms）の中の波はいくつ？', choices: ['半分', '1つ', '2つ'], answer: 1, set: { f: 25 }, look: '25 Hz の周期は 40 ms。グラフの幅がちょうど1回転分で、波1つ。' },
    ],
    quiz: [
      { q: '50 Hz の周期は？', choices: ['0.02 s（20 ms）', '0.5 s', '50 s'], answer: 0, why: '<var>T</var> = 1 ÷ 50 = 0.02 s。' },
      { q: '実効値 100 V の交流の最大値は？', choices: ['約 71 V', '100 V', '約 141 V'], answer: 2, why: '最大値 = 実効値 × √2 = 100 × 1.414 ≒ 141 V。' },
      { q: '角度 90° のとき、sin の値は？', choices: ['0', '0.5', '1'], answer: 2, why: 'sin 90° = 1。矢印がまっすぐ上で、波の山のてっぺん。' },
    ],
    exam: {
      lead: '交流の問題は、周波数 $f$・周期 $T$・角周波数 ω = 2π$f$・最大値と実効値の関係から始まる。',
      often: [
        '$T$ = 1 ÷ $f$。50 Hz は 20 ms、60 Hz は約 16.7 ms。',
        '最大値 = 実効値 × √2。ω = 2π$f$ は1秒にまわる角度（ラジアン）。',
      ],
      traps: [
        'ふつう「100 V」は実効値。最大値（約 141 V）ではない。',
        '角度は度（°）とラジアンの2つの書き方がある。360° = 2π ラジアン。',
      ],
    },
    conditions: '矢印は見やすいように本物の 1/200 の速さで回して表示（周波数が大きいほど速い）',
    explain: {
      points: [
        '交流は、まわる矢印の高さ。1回転（360°）で波が1つ（1周期）。',
        '周波数は1秒の回転数。周期 $T$ = 1 ÷ $f$（50 Hz なら 20 ms）。',
        '最大値は実効値の √2 倍。100 V の交流の山は約 141 V。',
      ],
      look: [
        ['arrow', 'q-voltage', '左のまわる矢印＝電圧。長さが最大値。'],
        ['curve', 'q-voltage', '右の青い波＝矢印の高さの変わり方（sin の波）。'],
        ['dashed', 'ink', '点線＝最大値（上）と実効値（下）の高さ。'],
      ],
      formulas: [
        ['T = 1 ÷ f', '周期は周波数の逆数。', '周期や周波数を求める時'],
        ['V_m = √2 × V', '最大値は実効値の √2 倍。', '波の山の高さを求める時'],
        ['v = V_m sinθ', 'その瞬間の値は、最大値 × sin（まわった角）。', '瞬時値を求める時'],
        ['ω = 2πf', '1秒にまわる角度（ラジアン）。', '$X_L$ = ω$L$ など'],
      ],
      symbols: [
        ['f', '周波数', 'Hz'],
        ['T', '周期', 's'],
        ['V_m', '最大値', 'V'],
        ['V', '実効値', 'V'],
        ['θ', 'まわった角度', '°（360° = 2π rad）'],
      ],
    },
  };
})(this);
