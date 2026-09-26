// 理論2「直列と並列」の遊び：ミッション（現場の依頼）。型の決まりは js/job.js、画面と演出は js/job-play.js。
// draw の look は js/job-play.js が毎コマ渡す今の様子：switchOn（0〜1）、lamps（電球ごとの明るさ）、broken（切れた電球・飛んだヒューズ）、
// meter（計器の針）、reading（結果が出たら計器の読み）、probe（テスターで測っている電球と針）、deciding（決めている間か）。
// draw は火花などを出す位置（lamps・fuse）を返す
(function (global) {
  'use strict';

  const num = (value) => String(Number(value.toFixed(2)));
  const amperes = (value) => Notation.number(value, 2);
  const JOB_NOTE_Y = 262;

  function runLampJob({ V, Vr, Ir }, R) {
    const r = DcCircuit.lampWithSeriesResistor({ V, Vr, Ir, R });
    const base = { meter: r.I, lamps: [r.brightness] };
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
    const base = { meter: r.I, lamps: Array(n).fill(1) };
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
      return { ok: true, meter: 0, lamps, burst: null, reading: null, reason: `ついた！ 切れていたのは ${i + 1}番。切れ目に電池の ${V} V が全部かかり、ほかの電球は 0 V` };
    }
    return { ok: false, meter: 0, lamps, burst: null, reading: null, reason: `まだつかない。${i + 1}番は 0 V で切れていなかった（切れた所には ${V} V がかかる）` };
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

  const jobs = [
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
  ];

  const play = { jobs };
  global.Plays = global.Plays || {};
  global.Plays['series-parallel'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
