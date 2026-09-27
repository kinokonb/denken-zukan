// 理論「磁界と電磁力」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は電流のまわりの磁界 H、磁束密度 B、電磁力 F = BIl、フレミングの左手の向き、平行な電流の力、その向きと距離へ進む。
// 現場は磁石の中の棒をちょうど浮かせる電流、短絡でも支えが曲がらない母線のいちばん狭い間隔、
// 磁界センサーで電流が決まった値のケーブルを当てる。計算は js/calc/magnetic.js。
(function (global) {
  'use strict';

  const { num, near, predicted, nearestMark, predictedNearest } = PlayKit;
  const NOTE_Y = 262;
  const microTesla = (I, r) => Magnetic.fluxDensity(I, r) * 1e6;
  const way = (I) => (I > 0 ? '手前へ ⊙' : I < 0 ? '奥へ ⊗' : '0');

  // 磁石の N 極と S 極（dir = 1 なら N が左で磁界は右向き、−1 なら N が右で左向き）と、その間の磁界の矢印
  const MAGNET = { left: 70, right: 230, top: 64, bottom: 196, gap: [112, 188] };

  function drawMagnet(g, dir) {
    const [gl, gr] = MAGNET.gap;
    const poles = dir > 0 ? ['N', 'S'] : ['S', 'N'];
    [[MAGNET.left, gl], [gr, MAGNET.right]].forEach(([x1, x2], i) => {
      Svg.el(g, 'rect', { x: x1, y: MAGNET.top, width: x2 - x1, height: MAGNET.bottom - MAGNET.top, rx: 3, class: 'motor' });
      Svg.el(g, 'text', { x: (x1 + x2) / 2, y: (MAGNET.top + MAGNET.bottom) / 2, class: 'motor-letter', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, poles[i]);
    });
    for (const y of [74, 186]) {
      const [from, to] = dir > 0 ? [gl + 4, gr - 4] : [gr - 4, gl + 4];
      Svg.arrow(g, from, y, to, y, { cls: 'ink', width: 1.2 });
    }
    Svg.label(g, (gl + gr) / 2, 60, 'B');
  }

  // 磁石の間の棒（横から見た導線）。電流の向きを ⊙・⊗ で描く
  function drawRod(g, x, y, I) {
    if (I === 0) Svg.el(g, 'circle', { cx: x, cy: y, r: 11, class: 'motor' });
    else Svg.dotCross(g, x, y, I > 0, { r: 11, cls: 'q-current' });
  }

  // ---- ミッション（現場の依頼） ----

  // 棒を浮かせる：上向きの力 F = BIl が棒の重さ W とつり合う電流。電流の ＋ は紙から手前へ
  const LIFT = { x: 150, rest: 156, rise: 28, meter: [304, 118] };
  const liftForce = ({ B, l, dir }, I) => dir * Magnetic.force(B, I, l); // 上向きを ＋

  function runLiftJob(values, I) {
    const { B, l, W } = values;
    const F = liftForce(values, I);
    const reading = F === 0 ? '0 N' : `${F > 0 ? '上へ' : '下へ'} ${num(Math.abs(F))} N`;
    const base = { meter: F, lamps: [], burst: null, reading };
    const math = `F = BIl = ${B} × ${Math.abs(I)} × ${l} = ${num(Math.abs(F))} N`;
    if (near(F, W)) return { ...base, ok: true, reason: `浮いた！ ${math} が重さ ${W} N とつり合う` };
    if (F === 0) return { ...base, ok: false, reason: '電流が 0 では力が出ない' };
    if (F < 0) return { ...base, ok: false, reason: `下に押しつけた！ ${math} が下向き。⊙ と ⊗ を入れかえる（フレミングの左手）` };
    if (F < W) return { ...base, ok: false, reason: `持ち上がらない。${math}（重さ ${W} N）。電流を大きく` };
    return { ...base, ok: false, reason: `上にぶつかった！ ${math}（重さ ${W} N）。電流を小さく` };
  }

  function drawLiftJob(g, values, I, look) {
    const { B, l, W, dir } = values;
    const F = liftForce(values, I);
    // 棒の高さ：つり合えば真ん中に浮き、力が重さより大きければ上の止めまで上がる（look.meter はバネで動く力）
    let rise = 0;
    if (!look.deciding && F > 0 && near(F, W)) rise = Math.max(0, Math.min(1.2, look.meter / W));
    else if (!look.deciding && F > W) rise = Math.max(0, Math.min(2, (2 * (look.meter - W)) / (F - W)));
    const y = LIFT.rest - rise * LIFT.rise;
    drawMagnet(g, dir);
    Svg.guide(g, LIFT.x - 16, LIFT.rest + 12, LIFT.x + 16, LIFT.rest + 12, 'axis');
    Svg.guide(g, LIFT.x - 16, LIFT.rest - 2 * LIFT.rise - 12, LIFT.x + 16, LIFT.rest - 2 * LIFT.rise - 12, 'axis');
    Svg.arrow(g, LIFT.x - 20, y, LIFT.x - 20, y + 18, { cls: 'ink', width: 1.4 });
    Svg.label(g, LIFT.x - 30, y + 8, 'W');
    if (!look.deciding && Math.abs(look.meter) > 0.01) {
      const length = Math.min(34, (Math.abs(look.meter) / W) * 18);
      Svg.arrow(g, LIFT.x + 20, y, LIFT.x + 20, y - Math.sign(look.meter) * length, { cls: 'q-mech', width: 2.5 });
    }
    drawRod(g, LIFT.x, y, I);
    Svg.note(g, 16, 22, `B = ${B} T・磁石の中の長さ l = ${l} m`, { cls: 'value' });
    Svg.note(g, 16, 40, `棒の重さ W = ${W} N`, { cls: 'value q-mech' });
    Svg.note(g, LIFT.x, 216, `I = ${Math.abs(I)} A（${way(I)}）`, { cls: 'value q-current', anchor: 'middle' });
    const [mx, my] = LIFT.meter;
    Svg.note(g, mx, my - 36, '上向きの力', { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, mx, my, look, { min: -W * 1.5, max: W * 1.5, letter: 'N', cls: 'q-mech', mark: W });
    Svg.note(g, 180, NOTE_Y, '＋ は紙から手前へ（⊙）、− は奥へ（⊗）。重さとつり合うと浮く', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[LIFT.x, y]] };
  }

  // 母線の間隔：行きと帰りの短絡電流は反発する。支えが耐える力以下で、いちばん狭い間隔
  const BUS = { cx: 150, y: 116, pxPerM: 300, meter: [304, 110] };
  const busForce = (I, r) => Magnetic.parallelForce(I * 1e3, -I * 1e3, r); // 1 m あたり [N]、反発で正
  const busAnswer = ({ I, Fmax }) => (2e-7 * (I * 1e3) ** 2) / Fmax;

  function runBusJob(values, r) {
    const { I, Fmax } = values;
    const F = busForce(I, r);
    const base = { meter: F, lamps: [], reading: `${num(F)} N` };
    const math = `2×10⁻⁷ × (${I}×10³)² ÷ ${num(r)} = ${num(F)} N`;
    if (near(r, busAnswer(values))) return { ...base, ok: true, burst: null, reason: `耐えた！ いちばん狭い間隔。${math}` };
    if (F > Fmax + 1e-9) return { ...base, ok: false, burst: { fuse: true }, reason: `支えが曲がった！ ${math}（${Fmax} N まで）。間隔を広げる` };
    return { ...base, ok: false, burst: null, reason: `耐えたが、まだ詰められる。${math}（${Fmax} N まで）` };
  }

  function drawBusJob(g, { I, Fmax }, r, look) {
    const gap = r * BUS.pxPerM;
    const push = look.broken.fuse ? 12 : Math.max(0, Math.min(1.2, look.meter / Fmax)) * 3;
    const bars = [[BUS.cx - gap / 2, -1, true], [BUS.cx + gap / 2, 1, false]];
    Svg.el(g, 'line', { x1: 40, y1: 184, x2: 260, y2: 184, class: 'wire' });
    for (const [x, side, out] of bars) {
      // 支え（がいし）：根元は床に固定。曲がると上が外へ倒れる
      const top = [x + side * push, BUS.y + 16];
      Svg.el(g, 'path', { d: `M${x - 5},184 L${top[0] - 4},${top[1]} L${top[0] + 4},${top[1]} L${x + 5},184 Z`, class: 'motor' });
      Svg.el(g, 'rect', { x: top[0] - 5, y: BUS.y - 16, width: 10, height: 32, rx: 1.5, class: 'motor' });
      Svg.dotCross(g, top[0], BUS.y, out, { r: 4, cls: 'q-current' });
      if (!look.deciding && Math.abs(look.meter) > 0.01) {
        Svg.arrow(g, top[0] + side * 8, BUS.y - 24, top[0] + side * 26, BUS.y - 24, { cls: 'q-mech', width: 2.2 });
      }
    }
    Svg.guide(g, BUS.cx - gap / 2, 196, BUS.cx + gap / 2, 196);
    Svg.note(g, BUS.cx, 208, `r = ${num(r)} m`, { cls: 'value', anchor: 'middle' });
    Svg.note(g, 16, 22, `短絡電流 ${I} kA（⊙ 行き・⊗ 帰り）`, { cls: 'value q-current' });
    Svg.note(g, 16, 40, `支えは 1 m あたり ${Fmax} N まで`, { cls: 'value q-mech' });
    const [mx, my] = BUS.meter;
    Svg.note(g, mx, my - 36, '1 m あたりの力', { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, mx, my, look, { max: Fmax * 1.6, letter: 'N', cls: 'q-mech', mark: Fmax });
    Svg.note(g, 180, NOTE_Y, '行きと帰りは反対向きの電流なので反発する', { cls: 'faint', anchor: 'middle' });
    return { lamps: bars.map(([x]) => [x, BUS.y]), fuse: [BUS.cx + gap / 2 + push, BUS.y - 16] };
  }

  // 3本のケーブルに、書かれた距離から磁界センサーを当てて磁束密度を測り、電流が決まった値のものを当てる
  const CABLES = { xs: [70, 180, 290], y: 100, sensorY: 138, names: ['A', 'B', 'C'] };

  function runCableProbe({ cables, target }, i) {
    const { I, r } = cables[i];
    const B = microTesla(I, r);
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    const math = `${CABLES.names[i]} は ${num(B)} μT × ${r} ÷ 0.2 = ${num(I)} A`;
    if (near(I, target)) return { ...base, ok: true, reason: `当たり！ ${math}` };
    return { ...base, ok: false, reason: `${math}。同じ読みでも、遠くで測ったほど電流は大きい` };
  }

  function drawCableProbe(g, { cables }, selected, look) {
    const { xs, y, sensorY, names } = CABLES;
    xs.forEach((x, i) => {
      Svg.note(g, x, 30, `ケーブル ${names[i]}`, { cls: 'value', anchor: 'middle' });
      Svg.note(g, x, 48, `距離 ${cables[i].r} m`, { cls: 'value', anchor: 'middle' });
      if (!look.deciding) Svg.note(g, x, 66, `${num(cables[i].I)} A`, { cls: 'value q-current', anchor: 'middle' });
      Svg.dotCross(g, x, y, true, { r: 13, cls: 'q-current' });
      Svg.guide(g, x, y + 15, x, sensorY);
      Svg.el(g, 'rect', { x: x - 7, y: sensorY, width: 14, height: 10, rx: 2, class: 'motor' });
    });
    const meter = [180, 208];
    Svg.gauge(g, ...meter, { value: look.probe ? look.probe.needle : 0, max: 400, letter: 'μT', cls: 'ink' });
    Svg.note(g, meter[0], meter[1] + 38, look.probe ? look.probe.reading : '磁界センサー', { cls: look.probe ? 'value' : 'faint', anchor: 'middle' });
    if (look.probe) Svg.leads(g, meter, [[xs[look.probe.index] - 4, sensorY + 10], [xs[look.probe.index] + 4, sensorY + 10]]);
    if (look.deciding) {
      xs.forEach((x, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: y + 16, r: 38, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, 'タップすると、書かれた距離で磁束密度を測る', { cls: 'faint', anchor: 'middle' });
    return { lamps: xs.map((x) => [x, y]) };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  // 上から見た電流と、半径 r の円（磁界の線）。円周 2πr に電流が分かれる
  function topView(g, I, r) {
    const [cx, cy] = [110, 130];
    const R = r * 300;
    Svg.el(g, 'circle', { cx, cy, r: R, class: 'stator' });
    Svg.arrow(g, cx + 8, cy - R, cx - 8, cy - R, { cls: 'ink', width: 1.4 });
    Svg.dotCross(g, cx, cy, true, { r: 9, cls: 'q-current' });
    Svg.guide(g, cx, cy, cx + R, cy);
    Svg.el(g, 'circle', { cx: cx + R, cy, r: 3, class: 'gauge-pivot' });
    Svg.note(g, cx + R + 8, cy, `r = ${r} m`, { cls: 'value' });
    Svg.note(g, cx, cy + R + 14, '円周 2πr', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, 230, 40, `電流 ${I} A（手前へ）`, { cls: 'value q-current' });
  }

  const topViewStep = (meter) => (g, { I, r }, guess, look) => {
    topView(g, I, r);
    PlayKit.meter(g, 300, 130, look, { ...meter, ghost: guess });
    Svg.note(g, 180, NOTE_Y, '上から見た図。点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  };

  // 横から見た平行な2本の電流（上向きが ＋）。gap は2本の間の画面上の幅
  function wirePair(g, I1, I2, gap) {
    const x1 = 70;
    const x2 = x1 + gap;
    for (const [x, I] of [[x1, I1], [x2, I2]]) {
      Svg.wire(g, [[x, 70], [x, 200]]);
      Svg.arrow(g, x, I > 0 ? 176 : 94, x, I > 0 ? 94 : 176, { cls: 'q-current', width: 2.5 });
    }
    Svg.guide(g, x1, 212, x2, 212);
    return [x1, x2];
  }

  const basics = [
    {
      title: '電流のまわりの磁界',
      kind: 'dial',
      cases: [[10, 0.1], [20, 0.1], [30, 0.2], [40, 0.1], [25, 0.1], [15, 0.3], [50, 0.2], [90, 0.3]].map(([I, r]) => ({ I, r })),
      dial: { name: '予想', symbol: 'H', unit: 'A/m', min: 0, max: 80, step: 1 },
      know: 'まっすぐな電流 <var>I</var> のまわりには同心円の磁界ができる。半径 <var>r</var> の円周 2π<var>r</var> に <var>I</var> が分かれるので <var>H</var> = <var>I</var> ÷ 2π<var>r</var> [A/m]（2π ≒ 6.28）',
      request: () => '円の上の磁界 <var>H</var> は？',
      answer: ({ I, r }) => nearestMark(Magnetic.field(I, r), 1),
      run: ({ I, r }, guess) => {
        const H = Magnetic.field(I, r);
        return { ...predictedNearest(guess, H, 1, 'A/m', `${I} ÷ (2π × ${r}) = ${I} ÷ ${(2 * Math.PI * r).toFixed(3)} ≒ ${H.toFixed(1)} A/m`), meter: H, lamps: [], burst: null, reading: `${H.toFixed(1)} A/m` };
      },
      draw: topViewStep({ max: 80, letter: 'A/m', cls: 'ink' }),
    },
    {
      title: '磁束密度',
      kind: 'dial',
      cases: [[100, 0.1], [50, 0.1], [100, 0.2], [200, 0.2], [150, 0.1], [60, 0.3], [100, 0.5], [300, 0.2]].map(([I, r]) => ({ I, r })),
      dial: { name: '予想', symbol: 'B', unit: 'μT', min: 0, max: 400, step: 10 },
      know: '<var>B</var> = μ₀<var>H</var>、μ₀ = 4π × 10⁻⁷。まっすぐな電流なら π が消えて <var>B</var> = 2 × 10⁻⁷ × <var>I</var> ÷ <var>r</var> [T]。μT（10⁻⁶ T）なら 0.2 × <var>I</var> ÷ <var>r</var>',
      request: () => '円の上の磁束密度 <var>B</var> は？',
      answer: ({ I, r }) => microTesla(I, r),
      run: ({ I, r }, guess) => {
        const B = microTesla(I, r);
        return { ...predicted(guess, B, 'μT', `0.2 × ${I} ÷ ${r} = ${num(B)} μT`), meter: B, lamps: [], burst: null, reading: `${num(B)} μT` };
      },
      draw: topViewStep({ max: 400, letter: 'μT', cls: 'ink' }),
    },
    {
      title: '電磁力',
      kind: 'dial',
      cases: [[0.5, 4, 0.2], [0.2, 5, 0.5], [1, 3, 0.4], [0.8, 5, 0.25], [0.4, 10, 0.3], [0.5, 6, 0.5], [0.25, 8, 0.5], [0.6, 5, 0.2]].map(([B, I, l]) => ({ B, I, l })),
      dial: { name: '予想', symbol: 'F', unit: 'N', min: 0, max: 2, step: 0.1 },
      know: '磁界と直角な導線に電流を流すと、力 <var>F</var> = <var>BIl</var> [N] を受ける（<var>B</var> は磁束密度 T、<var>l</var> は磁界の中の長さ m）',
      request: () => '棒が受ける力の大きさは？',
      answer: ({ B, I, l }) => Magnetic.force(B, I, l),
      run: ({ B, I, l }, guess) => {
        const F = Magnetic.force(B, I, l);
        return { ...predicted(guess, F, 'N', `${B} × ${I} × ${l} = ${num(F)} N`), meter: F, lamps: [], burst: null, reading: `${num(F)} N` };
      },
      draw: (g, { B, I, l }, guess, look) => {
        drawMagnet(g, 1);
        drawRod(g, 150, 130, I);
        Svg.note(g, 16, 22, `B = ${B} T・l = ${l} m・I = ${I} A`, { cls: 'value' });
        PlayKit.meter(g, 304, 130, look, { max: 2, letter: 'N', cls: 'q-mech', ghost: guess });
        Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
        return { lamps: [] };
      },
    },
    {
      title: '力の向き（フレミングの左手）',
      kind: 'dial',
      cases: [[5, 1], [5, -1], [-3, 1], [-3, -1], [8, 1], [-6, -1], [4, -1], [-7, 1]].map(([I, dir]) => ({ I, dir })),
      dial: { name: '予想', symbol: 'F', unit: 'N', min: -1, max: 1, step: 0.1 },
      know: '左手の中指を電流、人差し指を磁界（N → S）に向けると、親指が力の向き（「電・磁・力」）。磁界が右向きで電流が手前へ（⊙）なら上。どちらかが逆なら下',
      request: () => '力は？（上 ＋・下 −）',
      answer: ({ I, dir }) => liftForce({ B: 0.5, l: 0.2, dir }, I),
      run: ({ I, dir }, guess) => {
        const F = liftForce({ B: 0.5, l: 0.2, dir }, I);
        return { ...predicted(guess, F, 'N', `${F > 0 ? '上' : '下'}向き、大きさ 0.5 × ${Math.abs(I)} × 0.2 = ${num(Math.abs(F))} N`), meter: F, lamps: [], burst: null, reading: `${num(F)} N` };
      },
      draw: (g, { I, dir }, guess, look) => {
        drawMagnet(g, dir);
        drawRod(g, 150, 130, I);
        Svg.note(g, 16, 22, `B = 0.5 T・l = 0.2 m・I = ${Math.abs(I)} A（${way(I)}）`, { cls: 'value' });
        PlayKit.meter(g, 304, 130, look, { min: -1, max: 1, letter: 'N', cls: 'q-mech', mark: 0, ghost: guess });
        Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（真ん中が 0、右が上向き）', { cls: 'faint', anchor: 'middle' });
        return { lamps: [] };
      },
    },
    {
      title: '平行な電流の力',
      kind: 'dial',
      cases: [[10, 10, 0.2], [10, 10, 0.1], [20, 20, 0.2], [5, 10, 0.2], [15, 15, 0.3], [10, 20, 0.5], [20, 10, 0.4], [30, 10, 0.2]].map(([I1, I2, r]) => ({ I1, I2, r })),
      dial: { name: '予想', symbol: 'F', unit: 'N', min: 0, max: 500, step: 10 },
      know: '平行な電流の 1 m あたりの力 <var>F</var> = μ₀<var>I</var><sub>1</sub><var>I</var><sub>2</sub> ÷ 2π<var>r</var> = 2 × 10⁻⁷ × <var>I</var><sub>1</sub><var>I</var><sub>2</sub> ÷ <var>r</var>。kA どうしなら 0.2 × <var>I</var><sub>1</sub><var>I</var><sub>2</sub> ÷ <var>r</var> [N]',
      request: () => '1 m あたりの力の大きさは？',
      answer: ({ I1, I2, r }) => Math.abs(Magnetic.parallelForce(I1 * 1e3, I2 * 1e3, r)),
      run: ({ I1, I2, r }, guess) => {
        const F = Math.abs(Magnetic.parallelForce(I1 * 1e3, I2 * 1e3, r));
        return { ...predicted(guess, F, 'N', `0.2 × ${I1} × ${I2} ÷ ${r} = ${num(F)} N`), meter: F, lamps: [], burst: null, reading: `${num(F)} N` };
      },
      draw: (g, { I1, I2, r }, guess, look) => {
        const [x1, x2] = wirePair(g, I1, I2, r * 300);
        Svg.note(g, x1 - 6, 56, `I₁ ${I1} kA`, { cls: 'value q-current', anchor: 'end' });
        Svg.note(g, x2 + 6, 56, `I₂ ${I2} kA`, { cls: 'value q-current' });
        Svg.note(g, (x1 + x2) / 2, 224, `r = ${r} m`, { cls: 'value', anchor: 'middle' });
        PlayKit.meter(g, 304, 130, look, { max: 500, letter: 'N', cls: 'q-mech', ghost: guess });
        Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
        return { lamps: [] };
      },
    },
    {
      title: '平行な電流の向きと距離',
      kind: 'dial',
      cases: [[100, 2, true], [100, 2, false], [60, 3, false], [40, 0.5, false], [90, 3, true], [80, 4, false], [50, 2, true], [30, 0.5, true]].map(([F0, k, same]) => ({ F0, k, same })),
      dial: { name: '予想', symbol: 'F', unit: 'N', min: -100, max: 100, step: 5 },
      know: '同じ向きの電流は引き合い、反対向きは反発する（電荷とは逆）。力は距離に反比例（2乗ではない）：距離2倍で半分。ここでは反発を ＋、引き合いを − で表す',
      request: ({ k, same }) => `${same ? '同じ向き' : '反対向き'}の電流で、距離を ${num(k)} 倍にした。力は？（反発 ＋・引き合い −）`,
      answer: ({ F0, k, same }) => (same ? -1 : 1) * (F0 / k),
      run: ({ F0, k, same }, guess) => {
        const F = (same ? -1 : 1) * (F0 / k);
        return { ...predicted(guess, F, 'N', `${same ? '同じ向きで引き合う' : '反対向きで反発'}、大きさ ${F0} ÷ ${num(k)} = ${num(Math.abs(F))} N`), meter: F, lamps: [], burst: null, reading: `${num(F)} N` };
      },
      draw: (g, { F0, k, same }, guess, look) => {
        const [x1, x2] = wirePair(g, 1, same ? 1 : -1, 45 * k);
        Svg.note(g, 16, 22, `はじめの力の大きさ ${F0} N（1 m あたり）`, { cls: 'value' });
        Svg.note(g, 16, 40, `距離を ${num(k)} 倍に`, { cls: 'value' });
        Svg.note(g, (x1 + x2) / 2, 224, `${num(k)} 倍`, { cls: 'value', anchor: 'middle' });
        PlayKit.meter(g, 304, 130, look, { min: -100, max: 100, letter: 'N', cls: 'q-mech', mark: 0, ghost: guess });
        Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（真ん中が 0、右が反発）', { cls: 'faint', anchor: 'middle' });
        return { lamps: [] };
      },
    },
  ];

  const jobs = [
    {
      kind: 'dial',
      needs: 2, // 失敗したら準備の③（電磁力）から
      cases: [[0.5, 0.2, 0.6, 1], [0.5, 0.2, 0.8, -1], [0.4, 0.5, 1.2, 1], [0.8, 0.25, 1, -1], [0.2, 0.5, 0.4, 1], [0.6, 0.5, 2.1, -1], [0.5, 0.4, 1.8, 1], [0.25, 0.4, 0.3, -1]].map(([B, l, W, dir]) => ({ B, l, W, dir })),
      dial: { name: '電流', symbol: 'I', unit: 'A', min: -10, max: 10, step: 1 },
      request: ({ W }) => `磁石の中の棒（重さ ${W} N）をちょうど浮かせたい。電流 <var>I</var> は？（＋ は手前へ）`,
      answer: ({ B, l, W, dir }) => (dir * W) / (B * l),
      run: runLiftJob,
      draw: drawLiftJob,
    },
    {
      kind: 'dial',
      needs: 4, // 失敗したら準備の⑤（平行な電流の力）から
      cases: [[10, 100], [10, 200], [10, 50], [20, 400], [20, 320], [5, 50], [15, 150], [30, 1200], [5, 10]].map(([I, Fmax]) => ({ I, Fmax })),
      dial: { name: '間隔', symbol: 'r', unit: 'm', min: 0.05, max: 0.5, step: 0.05 },
      request: () => '盤を小さくしたい。短絡しても支えが曲がらない、いちばん狭い母線の間隔 <var>r</var> は？',
      answer: busAnswer,
      run: runBusJob,
      draw: drawBusJob,
    },
    {
      kind: 'probe',
      needs: 1, // 失敗したら準備の②（磁束密度）から
      cases: [
        [[[100, 0.1], [200, 0.2], [50, 0.05]], 100], [[[100, 0.1], [200, 0.2], [50, 0.05]], 200], [[[300, 0.3], [100, 0.2], [60, 0.1]], 60],
        [[[300, 0.3], [100, 0.2], [60, 0.1]], 300], [[[40, 0.1], [80, 0.4], [120, 0.3]], 120], [[[40, 0.1], [80, 0.4], [120, 0.3]], 80],
      ].map(([cables, target]) => ({ cables: cables.map(([I, r]) => ({ I, r })), target })),
      probe: {
        parts: CABLES.xs.length,
        hint: 'ケーブルをタップすると、書かれた距離で磁束密度を測る',
        measure: ({ cables }, i) => microTesla(cables[i].I, cables[i].r),
        reading: (B) => `${num(B)} μT`,
      },
      action: 'これに決める',
      request: ({ target }) => `電流が ${target} A のケーブルはどれ？`,
      answer: ({ cables, target }) => cables.findIndex(({ I }) => near(I, target)),
      run: runCableProbe,
      draw: drawCableProbe,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays['magnetic-force'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
