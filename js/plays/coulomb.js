// 理論「クーロンの法則と電界」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は力が電荷の積に比例・距離の2乗に反比例、k を使った計算、電界、符号（反発・引き合う）、F = QE へ進む。
// 現場は力計（ばね）でちょうどの力にする距離・電荷と、力と距離から電荷の大きさを当てる。計算は js/calc/coulomb.js。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const NOTE_Y = 262;
  const Y = 120;

  function drawPair(g, { q1, q2, r, x1 = 80 }) {
    const x2 = x1 + r * 280;
    Svg.guide(g, x1, Y + 40, x2, Y + 40);
    Svg.note(g, (x1 + x2) / 2, Y + 54, `r = ${num(r)} m`, { cls: 'value', anchor: 'middle' });
    for (const [x, q] of [[x1, q1], [x2, q2]]) {
      Svg.el(g, 'circle', { cx: x, cy: Y, r: 14, class: 'rotor q-mech' });
      Svg.note(g, x, Y + 1, q > 0 ? '+' : q < 0 ? '−' : '?', { cls: 'value', anchor: 'middle' });
      Svg.note(g, x, Y - 26, typeof q === 'number' ? `${num(q)} μC` : q, { cls: 'value', anchor: 'middle' });
    }
  }

  const forceMeter = (g, look, options) => PlayKit.meter(g, 300, 64, look, { letter: 'N', cls: 'q-mech', readingY: 104, ...options });

  // ---- ミッション（現場の依頼） ----

  function runDistanceJob({ q1, q2, F }, r) {
    const now = Coulomb.force(q1, q2, r);
    const base = { meter: now, lamps: [] };
    const math = `9×10⁹ × ${q1}×10⁻⁶ × ${q2}×10⁻⁶ ÷ ${num(r)}² = ${num(now)} N`;
    if (near(now, F)) return { ...base, ok: true, burst: null, reading: `${num(now)} N`, reason: `ちょうど！ ${math}` };
    if (now < F) return { ...base, ok: false, burst: null, reading: `${num(now)} N`, reason: `弱い。${math}。近づける` };
    return { ...base, ok: false, burst: { fuse: true }, reading: `${num(now)} N`, reason: `ばねが切れた！ ${math}（${F} N まで）。はなす` };
  }

  function drawDistanceJob(g, { q1, q2, F }, r, look) {
    drawPair(g, { q1, q2, r });
    forceMeter(g, look, { max: F * 1.6, mark: F });
    Svg.note(g, 300, 30, `力計 ${F} N まで`, { cls: 'value q-mech', anchor: 'middle' });
    Svg.note(g, 180, NOTE_Y, 'k = 9 × 10⁹。力計は決まった力をこえるとばねが切れる', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[300, 64]], fuse: [300, 64] };
  }

  function runChargeJob({ q1, r, F }, q2) {
    const now = Coulomb.force(q1, q2, r);
    const base = { meter: now, lamps: [] };
    const math = `9×10⁹ × ${q1}×10⁻⁶ × ${q2}×10⁻⁶ ÷ ${r}² = ${num(now)} N`;
    if (near(now, F)) return { ...base, ok: true, burst: null, reading: `${num(now)} N`, reason: `ちょうど！ ${math}` };
    if (now < F) return { ...base, ok: false, burst: null, reading: `${num(now)} N`, reason: `弱い。${math}。Q₂ を大きく` };
    return { ...base, ok: false, burst: { fuse: true }, reading: `${num(now)} N`, reason: `ばねが切れた！ ${math}（${F} N まで）。Q₂ を小さく` };
  }

  function drawChargeJob(g, { q1, r, F }, q2, look) {
    drawPair(g, { q1, q2, r });
    forceMeter(g, look, { max: F * 1.6, mark: F });
    Svg.note(g, 300, 30, `力計 ${F} N まで`, { cls: 'value q-mech', anchor: 'middle' });
    Svg.note(g, 180, NOTE_Y, 'k = 9 × 10⁹。力計は決まった力をこえるとばねが切れる', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[300, 64]], fuse: [300, 64] };
  }

  // 3つの帯電球に、+1 μC の試験電荷を決まった距離で近づけて力を測り、電荷が決まった値のものを当てる
  const BALLS = { xs: [70, 180, 290], y: 90, names: ['A', 'B', 'C'] };

  function runBallProbe({ balls, target }, i) {
    const { q, r } = balls[i];
    const F = Coulomb.force(q, 1, r);
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    const math = `${BALLS.names[i]} は ${num(F)} N × ${r}² ÷ (9×10⁹ × 1×10⁻⁶) = ${num(q)} μC`;
    if (near(q, target)) return { ...base, ok: true, reason: `当たり！ ${math}` };
    return { ...base, ok: false, reason: `${math}。力の大きさだけでなく距離の2乗も効く` };
  }

  function drawBallProbe(g, { balls }, selected, look) {
    const { xs, y, names } = BALLS;
    xs.forEach((x, i) => {
      Svg.el(g, 'circle', { cx: x, cy: y, r: 16, class: 'rotor q-mech' });
      Svg.note(g, x, y - 28, `球 ${names[i]}`, { cls: 'value', anchor: 'middle' });
      Svg.note(g, x, y + 30, `距離 ${balls[i].r} m`, { cls: 'value', anchor: 'middle' });
      if (!look.deciding) Svg.note(g, x, y + 48, `${num(balls[i].q)} μC`, { cls: 'value q-mech', anchor: 'middle' });
    });
    const meter = [150, 206];
    Svg.gauge(g, ...meter, { value: look.probe ? look.probe.needle : 0, max: 1, letter: 'N', cls: 'q-mech' });
    Svg.note(g, meter[0] + 32, meter[1] + 4, look.probe ? look.probe.reading : '力計（+1 μC の試験電荷）', { cls: look.probe ? 'value q-mech' : 'faint' });
    if (look.probe) Svg.leads(g, meter, [[xs[look.probe.index] - 6, y + 16], [xs[look.probe.index] + 6, y + 16]]);
    if (look.deciding) {
      xs.forEach((x, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: y, r: 34, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, 'タップすると、書かれた距離に +1 μC を置いて反発の力を測る', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, y]) };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  const scene = (g, look, lines, meter) => {
    lines.forEach((text, i) => Svg.note(g, 30, 60 + i * 22, text, { cls: 'value' }));
    PlayKit.meter(g, 290, 130, look, meter);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  };

  const basics = [
    {
      title: '電荷と力',
      kind: 'dial',
      cases: [[0.1, 2, 1], [0.1, 2, 3], [0.2, 3, 1], [0.1, 5, 1], [0.3, 1, 3], [0.05, 4, 2], [0.1, 1, 4], [0.2, 2, 2]].map(([F0, a, b]) => ({ F0, a, b })),
      dial: { name: '予想', symbol: 'F', unit: 'N', min: 0, max: 1, step: 0.05 },
      know: '2つの電荷の力は、電荷の積 <var>Q</var><sub>1</sub><var>Q</var><sub>2</sub> に比例する。片方を2倍なら2倍、両方2倍なら4倍',
      request: ({ a, b }) => `Q₁ を ${a} 倍、Q₂ を ${b} 倍にした。力は？`,
      answer: ({ F0, a, b }) => F0 * a * b,
      run: ({ F0, a, b }, guess) => ({ ...predicted(guess, F0 * a * b, 'N', `${F0} × ${a} × ${b} = ${num(F0 * a * b)} N`), meter: F0 * a * b, lamps: [], burst: null, reading: `${num(F0 * a * b)} N` }),
      draw: (g, { F0 }, guess, look) => scene(g, look, [`はじめの力 ${F0} N`], { max: 1, letter: 'N', cls: 'q-mech', ghost: guess }),
    },
    {
      title: '距離と力',
      kind: 'dial',
      cases: [[0.4, 2], [0.9, 3], [0.1, 0.5], [0.8, 2], [0.2, 0.5], [0.6, 2], [0.45, 3], [1, 2]].map(([F0, k]) => ({ F0, k })),
      dial: { name: '予想', symbol: 'F', unit: 'N', min: 0, max: 1, step: 0.05 },
      know: '力は距離の2乗に反比例する（逆2乗）。距離2倍で 1/4、3倍で 1/9、半分なら4倍',
      request: ({ k }) => `距離を ${num(k)} 倍にした。力は？`,
      answer: ({ F0, k }) => F0 / (k * k),
      run: ({ F0, k }, guess) => ({ ...predicted(guess, F0 / (k * k), 'N', `${F0} ÷ ${num(k)}² = ${num(F0 / (k * k))} N`), meter: F0 / (k * k), lamps: [], burst: null, reading: `${num(F0 / (k * k))} N` }),
      draw: (g, { F0 }, guess, look) => scene(g, look, [`はじめの力 ${F0} N`], { max: 1, letter: 'N', cls: 'q-mech', ghost: guess }),
    },
    {
      title: 'クーロンの法則',
      kind: 'dial',
      cases: [[1, 1, 0.3], [1, 2, 0.3], [2, 2, 0.6], [1, 1, 0.1], [3, 3, 0.9], [1, 4, 0.3], [2, 5, 0.3], [1, 5, 0.3]].map(([q1, q2, r]) => ({ q1, q2, r })),
      dial: { name: '予想', symbol: 'F', unit: 'N', min: 0, max: 1, step: 0.05 },
      know: '<var>F</var> = <var>k</var><var>Q</var><sub>1</sub><var>Q</var><sub>2</sub> ÷ <var>r</var>²、<var>k</var> = 9 × 10⁹。μC どうしなら 9 × 10⁹ × 10⁻¹² = 9 × 10⁻³ をかけて <var>r</var>² で割る',
      request: () => '2つの電荷の力は？',
      answer: ({ q1, q2, r }) => Coulomb.force(q1, q2, r),
      run: ({ q1, q2, r }, guess) => {
        const F = Coulomb.force(q1, q2, r);
        return { ...predicted(guess, F, 'N', `9×10⁻³ × ${q1} × ${q2} ÷ ${r}² = ${num(F)} N`), meter: F, lamps: [], burst: null, reading: `${num(F)} N` };
      },
      draw: (g, { q1, q2, r }, guess, look) => {
        drawPair(g, { q1, q2, r, x1: 60 });
        PlayKit.meter(g, 300, 64, look, { max: 1, letter: 'N', cls: 'q-mech', ghost: guess, readingY: 104 });
        Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
        return { lamps: [] };
      },
    },
    {
      title: '点電荷の電界',
      kind: 'dial',
      cases: [[1, 0.3], [2, 0.3], [1, 0.6], [4, 0.6], [3, 0.3], [1, 0.2], [5, 0.5], [2, 0.6]].map(([q, r]) => ({ q, r })),
      dial: { name: '予想', symbol: 'E', unit: 'kV/m', min: 0, max: 300, step: 5 },
      know: '電荷 <var>Q</var> から距離 <var>r</var> の電界は <var>E</var> = <var>kQ</var> ÷ <var>r</var>²（+1 C が受ける力）。μC なら 9 × 10³ × <var>Q</var> ÷ <var>r</var>² [V/m]',
      request: () => 'その場所の電界は？',
      answer: ({ q, r }) => Coulomb.field(q, r) / 1000,
      run: ({ q, r }, guess) => {
        const E = Coulomb.field(q, r) / 1000;
        return { ...predicted(guess, E, 'kV/m', `9×10³ × ${q} ÷ ${r}² = ${num(E * 1000)} V/m = ${num(E)} kV/m`), meter: E, lamps: [], burst: null, reading: `${num(E)} kV/m` };
      },
      draw: (g, { q, r }, guess, look) => scene(g, look, [`電荷 ${q} μC`, `距離 ${r} m の所`], { max: 300, letter: 'kV/m', cls: 'q-voltage', ghost: guess }),
    },
    {
      title: '反発と引き合い',
      kind: 'dial',
      cases: [[1, 1], [1, -1], [-2, -1], [2, -3], [-1, 1], [-1, -4], [-5, 1], [3, 2]].map(([q1, q2]) => ({ q1, q2, r: 0.3 })),
      dial: { name: '予想', symbol: 'F', unit: 'N', min: -1, max: 1, step: 0.05 },
      know: '同じ符号は反発、ちがう符号は引き合う。ここでは反発を ＋、引き合いを − で表す（<var>Q</var><sub>1</sub><var>Q</var><sub>2</sub> の符号と同じ）',
      request: () => '力は？（反発 ＋・引き合い −）',
      answer: ({ q1, q2, r }) => Coulomb.force(q1, q2, r),
      run: ({ q1, q2, r }, guess) => {
        const F = Coulomb.force(q1, q2, r);
        return { ...predicted(guess, F, 'N', `${F > 0 ? '同符号で反発' : '異符号で引き合う'}、大きさ 9×10⁻³ × ${Math.abs(q1 * q2)} ÷ 0.3² = ${num(Math.abs(F))} N`), meter: F, lamps: [], burst: null, reading: `${num(F)} N` };
      },
      draw: (g, { q1, q2, r }, guess, look) => {
        drawPair(g, { q1, q2, r, x1: 60 });
        PlayKit.meter(g, 300, 64, look, { min: -1, max: 1, letter: 'N', cls: 'q-mech', mark: 0, ghost: guess, readingY: 104 });
        Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（真ん中が 0、右が反発）', { cls: 'faint', anchor: 'middle' });
        return { lamps: [] };
      },
    },
    {
      title: '電界の中の力',
      kind: 'dial',
      cases: [[2, 100], [5, 100], [1, 300], [4, 200], [3, 50], [10, 60], [2, 250], [5, 20]].map(([q, E]) => ({ q, E })),
      dial: { name: '予想', symbol: 'F', unit: 'N', min: 0, max: 1, step: 0.05 },
      know: '電界 <var>E</var> の中に電荷 <var>Q</var> を置くと、力 <var>F</var> = <var>QE</var>。μC × kV/m なら 10⁻⁶ × 10³ = 10⁻³ をかける',
      request: () => '電荷が受ける力は？',
      answer: ({ q, E }) => q * E * 1e-3,
      run: ({ q, E }, guess) => ({ ...predicted(guess, q * E * 1e-3, 'N', `${q}×10⁻⁶ × ${E}×10³ = ${num(q * E * 1e-3)} N`), meter: q * E * 1e-3, lamps: [], burst: null, reading: `${num(q * E * 1e-3)} N` }),
      draw: (g, { q, E }, guess, look) => scene(g, look, [`電界 ${E} kV/m の中に`, `電荷 ${q} μC`], { max: 1, letter: 'N', cls: 'q-mech', ghost: guess }),
    },
  ];

  const jobs = [
    {
      kind: 'dial',
      needs: 2, // 失敗したら準備の③（クーロンの法則）から
      cases: [[1, 1, 0.1], [1, 4, 0.1], [4, 4, 0.4], [1, 1, 0.9], [2, 2, 0.4], [1, 2, 0.2], [3, 3, 0.9], [5, 5, 0.9], [2, 2, 0.1]].map(([q1, q2, F]) => ({ q1, q2, F })),
      dial: { name: '距離', symbol: 'r', unit: 'm', min: 0.1, max: 0.8, step: 0.1 },
      request: ({ F }) => `2つの電荷の力をちょうど ${F} N にしたい。距離 <var>r</var> は？`,
      answer: ({ q1, q2, F }) => Math.sqrt((9e-3 * q1 * q2) / F),
      run: runDistanceJob,
      draw: drawDistanceJob,
    },
    {
      kind: 'dial',
      needs: 2, // 失敗したら準備の③（クーロンの法則）から
      cases: [[1, 0.3, 0.3], [2, 0.3, 0.4], [1, 0.6, 0.1], [5, 0.3, 0.5], [1, 0.3, 0.5], [3, 0.6, 0.075], [2, 0.6, 0.25], [4, 0.3, 0.8]].map(([q1, r, F]) => ({ q1, r, F })),
      dial: { name: '電荷', symbol: 'Q_2', unit: 'μC', min: 1, max: 5, step: 1 },
      request: ({ F }) => `力をちょうど ${F} N にしたい。<var>Q</var><sub>2</sub> は？`,
      answer: ({ q1, r, F }) => (F * r * r) / (9e-3 * q1),
      run: runChargeJob,
      draw: drawChargeJob,
    },
    {
      kind: 'probe',
      needs: 1, // 失敗したら準備の②（距離と力）から
      cases: [
        [[[2, 0.3], [4, 0.6], [1, 0.3]], 2], [[[2, 0.3], [4, 0.6], [1, 0.3]], 4], [[[3, 0.3], [5, 0.5], [1, 0.1]], 1],
        [[[3, 0.3], [5, 0.5], [1, 0.1]], 5], [[[4, 0.3], [2, 0.2], [5, 0.6]], 2], [[[4, 0.3], [2, 0.2], [5, 0.6]], 5],
      ].map(([balls, target]) => ({ balls: balls.map(([q, r]) => ({ q, r })), target })),
      probe: {
        parts: BALLS.xs.length,
        hint: '球をタップすると、書かれた距離に +1 μC を置いて力を測る',
        measure: ({ balls }, i) => Coulomb.force(balls[i].q, 1, balls[i].r),
        reading: (F) => `${num(F)} N`,
      },
      action: 'これに決める',
      request: ({ target }) => `電荷が ${target} μC の球はどれ？`,
      answer: ({ balls, target }) => balls.findIndex(({ q }) => near(q, target)),
      run: runBallProbe,
      draw: drawBallProbe,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays.coulomb = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
