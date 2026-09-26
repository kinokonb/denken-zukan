// 理論1「電圧・電流・抵抗とオームの法則」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は「電流・電圧・抵抗とは」から始め、ミッションではオームの法則の3つの形をそれぞれ使う
// （電熱線とヒューズ：I = V ÷ R、乾電池の個数：V = RI、テスターで電熱線を探す：R = V ÷ I）。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const amperes = (value) => Notation.number(value, 2);
  const CELL_V = 1.5; // 乾電池1個の電圧
  const TESTER_V = 3; // テスターが測る物にかける電圧
  const NOTE_Y = 262;
  const LOOP = { left: 40, right: 300, top: 64, bottom: 196, mid: 130 };

  function drawLoop(g, { left, right, top, bottom, mid } = LOOP) {
    Svg.wire(g, [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]]);
  }

  function drawBattery(g, x, y, V) {
    Svg.battery(g, x, y);
    Svg.note(g, x + 20, y + 18, `${V} V`, { cls: 'value q-voltage' });
  }

  // 乾電池 n 個を縦に重ねる（上が＋）。右に「1.5 V × n個 = ○ V」
  function drawCells(g, x, y, n) {
    for (let i = 0; i < n; i++) Svg.battery(g, x, y + (i - (n - 1) / 2) * 13, { sign: i === 0 });
    Svg.note(g, x + 30, y - 8, `${CELL_V} V × ${n}個`, { cls: 'value q-voltage' });
    Svg.note(g, x + 30, y + 10, `= ${num(CELL_V * n)} V`, { cls: 'value q-voltage' });
  }

  function drawAmmeter(g, x, y, look, max, mark = null, ghost = null) {
    PlayKit.meter(g, x, y, look, { max, letter: 'A', cls: 'q-current', mark, ghost });
  }

  // 電熱線の回路（電池・スイッチ・ヒューズ・電流計）で、電流 I が流れた結果。熱さは電流に比例（電圧が一定なので）
  function heaterResult({ V, F }, R) {
    const I = V / R;
    const blown = I > F + 1e-9;
    return {
      I,
      blown,
      enough: near(I, F),
      base: { meter: I, lamps: [I / F], burst: blown ? { fuse: true } : null, reading: blown ? `${amperes(I)} A → 0 A` : `${amperes(I)} A` },
    };
  }

  // ---- ミッション（現場の依頼） ----

  // 電熱線をいちばん熱く、ただしヒューズは飛ばさない（I = V ÷ R がヒューズの定格ちょうど）
  function runHeaterJob({ V, F }, R) {
    const r = heaterResult({ V, F }, R);
    if (r.blown) return { ...r.base, ok: false, reason: `ヒューズが飛んだ！ ${V}÷${R} = ${num(r.I)} A で、${F} A をこえた。<var>R</var> を大きく` };
    if (!r.enough) return { ...r.base, ok: false, reason: `まだ熱くできる。${V}÷${R} = ${num(r.I)} A で、ヒューズは ${F} A まで。<var>R</var> を小さく` };
    return { ...r.base, ok: true, reason: `ぎりぎり！ ${V}÷${R} = ${F} A でヒューズの定格ちょうど。<var>R</var> をこれより小さくすると飛ぶ` };
  }

  function drawHeaterJob(g, { V, F }, R, look) {
    const { left, right, top, bottom, mid } = LOOP;
    const fuseX = 160;
    drawLoop(g);
    drawBattery(g, left, mid, V);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.fuse(g, fuseX, top, { blown: look.broken.fuse });
    Svg.note(g, fuseX, top - 20, `ヒューズ ${F} A`, { cls: 'value q-current', anchor: 'middle' });
    Svg.heater(g, right, mid, { level: look.lamps[0] || 0 });
    Svg.note(g, right - 16, mid, `電熱線 R = ${R} Ω`, { cls: 'value q-active', anchor: 'end' });
    drawAmmeter(g, 176, bottom, look, F * 1.6, F);
    Svg.note(g, 180, NOTE_Y, '電流が多いほど電熱線は熱い。ヒューズは定格をこえると飛ぶ', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]], fuse: [fuseX, top] };
  }

  // 乾電池を重ねて、電球（抵抗 R・定格の電流 Ir）を定格どおりに光らせる（V = RI）
  function runCellsJob({ R, Ir }, n) {
    const V = CELL_V * n;
    const I = V / R;
    const base = { meter: I, lamps: [(I / Ir) ** 2] };
    const math = `${n}個で ${num(V)} V、${num(V)}÷${R} = ${num(I)} A`;
    if (near(I, Ir)) return { ...base, ok: true, burst: null, reading: `${amperes(I)} A`, reason: `定格どおり！ ${R} Ω × ${Ir} A = ${num(V)} V で、乾電池 ${n}個` };
    if (I < Ir) return { ...base, ok: false, burst: null, reading: `${amperes(I)} A`, reason: `暗い。${math}（定格 ${Ir} A）。電池を増やす` };
    return { ...base, ok: false, burst: { lamp: 0 }, reading: `${amperes(I)} A → 0 A`, reason: `切れた！ ${math}（定格 ${Ir} A をこえた）` };
  }

  function drawCellsJob(g, { R, Ir }, n, look) {
    const { left, right, top, bottom, mid } = LOOP;
    drawLoop(g);
    drawCells(g, left, mid, n);
    Svg.knifeSwitch(g, 96, top, { on: look.switchOn });
    Svg.lamp(g, right, mid, { level: look.lamps[0] || 0, broken: look.broken.lamps[0] });
    Svg.note(g, right - 20, mid, `${R} Ω・定格 ${Ir} A`, { cls: 'value', anchor: 'end' });
    drawAmmeter(g, 176, bottom, look, Ir * 2, Ir);
    Svg.note(g, 180, NOTE_Y, '電球の抵抗は一定、定格の電流をこえると切れる決まり', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // ラベルのはがれた電熱線3本から、テスターで測って決まった抵抗の1本を探し、ヒューズつきの回路に取り付ける（R = V ÷ I）
  const PICK = { left: 36, right: 170, top: 64, bottom: 196, mid: 130, fuseX: 120 };
  const TRAY = { xs: [214, 266, 318], y: 96 };
  const PICK_TESTER = [266, 180];

  function runPickJob({ V, F, wires }, i) {
    const R = wires[i];
    const r = heaterResult({ V, F }, R);
    const measured = `${i + 1}番は ${TESTER_V} V ÷ ${num(TESTER_V / R)} A = ${R} Ω`;
    if (r.blown) return { ...r.base, ok: false, reason: `ヒューズが飛んだ！ ${measured}。小さすぎて ${num(r.I)} A 流れた` };
    if (!r.enough) return { ...r.base, ok: false, reason: `ぬるい。${measured}。大きすぎて ${num(r.I)} A しか流れない` };
    return { ...r.base, ok: true, reason: `これだ！ ${measured}。ヒューズの定格ちょうどの ${F} A` };
  }

  function drawPickJob(g, { V, F, wires }, selected, look) {
    const { left, right, top, bottom, mid, fuseX } = PICK;
    const installed = !look.deciding && selected !== null;
    drawLoop(g, PICK);
    drawBattery(g, left, mid, V);
    Svg.knifeSwitch(g, 70, top, { on: look.switchOn });
    Svg.fuse(g, fuseX, top, { blown: look.broken.fuse });
    Svg.note(g, fuseX, top - 20, `ヒューズ ${F} A`, { cls: 'value q-current', anchor: 'middle' });
    if (installed) {
      Svg.heater(g, right, mid, { level: look.lamps[0] || 0 });
      Svg.note(g, right - 16, mid, `${wires[selected]} Ω`, { cls: 'value q-active', anchor: 'end' });
    } else {
      Svg.el(g, 'rect', { x: right - 8, y: mid - 20, width: 16, height: 40, rx: 2, class: 'socket' });
      Svg.note(g, right - 16, mid, 'ここに付ける', { cls: 'faint', anchor: 'end' });
    }
    drawAmmeter(g, (left + right) / 2, bottom, look, F * 1.6, F);
    // 置き場の電熱線（取り付けた1本は回路へ移る）と、テスター
    Svg.note(g, TRAY.xs[1], top - 20, 'ラベルのはがれた電熱線', { cls: 'faint', anchor: 'middle' });
    TRAY.xs.forEach((x, i) => {
      if (installed && i === selected) return;
      Svg.resistor(g, x, TRAY.y);
      Svg.note(g, x, TRAY.y - 22, `${i + 1}`, { cls: 'value', anchor: 'middle' });
    });
    const [tx, ty] = PICK_TESTER;
    Svg.gauge(g, tx, ty, { value: look.probe ? look.probe.needle : 0, max: 2, letter: 'A', cls: 'q-current' });
    Svg.note(g, tx, ty + 40, look.probe ? look.probe.reading : '電熱線をタップ', { cls: look.probe ? 'value q-current' : 'faint', anchor: 'middle' });
    Svg.note(g, tx, ty + 58, `テスター（${TESTER_V} V をかける）`, { cls: 'faint', anchor: 'middle' });
    if (look.probe && !installed) Svg.leads(g, PICK_TESTER, [[TRAY.xs[look.probe.index] - 20, TRAY.y], [TRAY.xs[look.probe.index] + 20, TRAY.y]]);
    // タップできる所（決めている間だけ）。測っている電熱線は実線の輪
    if (look.deciding) {
      TRAY.xs.forEach((x, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: TRAY.y, r: 23, class: 'job-tap-ring' });
      });
    }
    return { lamps: [[right, mid]], fuse: [fuseX, top] };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く（または値を決める）→ スイッチ → 本物とくらべる ----

  // 電流の向き（電池の＋から出て、回路をひと回りして −へ戻る）
  function drawCurrentArrows(g) {
    Svg.arrow(g, 124, LOOP.top - 14, 152, LOOP.top - 14, { cls: 'q-current', width: 1.5 });
    Svg.arrow(g, 262, LOOP.bottom + 14, 234, LOOP.bottom + 14, { cls: 'q-current', width: 1.5 });
  }

  // ① 電流：回路のどこで測っても同じ（抵抗を通っても減らない）
  const UPPER_METER = [200, LOOP.top];

  function runCurrentBasic({ I }, guess) {
    return { ...predicted(guess, I, 'A', '電流はひと回りの道のどこでも同じ。抵抗を通っても減らない'), meter: I, lamps: [], burst: null, reading: `${amperes(I)} A` };
  }

  function drawCurrentBasic(g, { I }, guess, look) {
    const { left, right, bottom, mid } = LOOP;
    drawLoop(g);
    Svg.battery(g, left, mid);
    Svg.knifeSwitch(g, 84, LOOP.top, { on: look.switchOn });
    drawCurrentArrows(g);
    Svg.resistor(g, right, mid, { vertical: true });
    Svg.note(g, right - 16, mid, '抵抗', { cls: 'value q-active', anchor: 'end' });
    const [ux, uy] = UPPER_METER;
    Svg.gauge(g, ux, uy, { value: look.meter, max: 4, letter: 'A', cls: 'q-current' });
    Svg.note(g, ux, uy + 40, `上 ${amperes(I)} A`, { cls: 'value q-current', anchor: 'middle' });
    drawAmmeter(g, 176, bottom, look, 4, null, guess);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ② 電圧：乾電池を重ねると電圧は足し算。抵抗が同じなら電流も同じ倍率で増える（比例）
  function runVoltageBasic({ I1, n }, guess) {
    const I = I1 * n;
    return { ...predicted(guess, I, 'A', `電圧が ${n}倍（${num(CELL_V * n)} V）なので、電流も ${n}倍の ${num(I)} A`), meter: I, lamps: [], burst: null, reading: `${amperes(I)} A` };
  }

  function drawVoltageBasic(g, { I1, n }, guess, look) {
    const { left, right, bottom, mid } = LOOP;
    drawLoop(g);
    drawCells(g, left, mid, n);
    Svg.knifeSwitch(g, 96, LOOP.top, { on: look.switchOn });
    Svg.resistor(g, right, mid, { vertical: true });
    Svg.note(g, right - 16, mid, '同じ抵抗', { cls: 'value q-active', anchor: 'end' });
    Svg.note(g, 200, 30, `乾電池1個のとき ${num(I1)} A`, { cls: 'value q-current', anchor: 'middle' });
    drawAmmeter(g, 176, bottom, look, 4, null, guess);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ③ 抵抗：電池が同じなら、抵抗が k 倍で電流は k 分の1（反比例）
  function runResistanceBasic({ R1, I1, R2 }, guess) {
    const I2 = (I1 * R1) / R2;
    const change = R2 > R1 ? [`${R2 / R1}倍`, `${R2 / R1}分の1`] : [`${R1 / R2}分の1`, `${R1 / R2}倍`];
    return { ...predicted(guess, I2, 'A', `抵抗が ${change[0]}なので、電流は ${change[1]}の ${num(I2)} A`), meter: I2, lamps: [], burst: null, reading: `${amperes(I2)} A` };
  }

  function drawResistanceBasic(g, { R1, I1, R2 }, guess, look) {
    const { left, right, bottom, mid } = LOOP;
    drawLoop(g);
    Svg.battery(g, left, mid);
    Svg.note(g, left + 20, mid + 18, '同じ電池', { cls: 'value q-voltage' });
    Svg.knifeSwitch(g, 84, LOOP.top, { on: look.switchOn });
    Svg.resistor(g, right, mid, { vertical: true });
    Svg.note(g, right - 16, mid, `R = ${R2} Ω`, { cls: 'value q-active', anchor: 'end' });
    Svg.note(g, 200, 30, `さっきは ${R1} Ω で ${num(I1)} A`, { cls: 'value', anchor: 'middle' });
    drawAmmeter(g, 176, bottom, look, 6, null, guess);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ④ オームの法則とヒューズ：電流を予想する（ヒューズの定格をこえていたら飛ぶ）
  const OHM_FUSE_X = 176;

  function runOhmBasic({ V, R, F }, guess) {
    const I = V / R;
    const blown = I > F + 1e-9;
    const why = `${V} V ÷ ${R} Ω = ${num(I)} A${blown ? `。ヒューズ ${F} A をこえたので飛んだ` : ''}`;
    return {
      ...predicted(guess, I, 'A', why),
      meter: I,
      lamps: [],
      burst: blown ? { fuse: true } : null,
      reading: blown ? `${amperes(I)} A → 0 A` : `${amperes(I)} A`,
    };
  }

  function drawOhmBasic(g, { V, R, F }, guess, look) {
    const { left, right, top, bottom, mid } = LOOP;
    drawLoop(g);
    drawBattery(g, left, mid, V);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.fuse(g, OHM_FUSE_X, top, { blown: look.broken.fuse });
    Svg.note(g, OHM_FUSE_X, top - 20, `ヒューズ ${F} A`, { cls: 'value q-current', anchor: 'middle' });
    Svg.resistor(g, right, mid, { vertical: true });
    Svg.note(g, right - 16, mid, `R = ${R} Ω`, { cls: 'value q-active', anchor: 'end' });
    drawAmmeter(g, 176, bottom, look, 6, F, guess);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想。赤い印はヒューズの定格', { cls: 'faint', anchor: 'middle' });
    return { lamps: [], fuse: [OHM_FUSE_X, top] };
  }

  // ⑤ 定格と V = RI：電球の抵抗と定格の電流から、電池の電圧を決める
  function runRatedBasic({ R, Ir }, V) {
    const I = V / R;
    const base = { meter: I, lamps: [(I / Ir) ** 2] };
    if (near(I, Ir)) return { ...base, ok: true, burst: null, reading: `${amperes(I)} A`, reason: `定格どおり！ ${R} Ω × ${Ir} A = ${V} V` };
    if (I < Ir) return { ...base, ok: false, burst: null, reading: `${amperes(I)} A`, reason: `暗い。${V}÷${R} = ${num(I)} A で、定格 ${Ir} A に足りない。電圧を上げる` };
    return { ...base, ok: false, burst: { lamp: 0 }, reading: `${amperes(I)} A → 0 A`, reason: `切れた！ ${V}÷${R} = ${num(I)} A で、定格 ${Ir} A をこえた` };
  }

  function drawRatedBasic(g, { R, Ir }, V, look) {
    const { left, right, top, bottom, mid } = LOOP;
    drawLoop(g);
    drawBattery(g, left, mid, V);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.lamp(g, right, mid, { level: look.lamps[0] || 0, broken: look.broken.lamps[0] });
    Svg.note(g, right - 20, mid, `${R} Ω・定格 ${Ir} A`, { cls: 'value', anchor: 'end' });
    drawAmmeter(g, 176, bottom, look, Ir * 2, Ir);
    Svg.note(g, 180, NOTE_Y, '電球の抵抗は一定、定格の電流をこえると切れる決まり', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // ⑥ 抵抗を測る：テスターが 3 V をかけて測った電流から、抵抗を出す（R = V ÷ I）
  const MEASURE = { x: 180, y: 84, tester: [180, 176] };

  function runMeasureBasic({ R }, guess) {
    const I = TESTER_V / R;
    return { ...predicted(guess, R, 'Ω', `${TESTER_V} V ÷ ${num(I)} A = ${R} Ω`), meter: I, lamps: [], burst: null, reading: `${R} Ω` };
  }

  function drawMeasureBasic(g, { R }, guess, look) {
    const { x, y, tester: [tx, ty] } = MEASURE;
    const I = TESTER_V / R;
    Svg.resistor(g, x, y);
    Svg.note(g, x, y - 24, `R = ${look.reading ?? '？ Ω'}`, { cls: look.reading ? 'value q-active' : 'faint', anchor: 'middle' });
    // テスターは当ててあり、針はもう止まっている（読みは問いにも書いてある）
    Svg.gauge(g, tx, ty, { value: I, max: 2, letter: 'A', cls: 'q-current' });
    Svg.note(g, tx, ty + 40, `${amperes(I)} A`, { cls: 'value q-current', anchor: 'middle' });
    Svg.note(g, tx, ty + 58, `テスター（${TESTER_V} V をかける）`, { cls: 'faint', anchor: 'middle' });
    Svg.leads(g, [tx, ty], [[x - 20, y], [x + 20, y]]);
    return { lamps: [] };
  }

  const jobs = [
    {
      // I = V ÷ R：ヒューズの定格ちょうどの電流にする（それより R を小さくすると飛ぶ）
      kind: 'dial',
      needs: 3, // 失敗したら準備の④（オームの法則とヒューズ）から
      cases: [[12, 2], [12, 3], [24, 2], [6, 2], [18, 3], [24, 3], [9, 3], [12, 4], [24, 4], [20, 2], [12, 0.5], [9, 0.5]]
        .map(([V, F]) => ({ V, F })),
      dial: { name: '電熱線の抵抗', symbol: 'R', unit: 'Ω', min: 1, max: 30, step: 1 },
      request: ({ F }) => `電熱線をいちばん熱くしたい。ヒューズ ${F} A を飛ばさない <var>R</var> は？`,
      answer: ({ V, F }) => V / F,
      run: runHeaterJob,
      draw: drawHeaterJob,
    },
    {
      // V = RI：定格の電流を流す電圧を、乾電池の個数でつくる
      kind: 'count',
      needs: 4, // 失敗したら準備の⑤（定格）から
      cases: [[6, 0.5], [9, 0.5], [12, 0.5], [15, 0.5], [10, 0.3], [20, 0.3], [6, 1], [4, 1.5], [30, 0.25], [24, 0.5], [3, 1]]
        .map(([R, Ir]) => ({ R, Ir })),
      count: { min: 1, max: 8 },
      request: () => `電球を定格どおりに光らせたい。乾電池（1個 ${CELL_V} V）は何個いる？`,
      answer: ({ R, Ir }) => Math.round((R * Ir) / CELL_V),
      run: runCellsJob,
      draw: drawCellsJob,
    },
    {
      // R = V ÷ I：テスターの電流から抵抗を出して、決まった抵抗の電熱線を探す
      kind: 'probe',
      needs: 5, // 失敗したら準備の⑥（抵抗を測る）から
      cases: [[12, 2, [3, 6, 12]], [12, 3, [4, 2, 6]], [6, 2, [6, 2, 3]], [24, 2, [12, 6, 4]], [18, 3, [4, 12, 6]], [12, 1, [6, 12, 4]], [6, 3, [3, 6, 2]], [24, 4, [6, 3, 12]], [9, 3, [6, 3, 2]]]
        .map(([V, F, wires]) => ({ V, F, wires })),
      probe: {
        parts: TRAY.xs.length,
        hint: `電熱線をタップすると、テスターが ${TESTER_V} V をかけて電流を測る`,
        measure: ({ wires }, i) => TESTER_V / wires[i],
        reading: (I) => `${amperes(I)} A`,
      },
      action: 'これを取り付ける',
      request: ({ V, F }) => `${V / F} Ω の電熱線はどれ？ テスターで測って取り付けよう`,
      answer: ({ V, F, wires }) => wires.indexOf(V / F),
      run: runPickJob,
      draw: drawPickJob,
    },
  ];

  // 準備（前提の知識）：この順に1つずつ。know は「使う知識」で、問いの上にいつも見せる
  const basics = [
    {
      title: '電流',
      kind: 'dial',
      cases: [0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((I) => ({ I })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 4, step: 0.5 },
      know: '電流＝電気の流れの量（単位 A）。電池の＋から出て回路をひと回りし、−へ戻る',
      request: ({ I }) => `スイッチを入れると、上の電流計は ${num(I)} A。下の電流計は？`,
      answer: ({ I }) => I,
      run: runCurrentBasic,
      draw: drawCurrentBasic,
    },
    {
      title: '電圧',
      kind: 'dial',
      cases: [[0.5, 2], [0.5, 3], [0.5, 4], [0.5, 5], [0.5, 6], [1, 2], [1, 3], [1, 4], [1.5, 2]].map(([I1, n]) => ({ I1, n })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 4, step: 0.5 },
      know: '電圧＝電流を押す力（単位 V）。乾電池を重ねると電圧は足し算。抵抗が同じなら、電流は電圧に比例する',
      request: ({ n }) => `乾電池を ${n}個重ねた。電流計の針はどこを指す？`,
      answer: ({ I1, n }) => I1 * n,
      run: runVoltageBasic,
      draw: drawVoltageBasic,
    },
    {
      title: '抵抗',
      kind: 'dial',
      cases: [[4, 3, 12], [6, 2, 3], [6, 2, 12], [3, 4, 6], [12, 1, 4], [8, 3, 4], [10, 1, 20], [5, 2, 20], [4, 1.5, 2], [2, 3, 6]]
        .map(([R1, I1, R2]) => ({ R1, I1, R2 })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 6, step: 0.5 },
      know: '抵抗＝電流の流れにくさ（単位 Ω）。電池が同じなら、抵抗が2倍で電流は半分、半分なら2倍（反比例）',
      request: ({ R2 }) => `抵抗を ${R2} Ω にかえた。電流計の針はどこを指す？`,
      answer: ({ R1, I1, R2 }) => (I1 * R1) / R2,
      run: runResistanceBasic,
      draw: drawResistanceBasic,
    },
    {
      title: 'オームの法則',
      kind: 'dial',
      cases: [[12, 6, 3], [12, 3, 3], [9, 3, 5], [6, 2, 2], [24, 8, 5], [12, 4, 2], [6, 12, 1], [10, 4, 3], [18, 4, 5], [24, 6, 3]]
        .map(([V, R, F]) => ({ V, R, F })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 6, step: 0.5 },
      know: '電流 = 電圧 ÷ 抵抗（<var>I</var> = <var>V</var> ÷ <var>R</var>）。ヒューズは書いてある電流をこえると飛んで、回路を切る',
      request: () => '電流計の針はどこを指す？ 予想の針を置こう',
      answer: ({ V, R }) => V / R,
      run: runOhmBasic,
      draw: drawOhmBasic,
    },
    {
      title: '定格',
      kind: 'dial',
      cases: [[12, 0.5], [6, 0.5], [20, 0.3], [10, 0.5], [24, 0.5], [8, 1], [6, 1.5], [30, 0.4], [16, 0.25], [4, 2]].map(([R, Ir]) => ({ R, Ir })),
      dial: { name: '電池の電圧', symbol: 'V', unit: 'V', min: 1, max: 24, step: 1 },
      know: '定格＝決められた使い方。定格の電流でちょうどの明るさ、こえると切れる。要る電圧は <var>V</var> = <var>R</var> × <var>I</var>',
      request: ({ R, Ir }) => `電球（${R} Ω・定格 ${Ir} A）をちょうど定格で光らせる電池の電圧は？`,
      answer: ({ R, Ir }) => R * Ir,
      run: runRatedBasic,
      draw: drawRatedBasic,
    },
    {
      title: '抵抗を測る',
      kind: 'dial',
      cases: [2, 3, 4, 5, 6, 10, 12, 15].map((R) => ({ R })),
      dial: { name: '予想', symbol: 'R', unit: 'Ω', min: 1, max: 20, step: 1 },
      action: '確かめる',
      know: `抵抗 = 電圧 ÷ 電流（<var>R</var> = <var>V</var> ÷ <var>I</var>）。テスターは ${TESTER_V} V をかけて、流れた電流を測る`,
      request: ({ R }) => `テスターの読みは ${amperes(TESTER_V / R)} A。この抵抗は何 Ω？`,
      answer: ({ R }) => R,
      run: runMeasureBasic,
      draw: drawMeasureBasic,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays.ohm = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
