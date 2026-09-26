// 理論「電池の内部抵抗」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は電池の中の電圧降下 rI から始め、端子電圧 E − rI、電流 E ÷ (R + r)、2つの測定から r、起電力 E、最大電力 E² ÷ 4r へ進む。
// 現場は乾電池と電球（直列の本数）・電熱線（いちばん熱く）・古い電池さがし。計算は js/calc/dc-circuit.js の batteryLoad。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const amperes = (value) => `${num(value)} A`;
  const volts = (value) => `${num(value)} V`;
  const NOTE_Y = 262;
  // 電池の中（点線の四角）と、外の負荷の回路
  const CELL = { left: 50, right: 290, top: 64, bottom: 190, mid: 127, box: [18, 44, 96, 168], terminal: 114 };

  // 点線の四角の電池（中に起電力と内部抵抗）。cells は直列の本数（2 以上なら電池の記号を並べる）
  function drawCell(g, look, { eText, rText, cells = 1, withSwitch = true }) {
    const { left, right, top, bottom, box, terminal } = CELL;
    Svg.wire(g, [[left, top], [right, top], [right, bottom], [left, bottom], [left, top]]);
    Svg.el(g, 'rect', { x: box[0], y: box[1], width: box[2], height: box[3], rx: 4, class: 'building dashed-box' });
    Svg.note(g, box[0] + 4, box[1] - 8, '電池の中', { cls: 'faint' });
    Svg.resistor(g, left, 92, { vertical: true });
    const gap = cells > 1 ? Math.min(14, 60 / (cells - 1)) : 0;
    for (let i = 0; i < cells; i++) Svg.battery(g, left, 128 + i * gap, { sign: i === 0 });
    Svg.note(g, left + 14, 92, rText, { cls: 'value q-active' });
    Svg.note(g, left + 14, 140, eText, { cls: 'value q-voltage' });
    for (const y of [top, bottom]) Svg.el(g, 'circle', { cx: terminal, cy: y, r: 3, class: 'dot ink' });
    if (withSwitch) Svg.knifeSwitch(g, 146, top, { on: look.switchOn });
  }

  const ammeter = (g, look, max, { mark = null, ghost = null } = {}) =>
    PlayKit.meter(g, 214, CELL.top, look, { max, letter: 'A', cls: 'q-current', mark, ghost, readingY: CELL.top + 40 });

  // 端子の電圧計（電池の外に出てくる電圧）
  function terminalMeter(g, look, max, { mark = null, ghost = null } = {}) {
    const at = [200, 136];
    PlayKit.meter(g, ...at, look, { max, letter: 'V', cls: 'q-voltage', mark, ghost });
    Svg.leads(g, at, [[CELL.terminal + 6, CELL.top], [CELL.terminal + 6, CELL.bottom]]);
  }

  // ---- ミッション（現場の依頼） ----

  // 同じ乾電池（E・r）を直列に何本で、電球が定格の電流になるか（n 本で起電力 nE・内部抵抗 nr）
  function runCellsJob({ E, r, R, Ir }, n) {
    const I = (n * E) / (R + n * r);
    const base = { meter: I, lamps: [(I / Ir) ** 2] };
    const math = `${n}本で ${num(n * E)} ÷ (${R} + ${num(n * r)}) = ${num(I)} A`;
    if (near(I, Ir)) return { ...base, ok: true, burst: null, reading: amperes(I), reason: `定格どおり！ ${math}（電池の中の抵抗も本数だけ増える）` };
    if (I < Ir) return { ...base, ok: false, burst: null, reading: amperes(I), reason: `暗い。${math}（定格 ${Ir} A）。電池の中の ${num(n * r)} Ω も忘れずに` };
    return { ...base, ok: false, burst: { lamp: 0 }, reading: `${amperes(I)} → 0 A`, reason: `切れた！ ${math}（定格 ${Ir} A をこえた）` };
  }

  function drawCellsJob(g, { E, r, R, Ir }, n, look) {
    drawCell(g, look, { eText: `${E} V × ${n}本`, rText: `r ${r} Ω × ${n}本`, cells: n });
    Svg.lamp(g, CELL.right, CELL.mid, { level: look.lamps[0] || 0, broken: look.broken.lamps[0] });
    Svg.note(g, CELL.right - 16, CELL.mid + 26, `電球 ${R} Ω・定格 ${Ir} A`, { cls: 'value', anchor: 'end' });
    ammeter(g, look, Ir * 2, { mark: Ir });
    Svg.note(g, 180, NOTE_Y, '乾電池1本 = 起電力と内部抵抗の直列。電球は定格をこえると切れる', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[CELL.right, CELL.mid]] };
  }

  // 電熱線をいちばん熱くする（負荷の電力が最大）R
  function runBestLoadJob({ E, r }, R) {
    const load = DcCircuit.batteryLoad({ E, r, R });
    const base = { meter: load.P, lamps: [load.P / load.Pmax], burst: null, reading: `${num(load.P)} W` };
    const best = `最大は <var>R</var> = <var>r</var> = ${r} Ω の ${num(load.Pmax)} W（${E}² ÷ (4 × ${r})）`;
    if (near(R, r)) return { ...base, ok: true, reason: `いちばん熱い！ ${best}` };
    return { ...base, ok: false, reason: `${num(load.P)} W。<var>R</var> を${R < r ? '大きく' : '小さく'}。${best}` };
  }

  function drawBestLoadJob(g, { E, r }, R, look) {
    drawCell(g, look, { eText: `E ${E} V`, rText: `r ${r} Ω` });
    Svg.heater(g, CELL.right, CELL.mid, { level: look.lamps[0] || 0 });
    Svg.note(g, CELL.right - 16, CELL.mid + 26, `電熱線 R ${R} Ω`, { cls: 'value q-active', anchor: 'end' });
    PlayKit.meter(g, 214, CELL.top, look, { max: ((E * E) / (4 * r)) * 1.25, letter: 'W', cls: 'q-active', readingY: CELL.top + 40 });
    Svg.note(g, 180, NOTE_Y, '電熱線の熱さ＝電熱線で使われる電力', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[CELL.right, CELL.mid]] };
  }

  // 4本の電池を 2 Ω につないで測り、内部抵抗が 1 Ω より大きい（古い）電池を探す
  const LOAD_R = 2;
  const OLD_R = 1;
  const BATTERY_XS = [60, 140, 220, 300];
  const underLoad = ({ E, r }) => (E * LOAD_R) / (LOAD_R + r);

  function runOldCellProbe({ cells }, i) {
    const { E, r } = cells[i];
    const V = underLoad(cells[i]);
    const math = `${i + 1}番は (${num(E)} − ${num(V)}) ÷ (${num(V)} ÷ ${LOAD_R}) = ${num(r)} Ω`;
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    if (r > OLD_R) return { ...base, ok: true, reason: `当たり！ ${math}（下がった電圧 ÷ 電流）` };
    return { ...base, ok: false, reason: `${math}。電圧の低さだけでなく、開放の電圧との差 ÷ 電流で <var>r</var> を出す` };
  }

  function drawOldCellProbe(g, { cells }, selected, look) {
    const y = 96;
    BATTERY_XS.forEach((x, i) => {
      Svg.el(g, 'rect', { x: x - 24, y: y - 30, width: 48, height: 60, rx: 4, class: 'building' });
      Svg.battery(g, x, y);
      Svg.note(g, x, y - 42, `${i + 1}`, { cls: 'value', anchor: 'middle' });
      if (!look.deciding) Svg.note(g, x, y + 44, `r ${num(cells[i].r)} Ω`, { cls: cells[i].r > OLD_R ? 'value q-active' : 'faint', anchor: 'middle' });
    });
    const tester = [150, 196];
    Svg.gauge(g, ...tester, { value: look.probe ? look.probe.needle : 0, max: 2, letter: 'V', cls: 'q-voltage' });
    if (look.probe) {
      Svg.note(g, tester[0] + 32, tester[1] - 8, `開放 ${num(cells[look.probe.index].E)} V`, { cls: 'value q-voltage' });
      Svg.note(g, tester[0] + 32, tester[1] + 10, look.probe.reading, { cls: 'value q-voltage' });
      Svg.leads(g, tester, [[BATTERY_XS[look.probe.index] - 6, y + 30], [BATTERY_XS[look.probe.index] + 6, y + 30]]);
    } else {
      Svg.note(g, tester[0] + 32, tester[1] + 4, 'テスター', { cls: 'faint' });
    }
    if (look.deciding) {
      BATTERY_XS.forEach((x, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: y, r: 34, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, `テスターは、開放の電圧と ${LOAD_R} Ω をつないだ時の電圧を測る`, { cls: 'faint', anchor: 'middle' });
    return { lamps: BATTERY_XS.map((x) => [x, y]) };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  // ① 電池の中の電圧降下 rI
  function runDropBasic({ r, I }, guess) {
    return { ...predicted(guess, r * I, 'V', `${r} Ω × ${I} A = ${num(r * I)} V`), meter: r * I, lamps: [1], burst: null, reading: volts(r * I) };
  }

  function drawDropBasic(g, { r, I }, guess, look) {
    drawCell(g, look, { eText: 'E', rText: `r ${r} Ω` });
    Svg.resistor(g, CELL.right, CELL.mid, { vertical: true });
    Svg.note(g, 214, CELL.top - 16, `${I} A →`, { cls: 'value q-current', anchor: 'middle' });
    const at = [200, 136];
    PlayKit.meter(g, ...at, look, { max: 4, letter: 'V', cls: 'q-voltage', ghost: guess });
    Svg.leads(g, at, [[CELL.left + 8, 72], [CELL.left + 8, 112]]);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（電池の中の r の電圧）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ② 端子電圧 V = E − rI
  function runTerminalBasic({ E, r, I }, guess) {
    const V = E - r * I;
    return { ...predicted(guess, V, 'V', `${E} − ${r} × ${I} = ${num(V)} V`), meter: V, lamps: [], burst: null, reading: volts(V) };
  }

  function drawTerminalBasic(g, { E, r, I }, guess, look) {
    drawCell(g, look, { eText: `E ${E} V`, rText: `r ${r} Ω` });
    Svg.resistor(g, CELL.right, CELL.mid, { vertical: true });
    Svg.note(g, 214, CELL.top - 16, `${I} A →`, { cls: 'value q-current', anchor: 'middle' });
    terminalMeter(g, look, 24, { ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（端子の電圧計）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ③ 電流 I = E ÷ (R + r)
  function runCurrentBasic({ E, r, R }, guess) {
    const I = E / (R + r);
    return { ...predicted(guess, I, 'A', `${E} ÷ (${R} + ${r}) = ${num(I)} A`), meter: I, lamps: [], burst: null, reading: amperes(I) };
  }

  function drawCurrentBasic(g, { E, r, R }, guess, look) {
    drawCell(g, look, { eText: `E ${E} V`, rText: `r ${r} Ω` });
    Svg.resistor(g, CELL.right, CELL.mid, { vertical: true });
    Svg.note(g, CELL.right - 16, CELL.mid + 30, `R ${R} Ω`, { cls: 'value q-active', anchor: 'end' });
    ammeter(g, look, 6, { ghost: guess });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ④ 2つの測定から r = (V1 − V2) ÷ (I2 − I1)
  function runTwoReadingsBasic({ V1, I1, V2, I2 }, guess) {
    const r = (V1 - V2) / (I2 - I1);
    return { ...predicted(guess, r, 'Ω', `(${V1} − ${V2}) ÷ (${I2} − ${I1}) = ${num(r)} Ω。電流が増えた分だけ rI が増える`), meter: r, lamps: [], burst: null, reading: `${num(r)} Ω` };
  }

  function drawTwoReadingsBasic(g, { V1, I1, V2, I2 }, guess, look) {
    drawCell(g, look, { eText: 'E ？', rText: 'r ？', withSwitch: false });
    Svg.resistor(g, CELL.right, CELL.mid, { vertical: true });
    Svg.note(g, 150, 100, `負荷A：${I1} A で ${V1} V`, { cls: 'value' });
    Svg.note(g, 150, 120, `負荷B：${I2} A で ${V2} V`, { cls: 'value' });
    PlayKit.meter(g, 214, 172, look, { max: 3, letter: 'Ω', cls: 'q-active', ghost: guess, readingY: 212 });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（内部抵抗）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ⑤ 起電力 E = V + rI
  function runEmfBasic({ V, I, r }, guess) {
    const E = V + r * I;
    return { ...predicted(guess, E, 'V', `${V} + ${r} × ${I} = ${num(E)} V（電流 0 なら rI も 0）`), meter: E, lamps: [], burst: null, reading: volts(E) };
  }

  function drawEmfBasic(g, { V, I, r }, guess, look) {
    drawCell(g, look, { eText: 'E ？', rText: `r ${r} Ω`, withSwitch: false });
    Svg.resistor(g, CELL.right, CELL.mid, { vertical: true });
    Svg.note(g, 150, 110, `${I} A 流れて端子 ${V} V`, { cls: 'value' });
    PlayKit.meter(g, 214, 172, look, { max: 24, letter: 'V', cls: 'q-voltage', ghost: guess, readingY: 212 });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（起電力 E）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ⑥ 最大電力 E² ÷ 4r（R = r の時）
  function runMaxPowerBasic({ E, r }, guess) {
    const P = (E * E) / (4 * r);
    return { ...predicted(guess, P, 'W', `<var>R</var> = <var>r</var> で電流 ${num(E / (2 * r))} A、端子 ${num(E / 2)} V、${num(P)} W`), meter: P, lamps: [1], burst: null, reading: `${num(P)} W` };
  }

  function drawMaxPowerBasic(g, { E, r }, guess, look) {
    drawCell(g, look, { eText: `E ${E} V`, rText: `r ${r} Ω` });
    Svg.heater(g, CELL.right, CELL.mid, { level: look.lamps[0] || 0 });
    Svg.note(g, CELL.right - 16, CELL.mid + 26, `R = r = ${r} Ω`, { cls: 'value q-active', anchor: 'end' });
    PlayKit.meter(g, 214, CELL.top, look, { max: 40, letter: 'W', cls: 'q-active', ghost: guess, readingY: CELL.top + 40 });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（電熱線の電力）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[CELL.right, CELL.mid]] };
  }

  const jobs = [
    {
      // I = E ÷ (R + r) を直列の本数で：起電力も内部抵抗も本数倍
      kind: 'count',
      needs: 2, // 失敗したら準備の③（電流）から
      cases: [[1.2, 0.2, 5, 1], [1.2, 0.25, 5, 0.8], [1.2, 0.5, 10, 0.4], [1.2, 0.5, 6, 0.6], [1.5, 0.1, 12, 0.6], [1.5, 0.5, 5, 0.5], [1.5, 0.5, 3, 1], [1.5, 0.5, 6, 1], [2, 0.5, 8, 0.8], [2, 0.5, 3, 1], [1.2, 0.2, 2, 1], [1.5, 0.5, 10, 0.6]]
        .map(([E, r, R, Ir]) => ({ E, r, R, Ir })),
      count: { min: 1, max: 8, unit: '本' },
      request: ({ Ir }) => `電球を定格の ${Ir} A で光らせたい。乾電池を直列に何本？`,
      answer: ({ E, r, R, Ir }) => (R * Ir) / (E - r * Ir),
      run: runCellsJob,
      draw: drawCellsJob,
    },
    {
      // 最大電力：R = r
      kind: 'dial',
      needs: 5, // 失敗したら準備の⑥（最大電力）から
      cases: [[6, 1], [12, 2], [9, 1.5], [12, 3], [6, 0.5], [12, 4], [10, 2.5], [8, 2], [9, 3], [6, 1.5]].map(([E, r]) => ({ E, r })),
      dial: { name: '電熱線の抵抗', symbol: 'R', unit: 'Ω', min: 0.5, max: 10, step: 0.5 },
      request: () => '電熱線をいちばん熱くしたい。抵抗 <var>R</var> は？',
      answer: ({ r }) => r,
      run: runBestLoadJob,
      draw: drawBestLoadJob,
    },
    {
      // r = (E − V) ÷ I：開放の電圧と、つないだ時の電圧・電流から内部抵抗を出す
      kind: 'probe',
      needs: 3, // 失敗したら準備の④（2つの測定から r）から
      cases: [
        [[1.6, 1.2], [1.2, 0.5], [1.5, 0.4], [1.4, 0.8]], [[1.2, 0.4], [1.8, 1.6], [1.4, 0.5], [1.5, 0.5]],
        [[1.8, 2], [1.2, 0.5], [1.4, 0.8], [1.6, 0.5]], [[1.4, 0.5], [1.5, 0.5], [1.4, 1.5], [1.2, 0.4]],
        [[1.5, 0.4], [1.2, 0.5], [1.6, 2], [1.4, 0.8]], [[1.8, 0.5], [1.6, 1.2], [1.2, 0.5], [1.5, 0.5]],
        [[1.2, 0.5], [1.4, 0.8], [1.8, 1.6], [1.8, 0.4]], [[1.5, 0.5], [1.2, 0.4], [1.4, 0.8], [1.6, 1.2]],
      ].map((cells) => ({ cells: cells.map(([E, r]) => ({ E, r })) })),
      probe: {
        parts: BATTERY_XS.length,
        hint: `電池をタップすると、テスターが開放の電圧と ${LOAD_R} Ω をつないだ時の電圧を測る`,
        measure: ({ cells }, i) => underLoad(cells[i]),
        reading: (V) => `つなぐと ${num(V)} V`,
      },
      action: 'これを交換する',
      request: () => `内部抵抗が ${OLD_R} Ω より大きい古い電池はどれ？`,
      answer: ({ cells }) => cells.findIndex(({ r }) => r > OLD_R),
      run: runOldCellProbe,
      draw: drawOldCellProbe,
    },
  ];

  // 準備（前提の知識）：この順に1つずつ。know は「使う知識」で、問いの上にいつも見せる
  const basics = [
    {
      title: '電池の中の電圧降下',
      kind: 'dial',
      cases: [[0.5, 2], [1, 1.5], [0.2, 5], [2, 0.5], [0.5, 3], [1.5, 2], [0.4, 5], [3, 0.5]].map(([r, I]) => ({ r, I })),
      dial: { name: '予想', symbol: 'rI', unit: 'V', min: 0, max: 4, step: 0.5 },
      know: '電池の中にも抵抗 <var>r</var>（内部抵抗）がある。電流 <var>I</var> が流れると、電池の中で <var>r</var> × <var>I</var> だけ電圧が下がる（オームの法則）',
      request: () => '電池の中の <var>r</var> の電圧は？',
      answer: ({ r, I }) => r * I,
      run: runDropBasic,
      draw: drawDropBasic,
    },
    {
      title: '端子電圧',
      kind: 'dial',
      cases: [[6, 1, 1], [12, 0.5, 4], [9, 1.5, 2], [1.5, 0.5, 1], [24, 2, 3], [12, 1, 2.5], [6, 0.5, 5], [10, 2, 2]].map(([E, r, I]) => ({ E, r, I })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 24, step: 0.5 },
      know: '電池の外に出てくる電圧（端子電圧）は、起電力 <var>E</var> から中で下がった分を引いたもの：<var>V</var> = <var>E</var> − <var>rI</var>',
      request: () => '端子の電圧計は？',
      answer: ({ E, r, I }) => E - r * I,
      run: runTerminalBasic,
      draw: drawTerminalBasic,
    },
    {
      title: '電流',
      kind: 'dial',
      cases: [[6, 1, 5], [12, 1, 3], [9, 0.5, 2.5], [1.5, 0.5, 2.5], [24, 2, 6], [10, 1, 4], [12, 2, 4], [6, 0.5, 1]].map(([E, r, R]) => ({ E, r, R })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 6, step: 0.5 },
      know: '電池の中の <var>r</var> と外の負荷 <var>R</var> は直列。電流 <var>I</var> = <var>E</var> ÷ (<var>R</var> + <var>r</var>)',
      request: () => '電流計の針は？',
      answer: ({ E, r, R }) => E / (R + r),
      run: runCurrentBasic,
      draw: drawCurrentBasic,
    },
    {
      title: '2つの測定から内部抵抗',
      kind: 'dial',
      cases: [[11, 2, 10, 4], [5, 1, 3, 3], [9, 1, 6, 3], [1.4, 0.2, 1.2, 0.6], [22, 2, 19, 5], [5.5, 1, 4, 4], [11.5, 1, 10, 2], [8, 2, 5, 5]].map(([V1, I1, V2, I2]) => ({ V1, I1, V2, I2 })),
      dial: { name: '予想', symbol: 'r', unit: 'Ω', min: 0, max: 3, step: 0.5 },
      know: '電流を増やすと、増えた電流 × <var>r</var> だけ端子電圧が下がる。<var>r</var> = (<var>V</var><sub>1</sub> − <var>V</var><sub>2</sub>) ÷ (<var>I</var><sub>2</sub> − <var>I</var><sub>1</sub>)',
      request: () => '内部抵抗 <var>r</var> は？',
      answer: ({ V1, I1, V2, I2 }) => (V1 - V2) / (I2 - I1),
      run: runTwoReadingsBasic,
      draw: drawTwoReadingsBasic,
    },
    {
      title: '起電力',
      kind: 'dial',
      cases: [[10, 4, 0.5], [5, 1, 1], [6, 2, 1.5], [1.2, 0.6, 0.5], [19, 5, 1], [4, 4, 0.5], [10, 2, 1.5], [5, 5, 1]].map(([V, I, r]) => ({ V, I, r })),
      dial: { name: '予想', symbol: 'E', unit: 'V', min: 0, max: 24, step: 0.5 },
      know: '起電力は電流 0 の時の電圧。電流が流れている時の端子電圧に、中で下がった <var>rI</var> を足す：<var>E</var> = <var>V</var> + <var>rI</var>',
      request: () => '起電力 <var>E</var> は？',
      answer: ({ V, I, r }) => V + r * I,
      run: runEmfBasic,
      draw: drawEmfBasic,
    },
    {
      title: '最大電力',
      kind: 'dial',
      cases: [[6, 1], [12, 2], [12, 1], [9, 1.5], [10, 2.5], [6, 0.5], [8, 2], [24, 4]].map(([E, r]) => ({ E, r })),
      dial: { name: '予想', symbol: 'P', unit: 'W', min: 0, max: 40, step: 0.5 },
      know: '負荷の電力は <var>R</var> = <var>r</var> の時にいちばん大きい。その時、電流 <var>E</var> ÷ 2<var>r</var>、端子電圧 <var>E</var> ÷ 2 で、電力 <var>E</var>² ÷ 4<var>r</var>',
      request: () => '<var>R</var> = <var>r</var> の電熱線の電力は？',
      answer: ({ E, r }) => (E * E) / (4 * r),
      run: runMaxPowerBasic,
      draw: drawMaxPowerBasic,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays['internal-resistance'] = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
