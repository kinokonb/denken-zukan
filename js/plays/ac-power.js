// 理論「交流の電力と力率」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は皮相電力 S = VI から始め、有効電力 VI cosθ、無効電力 VI sinθ、力率 P ÷ S、RL 直列の力率 R ÷ Z、有効電力は抵抗で I²R へ進む。
// 現場はモーターとブレーカー（力率と電流）と、電力計での力率さがし。計算は js/calc/ac-wave.js の power。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const amperes = (value) => `${num(value)} A`;
  const NOTE_Y = 262;
  const PANEL = { left: 36, top: 64, bottom: 196, mid: 130, breakerX: 118 };

  function drawSupply(g, look, { V, breaker = null, tripped = false }) {
    const { left, top, bottom, mid, breakerX } = PANEL;
    Svg.acSource(g, left, mid);
    Svg.note(g, left + 20, mid + 24, `${V} V`, { cls: 'value q-voltage' });
    Svg.knifeSwitch(g, 70, top, { on: look.switchOn });
    if (breaker !== null) {
      Svg.breaker(g, breakerX, top, { tripped });
      Svg.note(g, breakerX, top - 28, `ブレーカー ${breaker} A`, { cls: 'value q-current', anchor: 'middle' });
    }
    return { left, top, bottom, mid };
  }

  function drawMotor(g, x, y) {
    Svg.el(g, 'circle', { cx: x, cy: y, r: 12, class: 'motor' });
    Svg.el(g, 'text', { x, y: y + 1, class: 'motor-letter', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, 'M');
  }

  // 1台の負荷の回路（左に電源、右にモーター）
  function drawOneLoad(g, look, { V, text, breaker = null, tripped = false }) {
    const { left, top, bottom, mid } = PANEL;
    const right = 300;
    Svg.wire(g, [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]]);
    drawSupply(g, look, { V, breaker, tripped });
    drawMotor(g, right, mid);
    Svg.note(g, right - 18, mid - 26, text, { cls: 'value', anchor: 'end' });
  }

  // ---- ミッション（現場の依頼） ----

  // P が同じモーターの電流 I = P ÷ (V cosθ) をブレーカーちょうどにする力率（力率を上げすぎるとコンデンサが大きく高い）
  function runPfJob({ P, V, I }, pf) {
    const now = P / (V * pf);
    const base = { meter: now, lamps: [] };
    const math = `${P} ÷ (${V} × ${num(pf)}) = ${num(now)} A`;
    if (near(now, I)) return { ...base, ok: true, burst: null, reading: amperes(now), reason: `ちょうど！ ${math}` };
    if (now > I) return { ...base, ok: false, burst: { fuse: true }, reading: `${amperes(now)} → 0 A`, reason: `ブレーカーが落ちた！ ${math}（${I} A まで）。力率を上げる` };
    return { ...base, ok: false, burst: null, reading: amperes(now), reason: `上げすぎ（コンデンサが大きく高い）。${math}。${I} A までは流せる` };
  }

  function drawPfJob(g, { P, V, I }, pf, look) {
    drawOneLoad(g, look, { V, text: `モーター ${P} W・力率 ${num(pf)}`, breaker: I, tripped: look.broken.fuse });
    PlayKit.meter(g, 200, PANEL.bottom, look, { max: I * 1.6, letter: 'A', cls: 'q-current', mark: I });
    Svg.note(g, 180, NOTE_Y, '有効電力 P は同じ。力率はコンデンサで上げられる', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[300, PANEL.mid]], fuse: [PANEL.breakerX, PANEL.top] };
  }

  // 同じモーター（1台 P W・力率 pf）を並列にいちばん多く（電流の上限 I）
  function runMotorsJob({ V, P, pf, I }, n) {
    const each = P / (V * pf);
    const now = each * n;
    const base = { meter: now, lamps: [] };
    if (now > I + 1e-9) return { ...base, ok: false, burst: { fuse: true }, reading: `${amperes(now)} → 0 A`, reason: `ブレーカーが落ちた！ 1台 ${P} ÷ (${V} × ${pf}) = ${num(each)} A × ${n}台 = ${num(now)} A` };
    if (now + each <= I + 1e-9) return { ...base, ok: false, burst: null, reading: amperes(now), reason: `まだつなげる。${n}台で ${num(now)} A（${I} A まで）` };
    return { ...base, ok: true, burst: null, reading: amperes(now), reason: `ぴったり！ 1台 ${P} ÷ (${V} × ${pf}) = ${num(each)} A。${n}台で ${num(now)} A、あと1台で ${num(now + each)} A` };
  }

  function drawMotorsJob(g, { V, P, pf, I }, n, look) {
    const { left, top, bottom, mid } = PANEL;
    const xs = Array.from({ length: n }, (_, i) => 250 + (i - (n - 1) / 2) * 26);
    const last = xs[xs.length - 1];
    Svg.wire(g, [[left, mid], [left, top], [last, top]]);
    Svg.wire(g, [[left, mid], [left, bottom], [last, bottom]]);
    for (const x of xs) {
      Svg.wire(g, [[x, top], [x, bottom]]);
      drawMotor(g, x, mid);
    }
    drawSupply(g, look, { V, breaker: I, tripped: look.broken.fuse });
    Svg.note(g, 262, top - 28, `1台 ${P} W・力率 ${pf}`, { cls: 'value', anchor: 'middle' });
    PlayKit.meter(g, 160, bottom, look, { max: I * 1.6, letter: 'A', cls: 'q-current', mark: I });
    Svg.note(g, 180, NOTE_Y, '電流は 有効電力 ÷ (電圧 × 力率)', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, mid]), fuse: [PANEL.breakerX, top] };
  }

  // 3つの負荷の電流と電力を測り、力率が決まった値のものを当てる（V = 100 V）
  const LOADS = { xs: [70, 180, 290], y: 96, names: ['A', 'B', 'C'], V: 100 };

  function runPfProbe({ loads, target }, i) {
    const { I, P } = loads[i];
    const pf = P / (LOADS.V * I);
    const math = `${LOADS.names[i]} は ${P} ÷ (${LOADS.V} × ${I}) = ${num(pf)}`;
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    if (near(pf, target)) return { ...base, ok: true, reason: `当たり！ ${math}（力率 = <var>P</var> ÷ <var>VI</var>）` };
    return { ...base, ok: false, reason: `${math}。電力の大きさでなく、<var>P</var> ÷ <var>VI</var> をくらべる` };
  }

  function drawPfProbe(g, { loads }, selected, look) {
    const { xs, y, names } = LOADS;
    Svg.wire(g, [[xs[0], y - 50], [xs[2], y - 50]]);
    Svg.note(g, 16, y - 64, `電源 ${LOADS.V} V`, { cls: 'value q-voltage' });
    xs.forEach((x, i) => {
      Svg.wire(g, [[x, y - 50], [x, y - 20]]);
      drawMotor(g, x, y);
      Svg.note(g, x, y + 30, `負荷 ${names[i]}`, { cls: 'value', anchor: 'middle' });
      if (!look.deciding) Svg.note(g, x, y + 48, `力率 ${num(loads[i].P / (LOADS.V * loads[i].I))}`, { cls: 'value', anchor: 'middle' });
    });
    const meter = [150, 212];
    Svg.gauge(g, ...meter, { value: look.probe ? look.probe.needle : 0, max: 1000, letter: 'W', cls: 'q-active' });
    if (look.probe) {
      Svg.note(g, meter[0] + 32, meter[1] - 8, `I = ${loads[look.probe.index].I} A`, { cls: 'value q-current' });
      Svg.note(g, meter[0] + 32, meter[1] + 10, look.probe.reading, { cls: 'value q-active' });
      Svg.leads(g, meter, [[xs[look.probe.index] - 6, y + 12], [xs[look.probe.index] + 6, y + 12]]);
    } else {
      Svg.note(g, meter[0] + 32, meter[1] + 4, '電流計と電力計', { cls: 'faint' });
    }
    if (look.deciding) {
      xs.forEach((x, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: y, r: 34, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, '電力計は有効電力 P（W）を測る', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, y]) };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  function basicScene(g, look, { V, text, meter }) {
    drawOneLoad(g, look, { V, text });
    PlayKit.meter(g, 200, PANEL.bottom, look, meter);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  const basics = [
    {
      title: '皮相電力',
      kind: 'dial',
      cases: [[100, 5], [200, 3], [100, 8], [200, 5], [100, 2], [150, 4], [200, 4], [100, 9]].map(([V, I]) => ({ V, I })),
      dial: { name: '予想', symbol: 'S', unit: 'VA', min: 0, max: 1000, step: 50 },
      know: '交流の電圧 × 電流（どちらも実効値）を皮相電力 <var>S</var> = <var>VI</var>（VA）という。見かけの電力で、電線や変圧器の大きさはこれで決まる',
      request: () => '皮相電力は？',
      answer: ({ V, I }) => V * I,
      run: ({ V, I }, guess) => ({ ...predicted(guess, V * I, 'VA', `${V} × ${I} = ${V * I} VA`), meter: V * I, lamps: [], burst: null, reading: `${V * I} VA` }),
      draw: (g, { V, I }, guess, look) => basicScene(g, look, { V, text: `${I} A 流れる`, meter: { max: 1000, letter: 'VA', cls: 'ink', ghost: guess } }),
    },
    {
      title: '有効電力',
      kind: 'dial',
      cases: [[100, 5, 0.8], [200, 5, 0.6], [100, 10, 0.8], [200, 4, 0.9], [100, 6, 0.5], [200, 3, 1], [100, 8, 0.75], [150, 4, 0.8]].map(([V, I, pf]) => ({ V, I, pf })),
      dial: { name: '予想', symbol: 'P', unit: 'W', min: 0, max: 1000, step: 10 },
      know: '瞬時電力 <var>v</var> × <var>i</var> の平均が有効電力。電流が θ ずれると <var>P</var> = <var>VI</var> cosθ（W）。cosθ を力率という',
      request: () => '電力計（有効電力）の針は？',
      answer: ({ V, I, pf }) => V * I * pf,
      run: ({ V, I, pf }, guess) => {
        const P = V * I * pf;
        return { ...predicted(guess, P, 'W', `${V} × ${I} × ${pf} = ${num(P)} W`), meter: P, lamps: [], burst: null, reading: `${num(P)} W` };
      },
      draw: (g, { V, I, pf }, guess, look) => basicScene(g, look, { V, text: `${I} A・力率 ${pf}`, meter: { max: 1000, letter: 'W', cls: 'q-active', ghost: guess } }),
    },
    {
      title: '無効電力',
      kind: 'dial',
      cases: [[100, 5, 0.8], [200, 5, 0.6], [100, 10, 0.8], [100, 6, 0.6], [200, 2, 0.8], [100, 4, 0], [100, 10, 0.6], [150, 4, 0.8]].map(([V, I, pf]) => ({ V, I, pf })),
      dial: { name: '予想', symbol: 'Q', unit: 'var', min: 0, max: 1000, step: 10 },
      know: '行き来するだけの電力は無効電力 <var>Q</var> = <var>VI</var> sinθ（var）。力率 0.8 なら sinθ = 0.6、0.6 なら 0.8（基礎8）',
      request: () => '無効電力は？',
      answer: ({ V, I, pf }) => AcWave.power({ V, I, pf }).Q,
      run: ({ V, I, pf }, guess) => {
        const { Q } = AcWave.power({ V, I, pf });
        return { ...predicted(guess, Q, 'var', `sinθ = √(1 − ${pf}²) = ${num(Math.sqrt(1 - pf * pf))}、${V} × ${I} × ${num(Math.sqrt(1 - pf * pf))} = ${num(Q)} var`), meter: Q, lamps: [], burst: null, reading: `${num(Q)} var` };
      },
      draw: (g, { V, I, pf }, guess, look) => basicScene(g, look, { V, text: `${I} A・力率 ${pf}`, meter: { max: 1000, letter: 'var', cls: 'q-reactive', ghost: guess } }),
    },
    {
      title: '力率 = P ÷ S',
      kind: 'dial',
      cases: [[400, 500], [300, 500], [450, 500], [600, 1000], [700, 1000], [850, 1000], [500, 500], [240, 400]].map(([P, S]) => ({ P, S })),
      dial: { name: '予想', symbol: 'cosθ', unit: '', min: 0, max: 1, step: 0.05 },
      know: '力率は有効電力 ÷ 皮相電力：cosθ = <var>P</var> ÷ <var>VI</var>。電流計と電圧計と電力計から求められる',
      request: () => '力率は？',
      answer: ({ P, S }) => P / S,
      run: ({ P, S }, guess) => ({ ...predicted(guess, P / S, '', `${P} ÷ ${S} = ${num(P / S)}`), meter: P / S, lamps: [], burst: null, reading: num(P / S) }),
      draw: (g, { P, S }, guess, look) => basicScene(g, look, { V: 100, text: `${P} W・${S} VA`, meter: { max: 1, letter: 'cos', cls: 'ink', ghost: guess } }),
    },
    {
      title: 'RL 直列の力率',
      kind: 'dial',
      cases: [[40, 30], [30, 40], [60, 80], [80, 60], [50, 0], [24, 32], [8, 6], [90, 120]].map(([R, X]) => ({ R, X })),
      dial: { name: '予想', symbol: 'cosθ', unit: '', min: 0, max: 1, step: 0.05 },
      know: '抵抗 <var>R</var> とリアクタンス <var>X</var> の直列では、インピーダンス <var>Z</var> = √(<var>R</var>² + <var>X</var>²)、力率 cosθ = <var>R</var> ÷ <var>Z</var>（理論10 の直角三角形）',
      request: () => 'この回路の力率は？',
      answer: ({ R, X }) => R / Math.hypot(R, X),
      run: ({ R, X }, guess) => {
        const Z = Math.hypot(R, X);
        return { ...predicted(guess, R / Z, '', `<var>Z</var> = √(${R}² + ${X}²) = ${num(Z)} Ω、${R} ÷ ${num(Z)} = ${num(R / Z)}`), meter: R / Z, lamps: [], burst: null, reading: num(R / Z) };
      },
      draw: (g, { R, X }, guess, look) => basicScene(g, look, { V: 100, text: `R ${R} Ω・X ${X} Ω の直列`, meter: { max: 1, letter: 'cos', cls: 'ink', ghost: guess } }),
    },
    {
      title: '電力は抵抗で使われる',
      kind: 'dial',
      cases: [[5, 16], [2, 50], [4, 25], [10, 6], [3, 40], [6, 10], [5, 30], [8, 10]].map(([I, R]) => ({ I, R })),
      dial: { name: '予想', symbol: 'P', unit: 'W', min: 0, max: 1000, step: 10 },
      know: 'コイル・コンデンサは電力を使わない（行き来するだけ）。有効電力は抵抗だけで使われ、<var>P</var> = <var>I</var>²<var>R</var>',
      request: () => '有効電力は？',
      answer: ({ I, R }) => I * I * R,
      run: ({ I, R }, guess) => ({ ...predicted(guess, I * I * R, 'W', `${I}² × ${R} = ${I * I * R} W（コイルの分は 0）`), meter: I * I * R, lamps: [], burst: null, reading: `${I * I * R} W` }),
      draw: (g, { I, R }, guess, look) => basicScene(g, look, { V: 100, text: `${I} A・R ${R} Ω とコイル`, meter: { max: 1000, letter: 'W', cls: 'q-active', ghost: guess } }),
    },
  ];

  const jobs = [
    {
      kind: 'dial',
      needs: 3, // 失敗したら準備の④（力率 = P ÷ S）から
      cases: [[400, 100, 5], [600, 100, 10], [450, 100, 5], [700, 100, 10], [300, 100, 5], [850, 100, 10], [500, 100, 5], [480, 200, 3]].map(([P, V, I]) => ({ P, V, I })),
      dial: { name: '力率', symbol: 'cosθ', unit: '', min: 0.5, max: 1, step: 0.05 },
      request: ({ I }) => `モーターの電流をブレーカーちょうどの ${I} A にしたい。力率はいくつまで上げる？`,
      answer: ({ P, V, I }) => P / (V * I),
      run: runPfJob,
      draw: drawPfJob,
    },
    {
      kind: 'count',
      needs: 1, // 失敗したら準備の②（有効電力）から
      cases: [[100, 400, 0.8, 30], [200, 1200, 0.6, 50], [100, 300, 0.6, 22], [200, 800, 0.8, 17], [100, 450, 0.9, 26], [200, 1600, 0.8, 32], [100, 240, 0.8, 16], [100, 350, 0.7, 36]]
        .map(([V, P, pf, I]) => ({ V, P, pf, I })),
      count: { min: 1, max: 8, unit: '台' },
      request: ({ I }) => `ブレーカー ${I} A を落とさずに、モーターを何台まで動かせる？`,
      answer: ({ V, P, pf, I }) => Math.floor((I * V * pf) / P + 1e-9),
      run: runMotorsJob,
      draw: drawMotorsJob,
    },
    {
      kind: 'probe',
      needs: 3, // 失敗したら準備の④（力率 = P ÷ S）から
      cases: [
        [[[5, 400], [5, 300], [8, 720]], 0.8], [[[5, 400], [5, 300], [8, 720]], 0.6], [[[4, 360], [10, 700], [6, 480]], 0.7],
        [[[4, 360], [10, 700], [6, 480]], 0.9], [[[8, 400], [3, 240], [5, 500]], 0.5], [[[8, 400], [3, 240], [5, 500]], 1],
        [[[6, 510], [9, 540], [2, 160]], 0.85], [[[6, 510], [9, 540], [2, 160]], 0.6],
      ].map(([loads, target]) => ({ loads: loads.map(([I, P]) => ({ I, P })), target })),
      probe: {
        parts: LOADS.xs.length,
        hint: '負荷をタップすると、電流計と電力計が電流 I と有効電力 P を測る',
        measure: ({ loads }, i) => loads[i].P,
        reading: (P) => `P = ${num(P)} W`,
      },
      action: 'これに決める',
      request: ({ target }) => `力率が ${target} の負荷はどれ？（電圧はどれも 100 V）`,
      answer: ({ loads, target }) => loads.findIndex(({ I, P }) => near(P / (LOADS.V * I), target)),
      run: runPfProbe,
      draw: drawPfProbe,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays['ac-power'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
