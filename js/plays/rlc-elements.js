// 理論「R・L・C それぞれの交流」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備はリアクタンス X_L・X_C の計算（L = k/π mH・C = k/π μF と、試験によく出る書き方）から始め、電流の位相、周波数と電流、
// 抵抗とコイルの並列の電流（矢印の足し算）へ進む。現場はヒューズつきのコイル・コンデンサの回路。計算は js/calc/rlc.js。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const amperes = (value) => `${num(value)} A`;
  const NOTE_Y = 262;
  const LOOP = { left: 40, right: 300, top: 64, bottom: 196, mid: 130, fuseX: 150 };
  // k/π mH・k/π μF の書き方と、そのリアクタンス
  const henry = (k) => (k / 1000) / Math.PI;
  const farad = (k) => (k * 1e-6) / Math.PI;
  const xl = (f, k) => RlcCircuit.inductiveReactance(f, henry(k));
  const xc = (f, k) => RlcCircuit.capacitiveReactance(f, farad(k));

  function drawCircuit(g, look, { sourceText, fuseText = null, part, partText, blown = false }) {
    const { left, right, top, bottom, mid, fuseX } = LOOP;
    Svg.wire(g, [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]]);
    Svg.acSource(g, left, mid);
    Svg.note(g, left + 20, mid + 24, sourceText, { cls: 'value q-voltage' });
    Svg.knifeSwitch(g, 88, top, { on: look.switchOn });
    if (fuseText) {
      Svg.fuse(g, fuseX, top, { blown });
      Svg.note(g, fuseX, top - 20, fuseText, { cls: 'value q-current', anchor: 'middle' });
    }
    if (part === 'L') Svg.coil(g, right, mid, { vertical: true });
    else if (part === 'C') Svg.capacitor(g, right, mid, { vertical: true });
    else Svg.resistor(g, right, mid, { vertical: true });
    Svg.note(g, right - 18, mid, partText, { cls: `value ${part === 'R' ? 'q-active' : 'q-reactive'}`, anchor: 'end' });
  }

  // ---- ミッション（現場の依頼） ----

  // ヒューズ（定格 I）を飛ばさず、ちょうど I 流す周波数。コイルは周波数を下げると、コンデンサは上げると電流が増える
  function runFuseJob(part) {
    return ({ V, k, I }, f) => {
      const X = part === 'L' ? xl(f, k) : xc(f, k);
      const now = V / X;
      const base = { meter: now, lamps: [] };
      const math = `${f} Hz で X = ${num(X)} Ω、${V} ÷ ${num(X)} = ${num(now)} A`;
      const fix = (more) => (part === 'L' ? (more ? '周波数を下げる' : '周波数を上げる') : more ? '周波数を上げる' : '周波数を下げる');
      if (near(now, I)) return { ...base, ok: true, burst: null, reading: amperes(now), reason: `ちょうど！ ${math}` };
      if (now < I) return { ...base, ok: false, burst: null, reading: amperes(now), reason: `少ない。${math}。${fix(true)}` };
      return { ...base, ok: false, burst: { fuse: true }, reading: `${amperes(now)} → 0 A`, reason: `ヒューズが飛んだ！ ${math}（${I} A まで）。${fix(false)}` };
    };
  }

  function drawFuseScene(part) {
    return (g, { V, k, I }, f, look) => {
      drawCircuit(g, look, {
        sourceText: `${V} V・${f} Hz`, fuseText: `ヒューズ ${I} A`, blown: look.broken.fuse,
        part, partText: part === 'L' ? `コイル ${k}/π mH` : `コンデンサ ${k}/π μF`,
      });
      PlayKit.meter(g, 200, LOOP.bottom, look, { max: I * 1.6, letter: 'A', cls: 'q-current', mark: I });
      Svg.note(g, 180, NOTE_Y, 'ヒューズは定格の電流をこえると飛ぶ', { cls: 'faint', anchor: 'middle' });
      return { lamps: [[LOOP.right, LOOP.mid]], fuse: [LOOP.fuseX, LOOP.top] };
    };
  }

  // 同じコンデンサ（1個 k/π μF）を並列に何個で、ちょうど I 流れるか（並列の電流は足し算）
  function runBankJob({ V, f, k, I }, n) {
    const each = V / xc(f, k);
    const now = each * n;
    const base = { meter: now, lamps: [] };
    if (now > I + 1e-9) return { ...base, ok: false, burst: { fuse: true }, reading: `${amperes(now)} → 0 A`, reason: `ヒューズが飛んだ！ 1個 ${num(each)} A × ${n}個 = ${num(now)} A（${I} A まで）` };
    if (now + each <= I + 1e-9) return { ...base, ok: false, burst: null, reading: amperes(now), reason: `まだ足りない。1個 ${num(each)} A × ${n}個 = ${num(now)} A` };
    return { ...base, ok: true, burst: null, reading: amperes(now), reason: `ちょうど！ 1個は X = ${num(xc(f, k))} Ω で ${num(each)} A、${n}個で ${num(now)} A` };
  }

  function drawBankJob(g, { V, f, k, I }, n, look) {
    const { left, top, bottom, mid, fuseX } = LOOP;
    const xs = Array.from({ length: n }, (_, i) => 250 + (i - (n - 1) / 2) * 16);
    const last = xs[xs.length - 1];
    Svg.wire(g, [[left, mid], [left, top], [last, top]]);
    Svg.wire(g, [[left, mid], [left, bottom], [last, bottom]]);
    for (const x of xs) {
      Svg.wire(g, [[x, top], [x, bottom]]);
      const cap = Svg.el(g, 'g', { class: 'capacitor q-reactive' });
      Svg.el(cap, 'rect', { x: x - 3, y: mid - 3, width: 6, height: 6, class: 'cut' });
      for (const dy of [-3, 3]) Svg.el(cap, 'line', { x1: x - 6, y1: mid + dy, x2: x + 6, y2: mid + dy, class: 'plate' });
    }
    Svg.acSource(g, left, mid);
    Svg.note(g, left + 20, mid + 24, `${V} V・${f} Hz`, { cls: 'value q-voltage' });
    Svg.knifeSwitch(g, 88, top, { on: look.switchOn });
    Svg.fuse(g, fuseX, top, { blown: look.broken.fuse });
    Svg.note(g, fuseX, top - 20, `ヒューズ ${I} A`, { cls: 'value q-current', anchor: 'middle' });
    Svg.note(g, 250, bottom + 20, `1個 ${k}/π μF × ${n}個`, { cls: 'value q-reactive', anchor: 'middle' });
    PlayKit.meter(g, 176, bottom, look, { max: I * 1.6, letter: 'A', cls: 'q-current', mark: I });
    Svg.note(g, 180, NOTE_Y, '並列のコンデンサは、電流が足し算になる', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, mid]), fuse: [fuseX, top] };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  // ①② リアクタンス
  function runReactanceBasic(part) {
    return ({ f, k }, guess) => {
      const X = part === 'L' ? xl(f, k) : xc(f, k);
      const why = part === 'L'
        ? `2π × ${f} × ${k}/π × 10⁻³ = 2 × ${f} × ${k} ÷ 1000 = ${num(X)} Ω`
        : `1 ÷ (2π × ${f} × ${k}/π × 10⁻⁶) = 10⁶ ÷ (2 × ${f} × ${k}) = ${num(X)} Ω`;
      return { ...predicted(guess, X, 'Ω', why), meter: X, lamps: [], burst: null, reading: `${num(X)} Ω` };
    };
  }

  function drawReactanceBasic(part) {
    return (g, { f, k }, guess, look) => {
      drawCircuit(g, look, { sourceText: `${f} Hz`, part, partText: part === 'L' ? `コイル ${k}/π mH` : `コンデンサ ${k}/π μF` });
      PlayKit.meter(g, 200, LOOP.bottom, look, { max: 100, letter: 'Ω', cls: 'q-reactive', ghost: guess });
      Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（リアクタンス）', { cls: 'faint', anchor: 'middle' });
      return { lamps: [] };
    };
  }

  // ③ 電流の位相
  const PART_NAME = { R: '抵抗', L: 'コイル', C: 'コンデンサ' };
  const PHASE = { R: 0, L: -90, C: 90 };

  function runPhaseBasic({ part }, guess) {
    const deg = PHASE[part];
    return { ...predicted(guess, deg, '°', `${PART_NAME[part]}の電流は${deg === 0 ? '電圧と同相（0°）' : deg < 0 ? '90° 遅れ' : '90° 進み'}`), meter: deg, lamps: [], burst: null, reading: `${deg}°` };
  }

  function drawPhaseBasic(g, { part, ohm }, guess, look) {
    drawCircuit(g, look, { sourceText: '100 V・50 Hz', part, partText: `${PART_NAME[part]} ${ohm} Ω` });
    PlayKit.meter(g, 200, LOOP.bottom, look, { min: -90, max: 90, letter: '°', cls: 'ink', mark: 0, ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（位相計：電流の進みが右）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ④⑤ 周波数と電流
  function runCurrentBasic(part) {
    return ({ V, f, k }, guess) => {
      const X = part === 'L' ? xl(f, k) : xc(f, k);
      const I = V / X;
      return { ...predicted(guess, I, 'A', `${f} Hz で X = ${num(X)} Ω、${V} ÷ ${num(X)} = ${num(I)} A`), meter: I, lamps: [], burst: null, reading: amperes(I) };
    };
  }

  function drawCurrentBasic(part) {
    return (g, { V, f, k }, guess, look) => {
      drawCircuit(g, look, { sourceText: `${V} V・${f} Hz`, part, partText: part === 'L' ? `コイル ${k}/π mH` : `コンデンサ ${k}/π μF` });
      PlayKit.meter(g, 200, LOOP.bottom, look, { max: 6, letter: 'A', cls: 'q-current', ghost: guess });
      Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
      return { lamps: [] };
    };
  }

  // ⑥ 抵抗とコイルの並列：電流は 90° ずれているので三平方
  function runParallelBasic({ IR, IL }, guess) {
    const I = Math.hypot(IR, IL);
    return { ...predicted(guess, I, 'A', `√(${IR}² + ${IL}²) = ${num(I)} A（${IR} + ${IL} = ${num(IR + IL)} A ではない）`), meter: I, lamps: [], burst: null, reading: amperes(I) };
  }

  function drawParallelBasic(g, { IR, IL }, guess, look) {
    const { left, top, bottom, mid } = LOOP;
    Svg.wire(g, [[left, mid], [left, top], [270, top], [270, bottom], [left, bottom], [left, mid]]);
    Svg.wire(g, [[200, top], [200, bottom]]);
    Svg.acSource(g, left, mid);
    Svg.knifeSwitch(g, 88, top, { on: look.switchOn });
    Svg.resistor(g, 200, mid, { vertical: true });
    Svg.coil(g, 270, mid, { vertical: true });
    Svg.note(g, 186, mid, `${IR} A`, { cls: 'value q-current', anchor: 'end' });
    Svg.note(g, 284, mid, `${IL} A`, { cls: 'value q-current' });
    Svg.note(g, 200, top + 20, '抵抗', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, 270, top + 20, 'コイル', { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, 130, bottom, look, { max: 10, letter: 'A', cls: 'q-current', ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（全体の電流）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  const jobs = [
    {
      kind: 'dial',
      needs: 0, // 失敗したら準備の①（X_L）から
      cases: [[100, 500, 2], [100, 250, 2], [100, 1000, 1], [100, 500, 1], [200, 1000, 2], [100, 400, 2.5], [100, 250, 4], [100, 200, 5], [100, 100, 5]].map(([V, k, I]) => ({ V, k, I })),
      dial: { name: '周波数', symbol: 'f', unit: 'Hz', min: 10, max: 200, step: 10 },
      request: ({ I }) => `ヒューズを飛ばさずに、コイルにちょうど ${I} A 流す周波数は？`,
      answer: ({ V, k, I }) => (V * 1000) / (2 * k * I),
      run: runFuseJob('L'),
      draw: drawFuseScene('L'),
    },
    {
      kind: 'dial',
      needs: 1, // 失敗したら準備の②（X_C）から
      cases: [[100, 100, 1], [100, 100, 2], [100, 200, 2], [100, 250, 5], [200, 250, 5], [100, 500, 5], [100, 125, 1], [100, 50, 1]].map(([V, k, I]) => ({ V, k, I })),
      dial: { name: '周波数', symbol: 'f', unit: 'Hz', min: 10, max: 200, step: 10 },
      request: ({ I }) => `ヒューズを飛ばさずに、コンデンサにちょうど ${I} A 流す周波数は？`,
      answer: ({ V, k, I }) => I / (V * 2 * k * 1e-6),
      run: runFuseJob('C'),
      draw: drawFuseScene('C'),
    },
    {
      kind: 'count',
      needs: 4, // 失敗したら準備の⑤（コンデンサの電流）から
      cases: [[100, 50, 100, 3], [100, 50, 50, 2], [100, 50, 200, 6], [100, 60, 100, 2.4], [200, 50, 50, 4], [100, 50, 100, 5], [100, 25, 200, 3], [100, 50, 125, 5], [100, 100, 50, 6]]
        .map(([V, f, k, I]) => ({ V, f, k, I })),
      count: { min: 1, max: 8 },
      request: ({ I }) => `ヒューズを飛ばさずに、ちょうど ${I} A 流したい。コンデンサを並列に何個？`,
      answer: ({ V, f, k, I }) => I / (V / xc(f, k)),
      run: runBankJob,
      draw: drawBankJob,
    },
  ];

  const basics = [
    {
      title: 'コイルのリアクタンス',
      kind: 'dial',
      cases: [[50, 100], [50, 300], [60, 100], [50, 500], [60, 250], [100, 200], [50, 1000], [60, 500]].map(([f, k]) => ({ f, k })),
      dial: { name: '予想', symbol: 'X_L', unit: 'Ω', min: 0, max: 100, step: 2 },
      know: '<var>X</var><sub>L</sub> = 2π<var>fL</var>。試験では <var>L</var> = 100/π mH のように π 入りで出ることが多く、2π と π が消えて 2<var>f</var> × (100 × 10⁻³) になる',
      request: () => 'コイルのリアクタンスは？',
      answer: ({ f, k }) => xl(f, k),
      run: runReactanceBasic('L'),
      draw: drawReactanceBasic('L'),
    },
    {
      title: 'コンデンサのリアクタンス',
      kind: 'dial',
      cases: [[50, 100], [50, 200], [50, 500], [100, 100], [50, 1000], [25, 200], [100, 250], [50, 250]].map(([f, k]) => ({ f, k })),
      dial: { name: '予想', symbol: 'X_C', unit: 'Ω', min: 0, max: 100, step: 2 },
      know: '<var>X</var><sub>C</sub> = 1 ÷ (2π<var>fC</var>)。<var>C</var> = 100/π μF なら π が消えて 1 ÷ (2<var>f</var> × 100 × 10⁻⁶)。μ は 10⁻⁶',
      request: () => 'コンデンサのリアクタンスは？',
      answer: ({ f, k }) => xc(f, k),
      run: runReactanceBasic('C'),
      draw: drawReactanceBasic('C'),
    },
    {
      title: '電流の位相',
      kind: 'dial',
      cases: [['R', 50], ['L', 30], ['C', 40], ['L', 80], ['C', 25], ['R', 20], ['C', 100], ['L', 10]].map(([part, ohm]) => ({ part, ohm })),
      dial: { name: '予想', symbol: 'φ', unit: '°', min: -90, max: 90, step: 90 },
      know: '抵抗の電流は電圧と同相。コイルは電流の変化をじゃまするので 90° 遅れ、コンデンサはたまる電荷が先に動くので 90° 進む（「L は遅れ、C は進み」）',
      request: () => '電流の位相（電圧が基準、進みを＋）は？',
      answer: ({ part }) => PHASE[part],
      run: runPhaseBasic,
      draw: drawPhaseBasic,
    },
    {
      title: '周波数とコイルの電流',
      kind: 'dial',
      cases: [[100, 50, 500], [100, 100, 500], [100, 25, 500], [200, 50, 1000], [100, 50, 250], [100, 50, 1000], [100, 20, 500], [100, 40, 250]].map(([V, f, k]) => ({ V, f, k })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 6, step: 0.5 },
      know: 'コイルの電流 <var>I</var> = <var>V</var> ÷ <var>X</var><sub>L</sub>。周波数を下げると <var>X</var><sub>L</sub> が小さくなり、電流は増える',
      request: () => 'コイルの電流は？',
      answer: ({ V, f, k }) => V / xl(f, k),
      run: runCurrentBasic('L'),
      draw: drawCurrentBasic('L'),
    },
    {
      title: '周波数とコンデンサの電流',
      kind: 'dial',
      cases: [[100, 50, 100], [100, 50, 200], [200, 50, 100], [100, 100, 100], [100, 50, 500], [100, 25, 200], [200, 50, 250], [100, 60, 250]].map(([V, f, k]) => ({ V, f, k })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 6, step: 0.5 },
      know: 'コンデンサの電流 <var>I</var> = <var>V</var> ÷ <var>X</var><sub>C</sub> = <var>V</var> × 2π<var>fC</var>。周波数を上げると電流が増える',
      request: () => 'コンデンサの電流は？',
      answer: ({ V, f, k }) => V / xc(f, k),
      run: runCurrentBasic('C'),
      draw: drawCurrentBasic('C'),
    },
    {
      title: '抵抗とコイルの並列',
      kind: 'dial',
      cases: [[3, 4], [1.5, 2], [6, 8], [2.4, 3.2], [4, 3], [0.6, 0.8], [1.8, 2.4], [4.8, 6.4]].map(([IR, IL]) => ({ IR, IL })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 10, step: 0.5 },
      know: '並列なら電圧が共通。抵抗の電流は同相、コイルの電流は 90° 遅れなので、全体の電流は矢印で足して √(<var>I</var><sub>R</sub>² + <var>I</var><sub>L</sub>²)',
      request: () => '全体の電流は？',
      answer: ({ IR, IL }) => Math.hypot(IR, IL),
      run: runParallelBasic,
      draw: drawParallelBasic,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays['rlc-elements'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
