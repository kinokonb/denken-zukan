// 理論「正弦波と実効値」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は瞬時値の式から実効値・周波数を読むことから始め、瞬時値、電力は実効値で、平均値、直流と交流の重ね合わせへ進む。
// 現場は電熱線（ちょうどの電力）、コンデンサの耐圧（最大値で決まる）、3つの電源の実効値さがし。計算は js/calc/ac-wave.js。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const volts = (value) => `${num(value)} V`;
  const NOTE_Y = 262;
  const LOOP = { left: 40, right: 300, top: 64, bottom: 196, mid: 130 };
  // 式の書き方：実効値 V の正弦波を v = V√2 sin(ωt) で
  const formula = (V, omega = '100π') => `v = ${V}√2 sin(${omega}t)`;

  function drawLoop(g, look, sourceText) {
    const { left, right, top, bottom, mid } = LOOP;
    Svg.wire(g, [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]]);
    Svg.acSource(g, left, mid);
    Svg.note(g, left + 20, mid + 24, sourceText, { cls: 'value q-voltage' });
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
  }

  // 式を大きく見せる札
  const formulaNote = (g, text) => Svg.note(g, 180, 36, text, { cls: 'value q-voltage', anchor: 'middle' });

  // ---- ミッション（現場の依頼） ----

  // ちょうど P W の電熱線（P = V² ÷ R、V は実効値。最大値で計算すると2倍になる）
  function runHeaterJob({ V, P }, R) {
    const now = (V * V) / R;
    const base = { meter: now, lamps: [now / P] };
    const math = `${V}² ÷ ${R} = ${num(now)} W`;
    if (near(now, P)) return { ...base, ok: true, burst: null, reading: `${num(now)} W`, reason: `ちょうど！ 実効値 ${V} V で ${math}（最大値 ${num(V * Math.SQRT2)} V を使うと2倍になる）` };
    if (now < P) return { ...base, ok: false, burst: null, reading: `${num(now)} W`, reason: `弱い。${math}。<var>R</var> を小さく` };
    return { ...base, ok: false, burst: { lamp: 0 }, reading: `${num(now)} W → 0 W`, reason: `焼き切れた！ ${math}（${P} W まで）。<var>R</var> を大きく` };
  }

  function drawHeaterJob(g, { V, P }, R, look) {
    drawLoop(g, look, '交流');
    formulaNote(g, formula(V));
    Svg.heater(g, LOOP.right, LOOP.mid, { level: look.lamps[0] || 0, broken: look.broken.lamps[0] });
    Svg.note(g, LOOP.right - 16, LOOP.mid, `電熱線 R = ${R} Ω`, { cls: 'value q-active', anchor: 'end' });
    PlayKit.meter(g, 176, LOOP.bottom, look, { max: P * 1.6, letter: 'W', cls: 'q-active', mark: P });
    Svg.note(g, 180, NOTE_Y, `この電熱線は ${P} W まで。こえると焼き切れる決まり`, { cls: 'faint', anchor: 'middle' });
    return { lamps: [[LOOP.right, LOOP.mid]] };
  }

  // コンデンサの耐圧（最大値）をこえない、いちばん高い交流の実効値（10 V おき）
  const STEP_V = 10;
  const highestRms = ({ rating }) => Math.floor(rating / Math.SQRT2 / STEP_V + 1e-9) * STEP_V;

  function runRatingJob({ rating }, V) {
    const peak = V * Math.SQRT2;
    const base = { meter: peak, lamps: [], reading: volts(Math.round(peak)) };
    const math = `${V} V × √2 ≒ ${Math.round(peak)} V`;
    if (peak > rating + 1e-9) return { ...base, ok: false, burst: { fuse: true }, reading: `${volts(Math.round(peak))} → 0 V`, reason: `こわれた！ 山の高さ ${math} が耐圧 ${rating} V をこえた` };
    if ((V + STEP_V) * Math.SQRT2 <= rating + 1e-9) return { ...base, ok: false, burst: null, reason: `まだ上げられる。山は ${math}（耐圧 ${rating} V）` };
    return { ...base, ok: true, burst: null, reason: `ぎりぎり！ 山は ${math}（耐圧 ${rating} V）。${V + STEP_V} V だと ${Math.round((V + STEP_V) * Math.SQRT2)} V でこえる` };
  }

  const CAP_AT = [LOOP.right, LOOP.mid];

  function drawRatingJob(g, { rating }, V, look) {
    drawLoop(g, look, '交流');
    const [cx, cy] = CAP_AT;
    Svg.capacitor(g, cx, cy, { vertical: true });
    if (look.broken.fuse) Svg.el(g, 'circle', { cx, cy, r: 5, class: 'fuse-scorch' });
    Svg.note(g, cx - 18, cy, `コンデンサ 耐圧 ${rating} V`, { cls: 'value q-reactive', anchor: 'end' });
    PlayKit.meter(g, 176, LOOP.bottom, look, { max: rating * 1.5, letter: 'V', cls: 'q-voltage', mark: rating });
    Svg.note(g, 176, LOOP.bottom - 34, '山の高さ（最大値）', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, 180, NOTE_Y, '耐圧は、こえるとこわれる電圧の山の高さ（最大値）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[cx, cy]], fuse: [cx, cy] };
  }

  // 3つの電源（直流と交流を重ねたもの）を測って、実効値が決まった値のものを当てる
  const SOURCES = { xs: [70, 180, 290], y: 96, names: ['A', 'B', 'C'] };
  const peakOf = ({ Vd, Va }) => Vd + Va * Math.SQRT2;

  function runSourceProbe({ sources, target }, i) {
    const { Vd, Va } = sources[i];
    const rms = AcWave.mixedRms(Vd, Va);
    const math = `${SOURCES.names[i]} は交流の山 ${Math.round(Va * Math.SQRT2)} V ÷ √2 = ${Va} V、√(${Vd}² + ${Va}²) = ${num(rms)} V`;
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    if (near(rms, target)) return { ...base, ok: true, reason: `当たり！ ${math}` };
    return { ...base, ok: false, reason: `${math}。直流分と交流分の実効値を、2乗して足してから √` };
  }

  function drawSourceProbe(g, { sources }, selected, look) {
    const { xs, y, names } = SOURCES;
    xs.forEach((x, i) => {
      Svg.el(g, 'rect', { x: x - 30, y: y - 30, width: 60, height: 60, rx: 4, class: 'building' });
      Svg.note(g, x, y - 42, `電源 ${names[i]}`, { cls: 'value', anchor: 'middle' });
      Svg.acSource(g, x, y);
      if (!look.deciding) Svg.note(g, x, y + 44, `実効値 ${num(AcWave.mixedRms(sources[i].Vd, sources[i].Va))} V`, { cls: 'value q-voltage', anchor: 'middle' });
    });
    const scope = [150, 206];
    Svg.gauge(g, ...scope, { value: look.probe ? look.probe.needle : 0, max: 300, letter: 'V', cls: 'q-voltage' });
    if (look.probe) {
      Svg.note(g, scope[0] + 32, scope[1] - 8, look.probe.reading, { cls: 'value q-voltage' });
      Svg.note(g, scope[0] + 32, scope[1] + 10, `直流分 ${sources[look.probe.index].Vd} V`, { cls: 'value q-voltage' });
      Svg.leads(g, scope, [[xs[look.probe.index] - 6, y + 30], [xs[look.probe.index] + 6, y + 30]]);
    } else {
      Svg.note(g, scope[0] + 32, scope[1] + 4, '電圧をみる計器', { cls: 'faint' });
    }
    if (look.deciding) {
      xs.forEach((x, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: y, r: 40, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, '計器は、電圧の山の高さ（最大値）と直流分（平均）を読む', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, y]) };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  // ①④ 式から実効値（交流の電圧計）、電力は実効値で
  function runRmsBasic({ V }, guess) {
    return { ...predicted(guess, V, 'V', `最大値 ${V}√2 ÷ √2 = ${V} V（計器の値は実効値）`), meter: V, lamps: [1], burst: null, reading: volts(V) };
  }

  function drawRmsBasic(g, { V }, guess, look) {
    drawLoop(g, look, '交流');
    formulaNote(g, formula(V));
    Svg.lamp(g, LOOP.right, LOOP.mid, { level: look.lamps[0] || 0 });
    const at = [200, LOOP.mid];
    PlayKit.meter(g, ...at, look, { max: 300, letter: 'V', cls: 'q-voltage', ghost: guess });
    Svg.leads(g, at, [[LOOP.right, LOOP.mid - 13], [LOOP.right, LOOP.mid + 13]]);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（交流の電圧計）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[LOOP.right, LOOP.mid]] };
  }

  // ② 式から周波数：ω = 2πf
  function runFrequencyBasic({ k }, guess) {
    const f = k / 2;
    return { ...predicted(guess, f, 'Hz', `ω = ${k}π = 2π<var>f</var> なので <var>f</var> = ${k} ÷ 2 = ${num(f)} Hz`), meter: f, lamps: [1], burst: null, reading: `${num(f)} Hz` };
  }

  function drawFrequencyBasic(g, { k }, guess, look) {
    drawLoop(g, look, '交流');
    formulaNote(g, formula(100, `${k}π`));
    Svg.lamp(g, LOOP.right, LOOP.mid, { level: look.lamps[0] || 0 });
    PlayKit.meter(g, 176, LOOP.bottom, look, { max: 120, letter: 'Hz', cls: 'ink', ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（周波数計）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[LOOP.right, LOOP.mid]] };
  }

  // ③ 瞬時値：v = Vm sin(角度)
  const ROTOR = { x: 110, y: 140, r: 56 };

  function runInstantBasic({ Vm, deg }, guess) {
    const v = AcWave.instantaneous(Vm, deg);
    return { ...predicted(guess, v, 'V', `${Vm} × sin ${deg}° = ${Vm} × ${num(Math.sin((deg * Math.PI) / 180))} = ${num(v)} V`), meter: v, lamps: [], burst: null, reading: volts(v) };
  }

  function drawInstantBasic(g, { Vm, deg }, guess, look) {
    const { x, y, r } = ROTOR;
    const a = (deg * Math.PI) / 180;
    Svg.el(g, 'circle', { cx: x, cy: y, r, class: 'stator' });
    Svg.guide(g, x - r - 10, y, x + r + 10, y, 'axis');
    Svg.arrow(g, x, y, x + r * Math.cos(a), y - r * Math.sin(a), { cls: 'q-voltage', width: 2.5 });
    Svg.angleArc(g, x, y, 20, 0, a, { cls: 'arc-angle' });
    Svg.note(g, x + 26, y - 10, `${deg}°`, { cls: 'value' });
    if (look.reading) Svg.guide(g, x + r * Math.cos(a), y - r * Math.sin(a), x + r * Math.cos(a), y);
    Svg.note(g, x, y + r + 20, `長さ＝最大値 ${Vm} V`, { cls: 'value q-voltage', anchor: 'middle' });
    formulaNote(g, `v = ${Vm} sin θ、いま θ = ${deg}°`);
    PlayKit.meter(g, 272, 140, look, { min: -300, max: 300, letter: 'V', cls: 'q-voltage', mark: 0, ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（真ん中が 0）。瞬時値＝矢印の高さ', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  function runPowerBasic({ V, R }, guess) {
    const P = (V * V) / R;
    return { ...predicted(guess, P, 'W', `実効値 ${V} V で ${V}² ÷ ${R} = ${num(P)} W（最大値で計算すると2倍になってしまう）`), meter: P, lamps: [P / 4000], burst: null, reading: `${num(P)} W` };
  }

  function drawPowerBasic(g, { V, R }, guess, look) {
    drawLoop(g, look, '交流');
    formulaNote(g, formula(V));
    Svg.heater(g, LOOP.right, LOOP.mid, { level: look.lamps[0] || 0 });
    Svg.note(g, LOOP.right - 16, LOOP.mid, `電熱線 ${R} Ω`, { cls: 'value q-active', anchor: 'end' });
    PlayKit.meter(g, 176, LOOP.bottom, look, { max: 4000, letter: 'W', cls: 'q-active', ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（電力計）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[LOOP.right, LOOP.mid]] };
  }

  // ⑤ 平均値（全波整流）：2Vm ÷ π。目盛りは 5 V おきで、いちばん近い目盛りが当たり
  const AVERAGE_STEP = 5;
  const RECT = { left: 40, right: 262, base: 196, height: 110 };

  function runAverageBasic({ Vm }, guess) {
    const avg = AcWave.averageFromPeak(Vm);
    return { ...PlayKit.predictedNearest(guess, avg, AVERAGE_STEP, 'V', `2 × ${Vm} ÷ π ≒ ${num(avg)} V（最大値の約 0.637 倍）`), meter: avg, lamps: [], burst: null, reading: `約 ${Math.round(avg)} V` };
  }

  function drawAverageBasic(g, { Vm }, guess, look) {
    const { left, right, base, height } = RECT;
    const scale = height / 300;
    const points = [];
    for (let i = 0; i <= 120; i++) points.push([left + ((right - left) * i) / 120, base - Math.abs(Math.sin((2 * Math.PI * i) / 120)) * Vm * scale]);
    Svg.guide(g, left, base, right, base, 'axis');
    Svg.polyline(g, points, 'q-voltage thick');
    Svg.note(g, left, base - Vm * scale - 10, `全波整流した波（最大 ${Vm} V）`, { cls: 'value q-voltage' });
    if (look.reading) {
      const y = base - AcWave.averageFromPeak(Vm) * scale;
      Svg.el(g, 'line', { x1: left, y1: y, x2: right, y2: y, class: 'curve reference' });
      Svg.note(g, right + 6, y, '平均値', { cls: 'faint' });
    }
    PlayKit.meter(g, 300, 44, look, { max: 300, letter: 'V', cls: 'q-voltage', ghost: guess, readingY: 84 });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（平均値の計器）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ⑥ 直流と交流の重ね合わせ：√(Vd² + Va²)
  function runMixedBasic({ Vd, Va }, guess) {
    const rms = AcWave.mixedRms(Vd, Va);
    return { ...predicted(guess, rms, 'V', `√(${Vd}² + ${Va}²) = ${num(rms)} V（${Vd} + ${Va} = ${Vd + Va} V ではない）`), meter: rms, lamps: [1], burst: null, reading: volts(rms) };
  }

  function drawMixedBasic(g, { Vd, Va }, guess, look) {
    const { left, right, top, bottom, mid } = LOOP;
    Svg.wire(g, [[left, mid + 34], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid + 34]]);
    Svg.battery(g, left, mid + 30);
    Svg.acSource(g, left, mid - 26);
    Svg.note(g, left + 20, mid + 44, `直流 ${Vd} V`, { cls: 'value q-voltage' });
    Svg.note(g, left + 20, mid - 26, `交流 ${Va} V（実効値）`, { cls: 'value q-voltage' });
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.heater(g, right, mid, { level: look.lamps[0] || 0 });
    PlayKit.meter(g, 200, 150, look, { max: 300, letter: 'V', cls: 'q-voltage', ghost: guess });
    Svg.leads(g, [200, 150], [[right, mid - 16], [right, mid + 16]]);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（実効値の計器）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  const jobs = [
    {
      // P = V² ÷ R（V は実効値）
      kind: 'dial',
      needs: 3, // 失敗したら準備の④（電力は実効値で）から
      cases: [[100, 1000], [100, 500], [200, 1000], [100, 2000], [200, 2000], [100, 400], [200, 4000], [150, 900], [120, 1200], [100, 250]].map(([V, P]) => ({ V, P })),
      dial: { name: '電熱線の抵抗', symbol: 'R', unit: 'Ω', min: 1, max: 100, step: 1 },
      request: ({ P }) => `この交流で、ちょうど ${P} W の電熱線にしたい。<var>R</var> は？`,
      answer: ({ V, P }) => (V * V) / P,
      run: runHeaterJob,
      draw: drawHeaterJob,
    },
    {
      // 耐圧は最大値：実効値 × √2 が耐圧をこえない、いちばん高い電圧
      kind: 'dial',
      needs: 0, // 失敗したら準備の①（式から実効値）から
      cases: [250, 400, 160, 200, 350, 500, 300, 450, 100].map((rating) => ({ rating })),
      dial: { name: '交流の電圧（実効値）', symbol: 'V', unit: 'V', min: 0, max: 400, step: STEP_V },
      request: ({ rating }) => `耐圧 ${rating} V のコンデンサに、いちばん高い交流をかけたい。実効値は？`,
      answer: highestRms,
      run: runRatingJob,
      draw: drawRatingJob,
    },
    {
      // 直流と交流の重ね合わせ：√(Vd² + Va²)
      kind: 'probe',
      needs: 5, // 失敗したら準備の⑥（重ね合わせ）から
      cases: [
        [[[60, 80], [80, 80], [0, 80]], 100], [[[50, 100], [0, 100], [100, 50]], 100], [[[80, 40], [40, 80], [60, 80]], 100],
        [[[28, 96], [96, 40], [0, 120]], 100], [[[40, 40], [30, 40], [0, 40]], 50], [[[90, 90], [130, 40], [50, 120]], 130],
        [[[160, 160], [120, 160], [0, 160]], 200], [[[100, 0], [60, 60], [0, 140]], 100],
      ].map(([sources, target]) => ({ sources: sources.map(([Vd, Va]) => ({ Vd, Va })), target })),
      probe: {
        parts: SOURCES.xs.length,
        hint: '電源をタップすると、計器が電圧の山の高さと直流分を読む',
        measure: ({ sources }, i) => peakOf(sources[i]),
        reading: (peak) => `山 ${Math.round(peak)} V`,
      },
      action: 'これに決める',
      request: ({ target }) => `実効値が ${target} V の電源はどれ？`,
      answer: ({ sources, target }) => sources.findIndex(({ Vd, Va }) => near(AcWave.mixedRms(Vd, Va), target)),
      run: runSourceProbe,
      draw: drawSourceProbe,
    },
  ];

  // 準備（前提の知識）：この順に1つずつ。know は「使う知識」で、問いの上にいつも見せる
  const basics = [
    {
      title: '式から実効値',
      kind: 'dial',
      cases: [100, 200, 50, 150, 230, 20, 120, 300].map((V) => ({ V })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 300, step: 10 },
      know: '瞬時値の式 <var>v</var> = <var>V</var><sub>m</sub> sin ω<var>t</var> の <var>V</var><sub>m</sub> は最大値。実効値（計器の値）は 最大値 ÷ √2。「100√2」なら実効値 100 V',
      request: () => '交流の電圧計の針は？',
      answer: ({ V }) => V,
      run: runRmsBasic,
      draw: drawRmsBasic,
    },
    {
      title: '式から周波数',
      kind: 'dial',
      cases: [100, 120, 200, 50, 240, 80].map((k) => ({ k })),
      dial: { name: '予想', symbol: 'f', unit: 'Hz', min: 0, max: 120, step: 5 },
      know: 'sin の中の ω（角周波数）は1秒に進む角度。1回転が 2π なので ω = 2π<var>f</var>。100π なら <var>f</var> = 50 Hz',
      request: () => '周波数計の針は？',
      answer: ({ k }) => k / 2,
      run: runFrequencyBasic,
      draw: drawFrequencyBasic,
    },
    {
      title: '瞬時値',
      kind: 'dial',
      cases: [[200, 30], [100, 90], [240, 150], [200, 210], [100, 270], [280, 30], [160, 330], [300, 180]].map(([Vm, deg]) => ({ Vm, deg })),
      dial: { name: '予想', symbol: 'v', unit: 'V', min: -300, max: 300, step: 10 },
      know: 'まわる矢印（長さ＝最大値）の高さが瞬時値：<var>v</var> = <var>V</var><sub>m</sub> sin θ（基礎10）。sin 30° = 0.5、180° をこえると負',
      request: () => 'いまの瞬時値は？',
      answer: ({ Vm, deg }) => AcWave.instantaneous(Vm, deg),
      run: runInstantBasic,
      draw: drawInstantBasic,
    },
    {
      title: '電力は実効値で',
      kind: 'dial',
      cases: [[100, 10], [100, 20], [200, 20], [100, 5], [200, 10], [150, 15], [120, 12], [100, 25]].map(([V, R]) => ({ V, R })),
      dial: { name: '予想', symbol: 'P', unit: 'W', min: 0, max: 4000, step: 100 },
      know: '交流の電力は、実効値を使えば直流と同じ式：<var>P</var> = <var>V</var>² ÷ <var>R</var>。実効値は「同じ熱を出す直流の値」だから',
      request: () => '電熱線の電力は？',
      answer: ({ V, R }) => (V * V) / R,
      run: runPowerBasic,
      draw: drawPowerBasic,
    },
    {
      title: '平均値',
      kind: 'dial',
      cases: [100, 141, 150, 300, 120, 250, 180, 220].map((Vm) => ({ Vm })),
      dial: { name: '予想', symbol: 'V_{av}', unit: 'V', min: 0, max: 300, step: AVERAGE_STEP },
      know: '正弦波をそのまま平均すると 0。負の半分を折り返して（全波整流）平均すると 最大値 × 2/π（約 0.637 倍）',
      request: () => '平均値は？ いちばん近い目盛りに置こう',
      answer: ({ Vm }) => PlayKit.nearestMark(AcWave.averageFromPeak(Vm), AVERAGE_STEP),
      run: runAverageBasic,
      draw: drawAverageBasic,
    },
    {
      title: '直流と交流の重ね合わせ',
      kind: 'dial',
      cases: [[30, 40], [60, 80], [50, 120], [90, 120], [120, 160], [80, 60], [70, 240], [160, 120]].map(([Vd, Va]) => ({ Vd, Va })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 300, step: 10 },
      know: '直流の熱と交流の熱は足し算になる。熱は電圧の2乗に比例するので、実効値は √(<var>V</var><sub>d</sub>² + <var>V</var><sub>a</sub>²)',
      request: () => '実効値の計器の針は？',
      answer: ({ Vd, Va }) => AcWave.mixedRms(Vd, Va),
      run: runMixedBasic,
      draw: drawMixedBasic,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays['ac-rms'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
