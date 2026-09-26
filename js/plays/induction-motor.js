// 機械1「誘導電動機のトルクとすべり」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は同期速度（120f/p）から始め、すべり、二次入力の分かれ方（s が熱）、トルク（P₂ ÷ ω_s）、比例推移、最大トルクで起動へ進む。
// 現場はインバータで回すコンベヤ、巻線形のクレーン（二次に外部抵抗）、回転計で測る3台のモーター。
// トルクの曲線は一次側の抵抗と励磁回路を省いた式（js/calc/induction-motor.js の torqueRatio）で描く。すべりは周波数を変えても同じとする。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const rpm = (value) => `${Notation.number(value, 0)} min⁻¹`;
  const NOTE_Y = 262;
  const syncSpeed = InductionMotor.synchronousSpeed;
  const slipOf = (Ns, N) => (Ns - N) / Ns;

  // 誘導電動機（外枠と、橙の回転子）。turn は回転子の向き（ラジアン）、heat は回転子の熱（光のにじみ）
  function drawMotor(g, x, y, { turn = 0, heat = 0 } = {}) {
    if (heat > 0) Svg.el(g, 'circle', { cx: x, cy: y, r: 16 + 20 * Math.min(heat, 1.2), fill: 'url(#lamp-glow)', opacity: Math.min(1, 0.3 + 0.7 * heat) });
    Svg.el(g, 'circle', { cx: x, cy: y, r: 30, class: 'motor' });
    Svg.el(g, 'circle', { cx: x, cy: y, r: 17, class: 'rotor q-mech' });
    const [dx, dy] = [14 * Math.cos(turn), 14 * Math.sin(turn)];
    Svg.el(g, 'line', { x1: x - dx, y1: y - dy, x2: x + dx, y2: y + dy, class: 'rotor-bar q-mech' });
  }

  // 回転磁界の向き（外枠のまわりの矢印）
  function drawField(g, x, y) {
    Svg.angleArc(g, x, y, 38, 0.3, 1.5, { cls: 'arc-angle' });
    const end = 1.5;
    const [ex, ey] = [x + 38 * Math.cos(end), y - 38 * Math.sin(end)];
    Svg.arrow(g, ex + 7, ey + 1, ex - 1, ey - 1, { cls: 'ink', width: 1.5 });
  }

  // 電源から電動機までの線（三相を1本で描く）とスイッチ
  function drawSupply(g, x, y, look, text) {
    Svg.acSource(g, 30, y);
    Svg.wire(g, [[43, y], [x - 30, y]]);
    Svg.knifeSwitch(g, 70, y, { on: look.switchOn });
    Svg.note(g, 16, y + 26, text, { cls: 'value q-voltage' });
  }

  // 回転子の向き：針が振れる間だけ回る（止まっている間は 0）
  const turnOf = (look, max) => (look.meter / max) * Math.PI * 3;

  // ---- トルク曲線（比例推移の準備） ----

  const PLOT = { left: 34, right: 226, top: 44, bottom: 190 };
  const plotX = (s) => PLOT.left + (1 - s) * (PLOT.right - PLOT.left); // 左が s = 1（起動）、右が s = 0（同期速度）
  const plotY = (ratio) => PLOT.bottom - ratio * (PLOT.bottom - PLOT.top) * 0.85;

  function drawPlotAxes(g) {
    const { left, right, top, bottom } = PLOT;
    Svg.guide(g, left, bottom, right, bottom, 'axis');
    Svg.guide(g, left, top, left, bottom, 'axis');
    Svg.note(g, left, bottom + 14, 's = 1', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, right, bottom + 14, '0', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, (left + right) / 2, bottom + 28, 'すべり s（左が起動）', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, left + 4, top - 10, 'トルク', { cls: 'faint' });
  }

  function drawTorqueCurve(g, sm, cls) {
    const points = [];
    for (let i = 0; i <= 120; i++) {
      const s = 1 - (0.995 * i) / 120;
      points.push([plotX(s), plotY(InductionMotor.torqueRatio(s, sm))]);
    }
    Svg.polyline(g, points, cls);
  }

  const PLOT_METER = [296, 118];

  // ---- ミッション（現場の依頼） ----

  // インバータの周波数を決めて、コンベヤをちょうどの回転速度で回す（N = 120f/p × (1 − s)）
  const conveyorSpeed = ({ p, s }, f) => syncSpeed(f, p) * (1 - s);

  function runConveyorJob(values, f) {
    const N = conveyorSpeed(values, f);
    const base = { meter: N, lamps: [], burst: null, reading: rpm(N) };
    const math = `${f} Hz で <var>N</var><sub>s</sub> = 120 × ${f} ÷ ${values.p} = ${num(syncSpeed(f, values.p))}、× (1 − ${values.s}) = ${num(N)} min⁻¹`;
    if (near(N, values.N)) return { ...base, ok: true, reason: `ぴったり！ ${math}` };
    return { ...base, ok: false, reason: `${N < values.N ? '遅い' : '速すぎ'}。${math}` };
  }

  const CONVEYOR = { motor: [140, 104], belt: { left: 196, right: 336, y: 104 }, meter: [250, 196] };

  function drawConveyorJob(g, values, f, look) {
    const [mx, my] = CONVEYOR.motor;
    const { left, right, y } = CONVEYOR.belt;
    const max = values.N * 1.6;
    Svg.el(g, 'rect', { x: 14, y: my - 18, width: 60, height: 36, rx: 3, class: 'building' });
    Svg.note(g, 44, my - 28, 'インバータ', { cls: 'value', anchor: 'middle' });
    Svg.note(g, 44, my, `${f} Hz`, { cls: 'value q-voltage', anchor: 'middle' });
    Svg.wire(g, [[74, my], [mx - 30, my]]);
    Svg.knifeSwitch(g, 92, my, { on: look.switchOn });
    drawMotor(g, mx, my, { turn: turnOf(look, max) });
    Svg.note(g, mx, my - 44, `${values.p}極・すべり ${values.s}`, { cls: 'value q-mech', anchor: 'middle' });
    // コンベヤ（ベルトと箱）。箱は回転が上がる間だけ進む
    Svg.wire(g, [[mx + 30, my], [left, my]]);
    for (const x of [left, right]) Svg.el(g, 'circle', { cx: x, cy: y, r: 9, class: 'motor' });
    Svg.wire(g, [[left, y - 9], [right, y - 9]]);
    Svg.wire(g, [[left, y + 9], [right, y + 9]]);
    const shift = ((look.meter / max) * 60) % 36;
    for (let x = left + 8 + shift; x < right - 12; x += 36) Svg.el(g, 'rect', { x, y: y - 25, width: 18, height: 16, rx: 2, class: 'building' });
    Svg.note(g, (left + right) / 2, y + 30, `ちょうど ${rpm(values.N)}`, { cls: 'value q-mech', anchor: 'middle' });
    const [gx, gy] = CONVEYOR.meter;
    Svg.note(g, gx - 34, gy, '回転計', { cls: 'faint', anchor: 'end' });
    PlayKit.meter(g, gx, gy, look, { max, letter: 'N', cls: 'q-mech', mark: values.N });
    Svg.note(g, 180, NOTE_Y, 'すべりは周波数を変えても同じとする', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[left + 60, y - 17]] };
  }

  // 巻線形のクレーン：二次に外部抵抗を足して、起動の瞬間（s = 1）に最大トルクを出す。荷は最大トルクぎりぎりの重さ
  const CRANE = { motor: [140, 96], drum: [236, 96], breaker: [84, 96], resistor: [140, 176], meter: [310, 60], tm: 120 };
  const totalResistance = ({ r2 }, R) => r2 + R;
  const startRatio = ({ r2, sm }, R) => InductionMotor.torqueRatio(1, (sm * (r2 + R)) / r2); // 最大トルクのすべりも二次抵抗に比例
  const craneAnswer = ({ r2, sm }) => r2 / sm - r2;

  function runCraneJob(values, R) {
    const T = CRANE.tm * startRatio(values, R);
    const need = num(values.r2 / values.sm);
    const base = { meter: T, lamps: [], reading: `${Math.round(T)} N·m` };
    if (near(R, craneAnswer(values))) {
      return { ...base, ok: true, burst: null, reason: `持ち上がった！ 二次は ${num(values.r2)} + ${num(R)} = ${need} Ω（${values.r2} ÷ ${values.sm}）。最大トルクのすべりが 1 に来た` };
    }
    return { ...base, ok: false, burst: { fuse: true }, reason: `上がらない！ ブレーカーが落ちた。二次は ${num(totalResistance(values, R))} Ω、最大トルクで起動するには ${need} Ω` };
  }

  function drawCraneJob(g, values, R, look) {
    const [mx, my] = CRANE.motor;
    const [dx, dy] = CRANE.drum;
    const [bx, by] = CRANE.breaker;
    const [rx, ry] = CRANE.resistor;
    const lifted = !look.deciding && look.meter > 0 && near(R, craneAnswer(values)) && !look.broken.fuse;
    Svg.acSource(g, 30, my);
    Svg.wire(g, [[43, my], [mx - 30, my]]);
    Svg.breaker(g, bx, by, { tripped: look.broken.fuse });
    Svg.note(g, 16, my + 26, '三相', { cls: 'value q-voltage' });
    drawMotor(g, mx, my, { turn: lifted ? turnOf(look, CRANE.tm) : 0 });
    Svg.note(g, mx, my - 44, `r₂ = ${values.r2} Ω・最大トルクは s = ${values.sm}`, { cls: 'value q-mech', anchor: 'middle' });
    // 二次（回転子）に外から足す抵抗
    Svg.wire(g, [[mx, my + 30], [rx, ry - 20]]);
    Svg.resistor(g, rx, ry, { vertical: true });
    Svg.note(g, rx - 16, ry, `外部抵抗 R = ${num(R)} Ω`, { cls: 'value q-active', anchor: 'end' });
    // 巻き上げ（ドラム・ロープ・荷）。持ち上がると荷が上がる
    Svg.wire(g, [[mx + 30, my], [dx - 16, dy]]);
    Svg.el(g, 'circle', { cx: dx, cy: dy, r: 16, class: 'motor' });
    const rise = lifted ? Math.min(1, look.meter / CRANE.tm) * 36 : 0;
    const loadY = 196 - rise;
    Svg.wire(g, [[dx + 16, dy], [dx + 16, loadY - 14]]);
    Svg.el(g, 'rect', { x: dx - 6, y: loadY - 14, width: 44, height: 28, rx: 2, class: 'black-box closed' });
    Svg.note(g, dx + 16, loadY + 26, `荷 ${CRANE.tm} N·m 分`, { cls: 'value q-mech', anchor: 'middle' });
    const [gx, gy] = CRANE.meter;
    Svg.note(g, gx, gy - 34, '起動トルク', { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, gx, gy, look, { max: CRANE.tm * 1.25, letter: 'T', cls: 'q-mech', mark: CRANE.tm });
    Svg.note(g, 180, NOTE_Y, '荷は最大トルクぎりぎりの重さ。止まったままだと電流が大きい', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[dx + 16, loadY]], fuse: [bx, by] };
  }

  // 3台のモーター（極数がちがう）。回転計で回転速度を測り、すべりが決まった値のモーターを当てる
  const LINE_UP = { xs: [70, 180, 290], y: 104, meter: [180, 214] };

  function runSlipProbe({ f, motors, target }, i) {
    const { p, N } = motors[i];
    const Ns = syncSpeed(f, p);
    const math = `${i + 1}番は (${Notation.number(Ns, 0)} − ${Notation.number(N, 0)}) ÷ ${Notation.number(Ns, 0)} = ${num(slipOf(Ns, N))}`;
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    if (near(slipOf(Ns, N), target)) return { ...base, ok: true, reason: `当たり！ ${math}（同期速度 = 120 × ${f} ÷ ${p}）` };
    return { ...base, ok: false, reason: `${math}。同期速度 120<var>f</var> ÷ <var>p</var> との差の割合がすべり` };
  }

  function drawSlipProbe(g, { f, motors }, selected, look) {
    const { xs, y } = LINE_UP;
    Svg.wire(g, [[xs[0], y - 52], [xs[2], y - 52]]);
    Svg.note(g, 16, y - 66, `三相 ${f} Hz`, { cls: 'value q-voltage' });
    xs.forEach((x, i) => {
      Svg.wire(g, [[x, y - 52], [x, y - 30]]);
      drawMotor(g, x, y);
      Svg.note(g, x, y + 44, `${i + 1}番・${motors[i].p}極`, { cls: 'value', anchor: 'middle' });
      if (!look.deciding) {
        const Ns = syncSpeed(f, motors[i].p);
        Svg.note(g, x, y + 62, `s = ${num(slipOf(Ns, motors[i].N))}`, { cls: 'value q-mech', anchor: 'middle' });
      }
    });
    const [gx, gy] = LINE_UP.meter;
    Svg.gauge(g, gx, gy, { value: look.probe ? look.probe.needle : 0, max: 3600, letter: 'N', cls: 'q-mech' });
    Svg.note(g, gx + 32, gy + 4, look.probe ? look.probe.reading : '回転計', { cls: look.probe ? 'value q-mech' : 'faint' });
    if (look.probe) Svg.leads(g, [gx, gy], [[xs[look.probe.index] - 4, y + 18], [xs[look.probe.index] + 4, y + 18]]);
    if (look.deciding) {
      xs.forEach((x, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: y, r: 38, class: 'job-tap-ring' });
      });
    }
    return { lamps: xs.map((x) => [x, y]) };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  const MOTOR_AT = [150, 120];
  const SIDE_METER = [290, 120];

  // ① 同期速度：回転磁界の速さ Ns = 120f/p
  function runSyncBasic({ f, p }, guess) {
    const Ns = syncSpeed(f, p);
    return { ...predicted(guess, Ns, 'min⁻¹', `120 × ${f} ÷ ${p} = ${num(Ns)} min⁻¹`), meter: Ns, lamps: [], burst: null, reading: rpm(Ns) };
  }

  function drawSyncBasic(g, { f, p }, guess, look) {
    const [mx, my] = MOTOR_AT;
    drawSupply(g, mx, my, look, `三相 ${f} Hz`);
    drawMotor(g, mx, my);
    drawField(g, mx, my);
    Svg.note(g, mx, my + 50, `${p}極`, { cls: 'value q-mech', anchor: 'middle' });
    const [gx, gy] = SIDE_METER;
    Svg.note(g, gx, gy - 34, '回転磁界の速さ', { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, gx, gy, look, { max: 3600, letter: 'N', cls: 'q-mech', ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ② すべり：回転子は回転磁界より少し遅い。s = (Ns − N) ÷ Ns
  function runSlipBasic({ f, p, N }, guess) {
    const Ns = syncSpeed(f, p);
    const s = slipOf(Ns, N);
    const why = `同期速度 ${Notation.number(Ns, 0)}、(${Notation.number(Ns, 0)} − ${Notation.number(N, 0)}) ÷ ${Notation.number(Ns, 0)} = ${num(s)}`;
    return { ...predicted(guess, s, '', why), meter: s, lamps: [], burst: null, reading: `s = ${num(s)}` };
  }

  function drawSlipBasic(g, { f, p, N }, guess, look) {
    const [mx, my] = MOTOR_AT;
    drawSupply(g, mx, my, look, `三相 ${f} Hz`);
    drawMotor(g, mx, my, { turn: look.switchOn * 2 });
    drawField(g, mx, my);
    Svg.note(g, mx, my + 50, `${p}極・回転計 ${rpm(N)}`, { cls: 'value q-mech', anchor: 'middle' });
    const [gx, gy] = SIDE_METER;
    Svg.note(g, gx, gy - 34, 'すべり s', { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, gx, gy, look, { max: 0.1, letter: 's', cls: 'q-mech', ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ③ 二次入力の分かれ方：s の割合が回転子の熱（二次銅損）
  function runLossBasic({ P2, s }, guess) {
    const loss = P2 * s;
    const why = `${P2} kW × ${s} = ${num(loss)} kW が熱、残り ${num(P2 - loss)} kW が回す力`;
    return { ...predicted(guess, loss, 'kW', why), meter: loss, lamps: [], burst: null, reading: `${num(loss)} kW` };
  }

  function drawLossBasic(g, { P2, s }, guess, look) {
    const [mx, my] = MOTOR_AT;
    const loss = P2 * s;
    drawSupply(g, mx, my, look, '三相');
    drawMotor(g, mx, my, { heat: look.reading ? loss / 1.2 : 0 });
    Svg.note(g, mx, my - 44, `二次入力 ${P2} kW・すべり ${s}`, { cls: 'value q-active', anchor: 'middle' });
    if (look.reading) {
      Svg.splitBar(g, 60, my + 46, 180, 16, [
        { value: P2 - loss, label: `出力 ${num(P2 - loss)} kW`, cls: 'q-active' },
        { value: loss, cls: 'alt' },
      ]);
    }
    const [gx, gy] = SIDE_METER;
    Svg.note(g, gx, gy - 34, '回転子の熱', { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, gx, gy, look, { max: 2, letter: 'kW', cls: 'q-active', ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ④ トルク：T = P₂ ÷ ω_s（ω_s = 2πNs ÷ 60）。目盛りは 5 N·m おきで、いちばん近い目盛りが当たり
  const TORQUE_STEP = 5;
  const torqueOf = ({ P2, Ns }) => (P2 * 1000) / ((2 * Math.PI * Ns) / 60);

  function runTorqueBasic(values, guess) {
    const T = torqueOf(values);
    const omega = (2 * Math.PI * values.Ns) / 60;
    const why = `<var>ω</var><sub>s</sub> = 2π × ${Notation.number(values.Ns, 0)} ÷ 60 ≒ ${num(omega)}、${Notation.number(values.P2 * 1000, 0)} ÷ ${num(omega)} ≒ ${Math.round(T)} N·m`;
    return { ...PlayKit.predictedNearest(guess, T, TORQUE_STEP, 'N·m', why), meter: T, lamps: [], burst: null, reading: `約 ${Math.round(T)} N·m` };
  }

  function drawTorqueBasic(g, { P2, Ns }, guess, look) {
    const [mx, my] = MOTOR_AT;
    drawSupply(g, mx, my, look, '三相');
    drawMotor(g, mx, my, { turn: look.switchOn * 2 });
    Svg.note(g, mx, my - 44, `二次入力 ${P2} kW`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, mx, my + 50, `同期速度 ${rpm(Ns)}`, { cls: 'value q-mech', anchor: 'middle' });
    const [gx, gy] = SIDE_METER;
    Svg.note(g, gx, gy - 34, 'トルク T', { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, gx, gy, look, { max: 200, letter: 'T', cls: 'q-mech', ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ⑤ 比例推移：二次抵抗を k 倍にすると、同じトルクのすべりも k 倍
  const BASE_SM = 0.2; // 元の曲線の、最大トルクのすべり

  function runShiftBasic({ s, k }, guess) {
    const moved = Number((s * k).toFixed(6));
    const why = `${s} × ${k} = ${num(moved)}。<var>r</var><sub>2</sub> ÷ <var>s</var> が同じならトルクも同じ`;
    return { ...predicted(guess, moved, '', why), meter: moved, lamps: [], burst: null, reading: `s = ${num(moved)}` };
  }

  function drawShiftBasic(g, { s, k }, guess, look) {
    drawPlotAxes(g);
    const height = plotY(InductionMotor.torqueRatio(s, BASE_SM));
    drawTorqueCurve(g, BASE_SM, look.reading ? 'reference' : 'q-mech');
    Svg.el(g, 'circle', { cx: plotX(s), cy: height, r: 5, class: 'dot q-mech' });
    Svg.note(g, plotX(s) - 8, height + 16, `s = ${s}`, { cls: 'value q-mech', anchor: 'end' });
    if (look.reading) {
      drawTorqueCurve(g, BASE_SM * k, 'q-mech');
      Svg.guide(g, plotX(s), height, plotX(s * k), height);
      Svg.el(g, 'circle', { cx: plotX(s * k), cy: height, r: 5, class: 'ring q-mech' });
    }
    Svg.note(g, 130, 238, `二次抵抗を ${k}倍にする`, { cls: 'value q-active', anchor: 'middle' });
    const [gx, gy] = PLOT_METER;
    Svg.note(g, gx, gy - 34, '同じトルクのすべり', { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, gx, gy, look, { max: 1, letter: 's', cls: 'q-mech', ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ⑥ 最大トルクで起動：最大トルクのすべり sm を 1 に動かすには、二次抵抗を 1 ÷ sm 倍
  function runStartBasic({ sm }, guess) {
    const k = Number((1 / sm).toFixed(6));
    return { ...predicted(guess, k, '倍', `1 ÷ ${sm} = ${num(k)} 倍。最大トルクのすべり ${sm} × ${num(k)} = 1（起動）`), meter: k, lamps: [], burst: null, reading: `${num(k)} 倍` };
  }

  function drawStartBasic(g, { sm }, guess, look) {
    drawPlotAxes(g);
    drawTorqueCurve(g, sm, look.reading ? 'reference' : 'q-mech');
    Svg.el(g, 'circle', { cx: plotX(sm), cy: plotY(1), r: 5, class: 'ring q-mech' });
    Svg.note(g, plotX(sm), plotY(1) - 12, `最大 s = ${sm}`, { cls: 'value q-mech', anchor: 'middle' });
    if (look.reading) {
      drawTorqueCurve(g, 1, 'q-mech');
      Svg.el(g, 'circle', { cx: plotX(1), cy: plotY(1), r: 5, class: 'dot q-mech' });
    }
    Svg.note(g, 130, 238, '起動（s = 1）で最大トルクを出したい', { cls: 'value q-mech', anchor: 'middle' });
    const [gx, gy] = PLOT_METER;
    Svg.note(g, gx, gy - 34, '二次抵抗を何倍に', { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, gx, gy, look, { max: 20, letter: 'k', cls: 'q-active', ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  const jobs = [
    {
      // N = 120f/p × (1 − s)：インバータの周波数でコンベヤの回転速度を決める
      kind: 'dial',
      needs: 1, // 失敗したら準備の②（すべり）から
      cases: [[4, 0.04, 40], [4, 0.04, 25], [4, 0.04, 35], [4, 0.05, 30], [4, 0.05, 60], [2, 0.03, 40], [2, 0.04, 25], [6, 0.05, 30], [6, 0.05, 60], [6, 0.04, 45], [8, 0.04, 50], [4, 0.03, 20]]
        .map(([p, s, f]) => ({ p, s, N: Number((syncSpeed(f, p) * (1 - s)).toFixed(6)) })),
      dial: { name: 'インバータの周波数', symbol: 'f', unit: 'Hz', min: 10, max: 80, step: 5 },
      request: ({ N }) => `コンベヤをちょうど ${rpm(N)} で回したい。周波数は何 Hz？`,
      answer: ({ p, s, N }) => (N * p) / (120 * (1 - s)),
      run: runConveyorJob,
      draw: drawConveyorJob,
    },
    {
      // 比例推移：二次に外部抵抗を足して、最大トルクのすべりを 1（起動）へ
      kind: 'dial',
      needs: 4, // 失敗したら準備の⑤（比例推移）から
      cases: [[0.1, 0.2], [0.2, 0.25], [0.1, 0.1], [0.2, 0.2], [0.3, 0.25], [0.1, 0.05], [0.5, 0.2], [0.25, 0.2], [0.4, 0.5], [0.3, 0.2], [0.2, 0.1], [0.5, 0.25], [0.1, 0.125]]
        .map(([r2, sm]) => ({ r2, sm })),
      dial: { name: '外部抵抗', symbol: 'R', unit: 'Ω', min: 0, max: 3, step: 0.1 },
      request: () => '重い荷を止まった所から持ち上げたい。二次に足す抵抗 <var>R</var> は？',
      answer: craneAnswer,
      run: runCraneJob,
      draw: drawCraneJob,
    },
    {
      // 同期速度とすべり：3台の回転速度を測って、すべりが決まった値のモーターを当てる
      kind: 'probe',
      needs: 0, // 失敗したら準備の①（同期速度）から
      cases: [
        [50, [[2, 2910], [4, 1425], [6, 960]], [0.04, 0.03, 0.05]],
        [60, [[4, 1728], [6, 1164], [2, 3420]], [0.05, 0.03]],
        [50, [[4, 1455], [8, 720], [6, 950]], [0.05, 0.04]],
        [60, [[8, 873], [4, 1710], [6, 1152]], [0.04, 0.05]],
      ].flatMap(([f, motors, targets]) => targets.map((target) => ({ f, motors: motors.map(([p, N]) => ({ p, N })), target }))),
      probe: {
        parts: LINE_UP.xs.length,
        hint: 'モーターをタップすると、回転計が回転速度を測る',
        measure: ({ motors }, i) => motors[i].N,
        reading: (N) => rpm(N),
      },
      action: 'これに決める',
      request: ({ target }) => `すべりが ${target} のモーターはどれ？ 回転計で測ろう`,
      answer: ({ f, motors, target }) => motors.findIndex(({ p, N }) => near(slipOf(syncSpeed(f, p), N), target)),
      run: runSlipProbe,
      draw: drawSlipProbe,
    },
  ];

  // 準備（前提の知識）：この順に1つずつ。know は「使う知識」で、問いの上にいつも見せる
  const basics = [
    {
      title: '同期速度',
      kind: 'dial',
      cases: [[50, 2], [50, 4], [50, 8], [60, 2], [60, 4], [60, 6], [60, 8], [60, 12], [50, 20], [60, 16]].map(([f, p]) => ({ f, p })),
      dial: { name: '予想', symbol: 'N_s', unit: 'min⁻¹', min: 0, max: 3600, step: 150 },
      know: '三相の電流を固定子に流すと、磁界がぐるぐる回る（回転磁界）。その速さ <var>N</var><sub>s</sub> = 120<var>f</var> ÷ <var>p</var>（min⁻¹ は1分の回転数、<var>p</var> は極数）。極が多いほどゆっくり',
      request: () => '回転磁界の速さは？ 予想の針を置こう',
      answer: ({ f, p }) => syncSpeed(f, p),
      run: runSyncBasic,
      draw: drawSyncBasic,
    },
    {
      title: 'すべり',
      kind: 'dial',
      cases: [[50, 4, 1440], [50, 4, 1425], [60, 6, 1164], [60, 4, 1728], [50, 2, 2940], [50, 8, 720], [60, 4, 1674], [50, 6, 940], [60, 2, 3492], [50, 4, 1395]]
        .map(([f, p, N]) => ({ f, p, N })),
      dial: { name: '予想', symbol: 's', unit: '', min: 0, max: 0.1, step: 0.01 },
      know: '回転子は回転磁界より少し遅れて回る（同じ速さだと電流が生まれず、回す力が出ない）。遅れの割合がすべり <var>s</var> = (<var>N</var><sub>s</sub> − <var>N</var>) ÷ <var>N</var><sub>s</sub>',
      request: () => 'すべり <var>s</var> は？',
      answer: ({ f, p, N }) => slipOf(syncSpeed(f, p), N),
      run: runSlipBasic,
      draw: drawSlipBasic,
    },
    {
      title: '二次入力の分かれ方',
      kind: 'dial',
      cases: [[10, 0.04], [20, 0.05], [15, 0.04], [5, 0.06], [30, 0.03], [8, 0.05], [12, 0.05], [25, 0.04], [40, 0.03], [20, 0.08]].map(([P2, s]) => ({ P2, s })),
      dial: { name: '予想', symbol: 'P_{c2}', unit: 'kW', min: 0, max: 2, step: 0.1 },
      know: '固定子から回転子へ渡る電力（二次入力 <var>P</var><sub>2</sub>）のうち、<var>s</var> の割合が回転子の熱（二次銅損）、残り 1 − <var>s</var> が回す力（出力）。1 : <var>s</var> : (1 − <var>s</var>)',
      request: () => '回転子の熱（二次銅損）は何 kW？',
      answer: ({ P2, s }) => P2 * s,
      run: runLossBasic,
      draw: drawLossBasic,
    },
    {
      title: 'トルク',
      kind: 'dial',
      cases: [[10, 1500], [15, 1500], [10, 1000], [12, 1200], [30, 1500], [18, 1800], [6, 3000], [20, 1000], [25, 1500], [14, 1000]].map(([P2, Ns]) => ({ P2, Ns })),
      dial: { name: '予想', symbol: 'T', unit: 'N·m', min: 0, max: 200, step: TORQUE_STEP },
      know: 'トルク（回す力）<var>T</var> = <var>P</var><sub>2</sub> ÷ <var>ω</var><sub>s</sub>。<var>ω</var><sub>s</sub> = 2π<var>N</var><sub>s</sub> ÷ 60（1秒に回る角度 rad/s）。1,500 min⁻¹ なら約 157',
      request: () => 'トルク <var>T</var> は？ いちばん近い目盛りに置こう',
      answer: (values) => PlayKit.nearestMark(torqueOf(values), TORQUE_STEP),
      run: runTorqueBasic,
      draw: drawTorqueBasic,
    },
    {
      title: '比例推移',
      kind: 'dial',
      cases: [[0.05, 2], [0.05, 3], [0.1, 4], [0.04, 5], [0.03, 5], [0.06, 5], [0.1, 3], [0.15, 4], [0.1, 7], [0.05, 10], [0.1, 10], [0.15, 6]].map(([s, k]) => ({ s, k })),
      dial: { name: '予想', symbol: 's', unit: '', min: 0, max: 1, step: 0.05 },
      know: '巻線形は、回転子（二次）に外から抵抗を足せる。二次抵抗を <var>k</var> 倍にすると、同じトルクが出るすべりも <var>k</var> 倍（比例推移）。最大トルクの大きさは変わらない',
      request: () => '同じトルクが出るすべりは？',
      answer: ({ s, k }) => Number((s * k).toFixed(6)),
      run: runShiftBasic,
      draw: drawShiftBasic,
    },
    {
      title: '最大トルクで起動',
      kind: 'dial',
      cases: [0.2, 0.25, 0.1, 0.125, 0.5, 0.05, 0.0625].map((sm) => ({ sm })),
      dial: { name: '予想', symbol: 'k', unit: '倍', min: 1, max: 20, step: 1 },
      know: '起動の瞬間は <var>s</var> = 1。最大トルクのすべり <var>s</var><sub>m</sub> も二次抵抗に比例するので、二次抵抗を 1 ÷ <var>s</var><sub>m</sub> 倍にすると起動の瞬間に最大トルクが出る',
      request: () => '二次抵抗を何倍にする？',
      answer: ({ sm }) => Number((1 / sm).toFixed(6)),
      run: runStartBasic,
      draw: drawStartBasic,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays['induction-motor'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
