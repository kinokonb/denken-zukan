// 理論2「直列と並列」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js。
// draw の look は js/job-play.js が毎コマ渡す今の様子：switchOn（0〜1）、lamps（電球ごとの明るさ）、broken（切れた電球・飛んだヒューズ）、
// meter（計器の針）、reading（結果が出たら計器の読み）、probe（テスターで測っている電球と針）、deciding（決めている間か）。
// draw は火花などを出す位置（lamps・fuse）を返す
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
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

  function drawAmmeter(g, x, y, look, max, mark = null, ghost = null) {
    PlayKit.meter(g, x, y, look, { max, letter: 'A', cls: 'q-current', mark, ghost });
  }

  // 電圧計（テスター）。読みは計器の下
  function drawVoltmeter(g, x, y, look, max, ghost = null, readingY = y + 40) {
    PlayKit.meter(g, x, y, look, { max, letter: 'V', cls: 'q-voltage', ghost, readingY });
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

  // 電球の両端（テスターのリード線を当てる所）
  function lampEnds(lamp) {
    return lamp.vertical ? [[lamp.x, lamp.y - 13], [lamp.x, lamp.y + 13]] : [[lamp.x - 13, lamp.y], [lamp.x + 13, lamp.y]];
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
    if (look.probe) Svg.leads(g, [TESTER.x, TESTER.y], lampEnds(PROBE_LAMPS[look.probe.index]));
    // タップできる所（決めている間だけ）。測っている電球は実線の輪
    if (look.deciding) {
      PROBE_LAMPS.forEach((lamp, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: lamp.x, cy: lamp.y, r: 19, class: 'job-tap-ring' });
      });
    }
    return { lamps: PROBE_LAMPS.map((lamp) => [lamp.x, lamp.y]) };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く（または値を決める）→ スイッチ → 本物とくらべる ----

  const LOOP = { left: 40, right: 300, top: 64, bottom: 196, mid: 130 };

  function drawLoop(g) {
    const { left, right, top, bottom, mid } = LOOP;
    Svg.wire(g, [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]]);
  }

  // ① オームの法則：抵抗1本の電流を予想する
  function runOhmBasic({ V, R }, guess) {
    const I = DcCircuit.ohm({ V, R }).I;
    return { ...predicted(guess, I, 'A', `${V} V ÷ ${R} Ω = ${num(I)} A`), meter: I, lamps: [], burst: null, reading: `${amperes(I)} A` };
  }

  function drawOhmBasic(g, { V, R }, guess, look) {
    drawLoop(g);
    drawBattery(g, LOOP.left, LOOP.mid, V);
    Svg.knifeSwitch(g, 88, LOOP.top, { on: look.switchOn });
    Svg.resistor(g, 190, LOOP.top);
    Svg.note(g, 190, LOOP.top + 26, `R = ${R} Ω`, { cls: 'value q-active', anchor: 'middle' });
    drawAmmeter(g, 176, LOOP.bottom, look, 4, null, guess);
    Svg.note(g, 180, JOB_NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ② 定格：電球だけをつなぎ、電池の電圧を決める
  function runRatedBasic({ Vr, Ir }, V) {
    const r = DcCircuit.lampWithSeriesResistor({ V, Vr, Ir, R: 0 });
    const base = { meter: r.I, lamps: [r.brightness] };
    if (near(V, Vr)) return { ...base, ok: true, burst: null, reading: `${amperes(r.I)} A`, reason: `定格どおり！ ${Vr} V をかけると ${Ir} A 流れて、ちょうどの明るさ` };
    if (V < Vr) return { ...base, ok: false, burst: null, reading: `${amperes(r.I)} A`, reason: `暗い。${V} V では定格の ${Vr} V に足りない` };
    return { ...base, ok: false, burst: { lamp: 0 }, reading: `${amperes(r.I)} A → 0 A`, reason: `切れた！ ${V} V は定格の ${Vr} V をこえる` };
  }

  function drawRatedBasic(g, { Vr, Ir }, V, look) {
    drawLoop(g);
    drawBattery(g, LOOP.left, LOOP.mid, V);
    Svg.knifeSwitch(g, 88, LOOP.top, { on: look.switchOn });
    Svg.lamp(g, LOOP.right, LOOP.mid, { level: look.lamps[0] || 0, broken: look.broken.lamps[0] });
    Svg.note(g, LOOP.right - 20, LOOP.mid, `定格 ${Vr} V・${Ir} A`, { cls: 'value', anchor: 'end' });
    drawAmmeter(g, 176, LOOP.bottom, look, Ir * 2);
    Svg.note(g, 180, JOB_NOTE_Y, '定格の電圧をこえると切れる決まり（本物は少しなら耐える）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[LOOP.right, LOOP.mid]] };
  }

  // ③ 電球の抵抗：電球と同じ電流が流れる抵抗を選ぶ
  function runLampResistanceBasic({ Vr, Ir }, R) {
    const I = DcCircuit.ohm({ V: Vr, R }).I;
    const base = { meter: I, lamps: [], burst: null, reading: `${amperes(I)} A` };
    if (near(I, Ir)) return { ...base, ok: true, reason: `ぴったり！ ${Vr} V ÷ ${Ir} A = ${R} Ω。これがこの電球の抵抗` };
    const way = I > Ir ? `電球（${Ir} A）より多い。<var>R</var> を大きく` : `電球（${Ir} A）より少ない。<var>R</var> を小さく`;
    return { ...base, ok: false, reason: `電流 ${num(I)} A で、${way}（<var>R</var> = <var>V</var> ÷ <var>I</var>）` };
  }

  function drawLampResistanceBasic(g, { Vr, Ir }, R, look) {
    drawLoop(g);
    drawBattery(g, LOOP.left, LOOP.mid, Vr);
    Svg.knifeSwitch(g, 88, LOOP.top, { on: look.switchOn });
    Svg.resistor(g, LOOP.right, LOOP.mid, { vertical: true });
    Svg.note(g, LOOP.right - 16, LOOP.mid, `R = ${R} Ω`, { cls: 'value q-active', anchor: 'end' });
    Svg.note(g, 180, 30, `見本の電球：${Vr} V をかけると ${Ir} A（赤い印）`, { cls: 'value', anchor: 'middle' });
    drawAmmeter(g, 176, LOOP.bottom, look, Ir * 2, Ir);
    return { lamps: [] };
  }

  // ④ 直列：R1 にかかる電圧を予想する
  const SERIES_R1 = { x: 150, y: LOOP.top };
  const SERIES_METER = [150, 124];

  function runSeriesBasic({ V, R1, R2 }, guess) {
    const I = V / DcCircuit.seriesResistance(R1, R2);
    const V1 = I * R1;
    const why = `電流 ${V}÷(${R1}+${R2}) = ${num(I)} A、<var>R</var><sub>1</sub> に ${num(I)}×${R1} = ${num(V1)} V（<var>R</var><sub>2</sub> に ${num(V - V1)} V、足して ${V} V）`;
    return { ...predicted(guess, V1, 'V', why), meter: V1, lamps: [], burst: null, reading: `${num(V1)} V` };
  }

  function drawSeriesBasic(g, { V, R1, R2 }, guess, look) {
    drawLoop(g);
    drawBattery(g, LOOP.left, LOOP.mid, V);
    Svg.knifeSwitch(g, 84, LOOP.top, { on: look.switchOn });
    Svg.resistor(g, SERIES_R1.x, SERIES_R1.y);
    Svg.note(g, SERIES_R1.x + 30, SERIES_R1.y - 16, `R₁ = ${R1} Ω`, { cls: 'value q-active', anchor: 'start' });
    Svg.resistor(g, LOOP.right, LOOP.mid, { vertical: true });
    Svg.note(g, LOOP.right - 16, LOOP.mid, `R₂ = ${R2} Ω`, { cls: 'value q-active', anchor: 'end' });
    drawVoltmeter(g, SERIES_METER[0], SERIES_METER[1], look, 24, guess, SERIES_METER[1] + 44);
    Svg.leads(g, SERIES_METER, [[SERIES_R1.x - 22, SERIES_R1.y], [SERIES_R1.x + 22, SERIES_R1.y]]);
    Svg.note(g, 180, JOB_NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ⑤ 並列とヒューズ：全体の電流を予想する（ヒューズの定格をこえていたら飛ぶ）
  const PARALLEL_LAMPS = [226, 282];

  function runParallelBasic({ V, R1, R2, F }, guess) {
    const a = V / R1;
    const b = V / R2;
    const total = a + b;
    const blown = total > F + 1e-9;
    const why = `${V}÷${R1} = ${num(a)} A と ${V}÷${R2} = ${num(b)} A の足し算で ${num(total)} A${blown ? `。ヒューズ ${F} A をこえたので飛んだ` : ''}`;
    return {
      ...predicted(guess, total, 'A', why),
      meter: total,
      lamps: [1, 1],
      burst: blown ? { fuse: true } : null,
      reading: blown ? `${amperes(total)} A → 0 A` : `${amperes(total)} A`,
    };
  }

  function drawParallelBasic(g, { V, R1, R2, F }, guess, look) {
    const { top, bottom, mid } = LOOP;
    const left = 36;
    const last = PARALLEL_LAMPS[PARALLEL_LAMPS.length - 1];
    Svg.wire(g, [[left, mid], [left, top], [last, top]]);
    Svg.wire(g, [[left, mid], [left, bottom], [last, bottom]]);
    for (const x of PARALLEL_LAMPS) Svg.wire(g, [[x, top], [x, bottom]]);
    drawBattery(g, left, mid, V);
    Svg.knifeSwitch(g, 74, top, { on: look.switchOn });
    Svg.fuse(g, 124, top, { blown: look.broken.fuse });
    Svg.note(g, 124, top - 20, `ヒューズ ${F} A`, { cls: 'value q-current', anchor: 'middle' });
    PARALLEL_LAMPS.forEach((x, i) => {
      Svg.lamp(g, x, mid, { level: look.lamps[i] || 0 });
      Svg.note(g, x, mid + 26, `${[R1, R2][i]} Ω`, { cls: 'value q-active', anchor: 'middle' });
    });
    drawAmmeter(g, 100, bottom, look, 6, F, guess);
    Svg.note(g, 180, JOB_NOTE_Y, 'ヒューズは定格の電流をこえると飛ぶ決まり', { cls: 'faint', anchor: 'middle' });
    return { lamps: PARALLEL_LAMPS.map((x) => [x, mid]), fuse: [124, top] };
  }

  // ⑥ 断線とテスター：直列の電球3個のうち1個が切れている。指定の電球にテスターを当てた読みを予想する
  const BREAK_LAMPS = [{ x: 140, y: LOOP.top }, { x: 230, y: LOOP.top }, { x: LOOP.right, y: LOOP.mid, vertical: true }];
  const BREAK_TESTER = [170, 136];

  function runBreakBasic({ V, broken, target }, guess) {
    const volts = DcCircuit.seriesLampsWithBreak({ V, n: BREAK_LAMPS.length, broken }).voltages[target];
    const why = target === broken
      ? `切れ目には電池の ${V} V が全部かかる`
      : `電流が流れないので、${target + 1}番は 0 A × 抵抗 = 0 V`;
    return { ...predicted(guess, volts, 'V', why), meter: volts, lamps: [], burst: null, reading: `${num(volts)} V` };
  }

  function drawBreakBasic(g, { V, broken, target }, guess, look) {
    drawLoop(g);
    drawBattery(g, LOOP.left, LOOP.mid, V);
    Svg.knifeSwitch(g, 84, LOOP.top, { on: 1 });
    BREAK_LAMPS.forEach((lamp, i) => {
      Svg.lamp(g, lamp.x, lamp.y, { broken: i === broken });
      const [nx, ny] = lamp.vertical ? [lamp.x + 20, lamp.y] : [lamp.x, lamp.y - 20];
      Svg.note(g, nx, ny, `${i + 1}`, { cls: 'value', anchor: 'middle' });
    });
    drawVoltmeter(g, BREAK_TESTER[0], BREAK_TESTER[1], look, 24, guess);
    Svg.leads(g, BREAK_TESTER, lampEnds(BREAK_LAMPS[target]));
    Svg.note(g, 180, JOB_NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: BREAK_LAMPS.map((lamp) => [lamp.x, lamp.y]) };
  }

  const jobs = [
    {
      // 直列の抵抗で電球の電圧を定格に合わせる（分圧）
      kind: 'dial',
      needs: 1, // 失敗したら準備の②（定格）から
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
      needs: 4, // 失敗したら準備の⑤（並列とヒューズ）から
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
      needs: 5, // 失敗したら準備の⑥（断線とテスター）から
      cases: [6, 12, 24].flatMap((V) => [0, 1, 2, 3].map((broken) => ({ V, broken }))),
      probe: {
        parts: PROBE_LAMPS.length,
        hint: '電球をタップすると、テスターがその電球にかかる電圧を測る',
        measure: ({ V, broken }, i) => DcCircuit.seriesLampsWithBreak({ V, n: PROBE_LAMPS.length, broken }).voltages[i],
        reading: (volts) => `${Notation.number(volts, 0)} V`,
      },
      action: 'この電球を交換',
      request: () => '電球が1つもつかない。テスターで測って、切れた1個を交換しよう',
      answer: ({ broken }) => broken,
      run: runProbeJob,
      draw: drawProbeJob,
    },
  ];

  // 準備（前提の知識）：この順に1つずつ。know は「使う知識」で、問いの上にいつも見せる
  const basics = [
    {
      title: 'オームの法則',
      kind: 'dial',
      cases: [[12, 6], [12, 4], [6, 3], [9, 3], [12, 8], [6, 12], [24, 8], [10, 4]].map(([V, R]) => ({ V, R })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 4, step: 0.5 },
      know: '電流 = 電圧 ÷ 抵抗（<var>I</var> = <var>V</var> ÷ <var>R</var>）。電圧が電流を押し、抵抗がじゃまをする',
      request: () => '電流計の針はどこを指す？ 予想の針を置こう',
      answer: ({ V, R }) => V / R,
      run: runOhmBasic,
      draw: drawOhmBasic,
    },
    {
      title: '定格',
      kind: 'dial',
      cases: [[6, 0.5], [3, 0.3], [12, 1], [9, 0.5], [4, 0.2], [24, 2], [18, 1.5]].map(([Vr, Ir]) => ({ Vr, Ir })),
      dial: { name: '電池の電圧', symbol: 'V', unit: 'V', min: 1, max: 24, step: 1 },
      know: '定格＝その電圧で使う決まり。「6 V・0.5 A」の電球は、6 V をかけると 0.5 A 流れて、ちょうどの明るさになる',
      request: ({ Vr, Ir }) => `電球（${Vr} V・${Ir} A）をちょうど定格で光らせる電池の電圧は？`,
      answer: ({ Vr }) => Vr,
      run: runRatedBasic,
      draw: drawRatedBasic,
    },
    {
      title: '電球の抵抗',
      kind: 'dial',
      cases: [[6, 0.5], [3, 0.2], [12, 0.5], [9, 0.3], [4, 0.5], [6, 1], [2, 0.1]].map(([Vr, Ir]) => ({ Vr, Ir })),
      dial: { name: '抵抗', symbol: 'R', unit: 'Ω', min: 1, max: 30, step: 1 },
      know: '抵抗 = 電圧 ÷ 電流（<var>R</var> = <var>V</var> ÷ <var>I</var>）。定格の電圧を定格の電流で割ると、その電球の抵抗になる',
      request: ({ Vr, Ir }) => `電球（${Vr} V・${Ir} A）と同じ電流が流れる抵抗 <var>R</var> を選ぼう`,
      answer: ({ Vr, Ir }) => Vr / Ir,
      run: runLampResistanceBasic,
      draw: drawLampResistanceBasic,
    },
    {
      title: '直列',
      kind: 'dial',
      cases: [[12, 4, 8], [12, 2, 4], [9, 1, 2], [24, 6, 2], [12, 3, 1], [6, 1, 2], [18, 4, 2]].map(([V, R1, R2]) => ({ V, R1, R2 })),
      dial: { name: '予想', symbol: 'V_1', unit: 'V', min: 0, max: 24, step: 1 },
      know: '直列は電流がどこも同じ：<var>I</var> = <var>V</var> ÷ (<var>R</var><sub>1</sub> + <var>R</var><sub>2</sub>)。それぞれの電圧は <var>I</var> × <var>R</var> で、足すと電池の電圧',
      request: () => '<var>R</var><sub>1</sub> にかかる電圧は？ 電圧計の予想の針を置こう',
      answer: ({ V, R1, R2 }) => (V * R1) / (R1 + R2),
      run: runSeriesBasic,
      draw: drawSeriesBasic,
    },
    {
      title: '並列とヒューズ',
      kind: 'dial',
      cases: [[12, 12, 6, 5], [12, 6, 6, 3], [6, 3, 6, 2], [12, 24, 12, 2], [9, 9, 3, 5], [24, 12, 8, 3]].map(([V, R1, R2, F]) => ({ V, R1, R2, F })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 6, step: 0.5 },
      know: '並列はどの電球にも電池の電圧がかかる。電流は1個ずつ <var>V</var> ÷ <var>R</var> で、全体は足し算。ヒューズは書いてある電流をこえると飛ぶ',
      request: () => '全体の電流計は何 A？ 予想の針を置こう',
      answer: ({ V, R1, R2 }) => V / R1 + V / R2,
      run: runParallelBasic,
      draw: drawParallelBasic,
    },
    {
      title: '断線とテスター',
      kind: 'dial',
      cases: [6, 12, 24].flatMap((V) => [[2, 2], [2, 0], [1, 1], [0, 2]].map(([broken, target]) => ({ V, broken, target }))),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 24, step: 1 },
      action: '測る',
      know: '直列で1か所切れると、電流が流れない（0 A）。切れていない電球は 0 A × 抵抗 = 0 V、切れ目には電池の電圧が全部かかる',
      request: ({ broken, target }) => `${broken + 1}番の電球が切れている。${target + 1}番にテスターを当てると何 V？`,
      answer: ({ V, broken, target }) => (broken === target ? V : 0),
      run: runBreakBasic,
      draw: drawBreakBasic,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays['series-parallel'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
