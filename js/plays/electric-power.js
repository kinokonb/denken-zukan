// 理論3「電力と電力量」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 現場は家の 100 V（200 V の器具もある）とブレーカー。ミッションでは電力の式を1つずつ使う
// （ブレーカーとヒーターの台数：I = P ÷ V の足し算、ちょうどの電力の電熱線：P = V² ÷ R、お湯が沸くタイマー：W = Pt）。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const amperes = (value) => Notation.number(value, 2);
  // 電力・電力量の書き方（1,000 W のようにけた区切り。割り切れない時は「約」）
  const watts = (value) => `${Number.isInteger(Number(value.toFixed(6))) ? '' : '約 '}${Notation.number(value, 0)}`;
  const HOME_V = 100; // 家のコンセントの電圧
  const NOTE_Y = 262;
  const LOOP = { left: 40, right: 300, top: 64, bottom: 196, mid: 130 };

  function drawLoop(g, { left, right, top, bottom, mid } = LOOP) {
    Svg.wire(g, [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]]);
  }

  function drawSource(g, x, y, V) {
    Svg.battery(g, x, y);
    Svg.note(g, x + 20, y + 18, `電源 ${V} V`, { cls: 'value q-voltage' });
  }

  const ammeter = (g, x, y, look, max, mark = null, ghost = null) => PlayKit.meter(g, x, y, look, { max, letter: 'A', cls: 'q-current', mark, ghost });
  const wattmeter = (g, x, y, look, max, mark = null, ghost = null) => PlayKit.meter(g, x, y, look, { max, letter: 'W', cls: 'q-active', mark, ghost });
  // 電力量計（Wh）。スイッチを入れると、使う時間を早回しした分だけ針が進む
  const energyMeter = (g, x, y, look, max, mark = null, ghost = null) => PlayKit.meter(g, x, y, look, { max, letter: 'Wh', cls: 'q-active', mark, ghost });

  // 電熱器の熱さ（光のにじみ）は電力に比例。1,000 W で 1
  const heatOf = (P) => P / 1000;

  // 並列につないだ器具の図（左に電源・スイッチ・ブレーカー、右に器具を center を中心に spacing おきに並べる）。器具の x の並びを返す
  const PANEL = { left: 36, top: 64, bottom: 196, mid: 130, switchX: 72, breakerX: 128 };

  function drawPanel(g, { V, F }, count, center, look, spacing = 22) {
    const { left, top, bottom, mid, switchX, breakerX } = PANEL;
    const xs = Array.from({ length: count }, (_, i) => center + (i - (count - 1) / 2) * spacing);
    const last = xs[xs.length - 1];
    Svg.wire(g, [[left, mid], [left, top], [last, top]]);
    Svg.wire(g, [[left, mid], [left, bottom], [last, bottom]]);
    for (const x of xs) Svg.wire(g, [[x, top], [x, bottom]]);
    drawSource(g, left, mid, V);
    Svg.knifeSwitch(g, switchX, top, { on: look.switchOn });
    Svg.breaker(g, breakerX, top, { tripped: look.broken.fuse });
    Svg.note(g, breakerX, top - 28, `ブレーカー ${F} A`, { cls: 'value q-current', anchor: 'middle' });
    return xs;
  }

  // ---- ミッション（現場の依頼） ----

  // ブレーカーを落とさずに、同じヒーターをいちばん多くつなぐ（1台の電流 P ÷ V の足し算）
  function runHeatersJob({ F, P }, n) {
    const each = P / HOME_V;
    const I = each * n;
    const base = { meter: I, lamps: Array(n).fill(heatOf(P)) };
    if (I > F + 1e-9) {
      return { ...base, ok: false, burst: { fuse: true }, reading: `${amperes(I)} A → 0 A`, reason: `ブレーカーが落ちた！ 1台 ${watts(P)}÷${HOME_V} = ${num(each)} A × ${n}台 = ${num(I)} A（${F} A まで）` };
    }
    if (I + each <= F + 1e-9) {
      return { ...base, ok: false, burst: null, reading: `${amperes(I)} A`, reason: `まだつなげる。${n}台で ${num(I)} A、ブレーカーは ${F} A まで` };
    }
    return { ...base, ok: true, burst: null, reading: `${amperes(I)} A`, reason: `ぴったり！ 1台 ${watts(P)}÷${HOME_V} = ${num(each)} A。${n}台で ${num(I)} A、あと1台で ${num(I + each)} A になって落ちる` };
  }

  function drawHeatersJob(g, { F, P }, n, look) {
    const center = 253;
    const xs = drawPanel(g, { V: HOME_V, F }, n, center, look);
    xs.forEach((x, i) => Svg.heater(g, x, PANEL.mid, { level: look.lamps[i] || 0 }));
    Svg.note(g, center, PANEL.top - 20, `ヒーター 1台 ${watts(P)} W`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, center, PANEL.bottom + 20, `${n}台`, { cls: 'value', anchor: 'middle' });
    ammeter(g, 100, PANEL.bottom, look, F * 1.6, F);
    Svg.note(g, 180, NOTE_Y, 'ブレーカーは決まった電流をこえると落ちる。電線の抵抗は 0', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, PANEL.mid]), fuse: [PANEL.breakerX, PANEL.top] };
  }

  // 決まった電圧で、ちょうど決まった電力になる電熱線（P = V² ÷ R）。それより大きい電力では焼き切れる
  function runWireJob({ V, P }, R) {
    const now = (V * V) / R;
    const base = { meter: now, lamps: [heatOf(now)] };
    if (near(now, P)) return { ...base, ok: true, burst: null, reading: `${watts(now)} W`, reason: `ちょうど！ ${V}² ÷ ${R} = ${watts(P)} W` };
    if (now < P) return { ...base, ok: false, burst: null, reading: `${watts(now)} W`, reason: `弱い。${V}² ÷ ${R} = ${watts(now)} W。<var>R</var> を小さく` };
    return { ...base, ok: false, burst: { lamp: 0 }, reading: `${watts(now)} W → 0 W`, reason: `焼き切れた！ ${V}² ÷ ${R} = ${watts(now)} W で ${watts(P)} W をこえた。<var>R</var> を大きく` };
  }

  function drawWireJob(g, { V, P }, R, look) {
    const { left, right, top, bottom, mid } = LOOP;
    drawLoop(g);
    drawSource(g, left, mid, V);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.heater(g, right, mid, { level: look.lamps[0] || 0, broken: look.broken.lamps[0] });
    Svg.note(g, right - 16, mid, `電熱線 R = ${R} Ω`, { cls: 'value q-active', anchor: 'end' });
    wattmeter(g, 176, bottom, look, P * 1.6, P);
    Svg.note(g, 180, NOTE_Y, `この電熱線は ${watts(P)} W まで。こえると焼き切れる決まり`, { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // お湯がちょうど沸いた所で切れるタイマー（W = Pt。分は 60 で割って時間に直す）
  function runKettleJob({ E, P }, minutes) {
    const W = (P * minutes) / 60;
    const base = { meter: W, lamps: [heatOf(P)], burst: null, reading: `${watts(W)} Wh` };
    const math = `${watts(P)} W × ${minutes}/60 h = ${watts(W)} Wh`;
    if (near(W, E)) return { ...base, ok: true, reason: `ちょうど沸いた！ ${math}` };
    if (W < E) return { ...base, ok: false, reason: `ぬるい。${math}（${E} Wh 要る）。のばす` };
    return { ...base, ok: false, reason: `沸いた後も ${watts(W - E)} Wh むだに使った（${math}）。短く` };
  }

  function drawKettleJob(g, { E, P }, minutes, look) {
    const { left, right, top, bottom, mid } = LOOP;
    drawLoop(g);
    drawSource(g, left, mid, HOME_V);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.heater(g, right, mid, { level: look.lamps[0] || 0 });
    Svg.note(g, right - 16, mid, `ポット ${watts(P)} W`, { cls: 'value q-active', anchor: 'end' });
    Svg.note(g, 200, 30, `タイマー ${minutes} 分`, { cls: 'value', anchor: 'middle' });
    energyMeter(g, 176, bottom, look, E * 1.6, E);
    Svg.note(g, 180, NOTE_Y, `印＝お湯が沸く ${E} Wh（熱は全部お湯へ）。時間は早回し`, { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  // ① 電力 P = VI：電流計の読みから、電力計の針を予想する
  function runPowerBasic({ I }, guess) {
    const P = HOME_V * I;
    return { ...predicted(guess, P, 'W', `${HOME_V} V × ${num(I)} A = ${watts(P)} W`), meter: P, lamps: [heatOf(P)], burst: null, reading: `${watts(P)} W` };
  }

  function drawPowerBasic(g, { I }, guess, look) {
    const { left, right, top, bottom, mid } = LOOP;
    drawLoop(g);
    drawSource(g, left, mid, HOME_V);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.heater(g, right, mid, { level: look.lamps[0] || 0 });
    Svg.note(g, right - 16, mid, 'ヒーター', { cls: 'value q-active', anchor: 'end' });
    // 電流計の読みは問いで教えてある（針は電力計と一緒に振れる）
    Svg.gauge(g, 120, bottom, { value: look.meter / HOME_V, max: 15, letter: 'A', cls: 'q-current' });
    Svg.note(g, 120, bottom + 40, `${amperes(I)} A`, { cls: 'value q-current', anchor: 'middle' });
    wattmeter(g, 232, bottom, look, 1500, null, guess);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // ② 器具の電流 I = P ÷ V：「100 V・○ W」から電流を予想する
  function runCurrentBasic({ P }, guess) {
    const I = P / HOME_V;
    return { ...predicted(guess, I, 'A', `${watts(P)} W ÷ ${HOME_V} V = ${num(I)} A`), meter: I, lamps: [heatOf(P)], burst: null, reading: `${amperes(I)} A` };
  }

  function drawCurrentBasic(g, { P }, guess, look) {
    const { left, right, top, bottom, mid } = LOOP;
    drawLoop(g);
    drawSource(g, left, mid, HOME_V);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.heater(g, right, mid, { level: look.lamps[0] || 0 });
    Svg.note(g, right - 16, mid, `${HOME_V} V・${watts(P)} W`, { cls: 'value q-active', anchor: 'end' });
    ammeter(g, 176, bottom, look, 15, null, guess);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // ③ ブレーカー：並列の2台の電流の合計を予想する（決まった電流をこえると落ちる）
  const BREAKER_HEATERS_CENTER = 254;

  function runBreakerBasic({ F, P1, P2 }, guess) {
    const a = P1 / HOME_V;
    const b = P2 / HOME_V;
    const total = a + b;
    const tripped = total > F + 1e-9;
    const why = `${watts(P1)}÷${HOME_V} = ${num(a)} A と ${watts(P2)}÷${HOME_V} = ${num(b)} A で ${num(total)} A${tripped ? `。${F} A をこえて落ちた` : ''}`;
    return {
      ...predicted(guess, total, 'A', why),
      meter: total,
      lamps: [heatOf(P1), heatOf(P2)],
      burst: tripped ? { fuse: true } : null,
      reading: tripped ? `${amperes(total)} A → 0 A` : `${amperes(total)} A`,
    };
  }

  function drawBreakerBasic(g, { F, P1, P2 }, guess, look) {
    const xs = drawPanel(g, { V: HOME_V, F }, 2, BREAKER_HEATERS_CENTER, look, 56);
    xs.forEach((x, i) => {
      Svg.heater(g, x, PANEL.mid, { level: look.lamps[i] || 0 });
      Svg.note(g, x, PANEL.mid + 36, `${watts([P1, P2][i])} W`, { cls: 'value q-active', anchor: 'middle' });
    });
    ammeter(g, 100, PANEL.bottom, look, 30, F, guess);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想。印はブレーカーの電流', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, PANEL.mid]), fuse: [PANEL.breakerX, PANEL.top] };
  }

  // ④ P = V² ÷ R：電圧と電熱線の抵抗から、電力計の針を予想する
  function runSquareBasic({ V, R }, guess) {
    const P = (V * V) / R;
    return { ...predicted(guess, P, 'W', `${V}² ÷ ${R} = ${watts(P)} W（${num(V / R)} A × ${V} V と同じ）`), meter: P, lamps: [heatOf(P)], burst: null, reading: `${watts(P)} W` };
  }

  function drawSquareBasic(g, { V, R }, guess, look) {
    const { left, right, top, bottom, mid } = LOOP;
    drawLoop(g);
    drawSource(g, left, mid, V);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.heater(g, right, mid, { level: look.lamps[0] || 0 });
    Svg.note(g, right - 16, mid, `電熱線 R = ${R} Ω`, { cls: 'value q-active', anchor: 'end' });
    wattmeter(g, 176, bottom, look, 1500, null, guess);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // ⑤⑥ 電力量 W = Pt：使う時間（⑤は時間、⑥は分）から、電力量計の針を予想する
  function runEnergyBasic({ P, hours, minutes }, guess) {
    const W = hours !== undefined ? P * hours : (P * minutes) / 60;
    const why = hours !== undefined
      ? `${watts(P)} W × ${hours} h = ${watts(W)} Wh（${num(W / 1000)} kWh）`
      : `${minutes} 分 = ${minutes}/60 h。${watts(P)} W × ${minutes}/60 h = ${watts(W)} Wh`;
    return { ...predicted(guess, W, 'Wh', why), meter: W, lamps: [heatOf(P)], burst: null, reading: `${watts(W)} Wh` };
  }

  function drawEnergyBasic(g, { P, hours, minutes }, guess, look) {
    const { left, right, top, bottom, mid } = LOOP;
    drawLoop(g);
    drawSource(g, left, mid, HOME_V);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.heater(g, right, mid, { level: look.lamps[0] || 0 });
    Svg.note(g, right - 16, mid, `ヒーター ${watts(P)} W`, { cls: 'value q-active', anchor: 'end' });
    Svg.note(g, 200, 30, hours !== undefined ? `${hours} 時間 使う` : `${minutes} 分 使う`, { cls: 'value', anchor: 'middle' });
    energyMeter(g, 176, bottom, look, hours !== undefined ? 2000 : 1000, null, guess);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想。時間は早回し', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  const jobs = [
    {
      // I = P ÷ V の足し算：ブレーカーの電流までつなぐ
      kind: 'count',
      needs: 2, // 失敗したら準備の③（ブレーカー）から
      cases: [[15, 500], [20, 500], [15, 300], [20, 600], [15, 400], [20, 300], [15, 200], [20, 800], [15, 600], [20, 250], [30, 1000], [15, 700]]
        .map(([F, P]) => ({ F, P })),
      count: { min: 1, max: 8, unit: '台' },
      request: ({ P }) => `ブレーカーを落とさずに、${watts(P)} W のヒーターをいちばん多くつなごう`,
      answer: ({ F, P }) => Math.floor((F * HOME_V) / P + 1e-9),
      run: runHeatersJob,
      draw: drawHeatersJob,
    },
    {
      // P = V² ÷ R：ちょうど決まった電力になる電熱線
      kind: 'dial',
      needs: 3, // 失敗したら準備の④（P = V² ÷ R）から
      cases: [[100, 1000], [100, 500], [100, 400], [100, 250], [100, 200], [100, 1250], [100, 2000], [100, 125], [200, 1000], [200, 2000], [200, 800]]
        .map(([V, P]) => ({ V, P })),
      dial: { name: '電熱線の抵抗', symbol: 'R', unit: 'Ω', min: 1, max: 100, step: 1 },
      request: ({ V, P }) => `${V} V でちょうど ${watts(P)} W になる電熱線 <var>R</var> を決めよう`,
      answer: ({ V, P }) => (V * V) / P,
      run: runWireJob,
      draw: drawWireJob,
    },
    {
      // W = Pt：お湯を沸かす電力量から、タイマーの分を決める
      kind: 'dial',
      needs: 4, // 失敗したら準備の⑤（電力量）から
      cases: [[100, 1000], [100, 1200], [100, 600], [100, 500], [50, 1000], [50, 600], [50, 300], [200, 1200], [200, 800], [200, 1000], [150, 900], [150, 1000]]
        .map(([E, P]) => ({ E, P })),
      dial: { name: 'タイマー', symbol: 't', unit: '分', min: 1, max: 20, step: 1 },
      request: ({ E }) => `お湯を沸かすのに ${E} Wh 要る。ちょうど沸いた所で切れるタイマーは何分？`,
      answer: ({ E, P }) => (E * 60) / P,
      run: runKettleJob,
      draw: drawKettleJob,
    },
  ];

  // 準備（前提の知識）：この順に1つずつ。know は「使う知識」で、問いの上にいつも見せる
  const basics = [
    {
      title: '電力',
      kind: 'dial',
      cases: [0.5, 1, 2, 3, 4, 5, 8, 10, 12].map((I) => ({ I })),
      dial: { name: '予想', symbol: 'P', unit: 'W', min: 0, max: 1500, step: 50 },
      know: '電力＝電気が1秒にする仕事（単位 W）。電力 = 電圧 × 電流（<var>P</var> = <var>VI</var>）',
      request: ({ I }) => `電流計は ${num(I)} A。電力計（W）の針はどこを指す？`,
      answer: ({ I }) => HOME_V * I,
      run: runPowerBasic,
      draw: drawPowerBasic,
    },
    {
      title: '器具の電流',
      kind: 'dial',
      cases: [1000, 600, 1200, 500, 800, 300, 1500, 250, 400].map((P) => ({ P })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 15, step: 0.5 },
      know: '「100 V・1,000 W」は、100 V で使うと 1,000 W の器具（定格）。電流 = 電力 ÷ 電圧（<var>I</var> = <var>P</var> ÷ <var>V</var>）',
      request: ({ P }) => `100 V・${watts(P)} W の器具を使う。電流計の針はどこを指す？`,
      answer: ({ P }) => P / HOME_V,
      run: runCurrentBasic,
      draw: drawCurrentBasic,
    },
    {
      title: 'ブレーカー',
      kind: 'dial',
      cases: [[15, 1000, 600], [20, 1200, 600], [15, 500, 800], [20, 1000, 1200], [15, 600, 300], [20, 1500, 600], [15, 800, 400], [15, 1200, 300], [20, 1000, 1000]]
        .map(([F, P1, P2]) => ({ F, P1, P2 })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 30, step: 1 },
      know: '並列の器具はどれも 100 V で使える。全体の電流は1台ずつの <var>P</var> ÷ <var>V</var> の足し算。ブレーカーは決まった電流をこえると落ちる',
      request: () => '2台を同時に使う。全体の電流計は何 A？',
      answer: ({ P1, P2 }) => (P1 + P2) / HOME_V,
      run: runBreakerBasic,
      draw: drawBreakerBasic,
    },
    {
      title: 'P = V² ÷ R',
      kind: 'dial',
      cases: [[100, 10], [100, 20], [100, 25], [100, 40], [100, 50], [100, 100], [100, 8], [200, 40], [200, 100], [200, 50]].map(([V, R]) => ({ V, R })),
      dial: { name: '予想', symbol: 'P', unit: 'W', min: 0, max: 1500, step: 50 },
      know: '電圧が決まっている時は <var>P</var> = <var>V</var>² ÷ <var>R</var>（<var>I</var> = <var>V</var> ÷ <var>R</var> を <var>P</var> = <var>VI</var> に入れた形）。抵抗が小さいほど電力は大きい',
      request: () => '電力計（W）の針はどこを指す？ 予想の針を置こう',
      answer: ({ V, R }) => (V * V) / R,
      run: runSquareBasic,
      draw: drawSquareBasic,
    },
    {
      title: '電力量',
      kind: 'dial',
      cases: [[100, 2], [200, 3], [500, 2], [300, 4], [1000, 1], [400, 3], [150, 2], [500, 3], [250, 4], [800, 2]].map(([P, hours]) => ({ P, hours })),
      dial: { name: '予想', symbol: 'W', unit: 'Wh', min: 0, max: 2000, step: 100 },
      know: '電力量＝使った電気の合計（単位 Wh、1,000 Wh = 1 kWh）。電力量 = 電力 × 時間（<var>W</var> = <var>Pt</var>）',
      request: ({ P, hours }) => `${watts(P)} W のヒーターを ${hours} 時間使う。電力量計は何 Wh 進む？`,
      answer: ({ P, hours }) => P * hours,
      run: runEnergyBasic,
      draw: drawEnergyBasic,
    },
    {
      title: '分を時間に',
      kind: 'dial',
      cases: [[1200, 30], [600, 10], [1000, 6], [1500, 20], [900, 20], [800, 15], [1200, 5], [600, 45], [1000, 30], [300, 40]].map(([P, minutes]) => ({ P, minutes })),
      dial: { name: '予想', symbol: 'W', unit: 'Wh', min: 0, max: 1000, step: 50 },
      know: '<var>W</var> = <var>Pt</var> の <var>t</var> は時間（h）。分は 60 で割って時間に直す（30 分 = 0.5 h、6 分 = 0.1 h）',
      request: ({ P, minutes }) => `${watts(P)} W のヒーターを ${minutes} 分使う。電力量計は何 Wh 進む？`,
      answer: ({ P, minutes }) => (P * minutes) / 60,
      run: runEnergyBasic,
      draw: drawEnergyBasic,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays['electric-power'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
