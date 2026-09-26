// 理論「位相とフェーザ」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は式から位相差を読むことから始め、同じ向き・反対、90° ずれ（三平方）、複素数の角度、成分での足し算、一般の角度（余弦定理）へ進む。
// 現場は2台の交流電源の直列で電球を定格に（位相差・電圧を決める）と、位相計で「○° 遅れ」の電源を探す。計算は js/calc/phasor.js。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const volts = (value) => `${num(value)} V`;
  const NOTE_Y = 262;
  const BOARD = { x: 110, y: 138, r: 70 }; // 矢印を描く所
  const SIDE_METER = [292, 138];
  const complexText = ({ re, im }) => `${num(Math.abs(re) < 1e-9 ? 0 : re)} ${im < -1e-9 ? '−' : '+'} j${num(Math.abs(im))}`;
  const leadText = (deg) => (Math.abs(deg) === 180 ? '180°（反対）' : `${Math.abs(deg)}° ${deg > 0 ? '進み' : '遅れ'}`);

  // 矢印の図。arrows は [長さ, 角度(度), 名前, 点線か]。scale は長さ1あたりの画面の長さ。chain は先につないで描く
  function drawArrows(g, arrows, { scale, chain = false, total = null }) {
    const { x, y, r } = BOARD;
    Svg.el(g, 'circle', { cx: x, cy: y, r, class: 'stator' });
    Svg.guide(g, x - r - 8, y, x + r + 8, y, 'axis');
    let [sx, sy] = [x, y];
    for (const [length, deg, name, dashed] of arrows) {
      const [ex, ey] = [sx + scale * length * Math.cos(Phasor.toRad(deg)), sy - scale * length * Math.sin(Phasor.toRad(deg))];
      Svg.arrow(g, sx, sy, ex, ey, { cls: 'q-voltage', width: 2, dashed });
      Svg.label(g, (sx + ex) / 2 + 8, (sy + ey) / 2 - 8, name, { cls: 'q-voltage', size: 12, anchor: 'start' });
      if (chain) [sx, sy] = [ex, ey];
    }
    if (total) Svg.arrow(g, x, y, sx, sy, { cls: 'q-voltage', width: 3 });
  }

  // ---- ミッション（現場の依頼） ----

  // 2台の交流電源を直列にして電球を定格（T V）に：位相差 θ を決める（和は余弦定理）
  function lampResult(V, T) {
    if (Math.abs(V - T) < 0.5) return 'ok';
    return V < T ? 'dim' : 'over';
  }

  function runPhaseJob({ A, B, T }, theta) {
    const V = Phasor.sumMagnitude(A, B, theta);
    const base = { meter: V, lamps: [(V / T) ** 2] };
    const math = `√(${A}² + ${B}² + 2×${A}×${B}×cos ${theta}°) ≒ ${num(V)} V`;
    const result = lampResult(V, T);
    if (result === 'ok') return { ...base, ok: true, burst: null, reading: volts(V), reason: `定格どおり！ ${math}` };
    if (result === 'dim') return { ...base, ok: false, burst: null, reading: volts(V), reason: `暗い。${math}（定格 ${T} V）。ずれを小さく` };
    return { ...base, ok: false, burst: { lamp: 0 }, reading: `${volts(V)} → 0 V`, reason: `切れた！ ${math}（定格 ${T} V）。ずれを大きく` };
  }

  const SERIES = { left: 40, right: 300, top: 64, bottom: 196, mid: 130 };

  function drawSeriesSources(g, look, { top, bottom, lampText, broken }) {
    const { left, right } = SERIES;
    Svg.wire(g, [[left, 96], [left, SERIES.top], [right, SERIES.top], [right, SERIES.bottom], [left, SERIES.bottom], [left, 164]]);
    Svg.wire(g, [[left, 96], [left, 164]]);
    Svg.acSource(g, left, 100);
    Svg.acSource(g, left, 160);
    Svg.note(g, left + 20, 100, top, { cls: 'value q-voltage' });
    Svg.note(g, left + 20, 160, bottom, { cls: 'value q-voltage' });
    Svg.knifeSwitch(g, 84, SERIES.top, { on: look.switchOn });
    Svg.lamp(g, right, SERIES.mid, { level: look.lamps[0] || 0, broken });
    Svg.note(g, right - 18, SERIES.mid - 30, lampText, { cls: 'value', anchor: 'end' });
  }

  function drawPhaseJob(g, { A, B, T }, theta, look) {
    drawSeriesSources(g, look, { top: `V₁ ${A} V（基準）`, bottom: `V₂ ${B} V・${theta}° 進み`, lampText: `電球 定格 ${T} V`, broken: look.broken.lamps[0] });
    PlayKit.meter(g, 200, SERIES.bottom, look, { max: T * 1.6, letter: 'V', cls: 'q-voltage', mark: T });
    Svg.note(g, 180, NOTE_Y, '電球は、定格の電圧をこえると切れる決まり（±0.5 V は定格どおり）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[SERIES.right, SERIES.mid]] };
  }

  // 90° ずれた V₂ を決めて、合成をちょうど T に（三平方）
  function runQuadratureJob({ A, T }, B) {
    const V = Math.hypot(A, B);
    const base = { meter: V, lamps: [(V / T) ** 2] };
    const math = `√(${A}² + ${B}²) = ${num(V)} V`;
    if (near(V, T)) return { ...base, ok: true, burst: null, reading: volts(V), reason: `定格どおり！ ${math}（${A} + ${B} = ${A + B} V ではない）` };
    if (V < T) return { ...base, ok: false, burst: null, reading: volts(V), reason: `暗い。${math}（定格 ${T} V）。V₂ を大きく` };
    return { ...base, ok: false, burst: { lamp: 0 }, reading: `${volts(V)} → 0 V`, reason: `切れた！ ${math}（定格 ${T} V）。V₂ を小さく` };
  }

  function drawQuadratureJob(g, { A, T }, B, look) {
    drawSeriesSources(g, look, { top: `V₁ ${A} V（基準）`, bottom: `V₂ ${B} V・90° 進み`, lampText: `電球 定格 ${T} V`, broken: look.broken.lamps[0] });
    PlayKit.meter(g, 200, SERIES.bottom, look, { max: T * 1.6, letter: 'V', cls: 'q-voltage', mark: T });
    Svg.note(g, 180, NOTE_Y, '電球は、定格の電圧をこえると切れる決まり', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[SERIES.right, SERIES.mid]] };
  }

  // 位相計で3つの電源の複素数表示を読み、V₁（100 + j0）から決まった角度ずれたものを探す
  const SOURCES = { xs: [70, 180, 290], y: 96, names: ['A', 'B', 'C'] };

  function runPhaseProbe({ sources, target }, i) {
    const deg = Phasor.angle(sources[i]);
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    const math = `${SOURCES.names[i]} は ${complexText(sources[i])}、角度 tan⁻¹(${num(sources[i].im)} ÷ ${num(sources[i].re)}) → ${num(deg)}°`;
    if (near(deg, target)) return { ...base, ok: true, reason: `当たり！ ${math}（${leadText(target)}）` };
    return { ...base, ok: false, reason: `${math}。実部が横、虚部が縦（＋は上＝進み）` };
  }

  function drawPhaseProbe(g, { sources }, selected, look) {
    const { xs, y, names } = SOURCES;
    xs.forEach((x, i) => {
      Svg.el(g, 'rect', { x: x - 30, y: y - 30, width: 60, height: 60, rx: 4, class: 'building' });
      Svg.note(g, x, y - 42, `電源 ${names[i]}`, { cls: 'value', anchor: 'middle' });
      Svg.acSource(g, x, y);
      if (!look.deciding) Svg.note(g, x, y + 44, `${num(Phasor.angle(sources[i]))}°`, { cls: 'value q-voltage', anchor: 'middle' });
    });
    const meter = [150, 206];
    Svg.gauge(g, ...meter, { value: look.probe ? look.probe.needle : 0, max: 200, letter: 'V', cls: 'q-voltage' });
    Svg.note(g, meter[0] + 32, meter[1] + 4, look.probe ? look.probe.reading : '位相計（V₁ が基準）', { cls: look.probe ? 'value q-voltage' : 'faint' });
    if (look.probe) Svg.leads(g, meter, [[xs[look.probe.index] - 6, y + 30], [xs[look.probe.index] + 6, y + 30]]);
    if (look.deciding) {
      xs.forEach((x, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: y, r: 40, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, '位相計は V₁（100 + j0）を基準に、電圧を複素数で表示する', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, y]) };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  // ① 式から位相差
  function runReadPhaseBasic({ a, b }, guess) {
    const diff = b - a;
    return { ...predicted(guess, diff, '°', `(${Phasor.piText(b)}) − (${Phasor.piText(a)}) = ${diff}°（${diff === 0 ? '同じ' : leadText(diff)}）`), meter: diff, lamps: [], burst: null, reading: `${diff}°` };
  }

  function drawReadPhaseBasic(g, { a, b }, guess, look) {
    const plus = (deg) => (deg === 0 ? '' : deg > 0 ? ` + ${Phasor.piText(deg)}` : ` − ${Phasor.piText(-deg)}`);
    Svg.note(g, 30, 70, `v₁ = 100√2 sin(ωt${plus(a)})`, { cls: 'value q-voltage' });
    Svg.note(g, 30, 100, `v₂ = 100√2 sin(ωt${plus(b)})`, { cls: 'value q-voltage' });
    Svg.note(g, 30, 140, 'v₂ は v₁ より何度進んでいる？', { cls: 'faint' });
    PlayKit.meter(g, ...SIDE_METER, look, { min: -180, max: 180, letter: '°', cls: 'ink', mark: 0, ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（位相計：真ん中が 0、右が進み）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ②③⑥ 2つの矢印の和の大きさ
  function runSumBasic(explain) {
    return ({ A, B, theta }, guess) => {
      const V = Phasor.sumMagnitude(A, B, theta);
      return { ...predicted(guess, V, 'V', explain({ A, B, theta }, V)), meter: V, lamps: [], burst: null, reading: volts(V) };
    };
  }

  function drawSumBasic(g, { A, B, theta }, guess, look) {
    // 途中の点（V₁ の先）と合成の先が円に入る縮尺
    const scale = BOARD.r / Math.max(A, Phasor.sumMagnitude(A, B, theta), 1);
    drawArrows(g, [[A, 0, 'V_1', false], [B, theta, 'V_2', true]], { scale, chain: true, total: look.reading ? true : null });
    Svg.note(g, BOARD.x, 30, `V₁ ${A} V、V₂ ${B} V、ずれ ${theta}°`, { cls: 'value q-voltage', anchor: 'middle' });
    PlayKit.meter(g, ...SIDE_METER, look, { max: 300, letter: 'V', cls: 'q-voltage', ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（合成の電圧）。結果で太い矢印が出る', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ④ 複素数の角度
  function runAngleBasic({ re, im }, guess) {
    const deg = Phasor.angle({ re, im });
    return { ...predicted(guess, deg, '°', `${complexText({ re, im })} は、横 ${re}・縦 ${im} の矢印。角度 ${num(deg)}°`), meter: deg, lamps: [], burst: null, reading: `${num(deg)}°` };
  }

  function drawAngleBasic(g, { re, im }, guess, look) {
    const scale = BOARD.r / Math.max(Math.hypot(re, im), 1);
    const { x, y, r } = BOARD;
    Svg.el(g, 'circle', { cx: x, cy: y, r, class: 'stator' });
    Svg.guide(g, x - r - 8, y, x + r + 8, y, 'axis');
    Svg.guide(g, x, y - r - 8, x, y + r + 8, 'axis');
    Svg.note(g, x + r + 10, y - 8, '実部', { cls: 'faint' });
    Svg.note(g, x + 6, y - r - 6, '虚部 j', { cls: 'faint' });
    if (look.reading) Svg.arrow(g, x, y, x + scale * re, y - scale * im, { cls: 'q-voltage', width: 3 });
    Svg.note(g, x, 24, `V = ${complexText({ re, im })}`, { cls: 'value q-voltage', anchor: 'middle' });
    PlayKit.meter(g, ...SIDE_METER, look, { min: -180, max: 180, letter: '°', cls: 'ink', mark: 0, ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（角度。右＝進み）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ⑤ 成分で足す
  function runComponentBasic({ a1, b1, a2, b2 }, guess) {
    const sum = { re: a1 + a2, im: b1 + b2 };
    const V = Phasor.magnitude(sum);
    return { ...predicted(guess, V, 'V', `実部 ${a1} + ${a2} = ${sum.re}、虚部 ${b1} + ${b2} = ${sum.im}、√(${sum.re}² + ${sum.im}²) = ${num(V)} V`), meter: V, lamps: [], burst: null, reading: volts(V) };
  }

  function drawComponentBasic(g, { a1, b1, a2, b2 }, guess, look) {
    const V1 = { re: a1, im: b1 };
    const V2 = { re: a2, im: b2 };
    const scale = BOARD.r / Math.max(Phasor.magnitude(V1), Phasor.magnitude(Phasor.add(V1, V2)), 1);
    drawArrows(g, [[Phasor.magnitude(V1), Phasor.angle(V1), 'V_1', false], [Phasor.magnitude(V2), Phasor.angle(V2), 'V_2', true]], { scale, chain: true, total: look.reading ? true : null });
    Svg.note(g, BOARD.x, 24, `V₁ = ${complexText(V1)}、V₂ = ${complexText(V2)}`, { cls: 'value q-voltage', anchor: 'middle' });
    PlayKit.meter(g, ...SIDE_METER, look, { max: 300, letter: 'V', cls: 'q-voltage', ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（合成の大きさ）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  const jobs = [
    {
      // 余弦定理：ずれが小さいほど合成が大きい
      kind: 'dial',
      needs: 5, // 失敗したら準備の⑥（一般の角度）から
      cases: [[100, 100, 141], [100, 100, 100], [100, 100, 173], [100, 100, 52], [30, 50, 70], [50, 80, 70], [60, 80, 100], [80, 60, 140], [100, 60, 40], [70, 80, 130]]
        .map(([A, B, T]) => ({ A, B, T })),
      dial: { name: 'V₂ の位相差', symbol: 'θ', unit: '°', min: 0, max: 180, step: 15 },
      request: ({ T }) => `2台の電源を直列にして、電球を定格 ${T} V で光らせたい。V₂ のずれ θ は？`,
      answer: ({ A, B, T }) => [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180].find((deg) => lampResult(Phasor.sumMagnitude(A, B, deg), T) === 'ok'),
      run: runPhaseJob,
      draw: drawPhaseJob,
    },
    {
      // 90° ずれの三平方の逆算
      kind: 'dial',
      needs: 2, // 失敗したら準備の③（90° ずれ）から
      cases: [[60, 100], [80, 100], [30, 50], [120, 200], [90, 150], [50, 130], [70, 250], [160, 200]].map(([A, T]) => ({ A, T })),
      dial: { name: 'V₂ の電圧', symbol: 'V_2', unit: 'V', min: 0, max: 300, step: 10 },
      request: ({ T }) => `V₂ は V₁ より 90° 進んでいる。電球を定格 ${T} V にする V₂ は？`,
      answer: ({ A, T }) => Math.sqrt(T * T - A * A),
      run: runQuadratureJob,
      draw: drawQuadratureJob,
    },
    {
      // 複素数の角度：実部が横、虚部が縦
      kind: 'probe',
      needs: 3, // 失敗したら準備の④（複素数の角度）から
      cases: [
        [[[100, 0], [0, 100], [0, -100]], -90], [[[0, -80], [0, 80], [-80, 0]], 90], [[[50, 50], [50, -50], [-50, 50]], -45],
        [[[-60, 60], [60, 60], [60, -60]], 45], [[[-100, 0], [0, 100], [100, 0]], 180], [[[30, -30], [-30, -30], [30, 30]], -135],
        [[[0, 120], [120, 0], [0, -120]], 90], [[[-40, 40], [40, -40], [-40, -40]], 135],
      ].map(([sources, target]) => ({ sources: sources.map(([re, im]) => ({ re, im })), target })),
      probe: {
        parts: SOURCES.xs.length,
        hint: '電源をタップすると、位相計が電圧を複素数で表示する（針は大きさ）',
        measure: ({ sources }, i) => Phasor.magnitude(sources[i]),
        reading: (V) => `大きさ ${num(V)} V`,
      },
      action: 'これに決める',
      request: ({ target }) => `V₁ より ${leadText(target)} の電源はどれ？`,
      answer: ({ sources, target }) => sources.findIndex((s) => near(Phasor.angle(s), target)),
      run: runPhaseProbe,
      draw: drawPhaseProbe,
    },
  ];

  const basics = [
    {
      title: '式から位相差',
      kind: 'dial',
      cases: [[0, 30], [0, -60], [30, 90], [-30, 60], [45, -45], [0, 120], [60, 0], [-90, 0]].map(([a, b]) => ({ a, b })),
      dial: { name: '予想', symbol: 'θ', unit: '°', min: -180, max: 180, step: 15 },
      know: 'sin(ω<var>t</var> + θ) の θ が位相。π = 180° なので π/6 = 30°、π/3 = 60°、π/2 = 90°。2つの θ の差が位相差で、大きい方が進んでいる',
      request: () => 'v₂ は v₁ より何度進んでいる？（遅れはマイナス）',
      answer: ({ a, b }) => b - a,
      run: runReadPhaseBasic,
      draw: drawReadPhaseBasic,
    },
    {
      title: '同じ向き・反対向き',
      kind: 'dial',
      cases: [[100, 100, 0], [100, 50, 180], [80, 120, 0], [150, 100, 180], [60, 140, 180], [90, 60, 0], [200, 50, 180], [120, 150, 0]].map(([A, B, theta]) => ({ A, B, theta })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 300, step: 10 },
      know: '同じ位相なら矢印は同じ向きで、大きさは足し算。180° ずれ（反対向き）なら引き算（大きい方から小さい方を引く）',
      request: () => '合成の電圧は？',
      answer: ({ A, B, theta }) => (theta === 0 ? A + B : Math.abs(A - B)),
      run: runSumBasic(({ A, B, theta }, V) => (theta === 0 ? `同じ向きで ${A} + ${B} = ${num(V)} V` : `反対向きで ${Math.max(A, B)} − ${Math.min(A, B)} = ${num(V)} V`)),
      draw: drawSumBasic,
    },
    {
      title: '90° ずれ',
      kind: 'dial',
      cases: [[60, 80], [30, 40], [120, 160], [90, 120], [50, 120], [80, 60], [160, 120], [70, 240]].map(([A, B]) => ({ A, B, theta: 90 })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 300, step: 10 },
      know: '90° ずれた2つの矢印は直角三角形の2辺。合成は斜辺で √(<var>A</var>² + <var>B</var>²)（基礎7 の三平方）',
      request: () => '合成の電圧は？',
      answer: ({ A, B }) => Math.hypot(A, B),
      run: runSumBasic(({ A, B }, V) => `√(${A}² + ${B}²) = ${num(V)} V（${A} + ${B} = ${A + B} V ではない）`),
      draw: drawSumBasic,
    },
    {
      title: '複素数の角度',
      kind: 'dial',
      cases: [[1, 1], [0, 5], [5, 0], [-5, 0], [0, -5], [-3, 3], [4, -4], [-2, -2]].map(([a, b]) => ({ re: a * 20, im: b * 20 })),
      dial: { name: '予想', symbol: 'φ', unit: '°', min: -180, max: 180, step: 15 },
      know: '<var>a</var> + j<var>b</var> は、横に <var>a</var>、縦に <var>b</var> の矢印。角度は tan⁻¹(<var>b</var> ÷ <var>a</var>)。上（＋j）は 90° 進み、下（−j）は 90° 遅れ、左は 180°',
      request: () => 'この電圧の角度（位相）は？',
      answer: ({ re, im }) => Phasor.angle({ re, im }),
      run: runAngleBasic,
      draw: drawAngleBasic,
    },
    {
      title: '成分で足す',
      kind: 'dial',
      cases: [[30, 0, 0, 40], [30, 10, 30, 70], [50, 20, -20, 20], [100, 0, -40, 80], [20, 60, 70, 60], [-30, 50, 90, 30], [120, 0, 0, 50], [40, 30, 80, 130]]
        .map(([a1, b1, a2, b2]) => ({ a1, b1, a2, b2 })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 300, step: 10 },
      know: '複素数の足し算は、実部どうし・虚部どうしを足すだけ。そのあと大きさ √(実部² + 虚部²)',
      request: () => 'V₁ + V₂ の大きさは？',
      answer: ({ a1, b1, a2, b2 }) => Math.hypot(a1 + a2, b1 + b2),
      run: runComponentBasic,
      draw: drawComponentBasic,
    },
    {
      title: '一般の角度（余弦定理）',
      kind: 'dial',
      cases: [[30, 50, 60], [50, 30, 60], [70, 80, 60], [80, 70, 60], [50, 80, 120], [30, 80, 120], [100, 100, 120], [70, 150, 120]].map(([A, B, theta]) => ({ A, B, theta })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 300, step: 10 },
      know: '位相差 θ の2つの矢印の和は √(<var>A</var>² + <var>B</var>² + 2<var>AB</var> cos θ)。cos 60° = 0.5、cos 120° = −0.5（90° なら 0 で三平方）',
      request: () => '合成の電圧は？',
      answer: ({ A, B, theta }) => Phasor.sumMagnitude(A, B, theta),
      run: runSumBasic(({ A, B, theta }, V) => `√(${A}² + ${B}² + 2×${A}×${B}×cos ${theta}°) = ${num(V)} V`),
      draw: drawSumBasic,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays.phasor = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
