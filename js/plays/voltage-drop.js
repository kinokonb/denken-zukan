// 電力1「送電線の電圧降下」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は「電線にも抵抗がある（v = IR）」から始め、往復の2本（単相2線式）、枝分かれした区間の電流、力率（R cosθ + X sinθ、基礎8）、
// 三相3線式の √3 倍、電圧降下率へ進む。現場は低圧の家（100 V を 95〜107 V に保つ決まり）と、6,600 V で受ける工場。
// 計算は js/calc/voltage-drop.js（近似式）。家の電圧計は小さな差が見えるように 80〜120 V の拡大目盛りにし、図の下に書く。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const volts = (value) => `${num(value)} V`;
  const sinOf = (cos) => Math.sqrt(1 - cos * cos);
  const NOTE_Y = 262;
  const LOOP = { left: 40, right: 300, top: 64, bottom: 196, mid: 130 };
  const HOUSE_MIN = 95; // 100 V の家は 101 ± 6 V（95〜107 V）に保つ決まり（電気事業法施行規則）
  const FACTORY_V = 6600; // 工場（受電端）の線間電圧

  // 電球・電熱器の明るさ・熱さ（電力）は電圧の2乗に比例。100 V で 1
  const brightness = (V, rated = 100) => (V / rated) ** 2;

  function drawLoop(g) {
    const { left, right, top, bottom, mid } = LOOP;
    Svg.wire(g, [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]]);
  }

  // 柱上の変圧器（家へ送り出す所）。交流電源の記号で描く
  function drawTransformer(g, text) {
    Svg.acSource(g, LOOP.left, LOOP.mid);
    Svg.note(g, LOOP.left + 20, LOOP.mid + 24, text, { cls: 'value q-voltage' });
  }

  // 家の電圧計（80〜120 V の拡大目盛り）
  const houseMeter = (g, x, y, look, { mark = null, ghost = null } = {}) =>
    PlayKit.meter(g, x, y, look, { min: 80, max: 120, letter: 'V', cls: 'q-voltage', mark, ghost });

  // モーター（丸に M）。電流が電圧より遅れる負荷
  function drawMotor(g, x, y) {
    Svg.el(g, 'circle', { cx: x, cy: y, r: 13, class: 'motor' });
    Svg.el(g, 'text', { x, y: y + 1, class: 'motor-letter', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, 'M');
  }

  // ---- 家が並ぶ配電線（区間の電流・接続の悪い区間） ----

  const FEEDER = { source: 30, xs: [100, 170, 240, 310], top: 84, bottom: 200, mid: 142, V0: 105, R: 0.05 };
  // 区間 k の両端（k 番目の家の手前）
  const spanEnds = (k) => [k === 0 ? FEEDER.source : FEEDER.xs[k - 1], FEEDER.xs[k]];
  const spanMid = (k) => (spanEnds(k)[0] + spanEnds(k)[1]) / 2;

  // 区間の番号。except の区間（電流計を置く所）は、計器をよけて左に書く
  function drawSpanNumbers(g, except = null) {
    FEEDER.xs.forEach((_, k) => {
      const [x, anchor] = k === except ? [spanMid(k) - 28, 'end'] : [spanMid(k), 'middle'];
      Svg.note(g, x, FEEDER.top - 12, `${k + 1}`, { cls: 'value', anchor });
    });
  }

  // levels は家の電球の明るさ
  function drawFeeder(g, loads, levels) {
    const { source, xs, top, bottom, mid, V0 } = FEEDER;
    const last = xs[xs.length - 1];
    Svg.wire(g, [[source, mid], [source, top], [last, top], [last, bottom], [source, bottom], [source, mid]]);
    for (const x of xs.slice(0, -1)) Svg.wire(g, [[x, top], [x, bottom]]);
    Svg.acSource(g, source, mid);
    Svg.note(g, source - 12, bottom + 20, `変圧器 ${V0} V`, { cls: 'value q-voltage' });
    xs.forEach((x, i) => {
      Svg.lamp(g, x, mid, { level: levels[i] || 0 });
      Svg.note(g, x + 14, mid + 4, `${loads[i]} A`, { cls: 'value q-current' });
    });
  }

  // ---- 6,600 V の工場（三相3線式） ----

  const GRID = { wires: [66, 84, 102], from: 62, to: 268, switchX: 88, lamps: [[284, 124], [307, 124], [330, 124]], meter: [150, 200] };

  // width は電線の太さ（太い電線ほど抵抗が小さい）
  function drawGrid(g, look, { width = 1.75, station, factory }) {
    const { wires, from, to, switchX, lamps } = GRID;
    Svg.el(g, 'rect', { x: 14, y: 58, width: 48, height: 52, rx: 2, class: 'building' });
    Svg.note(g, 38, 48, '変電所', { cls: 'value', anchor: 'middle' });
    Svg.el(g, 'path', { d: 'M268,150 V58 L268,44 L294,58 L294,44 L320,58 L320,44 L346,58 V150 Z', class: 'building' });
    Svg.note(g, 307, 32, '工場', { cls: 'value', anchor: 'middle' });
    for (const y of wires) {
      Svg.el(g, 'line', { x1: from, y1: y, x2: to, y2: y, class: 'wire', style: `stroke-width: ${width}px` });
      Svg.knifeSwitch(g, switchX, y, { on: look.switchOn });
    }
    lamps.forEach(([x, y], i) => Svg.lamp(g, x, y, { level: look.lamps[i] || 0 }));
    if (station) Svg.note(g, 10, 128, station, { cls: 'value q-voltage' });
    if (factory) Svg.note(g, 307, 170, factory, { cls: 'value q-voltage', anchor: 'middle' });
    return { lamps };
  }

  // 1線の R・X と、負荷の電流・力率
  function drawLineValues(g, { R, X, I, cos }) {
    Svg.note(g, 140, 124, `R = ${R} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, 214, 124, `X = ${X} Ω`, { cls: 'value q-reactive', anchor: 'middle' });
    Svg.note(g, 177, 142, '（1線あたり）', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, 307, 170, `${I} A・力率 ${cos}`, { cls: 'value q-current', anchor: 'middle' });
  }

  // 電圧降下の計（送電端と受電端の電圧の差）
  function dropMeter(g, look, { max, mark = null, ghost = null, letter = 'V', name = '電圧降下 v' }) {
    const [x, y] = GRID.meter;
    Svg.note(g, x, y - 36, name, { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, x, y, look, { max, letter, cls: 'q-voltage', mark, ghost });
  }

  // ---- ミッション（現場の依頼） ----

  // 奥の家で同じヒーターを何台まで使えるか（1台ふえるごとに 2 × I × R 下がる。95 V を下回らない）
  const BANK = { center: 268, spacing: 19, lineX: 110, meterX: 160, tapX: 190 };

  function runHeatersJob({ V0, each, R }, n) {
    const step = VoltageDrop.singlePhaseDrop({ I: each, R }); // 1台ぶんの降下
    const V = V0 - step * n;
    const base = { meter: V, lamps: Array(n).fill(brightness(V)), burst: null, reading: volts(V) };
    const per = `1台で 2 × ${each} A × ${R} Ω = ${num(step)} V 下がる`;
    if (V < HOUSE_MIN - 1e-9) return { ...base, ok: false, reason: `下がりすぎ！ ${n}台で ${volts(V)}（${HOUSE_MIN} V より下）。${per}` };
    if (V - step >= HOUSE_MIN - 1e-9) return { ...base, ok: false, reason: `まだ使える。${n}台で ${volts(V)}。1台ふえるごとに ${num(step)} V 下がる` };
    return { ...base, ok: true, reason: `ぴったり！ ${per}。${n}台で ${volts(V)}、あと1台で ${volts(V - step)}` };
  }

  function drawHeatersJob(g, { V0, each, R }, n, look) {
    const { left, top, bottom, mid } = LOOP;
    const { center, spacing, lineX, meterX, tapX } = BANK;
    const xs = Array.from({ length: n }, (_, i) => center + (i - (n - 1) / 2) * spacing);
    const last = xs[xs.length - 1];
    Svg.wire(g, [[left, mid], [left, top], [last, top]]);
    Svg.wire(g, [[left, mid], [left, bottom], [last, bottom]]);
    for (const x of xs) Svg.wire(g, [[x, top], [x, bottom]]);
    drawTransformer(g, `変圧器 ${V0} V`);
    Svg.knifeSwitch(g, 70, top, { on: look.switchOn });
    Svg.resistor(g, lineX, top);
    Svg.resistor(g, lineX, bottom);
    Svg.note(g, lineX, top - 18, `1線 R = ${R} Ω`, { cls: 'value q-active', anchor: 'middle' });
    xs.forEach((x, i) => Svg.heater(g, x, mid, { level: look.lamps[i] || 0 }));
    Svg.note(g, center, top - 18, `ヒーター 1台 ${each} A`, { cls: 'value q-current', anchor: 'middle' });
    Svg.note(g, center, bottom + 20, `${n}台`, { cls: 'value', anchor: 'middle' });
    houseMeter(g, meterX, mid, look, { mark: HOUSE_MIN });
    Svg.leads(g, [meterX, mid], [[tapX, top], [tapX, bottom]]);
    Svg.note(g, 180, NOTE_Y, `家は ${HOUSE_MIN}〜107 V に保つ決まり。電圧計は 80〜120 V の目盛り`, { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, mid]) };
  }

  // 家が並ぶ配電線で、接続の悪い（抵抗の大きい）区間を探す。テスターは区間の行きの電線1本の電圧（I × R）を測る
  function feederOf({ loads, bad, badR }, repaired) {
    const { V0, R } = FEEDER;
    const top = loads.map((_, k) => (k === bad && !repaired ? badR : R));
    return VoltageDrop.feeder({ V0, loads, top, bottom: loads.map(() => R) });
  }

  const spanR = ({ bad, badR }, k) => (k === bad ? badR : FEEDER.R);
  const spanDrop = (values, k) => feederOf(values, false).spans[k] * spanR(values, k);

  function runJointJob(values, i) {
    const before = feederOf(values, false);
    const after = feederOf(values, i === values.bad);
    const far = (r) => num(r.voltages[r.voltages.length - 1]);
    const base = { meter: 0, lamps: after.voltages.map((V) => brightness(V)), burst: null, reading: null };
    const measured = `${i + 1}番は ${num(spanDrop(values, i))} V ÷ ${before.spans[i]} A = ${spanR(values, i)} Ω`;
    if (i === values.bad) return { ...base, ok: true, reason: `直った！ ${measured}（ふつうは ${FEEDER.R} Ω）。奥の家は ${far(before)} → ${far(after)} V` };
    return { ...base, ok: false, reason: `まだ暗い。${measured} でふつう。区間の電流は、その先の家の電流の合計` };
  }

  const JOINT_TESTER = [180, 34];

  function drawJointJob(g, values, selected, look) {
    const { xs, top, mid } = FEEDER;
    const repaired = !look.deciding && look.lamps.length > 0;
    const before = feederOf(values, false);
    // 結果が出るまでは直す前の明るさ（奥ほど暗い）
    const levels = look.lamps.length > 0 ? look.lamps : before.voltages.map((V) => brightness(V));
    drawFeeder(g, values.loads, levels);
    drawSpanNumbers(g);
    // 直した後は、区間ごとの本当の抵抗と家の電圧
    if (repaired) {
      const after = feederOf(values, selected === values.bad);
      xs.forEach((x, k) => {
        Svg.note(g, spanMid(k), top + 14, `${spanR(values, k)} Ω`, { cls: k === values.bad ? 'value q-active' : 'faint', anchor: 'middle' });
        Svg.note(g, x, mid + 30, volts(after.voltages[k]), { cls: 'value q-voltage', anchor: 'middle' });
      });
    }
    const [tx, ty] = JOINT_TESTER;
    Svg.gauge(g, tx, ty, { value: look.probe ? look.probe.needle : 0, max: 3, letter: 'V', cls: 'q-voltage' });
    Svg.note(g, tx + 32, ty + 4, look.probe ? look.probe.reading : 'テスター', { cls: look.probe ? 'value q-voltage' : 'faint' });
    if (look.probe) {
      const [a, b] = spanEnds(look.probe.index);
      Svg.leads(g, JOINT_TESTER, [[a + 8, top], [b - 8, top]]);
    }
    // タップできる所（決めている間だけ）。測っている区間は実線の輪
    if (look.deciding) {
      xs.forEach((_, k) => {
        const part = Svg.el(g, 'g', { class: `job-tap${k === selected ? ' selected' : ''}`, 'data-part': String(k) });
        Svg.el(part, 'circle', { cx: spanMid(k), cy: top, r: 20, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, '家の横の数字は、その家で使う電流', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, mid]) };
  }

  // 6,600 V の工場まで、降下率を決まった % 以内にできる、いちばん細い（1線の抵抗の大きい）電線を選ぶ
  const allowedDrop = (limit) => (FACTORY_V * limit) / 100;

  function thinnest({ I, cos, X, limit }) {
    const R = (allowedDrop(limit) / (Math.sqrt(3) * I) - X * sinOf(cos)) / cos;
    return Math.floor(R * 10 + 1e-9) / 10;
  }

  // 電線の太さ（線の幅）。抵抗が小さいほど太い
  const wireWidth = (R) => Math.min(8, 1.2 + 1.6 / R);
  const percent = (value) => Notation.number(value, 2);

  function runWireJob(values, R) {
    const { I, cos, X, limit } = values;
    const rateOf = (r) => (VoltageDrop.threePhaseDrop({ I, R: r, X, cos }) / FACTORY_V) * 100;
    const v = VoltageDrop.threePhaseDrop({ I, R, X, cos });
    const rate = rateOf(R);
    // 変電所は送電端を limit % 増しまでしか上げられない。こえた分だけ工場の電圧が下がる
    const Vr = Math.min(FACTORY_V, FACTORY_V + allowedDrop(limit) - v);
    const base = { meter: v, lamps: GRID.lamps.map(() => brightness(Vr, FACTORY_V)), burst: null, reading: `${Notation.number(v, 0)} V` };
    if (near(R, thinnest(values))) {
      const next = Number((R + 0.1).toFixed(1));
      return { ...base, ok: true, reason: `ちょうど！ 降下率 ${percent(rate)}%（${limit}% 以内）。${next} Ω だと ${percent(rateOf(next))}% でこえる` };
    }
    if (rate > limit) return { ...base, ok: false, reason: `工場の電圧が足りない！ 降下率 ${percent(rate)}% で ${limit}% をこえた。<var>R</var> を小さく（太く）` };
    return { ...base, ok: false, reason: `まだ細い電線で足りる（降下率 ${percent(rate)}%）。太い電線ほど高い。<var>R</var> を大きく` };
  }

  function drawWireJob(g, values, R, look) {
    const { I, cos, X, limit } = values;
    const anchors = drawGrid(g, look, {
      width: wireWidth(R),
      station: `最大 ${Notation.number(FACTORY_V + allowedDrop(limit), 0)} V`,
    });
    drawLineValues(g, { R, X, I, cos });
    Svg.note(g, 307, 188, `${Notation.number(FACTORY_V, 0)} V を保つ`, { cls: 'value q-voltage', anchor: 'middle' });
    const allowed = allowedDrop(limit);
    dropMeter(g, look, { max: allowed * 1.6, mark: allowed });
    Svg.note(g, 180, NOTE_Y, '三相3線式。太い電線ほど R が小さく、値段は高い', { cls: 'faint', anchor: 'middle' });
    return anchors;
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  // ① 電線にも抵抗：電線1本の両端の電圧（I × R）をテスターで測る
  const WIRE_TESTER = [170, 132];

  function runWireBasic({ I, R }, guess) {
    const v = I * R;
    return { ...predicted(guess, v, 'V', `${I} A × ${R} Ω = ${num(v)} V。電線の中でこれだけ下がる`), meter: v, lamps: [1], burst: null, reading: volts(v) };
  }

  function drawWireBasic(g, { I, R }, guess, look) {
    const { right, top, mid } = LOOP;
    const [tx, ty] = WIRE_TESTER;
    drawLoop(g);
    drawTransformer(g, '変圧器');
    Svg.knifeSwitch(g, 76, top, { on: look.switchOn });
    Svg.resistor(g, tx, top);
    Svg.note(g, tx, top - 18, `電線1本 R = ${R} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, 268, top - 18, `${I} A →`, { cls: 'value q-current', anchor: 'middle' });
    Svg.lamp(g, right, mid, { level: look.lamps[0] || 0 });
    Svg.note(g, right - 18, mid, '家', { cls: 'value', anchor: 'end' });
    PlayKit.meter(g, tx, ty, look, { max: 8, letter: 'V', cls: 'q-voltage', ghost: guess });
    Svg.leads(g, WIRE_TESTER, [[tx - 20, top], [tx + 20, top]]);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（テスターは電線1本の両端）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // ② 往復で2本（単相2線式）：家の電圧 = 送り出し − 2IR
  const HOUSE_METER = [224, LOOP.mid];

  function runRoundTripBasic({ V0, I, R }, guess) {
    const drop = VoltageDrop.singlePhaseDrop({ I, R });
    const V = V0 - drop;
    const why = `2 × ${I} × ${R} = ${num(drop)} V 下がり ${volts(V)}（1本分だけなら ${volts(V0 - I * R)}）`;
    return { ...predicted(guess, V, 'V', why), meter: V, lamps: [brightness(V)], burst: null, reading: volts(V) };
  }

  function drawRoundTripBasic(g, { V0, I, R }, guess, look) {
    const { right, top, bottom, mid } = LOOP;
    drawLoop(g);
    drawTransformer(g, `変圧器 ${V0} V`);
    Svg.knifeSwitch(g, 76, top, { on: look.switchOn });
    Svg.resistor(g, 140, top);
    Svg.resistor(g, 140, bottom);
    Svg.note(g, 140, top - 18, `行き R = ${R} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, 140, bottom + 22, `帰り R = ${R} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, 250, top - 18, `${I} A →`, { cls: 'value q-current', anchor: 'middle' });
    Svg.lamp(g, right, mid, { level: look.lamps[0] || 0 });
    houseMeter(g, ...HOUSE_METER, look, { ghost: guess });
    Svg.leads(g, HOUSE_METER, [[right, mid - 13], [right, mid + 13]]);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想。家の電圧計は 80〜120 V の目盛り', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // ③ 区間の電流：その先にある家の電流の合計
  function runSpanBasic({ loads, k }, guess) {
    const I = VoltageDrop.feeder({ V0: FEEDER.V0, loads, top: loads.map(() => 0), bottom: loads.map(() => 0) }).spans[k];
    const beyond = loads.slice(k);
    const why = beyond.length > 1 ? `${k + 1}番の先の家は ${beyond.join(' + ')} = ${I} A` : `${k + 1}番の先は最後の家だけで ${I} A`;
    return { ...predicted(guess, I, 'A', why), meter: I, lamps: loads.map(() => 1), burst: null, reading: `${I} A` };
  }

  function drawSpanBasic(g, { loads, k }, guess, look) {
    const { top } = FEEDER;
    drawFeeder(g, loads, look.lamps);
    drawSpanNumbers(g, k);
    PlayKit.meter(g, spanMid(k), top, look, { max: 60, letter: 'A', cls: 'q-current', ghost: guess, readingY: top - 34 });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想。家の横の数字は、その家で使う電流', { cls: 'faint', anchor: 'middle' });
    return { lamps: FEEDER.xs.map((x) => [x, FEEDER.mid]) };
  }

  // ④ 力率：モーターの家。単相2線は 2I(R cosθ + X sinθ)
  function runPowerFactorBasic({ V0, I, R, X, cos }, guess) {
    const drop = VoltageDrop.singlePhaseDrop({ I, R, X, cos });
    const V = V0 - drop;
    const why = `2 × ${I} × (${R} × ${cos} + ${X} × ${num(sinOf(cos))}) = ${num(drop)} V、${V0} − ${num(drop)} = ${volts(V)}`;
    return { ...predicted(guess, V, 'V', why), meter: V, lamps: [], burst: null, reading: volts(V) };
  }

  function drawPowerFactorBasic(g, { V0, I, R, X, cos }, guess, look) {
    const { right, top, bottom, mid } = LOOP;
    drawLoop(g);
    drawTransformer(g, `変圧器 ${V0} V`);
    Svg.knifeSwitch(g, 76, top, { on: look.switchOn });
    for (const y of [top, bottom]) {
      Svg.resistor(g, 110, y);
      Svg.coil(g, 180, y);
    }
    Svg.note(g, 110, top + 22, `R = ${R} Ω`, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, 180, top + 22, `X = ${X} Ω`, { cls: 'value q-reactive', anchor: 'middle' });
    Svg.note(g, 148, bottom + 22, '帰りの電線も同じ R・X', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, right, 36, `モーター ${I} A・力率 ${cos}（遅れ）`, { cls: 'value q-current', anchor: 'end' });
    drawMotor(g, right, mid);
    houseMeter(g, ...HOUSE_METER, look, { ghost: guess });
    Svg.leads(g, HOUSE_METER, [[right, mid - 16], [right, mid + 16]]);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想。家の電圧計は 80〜120 V の目盛り', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ⑤ 三相3線式：v ≒ √3 I(R cosθ + X sinθ)。目盛りは 20 V おきで、いちばん近い目盛りが当たり
  const THREE_PHASE_STEP = 20;

  function runThreePhaseBasic({ I, R, X, cos }, guess) {
    const v = VoltageDrop.threePhaseDrop({ I, R, X, cos });
    const why = `√3 × ${I} × (${R} × ${cos} + ${X} × ${num(sinOf(cos))}) ≒ ${Math.round(v)} V`;
    return { ...PlayKit.predictedNearest(guess, v, THREE_PHASE_STEP, 'V', why), meter: v, lamps: GRID.lamps.map(() => 1), burst: null, reading: `約 ${Math.round(v)} V` };
  }

  function drawThreePhaseBasic(g, values, guess, look) {
    const anchors = drawGrid(g, look, {});
    drawLineValues(g, values);
    dropMeter(g, look, { max: 600, ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想。三相3線式（電線3本）', { cls: 'faint', anchor: 'middle' });
    return anchors;
  }

  // ⑥ 電圧降下率：(Vs − Vr) ÷ Vr × 100。分母は受電端
  function runRateBasic({ Vs, Vr }, guess) {
    const rate = VoltageDrop.dropRate({ Vs, Vr });
    const wrong = ((Vs - Vr) / Vs) * 100;
    const [s, r] = [Vs, Vr].map((V) => Notation.number(V, 0));
    const why = `(${s} − ${r}) ÷ ${r} × 100 = ${num(rate)}%（${s} で割ると ${num(wrong)}%）`;
    return { ...predicted(guess, rate, '%', why), meter: rate, lamps: GRID.lamps.map(() => 1), burst: null, reading: `${num(rate)}%` };
  }

  function drawRateBasic(g, { Vs, Vr }, guess, look) {
    const anchors = drawGrid(g, look, {
      station: `送電端 ${Notation.number(Vs, 0)} V`,
      factory: `受電端 ${Notation.number(Vr, 0)} V`,
    });
    dropMeter(g, look, { max: 10, ghost: guess, letter: '%', name: '電圧降下率 ε' });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return anchors;
  }

  const jobs = [
    {
      // 単相2線式の 2IR：奥の家を 95 V 以上に保って、同じヒーターを何台まで使えるか
      kind: 'count',
      needs: 1, // 失敗したら準備の②（往復で2本）から
      cases: [[105, 5, 0.2], [105, 10, 0.1], [105, 10, 0.15], [104, 5, 0.15], [106, 8, 0.1], [107, 10, 0.2], [105, 15, 0.1], [103, 4, 0.25], [106, 12, 0.1], [105, 8, 0.25], [104, 6, 0.15], [107, 5, 0.2]]
        .map(([V0, each, R]) => ({ V0, each, R })),
      count: { min: 1, max: 8, unit: '台' },
      request: () => `奥の家を ${HOUSE_MIN} V 以上に保って、ヒーターを何台まで使える？`,
      answer: ({ V0, each, R }) => Math.floor((V0 - HOUSE_MIN) / VoltageDrop.singlePhaseDrop({ I: each, R }) + 1e-9),
      run: runHeatersJob,
      draw: drawHeatersJob,
    },
    {
      // 区間の電流（先の家の合計）と I × R：電圧の大きさだけでなく、電流で割って抵抗をくらべる
      kind: 'probe',
      needs: 2, // 失敗したら準備の③（区間の電流）から
      cases: [
        [[10, 10, 10, 10], 2, 0.1], [[10, 10, 10, 10], 3, 0.2], [[5, 20, 5, 10], 3, 0.2], [[15, 5, 10, 10], 2, 0.1],
        [[10, 20, 10, 5], 2, 0.15], [[5, 15, 15, 5], 3, 0.3], [[10, 5, 20, 5], 3, 0.2], [[5, 20, 10, 5], 3, 0.3],
        [[15, 15, 5, 10], 3, 0.15], [[10, 10, 10, 10], 1, 0.1], [[10, 15, 5, 10], 0, 0.1],
      ].map(([loads, bad, badR]) => ({ loads, bad, badR })),
      probe: {
        parts: FEEDER.xs.length,
        hint: '区間の番号の所をタップすると、テスターがその区間の電線1本の電圧を測る',
        measure: spanDrop,
        reading: (v) => volts(v),
      },
      action: 'ここを直す',
      request: () => '奥の家が暗い。接続の悪い（抵抗の大きい）区間はどれ？',
      answer: ({ bad }) => bad,
      run: runJointJob,
      draw: drawJointJob,
    },
    {
      // 三相3線式の √3 I(R cosθ + X sinθ) と降下率：条件を満たす、いちばん細い電線
      kind: 'dial',
      needs: 3, // 失敗したら準備の④（力率）から
      cases: [[150, 0.8, 1, 5], [100, 1, 2, 3], [250, 0.8, 0.8, 6], [100, 0.8, 1, 5], [80, 0.8, 2, 6], [150, 1, 1.5, 4], [60, 0.8, 2, 3], [120, 0.6, 1, 6], [100, 0.6, 0.5, 4], [200, 1, 1, 3], [80, 0.6, 1, 5], [300, 0.8, 0.5, 6]]
        .map(([I, cos, X, limit]) => ({ I, cos, X, limit })),
      dial: { name: '1線の抵抗', symbol: 'R', unit: 'Ω', min: 0.1, max: 3, step: 0.1 },
      request: ({ limit }) => `降下率 ${limit}% 以内で、いちばん細い（<var>R</var> の大きい）電線にしよう`,
      answer: thinnest,
      run: runWireJob,
      draw: drawWireJob,
    },
  ];

  // 準備（前提の知識）：この順に1つずつ。know は「使う知識」で、問いの上にいつも見せる
  const basics = [
    {
      title: '電線にも抵抗',
      kind: 'dial',
      cases: [[10, 0.3], [20, 0.2], [5, 0.4], [10, 0.5], [15, 0.2], [30, 0.1], [25, 0.2], [8, 0.5], [40, 0.1], [12, 0.5], [15, 0.3]].map(([I, R]) => ({ I, R })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 8, step: 0.5 },
      know: '電線も細長い抵抗。電流 <var>I</var> が流れると、電線の中で <var>I</var> × <var>R</var> だけ電圧が下がる（オームの法則）。先の家の電圧はその分低い',
      request: () => '電線1本の両端の電圧は？ テスターの針を予想しよう',
      answer: ({ I, R }) => I * R,
      run: runWireBasic,
      draw: drawWireBasic,
    },
    {
      title: '往復で2本（単相2線式）',
      kind: 'dial',
      cases: [[105, 10, 0.25], [105, 20, 0.2], [104, 10, 0.2], [106, 15, 0.2], [105, 20, 0.25], [104, 15, 0.1], [107, 20, 0.3], [105, 30, 0.1], [105, 12, 0.25], [103, 5, 0.3]]
        .map(([V0, I, R]) => ({ V0, I, R })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 85, max: 110, step: 1 },
      know: '電気は行きの電線で家へ行き、帰りの電線で戻る。1線の抵抗 <var>R</var> なら 2 × <var>I</var> × <var>R</var> 下がり、家の電圧 = 送り出し − 2<var>IR</var>',
      request: () => '家の電圧計の針はどこ？ 予想の針を置こう',
      answer: ({ V0, I, R }) => V0 - 2 * I * R,
      run: runRoundTripBasic,
      draw: drawRoundTripBasic,
    },
    {
      title: '区間の電流',
      kind: 'dial',
      cases: [[[10, 10, 10, 10], 1], [[10, 20, 10, 5], 2], [[5, 10, 15, 10], 1], [[10, 5, 10, 20], 2], [[20, 10, 5, 5], 3], [[10, 10, 20, 10], 0], [[5, 5, 10, 20], 1], [[15, 10, 5, 10], 2], [[10, 15, 10, 5], 1]]
        .map(([loads, k]) => ({ loads, k })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 60, step: 5 },
      know: '電線は家ごとに枝分かれする。ある区間を流れる電流は、その先にある家の電流の合計（手前の家の分は、もう分かれた）',
      request: ({ k }) => `${k + 1}番の区間の電流計は何 A？`,
      answer: ({ loads, k }) => loads.slice(k).reduce((sum, I) => sum + I, 0),
      run: runSpanBasic,
      draw: drawSpanBasic,
    },
    {
      title: '力率と電圧降下',
      kind: 'dial',
      cases: [[105, 10, 0.25, 0.5, 0.8], [105, 5, 0.5, 0.5, 0.8], [105, 10, 0.2, 0.4, 0.8], [104, 10, 0.5, 0.25, 0.6], [105, 20, 0.1, 0.2, 0.8], [106, 15, 0.1, 0.3, 0.6], [105, 10, 0.3, 0.1, 0.8], [105, 20, 0.2, 0.1, 0.6], [105, 25, 0.1, 0.2, 0.8], [107, 10, 0.5, 0.5, 0.6]]
        .map(([V0, I, R, X, cos]) => ({ V0, I, R, X, cos })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 85, max: 110, step: 1 },
      know: 'モーターの電流は電圧より <var>θ</var> 遅れる。電線で下がる分のうち電圧の向きに効くのは <var>R</var> cos<var>θ</var> + <var>X</var> sin<var>θ</var>（基礎8）。単相2線は 2<var>I</var>(<var>R</var> cos<var>θ</var> + <var>X</var> sin<var>θ</var>)',
      request: () => 'モーターの家の電圧は？ 予想の針を置こう',
      answer: ({ V0, I, R, X, cos }) => V0 - VoltageDrop.singlePhaseDrop({ I, R, X, cos }),
      run: runPowerFactorBasic,
      draw: drawPowerFactorBasic,
    },
    {
      title: '三相3線式',
      kind: 'dial',
      cases: [[100, 1, 2, 0.8], [100, 1, 1, 0.8], [150, 1, 1, 1], [100, 1.5, 2, 0.6], [80, 1, 2, 0.8], [150, 0.5, 1, 0.6], [120, 1, 1.5, 0.8], [50, 2, 3, 0.8], [200, 1, 1, 0.6], [300, 0.5, 0.5, 0.8], [200, 0.5, 0.5, 1]]
        .map(([I, R, X, cos]) => ({ I, R, X, cos })),
      dial: { name: '予想', symbol: 'v', unit: 'V', min: 0, max: 600, step: THREE_PHASE_STEP },
      know: '三相3線式は電線3本で送る。線間電圧の降下は1線分の √3 倍（√3 ≒ 1.73）：<var>v</var> ≒ √3<var>I</var>(<var>R</var> cos<var>θ</var> + <var>X</var> sin<var>θ</var>)',
      request: () => '電圧降下 <var>v</var> は？ いちばん近い目盛りに置こう',
      answer: ({ I, R, X, cos }) => PlayKit.nearestMark(VoltageDrop.threePhaseDrop({ I, R, X, cos }), THREE_PHASE_STEP),
      run: runThreePhaseBasic,
      draw: drawThreePhaseBasic,
    },
    {
      title: '電圧降下率',
      kind: 'dial',
      cases: [[6930, 6600], [6864, 6600], [6798, 6600], [6732, 6600], [6765, 6600], [6897, 6600], [6831, 6600], [7062, 6600], [3150, 3000], [3180, 3000], [6996, 6600]]
        .map(([Vs, Vr]) => ({ Vs, Vr })),
      dial: { name: '予想', symbol: 'ε', unit: '%', min: 0, max: 10, step: 0.5 },
      know: '電圧降下率 <var>ε</var> = (<var>V</var><sub>s</sub> − <var>V</var><sub>r</sub>) ÷ <var>V</var><sub>r</sub> × 100 [%]。分母は受電端（工場側）の電圧',
      request: () => '電圧降下率 <var>ε</var> は？',
      answer: ({ Vs, Vr }) => VoltageDrop.dropRate({ Vs, Vr }),
      run: runRateBasic,
      draw: drawRateBasic,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays['voltage-drop'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
