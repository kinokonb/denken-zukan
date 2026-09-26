// 法規1「力率改善とコンデンサ」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は電力の三角形（S = √(P² + Q²)、基礎7）から始め、力率 P ÷ S、Q = P tanθ（基礎8）、コンデンサで打ち消す、
// 必要な容量 P(tanθ₁ − tanθ₂)、電流と線路損失へ進む。現場はモーターの多い工場（遅れ力率）と進相コンデンサ。
// 計算は js/calc/power-factor.js。電力の三角形は結果が出てから描く（決めている間に見えると、形から答えが分かる）。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const NOTE_Y = 262;
  const tanOf = PowerFactor.tanOf;
  const sinOf = (cos) => Math.sqrt(1 - cos * cos);
  // cos から直した tan（割り切れない時は小数2けたの目安を添える）
  const tanText = (cos) => {
    const t = tanOf(cos);
    return near(t, Number(t.toFixed(2))) ? num(t) : `≒ ${num(t)}`;
  };
  const pfText = (P, Q) => `${Notation.number(P / Math.hypot(P, Q), 3)}${Q < -1e-9 ? '（進み）' : ''}`;

  // ---- 工場（モーターと進相コンデンサ）と電力の三角形 ----

  const PLANT = { left: 30, right: 200, top: 70, bottom: 190, mid: 130, motorX: 96, capX: 140, capGap: 13 };

  // 小さいコンデンサ（8台まで並ぶように、極板を短くしたもの）
  function drawSmallCap(g, x, y) {
    const cap = Svg.el(g, 'g', { class: 'capacitor q-reactive' });
    Svg.el(cap, 'rect', { x: x - 3, y: y - 3, width: 6, height: 6, class: 'cut' });
    for (const dy of [-3, 3]) Svg.el(cap, 'line', { x1: x - 6, y1: y + dy, x2: x + 6, y2: y + dy, class: 'plate' });
  }

  // caps はコンデンサの台数（0 なら描かない）
  function drawPlant(g, look, { caps = 0, capLabel = '', motorLabel = '' } = {}) {
    const { left, right, top, bottom, mid, motorX, capX, capGap } = PLANT;
    const capXs = Array.from({ length: caps }, (_, i) => capX + i * capGap);
    const last = Math.max(motorX, ...capXs, right - 60);
    Svg.wire(g, [[left, mid], [left, top], [last, top]]);
    Svg.wire(g, [[left, mid], [left, bottom], [last, bottom]]);
    Svg.acSource(g, left, mid);
    Svg.knifeSwitch(g, 62, top, { on: look.switchOn });
    Svg.wire(g, [[motorX, top], [motorX, bottom]]);
    Svg.el(g, 'circle', { cx: motorX, cy: mid, r: 14, class: 'motor' });
    Svg.el(g, 'text', { x: motorX, y: mid + 1, class: 'motor-letter', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, 'M');
    if (motorLabel) Svg.note(g, motorX, bottom + 18, motorLabel, { cls: 'value', anchor: 'middle' });
    for (const x of capXs) {
      Svg.wire(g, [[x, top], [x, bottom]]);
      drawSmallCap(g, x, mid);
    }
    if (capLabel) Svg.note(g, capX + ((caps || 1) - 1) * capGap / 2, top - 14, capLabel, { cls: 'value q-reactive', anchor: 'middle' });
  }

  // 電力の三角形（右が P、上が遅れの Q、斜めが S）。after は改善後の Q（点線で元の三角形を残す）
  const TRIANGLE = { x: 234, y: 150, w: 96, h: 100 };

  function drawTriangle(g, P, Q, after = null) {
    const { x, y, w, h } = TRIANGLE;
    const top = Math.max(Q, after ?? Q, 0);
    const bottomQ = Math.min(0, after ?? 0);
    const scale = Math.min(w / P, h / Math.max(top - bottomQ, 1e-9));
    const px = x + P * scale;
    const qy = (q) => y - q * scale;
    const endQ = after ?? Q;
    if (after !== null) {
      Svg.arrow(g, x, y, px, qy(Q), { cls: 'faint-ink', width: 1.5, dashed: true });
      Svg.arrow(g, px, y, px, qy(Q), { cls: 'q-reactive', width: 1.5, dashed: true });
    }
    Svg.arrow(g, x, y, px, y, { cls: 'q-active', width: 2.5 });
    Svg.label(g, (x + px) / 2, y + (endQ >= 0 ? 14 : -12), 'P', { cls: 'q-active', size: 14 });
    if (Math.abs(endQ) > 1e-9) {
      Svg.arrow(g, px, y, px, qy(endQ), { cls: 'q-reactive', width: 2.5 });
      Svg.label(g, px + 8, (y + qy(endQ)) / 2, 'Q', { cls: 'q-reactive', anchor: 'start', size: 14 });
    }
    Svg.arrow(g, x, y, px, qy(endQ), { cls: 'ink', width: 2.5 });
    Svg.label(g, (x + px) / 2 - 8, (y + qy(endQ)) / 2 - 8, 'S', { cls: 'ink', anchor: 'end', size: 14 });
  }

  const SIDE_METER = [290, 204];
  // 力率計（0.5〜1 の拡大目盛り）
  const pfMeter = (g, look, { mark = null, ghost = null } = {}) =>
    PlayKit.meter(g, ...SIDE_METER, look, { min: 0.5, max: 1, letter: 'cos', cls: 'ink', mark, ghost, readingY: SIDE_METER[1] + 38 });

  // ---- ミッション（現場の依頼） ----

  // 力率を目標以上にする、いちばん小さいコンデンサ（50 kvar おき）。力率割引で電気代が下がる
  const CAP_STEP = 50;
  const smallestCap = ({ P, cos1, target }) => Math.ceil(PowerFactor.capacitorFor(P, cos1, target) / CAP_STEP - 1e-9) * CAP_STEP;

  function runDiscountJob(values, Qc) {
    const { P, cos1, target } = values;
    const r = PowerFactor.analyze({ P, powerFactor1: cos1, Qc });
    const base = { meter: r.powerFactor2, lamps: [], burst: null, reading: pfText(P, r.Q2) };
    const need = `${P} × (${num(tanOf(cos1))} − ${num(tanOf(target))}) ≒ ${Math.round(PowerFactor.capacitorFor(P, cos1, target))} kvar`;
    if (near(Qc, smallestCap(values))) return { ...base, ok: true, reason: `割引になった！ 力率 ${pfText(P, r.Q2)}。要るのは ${need}` };
    if (r.Q2 < -1e-9) return { ...base, ok: false, reason: `入れすぎて進みになった（力率 ${pfText(P, r.Q2)}）。要るのは ${need}` };
    if (r.powerFactor2 < target - 1e-9) return { ...base, ok: false, reason: `まだ力率 ${pfText(P, r.Q2)}（${target} に届かない）。<var>Q</var><sub>c</sub> を大きく` };
    return { ...base, ok: false, reason: `力率 ${pfText(P, r.Q2)} で足りるが、もっと小さいコンデンサでよい（大きいほど高い）` };
  }

  function drawDiscountJob(g, { P, cos1, target }, Qc, look) {
    drawPlant(g, look, { caps: 1, capLabel: `コンデンサ ${Qc} kvar`, motorLabel: `${P} kW・力率 ${cos1}` });
    Svg.note(g, 16, 30, `力率 ${target} 以上で電気代が割引`, { cls: 'value' });
    if (look.reading) drawTriangle(g, P, P * tanOf(cos1), P * tanOf(cos1) - Qc);
    pfMeter(g, look, { mark: target });
    Svg.note(g, 180, NOTE_Y, `tan：力率 ${cos1} → ${tanText(cos1)}、${target} → ${tanText(target)}`, { cls: 'faint', anchor: 'middle' });
    return { lamps: [[PLANT.capX, PLANT.mid]] };
  }

  // 1台 q kvar のコンデンサを何台まで入れられるか（進みにしない、いちばん多い台数）
  function runBankJob({ P, cos1, q }, n) {
    const Q = P * tanOf(cos1);
    const Q2 = Q - n * q;
    const base = { meter: P / Math.hypot(P, Q2), lamps: [], burst: null, reading: pfText(P, Q2) };
    const math = `<var>Q</var> = ${P} × ${tanText(cos1)} = ${num(Q)} kvar`;
    if (Q2 < -1e-9) return { ...base, ok: false, reason: `入れすぎて進みになった（力率 ${pfText(P, Q2)}）。${math}` };
    if (Q2 - q >= -1e-9) return { ...base, ok: false, reason: `まだ入れられる。残りの <var>Q</var> ${num(Q2)} kvar。${math}` };
    return { ...base, ok: true, reason: `ぴったり！ ${math}、${n}台で ${n * q} kvar、力率 ${pfText(P, Q2)}` };
  }

  function drawBankJob(g, { P, cos1, q }, n, look) {
    drawPlant(g, look, { caps: n, capLabel: `1台 ${q} kvar × ${n}台`, motorLabel: `${P} kW・力率 ${cos1}` });
    if (look.reading) drawTriangle(g, P, P * tanOf(cos1), P * tanOf(cos1) - n * q);
    pfMeter(g, look, { mark: 1 });
    Svg.note(g, 180, NOTE_Y, '入れすぎると進みの力率になり、軽い時に電圧が上がる', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[PLANT.capX, PLANT.mid]] };
  }

  // 3つの設備の電力計（P と S）を読んで、力率が決まった値の設備を当てる
  const LOADS = { xs: [70, 180, 290], y: 100, names: ['A', 'B', 'C'], meter: [180, 212] };

  function runPfProbe({ loads, target }, i) {
    const { P, S } = loads[i];
    const math = `${LOADS.names[i]} は ${P} ÷ ${S} = ${num(P / S)}`;
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    if (near(P / S, target)) return { ...base, ok: true, reason: `当たり！ ${math}（力率 = <var>P</var> ÷ <var>S</var>）` };
    return { ...base, ok: false, reason: `${math}。<var>S</var> の大きさでなく、<var>P</var> ÷ <var>S</var> をくらべる` };
  }

  function drawPfProbe(g, { loads }, selected, look) {
    const { xs, y, names } = LOADS;
    Svg.wire(g, [[xs[0], y - 50], [xs[2], y - 50]]);
    Svg.note(g, 16, y - 64, '工場の中の3つの設備', { cls: 'value' });
    xs.forEach((x, i) => {
      Svg.wire(g, [[x, y - 50], [x, y - 22]]);
      Svg.el(g, 'rect', { x: x - 26, y: y - 22, width: 52, height: 44, rx: 3, class: 'building' });
      Svg.note(g, x, y, names[i], { cls: 'value', anchor: 'middle' });
      if (!look.deciding) Svg.note(g, x, y + 40, `力率 ${num(loads[i].P / loads[i].S)}`, { cls: 'value', anchor: 'middle' });
    });
    const [gx, gy] = LOADS.meter;
    Svg.gauge(g, gx, gy, { value: look.probe ? look.probe.needle : 0, max: 100, letter: 'kVA', cls: 'ink' });
    if (look.probe) {
      Svg.note(g, gx + 32, gy - 8, `P = ${loads[look.probe.index].P} kW`, { cls: 'value q-active' });
      Svg.note(g, gx + 32, gy + 10, look.probe.reading, { cls: 'value' });
    } else {
      Svg.note(g, gx + 32, gy + 4, '電力計', { cls: 'faint' });
    }
    if (look.probe) Svg.leads(g, [gx, gy], [[xs[look.probe.index] - 8, y + 22], [xs[look.probe.index] + 8, y + 22]]);
    if (look.deciding) {
      xs.forEach((x, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: y, r: 36, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, '針は皮相電力 S（kV·A）。読みは有効電力 P と S', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, y]) };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  function drawBasicScene(g, look, { labels, triangle = null, caps = 0, capLabel = '' }) {
    drawPlant(g, look, { caps, capLabel });
    labels.forEach(([text, cls], i) => Svg.note(g, 16, 22 + i * 18, text, { cls: `value ${cls}` }));
    if (look.reading && triangle) drawTriangle(g, ...triangle);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  const sideMeter = (g, look, options) => PlayKit.meter(g, ...SIDE_METER, look, { readingY: SIDE_METER[1] + 38, ...options });

  // ① 皮相電力：S = √(P² + Q²)
  function runApparentBasic({ P, Q }, guess) {
    const S = Math.hypot(P, Q);
    return { ...predicted(guess, S, 'kV·A', `√(${P}² + ${Q}²) = ${num(S)} kV·A（${P} + ${Q} ではない）`), meter: S, lamps: [], burst: null, reading: `${num(S)} kV·A` };
  }

  function drawApparentBasic(g, { P, Q }, guess, look) {
    drawBasicScene(g, look, { labels: [[`有効電力 P = ${P} kW`, 'q-active'], [`無効電力 Q = ${Q} kvar（遅れ）`, 'q-reactive']], triangle: [P, Q] });
    sideMeter(g, look, { max: 1000, letter: 'kVA', cls: 'ink', ghost: guess });
    return { lamps: [] };
  }

  // ② 力率：cosθ = P ÷ S
  function runPfBasic({ P, S }, guess) {
    const pf = P / S;
    return { ...predicted(guess, pf, '', `${P} ÷ ${S} = ${num(pf)}`), meter: pf, lamps: [], burst: null, reading: num(pf) };
  }

  function drawPfBasic(g, { P, S }, guess, look) {
    drawBasicScene(g, look, { labels: [[`有効電力 P = ${P} kW`, 'q-active'], [`皮相電力 S = ${S} kV·A`, '']], triangle: [P, Math.sqrt(S * S - P * P)] });
    pfMeter(g, look, { ghost: guess });
    return { lamps: [] };
  }

  // ③ 無効電力：Q = P tanθ
  function runReactiveBasic({ P, cos }, guess) {
    const Q = P * tanOf(cos);
    const why = `力率 ${cos} → sin ${num(sinOf(cos))}、tan = ${num(sinOf(cos))} ÷ ${cos} = ${tanText(cos)}。${P} × ${tanText(cos)} = ${num(Q)} kvar`;
    return { ...predicted(guess, Q, 'kvar', why), meter: Q, lamps: [], burst: null, reading: `${num(Q)} kvar` };
  }

  function drawReactiveBasic(g, { P, cos }, guess, look) {
    drawBasicScene(g, look, { labels: [[`有効電力 P = ${P} kW`, 'q-active'], [`力率 ${cos}（遅れ）`, '']], triangle: [P, P * tanOf(cos)] });
    sideMeter(g, look, { max: 1000, letter: 'kvar', cls: 'q-reactive', ghost: guess });
    return { lamps: [] };
  }

  // ④ コンデンサで打ち消す：残りの Q − Qc で力率が決まる
  function runCancelBasic({ P, Q, Qc }, guess) {
    const Q2 = Q - Qc;
    const pf = P / Math.hypot(P, Q2);
    const why = `残り ${Q} − ${Qc} = ${Q2} kvar、<var>S</var> = √(${P}² + ${Q2}²) = ${num(Math.hypot(P, Q2))}、${P} ÷ ${num(Math.hypot(P, Q2))} = ${num(pf)}`;
    return { ...predicted(guess, pf, '', why), meter: pf, lamps: [], burst: null, reading: num(pf) };
  }

  function drawCancelBasic(g, { P, Q, Qc }, guess, look) {
    drawBasicScene(g, look, {
      labels: [[`有効電力 P = ${P} kW`, 'q-active'], [`無効電力 Q = ${Q} kvar（遅れ）`, 'q-reactive']],
      triangle: [P, Q, Q - Qc], caps: 1, capLabel: `コンデンサ ${Qc} kvar`,
    });
    pfMeter(g, look, { ghost: guess });
    return { lamps: [] };
  }

  // ⑤ 必要なコンデンサ：Qc = P(tanθ₁ − tanθ₂)
  function runNeedBasic({ P, cos1, cos2 }, guess) {
    const Qc = PowerFactor.capacitorFor(P, cos1, cos2);
    const why = `${P} × (${tanText(cos1)} − ${tanText(cos2)}) = ${num(Qc)} kvar`;
    return { ...predicted(guess, Qc, 'kvar', why), meter: Qc, lamps: [], burst: null, reading: `${num(Qc)} kvar` };
  }

  function drawNeedBasic(g, { P, cos1, cos2 }, guess, look) {
    drawBasicScene(g, look, {
      labels: [[`有効電力 P = ${P} kW`, 'q-active'], [`力率 ${cos1} → ${cos2} にしたい`, '']],
      triangle: [P, P * tanOf(cos1), P * tanOf(cos2)], caps: 1, capLabel: 'コンデンサ ？ kvar',
    });
    sideMeter(g, look, { max: 1000, letter: 'kvar', cls: 'q-reactive', ghost: guess });
    return { lamps: [] };
  }

  // ⑥ 電流と線路損失：P が同じなら電流は 1/力率 に比例、損失は電流の2乗
  function runLossBasic({ loss, cos1, cos2 }, guess) {
    const ratio = cos1 / cos2;
    const after = loss * ratio * ratio;
    const why = `電流は ${cos1} ÷ ${cos2} = ${num(ratio)} 倍、損失は ${num(ratio)}² 倍で ${loss} × ${num(ratio * ratio)} = ${num(after)} kW`;
    return { ...predicted(guess, after, 'kW', why), meter: after, lamps: [], burst: null, reading: `${num(after)} kW` };
  }

  function drawLossBasic(g, { loss, cos1, cos2 }, guess, look) {
    drawBasicScene(g, look, { labels: [[`電線の損失 ${loss} kW（力率 ${cos1}）`, 'q-active'], [`力率を ${cos2} にすると？（P は同じ）`, '']], caps: 1, capLabel: 'コンデンサ' });
    sideMeter(g, look, { max: 50, letter: 'kW', cls: 'q-active', ghost: guess });
    return { lamps: [] };
  }

  const jobs = [
    {
      // Qc = P(tanθ₁ − tanθ₂)：力率割引の条件を満たす、いちばん小さいコンデンサ
      kind: 'dial',
      needs: 4, // 失敗したら準備の⑤（必要なコンデンサ）から
      cases: [[400, 0.6, 0.8], [600, 0.6, 0.8], [400, 0.8, 0.95], [800, 0.8, 0.95], [1000, 0.8, 0.9], [600, 0.7, 0.9], [500, 0.6, 0.9], [1200, 0.8, 0.9], [700, 0.7, 0.95], [200, 0.6, 1], [300, 0.8, 0.95], [900, 0.7, 0.9]]
        .map(([P, cos1, target]) => ({ P, cos1, target })),
      dial: { name: 'コンデンサ', symbol: 'Q_c', unit: 'kvar', min: 0, max: 1000, step: CAP_STEP },
      request: ({ target }) => `力率を ${target} 以上にしたい。いちばん小さいコンデンサは？`,
      answer: smallestCap,
      run: runDiscountJob,
      draw: drawDiscountJob,
    },
    {
      // Q = P tanθ：進みにしないで、コンデンサをいちばん多く入れる
      kind: 'count',
      needs: 2, // 失敗したら準備の③（無効電力）から
      cases: [[400, 0.8, 50], [400, 0.8, 75], [600, 0.8, 100], [300, 0.6, 75], [800, 0.8, 150], [200, 0.6, 50], [500, 0.8, 100], [1000, 0.8, 200], [240, 0.6, 60], [120, 0.8, 20]]
        .map(([P, cos1, q]) => ({ P, cos1, q })),
      count: { min: 1, max: 8, unit: '台' },
      request: () => '進みにしないで、力率をいちばん 1 に近づけたい。コンデンサは何台？',
      answer: ({ P, cos1, q }) => Math.floor((P * tanOf(cos1)) / q + 1e-9),
      run: runBankJob,
      draw: drawBankJob,
    },
    {
      // 力率 = P ÷ S：3つの設備を測って、力率が決まった値のものを当てる
      kind: 'probe',
      needs: 1, // 失敗したら準備の②（力率）から
      cases: [
        [[[40, 50], [30, 50], [45, 50]], [0.8, 0.6]],
        [[[24, 40], [35, 50], [72, 80]], [0.7, 0.9]],
        [[[60, 75], [20, 20], [42, 70]], [0.6, 0.8]],
        [[[18, 20], [48, 80], [56, 70]], [0.8, 0.9]],
        [[[40, 50], [21, 30], [54, 60]], [0.7, 0.8]],
      ].flatMap(([loads, targets]) => targets.map((target) => ({ loads: loads.map(([P, S]) => ({ P, S })), target }))),
      probe: {
        parts: LOADS.xs.length,
        hint: '設備をタップすると、電力計が有効電力 P と皮相電力 S を測る',
        measure: ({ loads }, i) => loads[i].S,
        reading: (S) => `S = ${num(S)} kV·A`,
      },
      action: 'これに決める',
      request: ({ target }) => `力率が ${target} の設備はどれ？ 電力計で測ろう`,
      answer: ({ loads, target }) => loads.findIndex(({ P, S }) => near(P / S, target)),
      run: runPfProbe,
      draw: drawPfProbe,
    },
  ];

  // 準備（前提の知識）：この順に1つずつ。know は「使う知識」で、問いの上にいつも見せる
  const basics = [
    {
      title: '電力の三角形',
      kind: 'dial',
      cases: [[400, 300], [300, 400], [600, 800], [120, 160], [240, 320], [80, 60], [360, 480], [450, 600], [600, 450]].map(([P, Q]) => ({ P, Q })),
      dial: { name: '予想', symbol: 'S', unit: 'kV·A', min: 0, max: 1000, step: 50 },
      know: '有効電力 <var>P</var>（仕事になる、kW）と無効電力 <var>Q</var>（行き来するだけ、kvar）は向きが90°ちがう。見かけの電力（皮相電力）<var>S</var> = √(<var>P</var>² + <var>Q</var>²)（kV·A）。電流は <var>S</var> に比例',
      request: () => '皮相電力 <var>S</var> は？ 予想の針を置こう',
      answer: ({ P, Q }) => Math.hypot(P, Q),
      run: runApparentBasic,
      draw: drawApparentBasic,
    },
    {
      title: '力率',
      kind: 'dial',
      cases: [[400, 500], [450, 500], [350, 500], [425, 500], [600, 800], [190, 200], [300, 500], [650, 1000], [720, 800]].map(([P, S]) => ({ P, S })),
      dial: { name: '予想', symbol: 'cosθ', unit: '', min: 0.5, max: 1, step: 0.05 },
      know: '力率 cos<var>θ</var> = <var>P</var> ÷ <var>S</var>（見かけのうち仕事になる割合）。モーターの多い工場は電流が遅れて、力率 0.8 くらい',
      request: () => '力率は？ 力率計の針を予想しよう',
      answer: ({ P, S }) => P / S,
      run: runPfBasic,
      draw: drawPfBasic,
    },
    {
      title: '無効電力',
      kind: 'dial',
      cases: [[400, 0.8], [300, 0.6], [800, 0.8], [600, 0.6], [200, 0.8], [1000, 0.8], [150, 0.6], [600, 0.8], [750, 0.6]].map(([P, cos]) => ({ P, cos })),
      dial: { name: '予想', symbol: 'Q', unit: 'kvar', min: 0, max: 1000, step: 50 },
      know: '力率 cos<var>θ</var> から sin<var>θ</var> = √(1 − cos²<var>θ</var>)、tan<var>θ</var> = sin ÷ cos（0.8 なら sin 0.6・tan 0.75、基礎8）。<var>Q</var> = <var>P</var> tan<var>θ</var>',
      request: () => '無効電力 <var>Q</var> は？',
      answer: ({ P, cos }) => P * tanOf(cos),
      run: runReactiveBasic,
      draw: drawReactiveBasic,
    },
    {
      title: 'コンデンサで打ち消す',
      kind: 'dial',
      cases: [[400, 300, 300], [400, 500, 200], [600, 1000, 200], [800, 900, 300], [300, 500, 100], [120, 250, 90], [400, 400, 100], [600, 600, 150]].map(([P, Q, Qc]) => ({ P, Q, Qc })),
      dial: { name: '予想', symbol: 'cosθ', unit: '', min: 0.5, max: 1, step: 0.05 },
      know: '進相コンデンサは進みの無効電力 <var>Q</var><sub>c</sub> を出して、負荷の遅れの <var>Q</var> を打ち消す。残りは <var>Q</var> − <var>Q</var><sub>c</sub>。<var>P</var> は変わらない',
      request: () => 'コンデンサを入れた後の力率は？',
      answer: ({ P, Q, Qc }) => P / Math.hypot(P, Q - Qc),
      run: runCancelBasic,
      draw: drawCancelBasic,
    },
    {
      title: '必要なコンデンサ',
      kind: 'dial',
      cases: [[400, 0.8, 1], [600, 0.6, 1], [800, 0.8, 1], [600, 0.8, 1], [1200, 0.6, 0.8], [200, 0.8, 1], [300, 0.6, 1], [1000, 0.8, 1], [600, 0.6, 0.8]].map(([P, cos1, cos2]) => ({ P, cos1, cos2 })),
      dial: { name: '予想', symbol: 'Q_c', unit: 'kvar', min: 0, max: 1000, step: 50 },
      know: '改善前の <var>Q</var><sub>1</sub> = <var>P</var> tan<var>θ</var><sub>1</sub>、改善後の <var>Q</var><sub>2</sub> = <var>P</var> tan<var>θ</var><sub>2</sub>。コンデンサはその差：<var>Q</var><sub>c</sub> = <var>P</var>(tan<var>θ</var><sub>1</sub> − tan<var>θ</var><sub>2</sub>)。力率 1 なら tan<var>θ</var><sub>2</sub> = 0',
      request: () => '要るコンデンサ <var>Q</var><sub>c</sub> は？',
      answer: ({ P, cos1, cos2 }) => PowerFactor.capacitorFor(P, cos1, cos2),
      run: runNeedBasic,
      draw: drawNeedBasic,
    },
    {
      title: '電流と線路損失',
      kind: 'dial',
      cases: [[25, 0.8, 1], [50, 0.6, 1], [16, 0.6, 0.8], [32, 0.6, 0.8], [100, 0.6, 1], [64, 0.6, 0.8], [50, 0.8, 1], [75, 0.8, 1], [48, 0.6, 0.8]].map(([loss, cos1, cos2]) => ({ loss, cos1, cos2 })),
      dial: { name: '予想', symbol: 'P_l', unit: 'kW', min: 0, max: 50, step: 1 },
      know: '同じ電圧・同じ <var>P</var> なら、電流は皮相電力 <var>S</var> = <var>P</var> ÷ cos<var>θ</var> に比例。電線の損失は <var>I</var>²<var>R</var> なので、電流が 0.8 倍なら損失は 0.64 倍',
      request: () => '力率を上げた後の電線の損失は？',
      answer: ({ loss, cos1, cos2 }) => loss * (cos1 / cos2) ** 2,
      run: runLossBasic,
      draw: drawLossBasic,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays['power-factor'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
