// 理論「平行平板コンデンサ」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は Q = CV から始め、C は S に比例・d に反比例、誘電体で εr 倍、電界 E = V ÷ d、つないだまま／外した、エネルギー CV² ÷ 2 へ進む。
// 現場は間隔を決めてちょうどの電荷をためる（狭すぎると火花）、誘電体でちょうどの容量、電池から外したコンデンサを探す。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const NOTE_Y = 262;
  const PLATE = { left: 110, right: 250, top: 70, pxPerMm: 28 };

  // 極板の図。gapMm は間隔、dielectric は誘電体を描くか
  function drawPlates(g, look, { gapMm, label, dielectric = false, battery = null, open = false }) {
    const { left, right, top, pxPerMm } = PLATE;
    const bottom = top + gapMm * pxPerMm;
    if (dielectric) Svg.el(g, 'rect', { x: left, y: top, width: right - left, height: bottom - top, class: 'black-box closed' });
    for (const y of [top, bottom]) Svg.el(g, 'rect', { x: left, y: y - 3, width: right - left, height: 6, class: 'plate-bar' });
    Svg.note(g, (left + right) / 2, top - 14, label, { cls: 'value', anchor: 'middle' });
    if (battery !== null) {
      Svg.wire(g, [[left, top], [40, top], [40, 118]]);
      Svg.wire(g, [[left, bottom], [40, bottom], [40, 138]]);
      Svg.battery(g, 40, 128);
      Svg.knifeSwitch(g, 76, top, { on: open ? 0 : look.switchOn });
      Svg.note(g, 36, 160, battery, { cls: 'value q-voltage', anchor: 'middle' });
    }
    return { top, bottom };
  }

  // ---- ミッション（現場の依頼） ----

  // 間隔 d を決めて、ちょうど Q をためる（d = 1 mm で C0。C は d に反比例）。狭すぎると電界が強く、火花が飛ぶ
  function runChargeJob({ C0, V, Q }, d) {
    const now = (C0 / d) * V / 1000; // nC（C0 は pF）
    const base = { meter: now, lamps: [] };
    const math = `C = ${C0} ÷ ${d} = ${num(C0 / d)} pF、Q = ${num(C0 / d)} pF × ${V} V = ${num(now)} nC`;
    if (near(now, Q)) return { ...base, ok: true, burst: null, reading: `${num(now)} nC`, reason: `ちょうど！ ${math}` };
    if (now < Q) return { ...base, ok: false, burst: null, reading: `${num(now)} nC`, reason: `足りない。${math}。間隔を狭く` };
    return { ...base, ok: false, burst: { fuse: true }, reading: `${num(now)} nC`, reason: `火花！ 狭すぎて電界 ${num(V / d)} kV/m。${math}。間隔を広く` };
  }

  function drawChargeJob(g, { C0, V, Q }, d, look) {
    const { top, bottom } = drawPlates(g, look, { gapMm: d, label: `d ${d} mm`, battery: `${V} V` });
    Svg.note(g, 180, 30, `1 mm の時 ${C0} pF`, { cls: 'value q-reactive', anchor: 'middle' });
    PlayKit.meter(g, 300, 130, look, { max: Q * 1.6, letter: 'nC', cls: 'ink', mark: Q });
    Svg.note(g, 180, NOTE_Y, '間隔が狭いほど電界が強い。強すぎると空気が絶縁破壊して火花', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[180, (top + bottom) / 2]], fuse: [180, (top + bottom) / 2] };
  }

  // 誘電体（比誘電率 εr）でちょうど C にする
  function runDielectricJob({ C0, C }, er) {
    const now = C0 * er;
    const base = { meter: now, lamps: [], burst: null, reading: `${num(now)} pF` };
    if (near(now, C)) return { ...base, ok: true, reason: `ちょうど！ ${C0} pF × εr ${er} = ${num(now)} pF` };
    return { ...base, ok: false, reason: `${C0} × ${er} = ${num(now)} pF（${C} pF にしたい）。εr を${now < C ? '大きく' : '小さく'}` };
  }

  function drawDielectricJob(g, { C0, C }, er, look) {
    drawPlates(g, look, { gapMm: 2, label: `εr ${er}`, dielectric: true, battery: '電池' });
    Svg.note(g, 180, 30, `空気の時 ${C0} pF`, { cls: 'value q-reactive', anchor: 'middle' });
    PlayKit.meter(g, 300, 130, look, { max: C * 1.6, letter: 'pF', cls: 'q-reactive', mark: C });
    Svg.note(g, 180, NOTE_Y, '誘電体を間いっぱいに入れると、C は εr 倍', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // 3つのコンデンサの間隔を2倍に広げて電圧を測る。電池から外してあるもの（Q 一定）は電圧が2倍になる
  const CAPS = { xs: [70, 180, 290], y: 100, names: ['A', 'B', 'C'] };

  function runDetachedProbe({ caps, target }, i) {
    const { V, detached } = caps[i];
    const after = detached ? 2 * V : V;
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    const math = `${CAPS.names[i]} は ${V} → ${after} V（${detached ? 'Q 一定で C 半分' : 'つないだままで V 一定'}）`;
    if (detached === (target === 'detached')) return { ...base, ok: true, reason: `当たり！ ${math}` };
    return { ...base, ok: false, reason: `${math}。外したものは V = Q ÷ C で2倍になる` };
  }

  function drawDetachedProbe(g, { caps }, selected, look) {
    const { xs, y, names } = CAPS;
    xs.forEach((x, i) => {
      Svg.el(g, 'rect', { x: x - 30, y: y - 36, width: 60, height: 72, rx: 4, class: 'building' });
      Svg.note(g, x, y - 46, `${names[i]}（はじめ ${caps[i].V} V）`, { cls: 'value', anchor: 'middle' });
      for (const dy of [-12, 12]) Svg.el(g, 'rect', { x: x - 20, y: y + dy - 2, width: 40, height: 4, class: 'plate-bar' });
      if (!look.deciding) Svg.note(g, x, y + 50, caps[i].detached ? '外してあった' : 'つないだまま', { cls: 'value', anchor: 'middle' });
    });
    const meter = [150, 212];
    Svg.gauge(g, ...meter, { value: look.probe ? look.probe.needle : 0, max: 250, letter: 'V', cls: 'q-voltage' });
    Svg.note(g, meter[0] + 32, meter[1] + 4, look.probe ? look.probe.reading : '電圧計', { cls: look.probe ? 'value q-voltage' : 'faint' });
    if (look.probe) Svg.leads(g, meter, [[xs[look.probe.index] - 8, y + 36], [xs[look.probe.index] + 8, y + 36]]);
    if (look.deciding) {
      xs.forEach((x, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: y, r: 42, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, 'タップすると、間隔を2倍に広げてから電圧を測る', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, y]) };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  function simpleScene(g, look, { lines, meter }) {
    drawPlates(g, look, { gapMm: 2, label: '', battery: '' });
    lines.forEach((text, i) => Svg.note(g, 180, 30 + i * 18, text, { cls: 'value', anchor: 'middle' }));
    PlayKit.meter(g, 300, 130, look, meter);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  const basics = [
    {
      title: '電荷 Q = CV',
      kind: 'dial',
      cases: [[2, 50], [5, 20], [10, 12], [4, 30], [0.5, 100], [3, 40], [6, 25], [8, 15]].map(([C, V]) => ({ C, V })),
      dial: { name: '予想', symbol: 'Q', unit: 'μC', min: 0, max: 200, step: 10 },
      know: 'コンデンサにたまる電荷は、容量 × 電圧：<var>Q</var> = <var>CV</var>。μF × V なら μC',
      request: () => 'たまる電荷は？',
      answer: ({ C, V }) => C * V,
      run: ({ C, V }, guess) => ({ ...predicted(guess, C * V, 'μC', `${C} μF × ${V} V = ${num(C * V)} μC`), meter: C * V, lamps: [], burst: null, reading: `${num(C * V)} μC` }),
      draw: (g, { C, V }, guess, look) => simpleScene(g, look, { lines: [`${C} μF に ${V} V`], meter: { max: 200, letter: 'μC', cls: 'ink', ghost: guess } }),
    },
    {
      title: '面積と間隔',
      kind: 'dial',
      cases: [[100, 2, 1], [100, 1, 2], [60, 3, 2], [80, 2, 4], [100, 1, 0.5], [50, 4, 2], [120, 1, 3], [90, 2, 3]].map(([C0, a, b]) => ({ C0, a, b })),
      dial: { name: '予想', symbol: 'C', unit: 'pF', min: 0, max: 250, step: 10 },
      know: '<var>C</var> = ε<var>S</var> ÷ <var>d</var>。面積 <var>S</var> に比例し、間隔 <var>d</var> に反比例する（基礎2）',
      request: ({ a, b }) => `面積を ${num(a)} 倍、間隔を ${num(b)} 倍にした。C は？`,
      answer: ({ C0, a, b }) => (C0 * a) / b,
      run: ({ C0, a, b }, guess) => ({ ...predicted(guess, (C0 * a) / b, 'pF', `${C0} × ${num(a)} ÷ ${num(b)} = ${num((C0 * a) / b)} pF`), meter: (C0 * a) / b, lamps: [], burst: null, reading: `${num((C0 * a) / b)} pF` }),
      draw: (g, { C0 }, guess, look) => simpleScene(g, look, { lines: [`はじめ ${C0} pF`], meter: { max: 250, letter: 'pF', cls: 'q-reactive', ghost: guess } }),
    },
    {
      title: '誘電体',
      kind: 'dial',
      cases: [[50, 2], [20, 5], [30, 4], [100, 2.5], [40, 3], [25, 6], [60, 2], [10, 8]].map(([C0, er]) => ({ C0, er })),
      dial: { name: '予想', symbol: 'C', unit: 'pF', min: 0, max: 250, step: 10 },
      know: '極板の間を比誘電率 εr の誘電体でうめると、<var>C</var> は εr 倍（ε = ε₀εr）',
      request: () => '誘電体を入れた後の C は？',
      answer: ({ C0, er }) => C0 * er,
      run: ({ C0, er }, guess) => ({ ...predicted(guess, C0 * er, 'pF', `${C0} × ${er} = ${num(C0 * er)} pF`), meter: C0 * er, lamps: [], burst: null, reading: `${num(C0 * er)} pF` }),
      draw: (g, { C0, er }, guess, look) => simpleScene(g, look, { lines: [`空気で ${C0} pF`, `εr = ${er} の誘電体を入れる`], meter: { max: 250, letter: 'pF', cls: 'q-reactive', ghost: guess } }),
    },
    {
      title: '電界 E = V ÷ d',
      kind: 'dial',
      cases: [[100, 1], [200, 2], [300, 1], [50, 0.5], [120, 3], [240, 4], [90, 0.5], [150, 1.5]].map(([V, d]) => ({ V, d })),
      dial: { name: '予想', symbol: 'E', unit: 'kV/m', min: 0, max: 300, step: 10 },
      know: '平行平板の間の電界は一様で <var>E</var> = <var>V</var> ÷ <var>d</var>（V/m）。mm で割ると kV/m',
      request: () => '極板の間の電界は？',
      answer: ({ V, d }) => V / d,
      run: ({ V, d }, guess) => ({ ...predicted(guess, V / d, 'kV/m', `${V} V ÷ ${d} mm = ${num(V / d)} kV/m`), meter: V / d, lamps: [], burst: null, reading: `${num(V / d)} kV/m` }),
      draw: (g, { V, d }, guess, look) => simpleScene(g, look, { lines: [`${V} V・間隔 ${d} mm`], meter: { max: 300, letter: 'kV/m', cls: 'q-voltage', ghost: guess } }),
    },
    {
      title: 'つないだまま・外して',
      kind: 'dial',
      cases: [[100, 2, true], [100, 2, false], [60, 3, true], [50, 0.5, true], [80, 2, false], [40, 4, true], [120, 1.5, true], [90, 2, true]].map(([V0, k, detached]) => ({ V0, k, detached })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 250, step: 5 },
      know: 'つないだままなら電圧は電池の <var>V</var> のまま。電池から外すと電荷 <var>Q</var> が一定で、<var>V</var> = <var>Q</var> ÷ <var>C</var>。間隔を <var>k</var> 倍にすると <var>C</var> は 1/<var>k</var> 倍なので <var>V</var> は <var>k</var> 倍',
      request: ({ k, detached }) => `${detached ? '電池を外してから' : 'つないだまま'}、間隔を ${num(k)} 倍にした。電圧は？`,
      answer: ({ V0, k, detached }) => (detached ? V0 * k : V0),
      run: ({ V0, k, detached }, guess) => {
        const V = detached ? V0 * k : V0;
        return { ...predicted(guess, V, 'V', detached ? `Q 一定、C は 1/${num(k)} 倍で V = ${V0} × ${num(k)} = ${num(V)} V` : `つないだままなので ${V0} V のまま`), meter: V, lamps: [], burst: null, reading: `${num(V)} V` };
      },
      draw: (g, { V0 }, guess, look) => simpleScene(g, look, { lines: [`はじめ ${V0} V`], meter: { max: 250, letter: 'V', cls: 'q-voltage', ghost: guess } }),
    },
    {
      title: 'エネルギー',
      kind: 'dial',
      cases: [[2, 100], [10, 50], [4, 50], [1, 200], [5, 60], [20, 30], [8, 50], [0.5, 400]].map(([C, V]) => ({ C, V })),
      dial: { name: '予想', symbol: 'W', unit: 'mJ', min: 0, max: 40, step: 0.5 },
      know: 'コンデンサにたまるエネルギー <var>W</var> = <var>CV</var>² ÷ 2。μF と V で計算すると μJ、1000 で割ると mJ',
      request: () => 'たまるエネルギーは？',
      answer: ({ C, V }) => (C * V * V) / 2 / 1000,
      run: ({ C, V }, guess) => {
        const W = (C * V * V) / 2 / 1000;
        return { ...predicted(guess, W, 'mJ', `${C} × ${V}² ÷ 2 = ${num(W * 1000)} μJ = ${num(W)} mJ`), meter: W, lamps: [], burst: null, reading: `${num(W)} mJ` };
      },
      draw: (g, { C, V }, guess, look) => simpleScene(g, look, { lines: [`${C} μF に ${V} V`], meter: { max: 40, letter: 'mJ', cls: 'q-active', ghost: guess } }),
    },
  ];

  const jobs = [
    {
      kind: 'dial',
      needs: 0, // 失敗したら準備の①（Q = CV）から
      cases: [[100, 100, 5], [100, 100, 20], [100, 100, 4], [80, 50, 2], [80, 50, 8], [60, 100, 3], [60, 100, 4], [60, 100, 1.5]].map(([C0, V, Q]) => ({ C0, V, Q })),
      dial: { name: '極板の間隔', symbol: 'd', unit: 'mm', min: 0.5, max: 4, step: 0.5 },
      request: ({ Q }) => `ちょうど ${Q} nC の電荷をためたい。間隔 <var>d</var> は？`,
      answer: ({ C0, V, Q }) => (C0 * V) / 1000 / Q,
      run: runChargeJob,
      draw: drawChargeJob,
    },
    {
      kind: 'dial',
      needs: 2, // 失敗したら準備の③（誘電体）から
      cases: [[50, 200], [20, 100], [30, 180], [100, 300], [40, 280], [25, 200], [60, 120], [10, 90]].map(([C0, C]) => ({ C0, C })),
      dial: { name: '比誘電率', symbol: 'ε_r', unit: '', min: 1, max: 10, step: 1 },
      request: ({ C }) => `誘電体を入れて、ちょうど ${C} pF にしたい。比誘電率は？`,
      answer: ({ C0, C }) => C / C0,
      run: runDielectricJob,
      draw: drawDielectricJob,
    },
    {
      kind: 'probe',
      needs: 4, // 失敗したら準備の⑤（つないだまま・外して）から
      cases: [
        [[[100, false], [100, true], [100, false]], 'detached'], [[[50, true], [100, false], [80, false]], 'detached'],
        [[[60, false], [60, false], [120, true]], 'detached'], [[[100, true], [50, true], [100, false]], 'connected'],
        [[[80, true], [80, false], [40, true]], 'connected'], [[[120, true], [60, true], [60, false]], 'connected'],
      ].map(([caps, target]) => ({ caps: caps.map(([V, detached]) => ({ V, detached })), target })),
      probe: {
        parts: CAPS.xs.length,
        hint: 'コンデンサをタップすると、間隔を2倍に広げてから電圧を測る',
        measure: ({ caps }, i) => (caps[i].detached ? 2 * caps[i].V : caps[i].V),
        reading: (V) => `広げた後 ${num(V)} V`,
      },
      action: 'これに決める',
      request: ({ target }) => (target === 'detached' ? '電池から外してあるコンデンサはどれ？' : '電池につないだままのコンデンサはどれ？'),
      answer: ({ caps, target }) => caps.findIndex(({ detached }) => detached === (target === 'detached')),
      run: runDetachedProbe,
      draw: drawDetachedProbe,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays['plate-capacitor'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
