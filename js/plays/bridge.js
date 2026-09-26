// 理論「ブリッジ回路」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は分圧（点C の電位）から始め、C と D の電位差、つり合いの比、対辺の積、つり合えば検流計の線は無いのと同じ、
// ホイートストンブリッジで測る、へ進む。現場は電池 12 V のブリッジと、真ん中が 0 の検流計（mA）。計算は js/calc/dc-circuit.js。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const NOTE_Y = 262;
  const E = 12; // 現場の電池
  const GALVANOMETER_R = 10;
  const BR = { battery: 30, left: 110, right: 280, top: 50, bottom: 206, mid: 128, meter: 205 };
  const milli = (amperes) => `${num(amperes * 1000)} mA`;

  // ブリッジの枠（電池・スイッチ・左右の辺の導線・点C・D）。arms は辺ごとの [文字, 部品を描くか]。
  // 右下の辺（R4）を自分で描く時は drawR4 を false に
  function drawFrame(g, look, { labels, drawR4 = true, galvanometer = true, withSwitch = true, batteryText = `${E} V` }) {
    const { battery, left, right, top, bottom, mid, meter } = BR;
    Svg.wire(g, [[battery, mid], [battery, top], [right, top], [right, mid]]);
    Svg.wire(g, [[left, top], [left, bottom]]);
    Svg.wire(g, [[right, mid], [right, bottom], [battery, bottom], [battery, mid]]);
    Svg.battery(g, battery, mid);
    Svg.note(g, battery + 18, mid + 24, batteryText, { cls: 'value q-voltage' });
    if (withSwitch) Svg.knifeSwitch(g, 64, top, { on: look.switchOn });
    // 辺の文字はどれも抵抗の右に書く（左の辺は内側、右の辺は外側）
    const arms = [[left, 89], [left, 167], [right, 89], [right, 167]];
    arms.forEach(([x, y], i) => {
      if (i === 3 && !drawR4) return;
      Svg.resistor(g, x, y, { vertical: true });
      Svg.note(g, x + 14, y, labels[i], { cls: 'value q-active' });
    });
    for (const [x, name, anchor] of [[left, 'C', 'end'], [right, 'D', 'start']]) {
      Svg.el(g, 'circle', { cx: x, cy: mid, r: 3.5, class: 'dot ink' });
      Svg.note(g, anchor === 'end' ? x - 10 : x + 10, mid - 10, name, { cls: 'value', anchor });
    }
    if (galvanometer) {
      Svg.wire(g, [[left, mid], [meter - 24, mid]]);
      Svg.wire(g, [[meter + 24, mid], [right, mid]]);
    }
  }

  // 検流計（真ん中が 0、C → D の電流で右に振れる）
  const galvanometer = (g, look, { ghost = null } = {}) =>
    PlayKit.meter(g, BR.meter, BR.mid, look, { min: -50, max: 50, letter: 'G', cls: 'q-current', mark: 0, ghost, readingY: BR.mid + 40 });

  const gCurrent = ({ R1, R2, R3, R4 }) => DcCircuit.bridge({ E, R1, R2, R3, R4, Rg: GALVANOMETER_R }).Ig;

  // ---- ミッション（現場の依頼） ----

  // 検流計を 0 にする R3（R1R4 = R2R3）
  function runBalanceJob({ R1, R2, R4 }, R3) {
    const Ig = gCurrent({ R1, R2, R3, R4 });
    const base = { meter: Ig * 1000, lamps: [], burst: null, reading: milli(Ig) };
    const need = `<var>R</var><sub>3</sub> = <var>R</var><sub>1</sub><var>R</var><sub>4</sub> ÷ <var>R</var><sub>2</sub> = ${R1} × ${R4} ÷ ${R2} = ${num((R1 * R4) / R2)} Ω`;
    if (near(Ig, 0)) return { ...base, ok: true, reason: `0 になった！ ${need}（対辺の積 ${R1 * R4} = ${R2 * R3}）` };
    return { ...base, ok: false, reason: `${Ig > 0 ? 'C → D' : 'D → C'} に ${milli(Math.abs(Ig))}。<var>R</var><sub>3</sub> を${Ig > 0 ? '小さく' : '大きく'}。対辺の積 ${R1 * R4} と ${R2 * R3}` };
  }

  function drawBalanceJob(g, { R1, R2, R4 }, R3, look) {
    drawFrame(g, look, { labels: [`R₁ ${R1} Ω`, `R₂ ${R2} Ω`, `R₃ ${R3} Ω`, `R₄ ${R4} Ω`] });
    galvanometer(g, look);
    Svg.note(g, 180, NOTE_Y, `電池 ${E} V、検流計の抵抗 ${GALVANOMETER_R} Ω`, { cls: 'faint', anchor: 'middle' });
    return { lamps: [[BR.meter, BR.mid]] };
  }

  // R4 の所に、同じ抵抗（1個 r Ω）を何個直列につなぐとつり合うか
  function runChainJob({ R1, R2, R3, r }, n) {
    const R4 = n * r;
    const Ig = gCurrent({ R1, R2, R3, R4 });
    const base = { meter: Ig * 1000, lamps: [], burst: null, reading: milli(Ig) };
    const need = `<var>R</var><sub>4</sub> = <var>R</var><sub>2</sub><var>R</var><sub>3</sub> ÷ <var>R</var><sub>1</sub> = ${R2} × ${R3} ÷ ${R1} = ${num((R2 * R3) / R1)} Ω`;
    if (near(Ig, 0)) return { ...base, ok: true, reason: `0 になった！ ${need} = ${r} Ω × ${n}個` };
    return { ...base, ok: false, reason: `${n}個で ${R4} Ω。${Ig > 0 ? 'C → D' : 'D → C'} に ${milli(Math.abs(Ig))}。${need}` };
  }

  function drawChainJob(g, { R1, R2, R3, r }, n, look) {
    const { right, mid, bottom } = BR;
    drawFrame(g, look, { labels: [`R₁ ${R1} Ω`, `R₂ ${R2} Ω`, `R₃ ${R3} Ω`, ''], drawR4: false });
    // 小さな抵抗を n 個、D から下へ並べる
    const span = (bottom - mid - 16) / 8;
    for (let i = 0; i < n; i++) {
      const y = mid + 10 + i * span;
      Svg.el(g, 'rect', { x: right - 6, y, width: 12, height: span - 2, rx: 1.5, class: 'resistor q-active' });
    }
    Svg.note(g, right, bottom + 18, `1個 ${r} Ω × ${n}個`, { cls: 'value q-active', anchor: 'end' });
    galvanometer(g, look);
    Svg.note(g, 180, NOTE_Y, `電池 ${E} V、検流計の抵抗 ${GALVANOMETER_R} Ω`, { cls: 'faint', anchor: 'middle' });
    return { lamps: [[BR.meter, BR.mid]] };
  }

  // C と同じ電位の点を、右の4本の抵抗の間（D₁〜D₃）から探す。テスターは下の導線との電圧を測る
  const TAP_YS = [89, 128, 167];
  const tapVoltages = ({ chain }) => {
    const total = chain.reduce((sum, R) => sum + R, 0);
    return [1, 2, 3].map((k) => (E * chain.slice(k).reduce((sum, R) => sum + R, 0)) / total);
  };
  const cVoltage = ({ R1, R2 }) => (E * R2) / (R1 + R2);

  function runTapProbe(values, i) {
    const VC = cVoltage(values);
    const taps = tapVoltages(values);
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    const c = `C は ${E} × ${values.R2} ÷ (${values.R1} + ${values.R2}) = ${num(VC)} V`;
    if (near(taps[i], VC)) return { ...base, ok: true, reason: `当たり！ ${c}、D${'₁₂₃'[i]} も ${num(taps[i])} V。つなぐと検流計は 0` };
    return { ...base, ok: false, reason: `D${'₁₂₃'[i]} は ${num(taps[i])} V。${c}` };
  }

  function drawTapProbe(g, values, selected, look) {
    const { battery, left, right, top, bottom, mid } = BR;
    Svg.wire(g, [[battery, mid], [battery, top], [right, top], [right, bottom], [battery, bottom], [battery, mid]]);
    Svg.wire(g, [[left, top], [left, bottom]]);
    Svg.battery(g, battery, mid);
    Svg.note(g, battery + 18, mid + 24, `${E} V`, { cls: 'value q-voltage' });
    Svg.resistor(g, left, 89, { vertical: true });
    Svg.resistor(g, left, 167, { vertical: true });
    Svg.note(g, left - 14, 89, `R₁ ${values.R1} Ω`, { cls: 'value q-active', anchor: 'end' });
    Svg.note(g, left - 14, 167, `R₂ ${values.R2} Ω`, { cls: 'value q-active', anchor: 'end' });
    Svg.el(g, 'circle', { cx: left, cy: mid, r: 3.5, class: 'dot ink' });
    Svg.note(g, left - 10, mid - 10, 'C', { cls: 'value', anchor: 'end' });
    // 右の4本（上から）と、その間の点 D₁〜D₃
    const ends = [top, ...TAP_YS, bottom];
    values.chain.forEach((R, k) => {
      const y = (ends[k] + ends[k + 1]) / 2;
      Svg.el(g, 'rect', { x: right - 6, y: y - 11, width: 12, height: 22, rx: 1.5, class: 'resistor q-active' });
      Svg.note(g, right + 12, y, `${R} Ω`, { cls: 'value q-active' });
    });
    TAP_YS.forEach((y, i) => {
      Svg.el(g, 'circle', { cx: right, cy: y, r: 3, class: 'dot ink' });
      Svg.note(g, right - 10, y - 8, `D${'₁₂₃'[i]}`, { cls: 'value', anchor: 'end' });
    });
    const tester = [195, 150];
    Svg.gauge(g, ...tester, { value: look.probe ? look.probe.needle : 0, max: E, letter: 'V', cls: 'q-voltage' });
    Svg.note(g, tester[0], tester[1] + 38, look.probe ? look.probe.reading : 'テスター（下の導線との電圧）', { cls: look.probe ? 'value q-voltage' : 'faint', anchor: 'middle' });
    if (look.probe) Svg.leads(g, tester, [[right, TAP_YS[look.probe.index]], [right - 30, bottom]]);
    if (!look.deciding) Svg.note(g, 195, 96, `C は ${num(cVoltage(values))} V`, { cls: 'value q-voltage', anchor: 'middle' });
    if (look.deciding) {
      TAP_YS.forEach((y, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: right, cy: y, r: 15, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, '同じ電位の2点を検流計でつなぐと、電流は流れない', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  const SIDE = [195, 170];

  // ① 分圧：点C の電位 = E × R2 ÷ (R1 + R2)
  function runDividerBasic({ V, R1, R2 }, guess) {
    const VC = (V * R2) / (R1 + R2);
    return { ...predicted(guess, VC, 'V', `${V} × ${R2} ÷ (${R1} + ${R2}) = ${num(VC)} V`), meter: VC, lamps: [], burst: null, reading: `${num(VC)} V` };
  }

  function drawDividerBasic(g, { V, R1, R2 }, guess, look) {
    const { battery, left, top, bottom, mid } = BR;
    Svg.wire(g, [[battery, mid], [battery, top], [left, top], [left, bottom], [battery, bottom], [battery, mid]]);
    Svg.battery(g, battery, mid);
    Svg.note(g, battery + 18, mid + 24, `${V} V`, { cls: 'value q-voltage' });
    Svg.knifeSwitch(g, 64, top, { on: look.switchOn });
    Svg.resistor(g, left, 89, { vertical: true });
    Svg.resistor(g, left, 167, { vertical: true });
    Svg.note(g, left + 14, 89, `R₁ ${R1} Ω`, { cls: 'value q-active' });
    Svg.note(g, left + 14, 167, `R₂ ${R2} Ω`, { cls: 'value q-active' });
    Svg.el(g, 'circle', { cx: left, cy: mid, r: 3.5, class: 'dot ink' });
    Svg.note(g, left + 10, mid - 8, 'C', { cls: 'value' });
    PlayKit.meter(g, ...SIDE, look, { max: 24, letter: 'V', cls: 'q-voltage', ghost: guess });
    Svg.leads(g, SIDE, [[left, mid], [left + 30, bottom]]);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（C と下の導線の電圧）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ② 電位差：C と D の間の電圧（検流計を外して、電圧計でつなぐ）
  function runDifferenceBasic({ R1, R2, R3, R4 }, guess) {
    const VC = (E * R2) / (R1 + R2);
    const VD = (E * R4) / (R3 + R4);
    return { ...predicted(guess, VC - VD, 'V', `C は ${num(VC)} V、D は ${num(VD)} V、差は ${num(VC - VD)} V`), meter: VC - VD, lamps: [], burst: null, reading: `${num(VC - VD)} V` };
  }

  function drawDifferenceBasic(g, { R1, R2, R3, R4 }, guess, look) {
    drawFrame(g, look, { labels: [`R₁ ${R1} Ω`, `R₂ ${R2} Ω`, `R₃ ${R3} Ω`, `R₄ ${R4} Ω`] });
    PlayKit.meter(g, BR.meter, BR.mid, look, { min: -6, max: 6, letter: 'V', cls: 'q-voltage', mark: 0, ghost: guess, readingY: BR.mid + 40 });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想。電圧計は真ん中が 0、C が高いと右', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ③④⑥ つり合いの抵抗（上下の比が左右で同じ ⇔ 対辺の積が等しい）。予想の値でつないだ時の検流計を見せる。
  // unknown は分からない辺（'R4' か 'R1'）、why はその答えの理由
  function runRatioBasic(unknown, why) {
    return (values, guess) => {
      const answer = unknown === 'R4' ? (values.R2 * values.R3) / values.R1 : (values.R2 * values.R3) / values.R4;
      const Ig = gCurrent({ ...values, [unknown]: guess });
      return { ...predicted(guess, answer, 'Ω', why(values, answer)), meter: Ig * 1000, lamps: [], burst: null, reading: milli(Ig) };
    };
  }

  // names は4つの辺の名前（R4 の所に未知の抵抗 X を入れる時は 'X'）
  function drawRatioBasic(unknown, names = ['R₁', 'R₂', 'R₃', 'R₄']) {
    return (g, values, guess, look) => {
      const keys = ['R1', 'R2', 'R3', 'R4'];
      const labels = keys.map((key, i) => (key === unknown ? `${names[i]} ${guess} Ω？` : `${names[i]} ${values[key]} Ω`));
      drawFrame(g, look, { labels });
      galvanometer(g, look);
      Svg.note(g, 180, NOTE_Y, '予想の値でつなぐ。つり合えば検流計は 0', { cls: 'faint', anchor: 'middle' });
      return { lamps: [] };
    };
  }

  // ⑤ つり合えば検流計の線は無いのと同じ：電池の電流 = E ÷ (左右の辺の並列)
  function runTotalBasic({ V, R1, R2, R3, R4 }, guess) {
    const left = R1 + R2;
    const right = R3 + R4;
    const R = (left * right) / (left + right);
    const I = V / R;
    const why = `検流計の線を外すと ${left} Ω と ${right} Ω の並列で ${num(R)} Ω、${V} ÷ ${num(R)} = ${num(I)} A`;
    return { ...predicted(guess, I, 'A', why), meter: I, lamps: [], burst: null, reading: `${num(I)} A` };
  }

  function drawTotalBasic(g, { V, R1, R2, R3, R4 }, guess, look) {
    drawFrame(g, look, { labels: [`R₁ ${R1} Ω`, `R₂ ${R2} Ω`, `R₃ ${R3} Ω`, `R₄ ${R4} Ω`], galvanometer: false, withSwitch: false, batteryText: `${V} V` });
    Svg.el(g, 'line', { x1: BR.left, y1: BR.mid, x2: BR.right, y2: BR.mid, class: 'lead' });
    Svg.note(g, BR.meter, BR.mid - 10, 'つり合い（0 A）', { cls: 'faint', anchor: 'middle' });
    PlayKit.meter(g, 70, BR.top, look, { max: 10, letter: 'A', cls: 'q-current', ghost: guess, readingY: BR.top + 40 });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（電池の電流）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  const jobs = [
    {
      // 対辺の積：可変抵抗 R3 を回して検流計を 0 に
      kind: 'dial',
      needs: 2, // 失敗したら準備の③（つり合いの比）から
      cases: [[10, 20, 30], [4, 8, 10], [6, 4, 10], [12, 8, 20], [5, 10, 24], [9, 6, 14], [8, 12, 27], [15, 5, 8], [3, 9, 33], [20, 25, 40], [7, 14, 50]]
        .map(([R1, R2, R4]) => ({ R1, R2, R4 })),
      dial: { name: '可変抵抗', symbol: 'R_3', unit: 'Ω', min: 1, max: 60, step: 1 },
      request: () => '可変抵抗 <var>R</var><sub>3</sub> を回して、検流計を 0 にしよう',
      answer: ({ R1, R2, R4 }) => (R1 * R4) / R2,
      run: runBalanceJob,
      draw: drawBalanceJob,
    },
    {
      // 対辺の積：R4 の所を、同じ抵抗の直列でつくる
      kind: 'count',
      needs: 3, // 失敗したら準備の④（対辺の積）から
      cases: [[10, 20, 15, 10], [5, 10, 8, 4], [6, 9, 8, 3], [12, 6, 20, 5], [4, 12, 10, 6], [8, 20, 12, 5], [3, 6, 7, 2], [10, 5, 30, 5], [9, 12, 15, 4]]
        .map(([R1, R2, R3, r]) => ({ R1, R2, R3, r })),
      count: { min: 1, max: 8 },
      request: ({ r }) => `<var>R</var><sub>4</sub> の所に ${r} Ω の抵抗を直列に何個つなぐと、つり合う？`,
      answer: ({ R1, R2, R3, r }) => (R2 * R3) / (R1 * r),
      run: runChainJob,
      draw: drawChainJob,
    },
    {
      // 分圧：C と同じ電位の点を、右の抵抗の列から探す
      kind: 'probe',
      needs: 0, // 失敗したら準備の①（分圧）から
      cases: [
        [[1, 2], [4, 4, 3, 1]], [[10, 20], [4, 3, 3, 2]], [[5, 15], [3, 3, 2, 4]],
        [[1, 1], [1, 1, 1, 1]], [[20, 10], [3, 1, 1, 1]], [[1, 3], [1, 1, 5, 1]],
        [[2, 1], [4, 1, 3, 4]], [[20, 10], [3, 3, 2, 4]], [[15, 5], [3, 2, 1, 2]],
      ].map(([[R1, R2], chain]) => ({ R1, R2, chain })),
      probe: {
        parts: TAP_YS.length,
        hint: '点 D₁〜D₃ をタップすると、テスターが下の導線との電圧を測る',
        measure: (values, i) => tapVoltages(values)[i],
        reading: (V) => `${num(V)} V`,
      },
      action: 'ここに検流計をつなぐ',
      request: () => '検流計を C とつないで 0 にしたい。C と同じ電位の点はどれ？',
      answer: (values) => tapVoltages(values).findIndex((V) => near(V, cVoltage(values))),
      run: runTapProbe,
      draw: drawTapProbe,
    },
  ];

  // 準備（前提の知識）：この順に1つずつ。know は「使う知識」で、問いの上にいつも見せる
  const basics = [
    {
      title: '分圧（点の電位）',
      kind: 'dial',
      cases: [[12, 10, 20], [12, 20, 10], [24, 10, 30], [10, 3, 2], [18, 4, 2], [20, 15, 5], [9, 1, 2], [16, 6, 10]].map(([V, R1, R2]) => ({ V, R1, R2 })),
      dial: { name: '予想', symbol: 'V_C', unit: 'V', min: 0, max: 24, step: 0.5 },
      know: '下の導線を 0 V として、そこから測った電圧を「電位」という。直列の2本の間の点C の電位は <var>E</var> × <var>R</var><sub>2</sub> ÷ (<var>R</var><sub>1</sub> + <var>R</var><sub>2</sub>)（理論2 の分圧）',
      request: () => '点C の電位は？ 予想の針を置こう',
      answer: ({ V, R1, R2 }) => (V * R2) / (R1 + R2),
      run: runDividerBasic,
      draw: drawDividerBasic,
    },
    {
      title: 'C と D の電位差',
      kind: 'dial',
      cases: [[10, 20, 20, 20], [20, 10, 10, 20], [1, 2, 1, 1], [3, 1, 1, 3], [1, 1, 1, 3], [1, 3, 1, 1], [2, 1, 1, 1], [1, 1, 3, 1], [5, 1, 1, 1]].map(([R1, R2, R3, R4]) => ({ R1, R2, R3, R4 })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: -6, max: 6, step: 0.5 },
      know: '左の辺で C、右の辺で D の電位をそれぞれ分圧で出し、引き算する。C と D の電位が同じなら、つないでも電流は流れない',
      request: () => 'C と D の間の電圧は？（C が高いと ＋）',
      answer: ({ R1, R2, R3, R4 }) => (E * R2) / (R1 + R2) - (E * R4) / (R3 + R4),
      run: runDifferenceBasic,
      draw: drawDifferenceBasic,
    },
    {
      title: 'つり合いの比',
      kind: 'dial',
      cases: [[10, 20, 15], [2, 4, 3], [5, 10, 12], [4, 6, 10], [3, 9, 5], [8, 4, 20], [6, 9, 8], [12, 4, 30]].map(([R1, R2, R3]) => ({ R1, R2, R3 })),
      dial: { name: '予想', symbol: 'R_4', unit: 'Ω', min: 1, max: 40, step: 1 },
      know: '左の辺の上下の比 <var>R</var><sub>1</sub> : <var>R</var><sub>2</sub> と、右の辺の比 <var>R</var><sub>3</sub> : <var>R</var><sub>4</sub> が同じなら、C と D は同じ電位（つり合い）',
      request: () => '検流計が 0 になる <var>R</var><sub>4</sub> は？',
      answer: ({ R1, R2, R3 }) => (R2 * R3) / R1,
      run: runRatioBasic('R4', ({ R1, R2, R3 }, answer) => `${R1} : ${R2} = ${R3} : <var>R</var><sub>4</sub> なので <var>R</var><sub>4</sub> = ${R2} × ${R3} ÷ ${R1} = ${num(answer)} Ω`),
      draw: drawRatioBasic('R4'),
    },
    {
      title: '対辺の積',
      kind: 'dial',
      cases: [[20, 15, 30], [4, 3, 6], [9, 8, 12], [6, 10, 15], [12, 10, 8], [8, 6, 4], [18, 5, 9], [7, 12, 4]].map(([R2, R3, R4]) => ({ R2, R3, R4 })),
      dial: { name: '予想', symbol: 'R_1', unit: 'Ω', min: 1, max: 40, step: 1 },
      know: '比が同じ ⇔ 向かい合う辺の積が等しい：<var>R</var><sub>1</sub> × <var>R</var><sub>4</sub> = <var>R</var><sub>2</sub> × <var>R</var><sub>3</sub>。どこが分からなくても、この1本の式で出せる',
      request: () => '検流計が 0 になる <var>R</var><sub>1</sub> は？',
      answer: ({ R2, R3, R4 }) => (R2 * R3) / R4,
      run: runRatioBasic('R1', ({ R2, R3, R4 }, answer) => `対辺の積 <var>R</var><sub>1</sub> × ${R4} = ${R2} × ${R3} なので <var>R</var><sub>1</sub> = ${num(answer)} Ω`),
      draw: drawRatioBasic('R1'),
    },
    {
      title: 'つり合えば線は無いのと同じ',
      kind: 'dial',
      cases: [[12, 2, 4, 1, 2], [12, 1, 2, 2, 4], [18, 3, 6, 3, 6], [10, 1, 4, 1, 4], [12, 4, 8, 2, 4], [24, 3, 9, 1, 3], [15, 2, 3, 2, 3], [9, 1, 2, 2, 4]]
        .map(([V, R1, R2, R3, R4]) => ({ V, R1, R2, R3, R4 })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 10, step: 0.5 },
      know: 'つり合ったブリッジの検流計の線には電流が流れない。だから線を外して考えてよく、左の辺（<var>R</var><sub>1</sub> + <var>R</var><sub>2</sub>）と右の辺（<var>R</var><sub>3</sub> + <var>R</var><sub>4</sub>）の並列になる',
      request: () => '電池から流れる電流は？',
      answer: ({ V, R1, R2, R3, R4 }) => V / (((R1 + R2) * (R3 + R4)) / (R1 + R2 + R3 + R4)),
      run: runTotalBasic,
      draw: drawTotalBasic,
    },
    {
      title: 'ホイートストンブリッジで測る',
      kind: 'dial',
      cases: [[10, 100, 23], [10, 100, 47], [10, 100, 15], [100, 1000, 32], [1, 10, 39], [10, 100, 8], [100, 1000, 12], [1, 10, 45]].map(([R1, R2, R3]) => ({ R1, R2, R3 })),
      dial: { name: '予想', symbol: 'X', unit: 'Ω', min: 0, max: 500, step: 10 },
      know: '未知の抵抗 <var>X</var> を <var>R</var><sub>4</sub> の所に入れ、可変抵抗 <var>R</var><sub>3</sub> を回して検流計を 0 にする（零位法）。<var>X</var> = <var>R</var><sub>2</sub> × <var>R</var><sub>3</sub> ÷ <var>R</var><sub>1</sub>',
      request: ({ R3 }) => `可変抵抗 ${R3} Ω で検流計が 0 になった。<var>X</var> は？`,
      answer: ({ R1, R2, R3 }) => (R2 * R3) / R1,
      run: runRatioBasic('R4', ({ R1, R2, R3 }, answer) => `<var>X</var> = ${R2} × ${R3} ÷ ${R1} = ${num(answer)} Ω`),
      draw: drawRatioBasic('R4', ['R₁', 'R₂', 'R₃', 'X']),
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays.bridge = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
