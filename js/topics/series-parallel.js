// 理論：直列と並列（合成抵抗・分圧・分流）。同じ2本の抵抗を、左は直列・右は並列にして見比べる
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 270;
  const SERIES = { left: 28, right: 158, top: 50, bottom: 134 };
  const PARALLEL = { left: 202, branch: 267, right: 332, top: 50, bottom: 134 };
  const MID_Y = 92;
  const DOT_SPEED = 10; // 電流 1 A あたり、点が1秒に進む長さ

  function compute(p) {
    return DcCircuit.seriesAndParallel({ V: p.V, R1: p.R1, R2: p.R2 });
  }

  function seriesPath() {
    const { left, right, top, bottom } = SERIES;
    return [[left, MID_Y], [left, top], [right, top], [right, bottom], [left, bottom], [left, MID_Y]];
  }

  // 並列は、電流の大きさがちがう区間ごとに分ける
  function parallelPaths() {
    const { left, branch, right, top, bottom } = PARALLEL;
    return {
      out: [[left, MID_Y], [left, top], [branch, top]],
      branch1: [[branch, top], [branch, bottom]],
      branch2: [[branch, top], [right, top], [right, bottom], [branch, bottom]],
      back: [[branch, bottom], [left, bottom], [left, MID_Y]],
    };
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');

    // 直列：R1 を上の導線、R2 を右の導線に
    Svg.note(g, (SERIES.left + SERIES.right) / 2, 20, '直列', { cls: 'value', anchor: 'middle' });
    Svg.wire(g, seriesPath());
    Svg.battery(g, SERIES.left, MID_Y);
    Svg.resistor(g, (SERIES.left + SERIES.right) / 2, SERIES.top);
    Svg.resistor(g, SERIES.right, MID_Y, { vertical: true });
    Svg.label(g, (SERIES.left + SERIES.right) / 2, SERIES.top + 20, 'R_1', { cls: 'q-active', size: 13 });
    Svg.label(g, SERIES.right - 14, MID_Y, 'R_2', { cls: 'q-active', anchor: 'end', size: 13 });
    Svg.note(g, (SERIES.left + SERIES.right) / 2, 154, `合成 ${Notation.number(r.series.R, 1)} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, (SERIES.left + SERIES.right) / 2, 170, `電流 ${Notation.number(r.series.I, 2)} A`, { cls: 'value q-current', anchor: 'middle' });

    // 並列：R1 と R2 を枝分かれに
    const paths = parallelPaths();
    Svg.note(g, (PARALLEL.left + PARALLEL.right) / 2, 20, '並列', { cls: 'value', anchor: 'middle' });
    for (const path of Object.values(paths)) Svg.wire(g, path);
    Svg.battery(g, PARALLEL.left, MID_Y);
    Svg.resistor(g, PARALLEL.branch, MID_Y, { vertical: true });
    Svg.resistor(g, PARALLEL.right, MID_Y, { vertical: true });
    Svg.label(g, PARALLEL.branch - 14, MID_Y, 'R_1', { cls: 'q-active', anchor: 'end', size: 13 });
    Svg.label(g, PARALLEL.right - 14, MID_Y, 'R_2', { cls: 'q-active', anchor: 'end', size: 13 });
    Svg.note(g, (PARALLEL.left + PARALLEL.right) / 2, 154, `合成 ${Notation.number(r.parallel.R, 1)} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, (PARALLEL.left + PARALLEL.right) / 2, 170, `電流 ${Notation.number(r.parallel.I, 2)} A`, { cls: 'value q-current', anchor: 'middle' });

    // 分かれ方：直列は電圧が R1 : R2 に、並列は電流が R2 : R1（抵抗の小さい方に多く）に分かれる
    const barY = 212;
    const seriesWidth = SERIES.right - SERIES.left;
    Svg.note(g, SERIES.left, barY - 14, `電圧 ${Notation.number(p.V, 0)} V の分かれ方`, { cls: 'faint' });
    Svg.splitBar(g, SERIES.left, barY, seriesWidth, 22, [
      { value: r.series.V1, label: '', cls: 'q-voltage' },
      { value: r.series.V2, label: '', cls: 'q-voltage alt' },
    ]);
    Svg.note(g, SERIES.left, barY + 36, `R₁ ${Notation.number(r.series.V1, 1)} V`, { cls: 'value q-voltage' });
    Svg.note(g, SERIES.right, barY + 36, `R₂ ${Notation.number(r.series.V2, 1)} V`, { cls: 'value q-voltage', anchor: 'end' });

    const parallelWidth = PARALLEL.right - PARALLEL.left;
    Svg.note(g, PARALLEL.left, barY - 14, '電流の分かれ方', { cls: 'faint' });
    Svg.splitBar(g, PARALLEL.left, barY, parallelWidth, 22, [
      { value: r.parallel.I1, label: '', cls: 'q-current' },
      { value: r.parallel.I2, label: '', cls: 'q-current alt' },
    ]);
    Svg.note(g, PARALLEL.left, barY + 36, `R₁ ${Notation.number(r.parallel.I1, 2)} A`, { cls: 'value q-current' });
    Svg.note(g, PARALLEL.right, barY + 36, `R₂ ${Notation.number(r.parallel.I2, 2)} A`, { cls: 'value q-current', anchor: 'end' });
  }

  function drawFlow(g, p, r, time) {
    const move = time * DOT_SPEED;
    Svg.flowDots(g, seriesPath(), move * r.series.I);
    const paths = parallelPaths();
    Svg.flowDots(g, paths.out, move * r.parallel.I);
    Svg.flowDots(g, paths.branch1, move * r.parallel.I1);
    Svg.flowDots(g, paths.branch2, move * r.parallel.I2);
    Svg.flowDots(g, paths.back, move * r.parallel.I);
  }

  // ---- ミッション（現場の依頼）：結果の計算と現場の図 ----
  // draw の look は js/job-play.js が毎コマ渡す今の様子：switchOn（0〜1）、lamps（電球ごとの明るさ）、broken（切れた電球・飛んだヒューズ）、
  // meter（電流計の針）、reading（結果が出たら計器の読み）、probe（テスターで測っている電球と針）、deciding（決めている間か）。
  // draw は火花などを出す位置（lamps・fuse）を返す

  const num = (value) => String(Number(value.toFixed(2)));
  const amperes = (value) => Notation.number(value, 2);
  const JOB_NOTE_Y = 262;

  function runLampJob({ V, Vr, Ir }, R) {
    const r = DcCircuit.lampWithSeriesResistor({ V, Vr, Ir, R });
    const base = { current: r.I, lamps: [r.brightness] };
    if (Math.abs(r.lampV - Vr) < 1e-9) {
      return { ...base, ok: true, burst: null, reading: `${amperes(r.I)} A`, reason: `定格どおり！ <var>R</var> にかかる ${num(V - Vr)} V を ${Ir} A で割って ${R} Ω` };
    }
    if (r.lampV < Vr) {
      return { ...base, ok: false, burst: null, reading: `${amperes(r.I)} A`, reason: `暗い。電流 ${num(r.I)} A で、電球は ${num(r.lampV)} V しかない（定格 ${Vr} V）。<var>R</var> を小さく` };
    }
    return { ...base, ok: false, burst: { lamp: 0 }, reading: `${amperes(r.I)} A → 0 A`, reason: `切れた！ 電球に ${num(r.lampV)} V（定格 ${Vr} V）。<var>R</var> を大きく` };
  }

  function runFuseJob({ V, lampR, F }, n) {
    const r = DcCircuit.parallelLamps({ V, lampR, n });
    const base = { current: r.I, lamps: Array(n).fill(1) };
    if (r.I > F + 1e-9) {
      return { ...base, ok: false, burst: { fuse: true }, reading: `${amperes(r.I)} A → 0 A`, reason: `ヒューズが飛んだ！ ${num(r.each)} A × ${n}個 = ${num(r.I)} A（ヒューズ ${F} A）` };
    }
    if (r.I + r.each <= F + 1e-9) {
      return { ...base, ok: false, burst: null, reading: `${amperes(r.I)} A`, reason: `まだつけられる。${n}個で ${num(r.I)} A、ヒューズは ${F} A まで` };
    }
    return { ...base, ok: true, burst: null, reading: `${amperes(r.I)} A`, reason: `ぴったり！ 1個 ${V}÷${lampR} = ${num(r.each)} A。${n}個で ${num(r.I)} A、あと1個で ${num(r.I + r.each)} A になって飛ぶ` };
  }

  function runProbeJob({ V, broken }, i) {
    const lamps = PROBE_LAMPS.map(() => (i === broken ? 1 : 0));
    if (i === broken) {
      return { ok: true, current: 0, lamps, burst: null, reading: null, reason: `ついた！ 切れていたのは ${i + 1}番。切れ目に電池の ${V} V が全部かかり、ほかの電球は 0 V` };
    }
    return { ok: false, current: 0, lamps, burst: null, reading: null, reason: `まだつかない。${i + 1}番は 0 V で切れていなかった（切れた所には ${V} V がかかる）` };
  }

  function drawBattery(g, x, y, V) {
    Svg.battery(g, x, y);
    Svg.note(g, x + 20, y + 18, `${V} V`, { cls: 'value q-voltage' });
  }

  function drawAmmeter(g, x, y, look, max, mark = null) {
    Svg.gauge(g, x, y, { value: look.meter, max, letter: 'A', cls: 'q-current', mark });
    Svg.note(g, x, y + 40, look.reading ?? '？ A', { cls: look.reading ? 'value q-current' : 'faint', anchor: 'middle' });
  }

  function drawLampJob(g, { V, Vr, Ir }, R, look) {
    const left = 40, right = 300, top = 64, bottom = 196, mid = 130;
    Svg.wire(g, [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]]);
    drawBattery(g, left, mid, V);
    Svg.knifeSwitch(g, 88, top, { on: look.switchOn });
    Svg.resistor(g, 176, top);
    Svg.note(g, 176, top + 26, `R = ${R} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.lamp(g, right, mid, { level: look.lamps[0] || 0, broken: look.broken.lamps[0] });
    Svg.note(g, right - 20, mid, `定格 ${Vr} V・${Ir} A`, { cls: 'value', anchor: 'end' });
    drawAmmeter(g, 176, bottom, look, Ir * 2);
    Svg.note(g, 180, JOB_NOTE_Y, '電球の抵抗は一定、定格の電圧をこえると切れる決まり', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  function drawFuseJob(g, { V, lampR, F }, n, look) {
    const left = 36, top = 64, bottom = 196, mid = 130, fuseX = 124;
    const center = 253; // 電球の並びの中心（ラベルの位置）
    const xs = Array.from({ length: n }, (_, i) => center + (i - (n - 1) / 2) * 22);
    const last = xs[xs.length - 1];
    Svg.wire(g, [[left, mid], [left, top], [last, top]]);
    Svg.wire(g, [[left, mid], [left, bottom], [last, bottom]]);
    for (const x of xs) Svg.wire(g, [[x, top], [x, bottom]]);
    drawBattery(g, left, mid, V);
    Svg.knifeSwitch(g, 74, top, { on: look.switchOn });
    Svg.fuse(g, fuseX, top, { blown: look.broken.fuse });
    Svg.note(g, fuseX, top - 20, `ヒューズ ${F} A`, { cls: 'value q-current', anchor: 'middle' });
    xs.forEach((x, i) => Svg.lamp(g, x, mid, { level: look.lamps[i] || 0 }));
    Svg.note(g, center, top - 20, `電球 1個 ${lampR} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, center, bottom + 20, `${n}個`, { cls: 'value', anchor: 'middle' });
    drawAmmeter(g, 100, bottom, look, F * 1.6, F);
    Svg.note(g, 180, JOB_NOTE_Y, 'ヒューズは定格の電流をこえると飛ぶ。電線の抵抗は 0', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, mid]), fuse: [fuseX, top] };
  }

  // テスターで測る電球。vertical は縦の導線の上の電球
  const PROBE_LAMPS = [{ x: 150, y: 64 }, { x: 250, y: 64 }, { x: 316, y: 130, vertical: true }, { x: 220, y: 196 }];
  const TESTER = { x: 176, y: 132 };

  function drawProbeJob(g, { V }, selected, look) {
    const left = 40, right = 316, top = 64, bottom = 196, mid = 130;
    Svg.wire(g, [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]]);
    drawBattery(g, left, mid, V);
    Svg.knifeSwitch(g, 88, top, { on: 1 });
    PROBE_LAMPS.forEach((lamp, i) => {
      Svg.lamp(g, lamp.x, lamp.y, { level: look.lamps[i] || 0 });
      const [nx, ny] = lamp.vertical ? [lamp.x + 20, lamp.y] : [lamp.x, lamp.y + (lamp.y === top ? -20 : 22)];
      Svg.note(g, nx, ny, `${i + 1}`, { cls: 'value', anchor: 'middle' });
    });
    Svg.note(g, TESTER.x, TESTER.y - 36, 'テスター', { cls: 'faint', anchor: 'middle' });
    Svg.gauge(g, TESTER.x, TESTER.y, { value: look.probe ? look.probe.needle : 0, max: V * 1.25, letter: 'V', cls: 'q-voltage' });
    Svg.note(g, TESTER.x, TESTER.y + 40, look.probe ? look.probe.reading : '電球をタップして測る', { cls: look.probe ? 'value q-voltage' : 'faint', anchor: 'middle' });
    if (look.probe) {
      const lamp = PROBE_LAMPS[look.probe.index];
      const ends = lamp.vertical ? [[lamp.x, lamp.y - 13], [lamp.x, lamp.y + 13]] : [[lamp.x - 13, lamp.y], [lamp.x + 13, lamp.y]];
      ends.forEach(([ex, ey], k) => {
        const sx = TESTER.x + (k === 0 ? -9 : 9);
        const sy = TESTER.y + 22;
        Svg.el(g, 'path', { d: `M${sx},${sy} Q${(sx + ex) / 2},${Math.max(sy, ey) + 26} ${ex},${ey}`, class: 'lead' });
        Svg.el(g, 'circle', { cx: ex, cy: ey, r: 2.4, class: 'lead-tip' });
      });
    }
    // タップできる所（決めている間だけ）。測っている電球は実線の輪
    if (look.deciding) {
      PROBE_LAMPS.forEach((lamp, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: lamp.x, cy: lamp.y, r: 19, class: 'job-tap-ring' });
      });
    }
    return { lamps: PROBE_LAMPS.map((lamp) => [lamp.x, lamp.y]) };
  }

  global.TopicSeriesParallel = {
    id: 'series-parallel',
    title: '直列と並列',
    lead: '直列は電流が共通で電圧が分かれる。並列は電圧が共通で電流が分かれる。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'V', name: '電池の電圧', symbol: 'V', unit: 'V', min: 1, max: 24, step: 1, value: 12 },
      { key: 'R1', name: '抵抗', symbol: 'R_1', unit: 'Ω', min: 2, max: 30, step: 1, value: 4 },
      { key: 'R2', name: '抵抗', symbol: 'R_2', unit: 'Ω', min: 2, max: 30, step: 1, value: 12 },
    ],
    presets: [],
    compute,
    draw,
    motion: { draw: drawFlow },
    caption(p, r) {
      const smaller = Math.min(p.R1, p.R2);
      return `並列の合成 ${Notation.number(r.parallel.R, 1)} Ω は、小さい方の ${Notation.number(smaller, 0)} Ω よりさらに小さい（通り道が増えるから）。`;
    },
    readouts: (p, r) => [
      { name: '直列の合成抵抗', symbol: 'R', value: Notation.number(r.series.R, 1), unit: 'Ω', cls: 'q-active' },
      { name: '直列の電流', symbol: 'I', value: Notation.number(r.series.I, 2), unit: 'A', cls: 'q-current' },
      { name: '並列の合成抵抗', symbol: 'R', value: Notation.number(r.parallel.R, 1), unit: 'Ω', cls: 'q-active' },
      { name: '並列の電流', symbol: 'I', value: Notation.number(r.parallel.I, 2), unit: 'A', cls: 'q-current' },
    ],
    // ミッション：現場の依頼（決めてからスイッチ → 結果が起きる）。型の決まりは js/job.js
    jobs: [
      {
        // 直列の抵抗で電球の電圧を定格に合わせる（分圧）
        kind: 'dial',
        cases: [[12, 6, 0.5], [9, 6, 0.5], [12, 3, 0.5], [24, 12, 1], [12, 4, 0.5], [9, 3, 0.2], [6, 2, 0.2], [12, 9, 0.3], [24, 6, 1]]
          .map(([V, Vr, Ir]) => ({ V, Vr, Ir })),
        dial: { name: '直列の抵抗', symbol: 'R', unit: 'Ω', min: 1, max: 30, step: 1 },
        request: ({ Vr, Ir }) => `電球（${Vr} V・${Ir} A）を定格どおりに光らせる <var>R</var> を決めよう`,
        answer: ({ V, Vr, Ir }) => (V - Vr) / Ir,
        run: runLampJob,
        draw: drawLampJob,
      },
      {
        // 並列の電球を増やすと全体の電流が増える。ヒューズの定格まで
        kind: 'count',
        cases: [[12, 6, 5], [9, 10, 2], [12, 20, 2], [12, 15, 3], [12, 10, 5], [9, 20, 2], [18, 20, 5], [12, 15, 5], [12, 30, 3]]
          .map(([V, lampR, F]) => ({ V, lampR, F })),
        count: { min: 1, max: 8 },
        request: () => 'ヒューズを飛ばさずに、電球をいちばん多くつけよう',
        answer: ({ V, lampR, F }) => Math.floor(F / (V / lampR) + 1e-9),
        run: runFuseJob,
        draw: drawFuseJob,
      },
      {
        // 直列の電球が1個切れると全部消える。切れた電球には電池の電圧が全部かかる
        kind: 'probe',
        cases: [6, 12, 24].flatMap((V) => [0, 1, 2, 3].map((broken) => ({ V, broken }))),
        probe: {
          parts: PROBE_LAMPS.length,
          measure: ({ V, broken }, i) => DcCircuit.seriesLampsWithBreak({ V, n: PROBE_LAMPS.length, broken }).voltages[i],
        },
        action: 'この電球を交換',
        request: () => '電球が1つもつかない。テスターで測って、切れた1個を交換しよう',
        answer: ({ broken }) => broken,
        run: runProbeJob,
        draw: drawProbeJob,
      },
    ],
    terms: [
      ['直列', '抵抗を1列につなぐこと。電流の通り道は1本なので、どの抵抗にも同じ電流が流れる。'],
      ['並列', '抵抗を枝分かれさせてつなぐこと。どの枝にも電池の電圧がそのままかかる。'],
      ['合成抵抗', 'いくつかの抵抗を、同じはたらきをする1本の抵抗に置きかえた値。'],
      ['分圧', '直列の抵抗に、電池の電圧が抵抗の大きさの比で分かれること。'],
      ['分流', '並列の枝に、電流が分かれて流れること。抵抗が小さい枝ほど多く流れる。'],
      ['断線', '抵抗や導線が切れて、電流が通れなくなること。直列ではどこが切れても全体が止まり、並列では切れた枝だけが止まる。'],
    ],
    tries: [
      { text: '<var>R</var><sub>1</sub> と <var>R</var><sub>2</sub> を両方 10 Ω にすると、並列の合成抵抗は？', choices: ['5 Ω', '10 Ω', '20 Ω'], answer: 0, set: { R1: 10, R2: 10 }, look: '直列の合成は 20 Ω（足し算）、並列の合成は 5 Ω（半分）。電圧・電流はちょうど半分ずつに分かれる。' },
      { text: '<var>R</var><sub>1</sub> = 6 Ω、<var>R</var><sub>2</sub> = 18 Ω にすると、直列の <var>R</var><sub>1</sub> にかかる電圧は？（電池は 12 V）', choices: ['3 V', '6 V', '9 V'], answer: 0, set: { R1: 6, R2: 18 }, look: '直列の電圧は抵抗の比 6 : 18 = 1 : 3 で、12 V が 3 V と 9 V に分かれる。並列の電流は逆に 3 : 1（2 A と 0.67 A）。' },
      { text: '<var>R</var><sub>2</sub> を 30 Ω にすると（<var>R</var><sub>1</sub> は 4 Ω のまま）、並列の合成抵抗は？', choices: ['4 Ω より小さい', '4 Ω と 30 Ω の間', '30 Ω より大きい'], answer: 0, set: { R2: 30 }, look: '並列の合成は約 3.5 Ω で、小さい方の 4 Ω に近づく。電流はほとんど <var>R</var><sub>1</sub> の枝を流れる（3 A と 0.4 A）。' },
    ],
    quiz: [
      { q: '10 Ω と 10 Ω を並列につないだ合成抵抗は？', choices: ['5 Ω', '10 Ω', '20 Ω', '100 Ω'], answer: 0, why: '同じ抵抗2本の並列は半分。和分の積で (10 × 10)/(10 + 10) = 5 Ω。' },
      { q: '4 Ω と 6 Ω を直列にして 20 V をかけた。4 Ω の抵抗にかかる電圧は？', choices: ['4 V', '8 V', '10 V', '12 V'], answer: 1, why: '合成 10 Ω で電流 2 A。4 Ω には 4 × 2 = 8 V（電圧は 4 : 6 に分かれる）。' },
      { q: '3 Ω と 6 Ω の並列の合成抵抗は？', choices: ['2 Ω', '4.5 Ω', '9 Ω', '18 Ω'], answer: 0, why: '和分の積：(3 × 6)/(3 + 6) = 18/9 = 2 Ω。並列の合成は、小さい方の 3 Ω より必ず小さくなる。' },
    ],
    exam: `<p>抵抗の合成や分圧・分流を使う直流回路の計算は、理論で約35問（過去12回）。ブリッジ回路やキルヒホッフの法則の問題も、まずここで回路を簡単にしてから解く。</p>
      <ul>
        <li>並列2本は「和分の積」：${Notation.html('R_{1}R_{2}')} / (${Notation.html('R_1')} + ${Notation.html('R_2')})。3本以上は 1/${Notation.html('R')} = 1/${Notation.html('R_1')} + 1/${Notation.html('R_2')} + 1/${Notation.html('R_3')}。</li>
        <li>並列の合成抵抗は、いちばん小さい抵抗より必ず小さい。検算に使える。</li>
      </ul>`,
    conditions: '電池の中の抵抗と、導線の抵抗は 0 とする',
    notesHtml: `
      <h2>しくみ</h2>
      <p>直列では電流の通り道が1本なので、どの抵抗にも同じ電流が流れ、電池の電圧が抵抗の比で分かれる。抵抗をつなぐほど流れにくくなる（合成抵抗は足し算）。</p>
      <p>並列ではどの枝にも同じ電圧がかかり、電流が枝に分かれる。通り道が増えるので流れやすくなり、合成抵抗はどの枝の抵抗よりも小さくなる。</p>
      <h2>公式</h2>
      <ul class="formulas">
        <li>直列：${Notation.html('R')} = ${Notation.html('R_1')} + ${Notation.html('R_2')}</li>
        <li>並列：${Notation.html('R')} = ${Notation.html('R_{1}R_{2}')} / (${Notation.html('R_1')} + ${Notation.html('R_2')})</li>
        <li>分圧：${Notation.html('V_1')} = ${Notation.html('R_1')} / (${Notation.html('R_1')} + ${Notation.html('R_2')}) × ${Notation.html('V')}</li>
        <li>分流：${Notation.html('I_1')} = ${Notation.html('R_2')} / (${Notation.html('R_1')} + ${Notation.html('R_2')}) × ${Notation.html('I')}</li>
      </ul>
      <p class="symbols">${Notation.html('R')}：合成抵抗［Ω］、${Notation.html('R_1')}・${Notation.html('R_2')}：それぞれの抵抗［Ω］、${Notation.html('V')}：電池の電圧［V］、${Notation.html('V_1')}：${Notation.html('R_1')} にかかる電圧［V］、${Notation.html('I')}：全体の電流［A］、${Notation.html('I_1')}：${Notation.html('R_1')} の枝の電流［A］</p>`,
  };
})(this);
