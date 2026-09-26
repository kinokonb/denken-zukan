// 理論「キルヒホッフの法則」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 準備は第1法則（点の電流）と第2法則（1周の電圧）から始め、閉回路の式、向きが反対の電池、負の電流（仮の向き）、
// 点A の電位から電流へ進む。現場は2つの電池の回路（電池1 − R1 − 点A − R2 − 電池2、点A から R3）。計算は js/calc/dc-circuit.js。
// 電流は仮に決めた向き（I1・I2 は点A へ、I3 は下へ）を正とし、負の電流は針が真ん中の 0 から左へ振れる計器で見せる。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const amperes = (value) => `${num(value)} A`;
  const volts = (value) => `${num(value)} V`;
  const NOTE_Y = 262;
  // 2つの電池の回路の位置
  const K = { left: 40, mid: 180, right: 320, top: 64, bottom: 206, y: 135, r1x: 100, r2x: 260, a1x: 146, a2x: 214, r3y: 124, a3y: 172 };

  // 電流計。signed は針が真ん中の 0 から左右に振れる計器（負の電流を見せる）
  function ammeter(g, x, y, look, { max, signed = false, mark = null, ghost = null, readingY }) {
    PlayKit.meter(g, x, y, look, { min: signed ? -max : 0, max, letter: 'A', cls: 'q-current', mark: signed && mark === null ? 0 : mark, ghost, readingY });
  }

  // 2つの電池の回路。load は R3 の所の部品（'resistor'・'lamp'・'heater'）、level はその明るさ・熱さ。r3Left は R3 の文字を左に書く（長い時）
  function drawTwoSource(g, look, { e1, e2, r1, r2, r3, load = 'resistor', level = 0, broken = false, withSwitch = true, r3Left = false }) {
    const { left, mid, right, top, bottom, y, r1x, r2x, r3y } = K;
    Svg.wire(g, [[left, y], [left, top], [right, top], [right, bottom], [left, bottom], [left, y]]);
    Svg.wire(g, [[mid, top], [mid, bottom]]);
    Svg.battery(g, left, y);
    Svg.battery(g, right, y);
    if (withSwitch) Svg.knifeSwitch(g, 66, top, { on: look.switchOn });
    Svg.note(g, left + 18, y + 22, e1, { cls: 'value q-voltage' });
    Svg.note(g, right - 18, y + 22, e2, { cls: 'value q-voltage', anchor: 'end' });
    Svg.resistor(g, r1x, top);
    Svg.resistor(g, r2x, top);
    Svg.note(g, r1x, top - 16, r1, { cls: 'value q-active', anchor: 'middle' });
    Svg.note(g, r2x, top - 16, r2, { cls: 'value q-active', anchor: 'middle' });
    if (load === 'lamp') Svg.lamp(g, mid, r3y, { level, broken });
    else if (load === 'heater') Svg.heater(g, mid, r3y, { level });
    else Svg.resistor(g, mid, r3y, { vertical: true });
    Svg.note(g, r3Left ? mid - 16 : mid + 16, r3y + 8, r3, { cls: 'value q-active', anchor: r3Left ? 'end' : 'start' });
    Svg.el(g, 'circle', { cx: mid, cy: top, r: 3.5, class: 'dot ink' });
    Svg.note(g, mid, top - 12, 'A', { cls: 'value', anchor: 'middle' });
  }

  // 1つの閉回路（左に電池1、上に R、右に電池2 か抵抗）
  const LOOP = { left: 60, right: 300, top: 64, bottom: 196, mid: 130 };

  // ---- ミッション（現場の依頼） ----

  // 電球（R3）を定格の電流で光らせる、電池2 の電圧
  function runLampJob(values, E2) {
    const { E1, R1, R2, R3, Ir } = values;
    const r = DcCircuit.twoSources({ E1, E2, R1, R2, R3 });
    const base = { meter: r.I3, lamps: [(r.I3 / Ir) ** 2] };
    const need = `<var>V</var><sub>A</sub> = ${R3} × ${Ir} = ${num(R3 * Ir)} V、<var>I</var><sub>1</sub> = (${E1} − ${num(R3 * Ir)}) ÷ ${R1} = ${num((E1 - R3 * Ir) / R1)} A`;
    if (near(r.I3, Ir)) return { ...base, ok: true, burst: null, reading: amperes(r.I3), reason: `定格どおり！ ${need}、<var>I</var><sub>2</sub> = ${num(Ir - (E1 - R3 * Ir) / R1)} A` };
    if (r.I3 < Ir) return { ...base, ok: false, burst: null, reading: amperes(r.I3), reason: `暗い（${amperes(r.I3)}）。${need}` };
    return { ...base, ok: false, burst: { lamp: 0 }, reading: `${amperes(r.I3)} → 0 A`, reason: `切れた！ ${amperes(r.I3)} 流れた（定格 ${Ir} A）。${need}` };
  }

  function drawLampJob(g, { E1, R1, R2, R3, Ir }, E2, look) {
    drawTwoSource(g, look, {
      e1: `E₁ ${E1} V`, e2: `E₂ ${E2} V`, r1: `R₁ ${R1} Ω`, r2: `R₂ ${R2} Ω`, r3: `電球 ${R3} Ω・定格 ${Ir} A`,
      load: 'lamp', level: look.lamps[0] || 0, broken: look.broken.lamps[0], r3Left: true,
    });
    ammeter(g, K.mid, K.a3y, look, { max: Ir * 2, mark: Ir, readingY: K.bottom + 20 });
    Svg.note(g, 180, NOTE_Y, '電球の抵抗は一定、定格の電流をこえると切れる決まり', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[K.mid, K.r3y]] };
  }

  // 予備の電池2 から電流を出さない（I2 = 0）電熱線 R3。I2 = 0 なら点A の電位 = E2
  function runSpareJob(values, R3) {
    const { E1, E2, R1, R2 } = values;
    const r = DcCircuit.twoSources({ E1, E2, R1, R2, R3 });
    const answer = (E2 * R1) / (E1 - E2);
    const base = { meter: r.I2, lamps: [Math.min(1.4, (r.I3 * r.I3 * R3) / ((E2 * E2) / answer))], burst: null, reading: amperes(r.I2) };
    const why = `<var>I</var><sub>2</sub> = 0 なら <var>V</var><sub>A</sub> = ${E2} V、<var>I</var><sub>1</sub> = (${E1} − ${E2}) ÷ ${R1} = ${num((E1 - E2) / R1)} A = <var>I</var><sub>3</sub>`;
    if (near(r.I2, 0)) return { ...base, ok: true, reason: `ぴったり 0 A！ ${why}、<var>R</var><sub>3</sub> = ${E2} ÷ ${num((E1 - E2) / R1)} = ${num(answer)} Ω` };
    if (r.I2 > 0) return { ...base, ok: false, reason: `電池2 から ${amperes(r.I2)} 出ていく（減っていく）。<var>R</var><sub>3</sub> を大きく。${why}` };
    return { ...base, ok: false, reason: `電池2 に ${amperes(-r.I2)} 流れこむ（反対向き）。<var>R</var><sub>3</sub> を小さく。${why}` };
  }

  function drawSpareJob(g, { E1, E2, R1, R2 }, R3, look) {
    drawTwoSource(g, look, {
      e1: `E₁ ${E1} V`, e2: `予備 E₂ ${E2} V`, r1: `R₁ ${R1} Ω`, r2: `R₂ ${R2} Ω`, r3: `電熱線 ${R3} Ω`,
      load: 'heater', level: look.lamps[0] || 0,
    });
    ammeter(g, K.a2x, K.top, look, { max: 3, signed: true, readingY: K.top + 40 });
    Svg.note(g, 180, NOTE_Y, '電流計は真ん中が 0。右が点A へ向かう向き（仮の向き）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[K.mid, K.r3y]] };
  }

  // 3つの電流計のうち1つが壊れている。2つの法則が合わない所から、壊れた計器を探す
  const METERS = [[K.a1x, K.top], [K.a2x, K.top], [K.mid, K.a3y]];
  const METER_NAMES = ['I₁', 'I₂', 'I₃'];
  const trueCurrents = ({ E1, E2, R1, R2, R3 }) => {
    const r = DcCircuit.twoSources({ E1, E2, R1, R2, R3 });
    return [r.I1, r.I2, r.I3];
  };
  const shownCurrent = (values, i) => (i === values.broken ? values.wrong : trueCurrents(values)[i]);

  function runMeterProbe(values, i) {
    const { E1, E2, R1, R2, R3, broken } = values;
    const [I1, I2, I3] = trueCurrents(values);
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    const loops = `① ${E1} = ${R1}×${num(I1)} + ${R3}×${num(I3)}、② ${E2} = ${R2}×${num(I2)} + ${R3}×${num(I3)}`;
    if (i === broken) return { ...base, ok: true, reason: `当たり！ ${METER_NAMES[i]} は本当は ${amperes(trueCurrents(values)[i])}。${loops}` };
    return { ...base, ok: false, reason: `${METER_NAMES[i]} は正しい。壊れたのは ${METER_NAMES[broken]}（本当は ${amperes(trueCurrents(values)[broken])}）。${loops}` };
  }

  function drawMeterProbe(g, values, selected, look) {
    const { E1, E2, R1, R2, R3 } = values;
    drawTwoSource(g, look, { e1: `E₁ ${E1} V`, e2: `E₂ ${E2} V`, r1: `R₁ ${R1} Ω`, r2: `R₂ ${R2} Ω`, r3: `R₃ ${R3} Ω`, withSwitch: false });
    const truth = trueCurrents(values);
    METERS.forEach(([x, y], i) => {
      const measured = look.probe && look.probe.index === i;
      Svg.gauge(g, x, y, { value: measured ? look.probe.needle : 0, max: 6, letter: 'A', cls: 'q-current' });
      const [nx, ny, anchor] = i === 2 ? [x + 30, y, 'start'] : [x, y + 38, 'middle'];
      Svg.note(g, nx, ny, measured ? look.probe.reading : METER_NAMES[i], { cls: measured ? 'value q-current' : 'faint', anchor });
      if (!look.deciding) {
        const [rx, ry] = i === 2 ? [nx, ny + 16] : [x, y - 32];
        Svg.note(g, rx, ry, `本当 ${amperes(truth[i])}`, { cls: 'value', anchor });
      }
    });
    if (look.deciding) {
      METERS.forEach(([x, y], i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: y, r: 28, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, '電流の向きは、I₁・I₂ が点A へ、I₃ が下へ', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[K.mid, K.r3y]] };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く → スイッチ → 本物とくらべる ----

  // ① 第1法則：点に流れこむ電流の和 = 出る電流の和
  const NODE = { x: 180, y: 118 };

  function runNodeBasic({ a, b, c }, guess) {
    const d = a + b - c;
    return { ...predicted(guess, d, 'A', `入る ${num(a)} + ${num(b)} = 出る ${num(c)} + ${num(d)}`), meter: d, lamps: [], burst: null, reading: amperes(d) };
  }

  function drawNodeBasic(g, { a, b, c }, guess, look) {
    const { x, y } = NODE;
    Svg.wire(g, [[40, y], [320, y]]);
    Svg.wire(g, [[x, 30], [x, 202]]);
    Svg.el(g, 'circle', { cx: x, cy: y, r: 4, class: 'dot ink' });
    // 入る2本（左・上）と出る1本（右）、測る1本（下）
    Svg.arrow(g, 70, y - 12, 110, y - 12, { cls: 'q-current', width: 1.6 });
    Svg.note(g, 90, y - 26, `${num(a)} A 入る`, { cls: 'value q-current', anchor: 'middle' });
    Svg.arrow(g, x + 12, 44, x + 12, 76, { cls: 'q-current', width: 1.6 });
    Svg.note(g, x + 20, 58, `${num(b)} A 入る`, { cls: 'value q-current' });
    Svg.arrow(g, 250, y - 12, 290, y - 12, { cls: 'q-current', width: 1.6 });
    Svg.note(g, 270, y - 26, `${num(c)} A 出る`, { cls: 'value q-current', anchor: 'middle' });
    ammeter(g, x, 178, look, { max: 8, ghost: guess, readingY: 222 });
    Svg.note(g, x + 30, 182, '下へ出る', { cls: 'faint' });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ② 第2法則：1周で、電池の電圧 = 抵抗の電圧の和
  function runLoopBasic({ E, V1 }, guess) {
    const V2 = E - V1;
    return { ...predicted(guess, V2, 'V', `${E} − ${num(V1)} = ${num(V2)} V（1周で ${E} V = ${num(V1)} + ${num(V2)}）`), meter: V2, lamps: [], burst: null, reading: volts(V2) };
  }

  function drawLoopBasic(g, { E, V1 }, guess, look) {
    const { left, right, top, bottom, mid } = LOOP;
    Svg.wire(g, [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]]);
    Svg.battery(g, left, mid);
    Svg.note(g, left + 18, mid + 22, `電池 ${E} V`, { cls: 'value q-voltage' });
    Svg.knifeSwitch(g, 96, top, { on: look.switchOn });
    Svg.resistor(g, 180, top);
    Svg.note(g, 180, top - 16, `R₁ の電圧 ${num(V1)} V`, { cls: 'value q-voltage', anchor: 'middle' });
    Svg.resistor(g, right, mid, { vertical: true });
    const meterAt = [236, mid];
    PlayKit.meter(g, ...meterAt, look, { max: 24, letter: 'V', cls: 'q-voltage', ghost: guess });
    Svg.leads(g, meterAt, [[right, mid - 20], [right, mid + 20]]);
    Svg.note(g, right - 12, mid - 32, 'R₂', { cls: 'value q-active', anchor: 'end' });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（R₂ の電圧計）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ③ 閉回路の式：E1 = R1I1 + R3I3（I1 と I3 は同じとは限らない。点A で I2 が合流する）
  function runLoopEquationBasic({ R1, I1, R3, I3 }, guess) {
    const E1 = R1 * I1 + R3 * I3;
    return { ...predicted(guess, E1, 'V', `${R1}×${num(I1)} + ${R3}×${num(I3)} = ${num(R1 * I1)} + ${num(R3 * I3)} = ${num(E1)} V`), meter: E1, lamps: [], burst: null, reading: volts(E1) };
  }

  function drawLoopEquationBasic(g, { R1, I1, R3, I3 }, guess, look) {
    const { left, mid, top, bottom, y, r1x, r3y } = K;
    Svg.wire(g, [[left, y], [left, top], [mid + 90, top]]);
    Svg.wire(g, [[mid, top], [mid, bottom], [left, bottom], [left, y]]);
    Svg.battery(g, left, y);
    Svg.knifeSwitch(g, 66, top, { on: look.switchOn });
    Svg.resistor(g, r1x, top);
    Svg.resistor(g, mid, r3y, { vertical: true });
    Svg.note(g, r1x, top - 16, `R₁ ${R1} Ω・${num(I1)} A →`, { cls: 'value q-current', anchor: 'middle' });
    Svg.note(g, mid + 16, r3y, `R₃ ${R3} Ω`, { cls: 'value q-active' });
    Svg.note(g, mid + 16, r3y + 18, `${num(I3)} A ↓`, { cls: 'value q-current' });
    Svg.note(g, mid + 88, top + 18, `← ${num(I3 - I1)} A（電池2 から）`, { cls: 'faint', anchor: 'end' });
    Svg.el(g, 'circle', { cx: mid, cy: top, r: 3.5, class: 'dot ink' });
    const meterAt = [104, 150];
    PlayKit.meter(g, ...meterAt, look, { max: 30, letter: 'V', cls: 'q-voltage', ghost: guess });
    Svg.leads(g, meterAt, [[left, y - 16], [left, y + 16]]);
    Svg.note(g, 250, 160, '閉回路①', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（電池1 の電圧計）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  // ④⑤ 向きが反対の電池：1周で E1 − E2 = RI。仮に時計回りを正とし、負なら反対向き
  function runOpposeBasic({ E1, E2, R }, guess) {
    const I = (E1 - E2) / R;
    const why = `(${E1} − ${E2}) ÷ ${R} = ${num(I)} A${I < 0 ? '（負：反時計回りに流れる）' : ''}`;
    return { ...predicted(guess, I, 'A', why), meter: I, lamps: [], burst: null, reading: amperes(I) };
  }

  function drawOpposeBasic(signed) {
    return (g, { E1, E2, R }, guess, look) => {
      const { left, right, top, bottom, mid } = LOOP;
      Svg.wire(g, [[left, mid], [left, top], [right, top], [right, mid]]);
      Svg.wire(g, [[right, mid], [right, bottom], [left, bottom], [left, mid]]);
      Svg.battery(g, left, mid);
      Svg.battery(g, right, mid);
      Svg.note(g, left + 18, mid + 22, `E₁ ${E1} V`, { cls: 'value q-voltage' });
      Svg.note(g, right - 18, mid + 22, `E₂ ${E2} V`, { cls: 'value q-voltage', anchor: 'end' });
      Svg.knifeSwitch(g, 96, top, { on: look.switchOn });
      Svg.resistor(g, 250, top);
      Svg.note(g, 250, top - 16, `R ${R} Ω`, { cls: 'value q-active', anchor: 'middle' });
      ammeter(g, 170, top, look, { max: signed ? 5 : 6, signed, ghost: guess });
      Svg.arrow(g, 150, 150, 190, 150, { cls: 'q-current', width: 1.6 });
      Svg.note(g, 170, 170, '仮の向き（時計回り）', { cls: 'faint', anchor: 'middle' });
      Svg.note(g, 180, NOTE_Y, signed ? '点線の針があなたの予想。電流計は真ん中が 0' : '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
      return { lamps: [] };
    };
  }

  // ⑥ 点A の電位から電流：I2 = (E2 − VA) ÷ R2（負なら電池2 へ流れこむ）
  function runPotentialBasic({ E2, R2, VA }, guess) {
    const I2 = (E2 - VA) / R2;
    return { ...predicted(guess, I2, 'A', `(${E2} − ${num(VA)}) ÷ ${R2} = ${num(I2)} A${I2 < 0 ? '（負：電池2 へ流れこむ）' : ''}`), meter: I2, lamps: [], burst: null, reading: amperes(I2) };
  }

  function drawPotentialBasic(g, { E1, E2, R1, R2, R3, VA }, guess, look) {
    drawTwoSource(g, look, { e1: `E₁ ${E1} V`, e2: `E₂ ${E2} V`, r1: `R₁ ${R1} Ω`, r2: `R₂ ${R2} Ω`, r3: `R₃ ${R3} Ω` });
    Svg.note(g, K.mid - 14, K.r3y - 8, `点A の電位 ${num(VA)} V`, { cls: 'value q-voltage', anchor: 'end' });
    ammeter(g, K.a2x, K.top, look, { max: 5, signed: true, ghost: guess, readingY: K.top + 40 });
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想。電流計は真ん中が 0、右が点A へ', { cls: 'faint', anchor: 'middle' });
    return { lamps: [] };
  }

  const jobs = [
    {
      // 第1・第2法則：電球の電流から点A の電位、I1、I2 と順に求めて E2 を決める
      kind: 'dial',
      needs: 2, // 失敗したら準備の③（閉回路の式）から
      cases: [[9, 3, 3, 2, 3], [12, 3, 3, 2, 3], [15, 2, 4, 6, 2], [15, 6, 1, 3, 3], [18, 6, 2, 3, 3], [18, 3, 4, 6, 1.5], [24, 4, 2, 4, 2.5], [12, 6, 2, 5, 1.5], [20, 1, 4, 6, 2.5], [24, 2, 3, 4, 3]]
        .map(([E1, R1, R2, R3, Ir]) => ({ E1, R1, R2, R3, Ir })),
      dial: { name: '電池2の電圧', symbol: 'E_2', unit: 'V', min: 0, max: 30, step: 1 },
      request: ({ Ir }) => `電球を定格の ${Ir} A で光らせたい。電池2 の電圧 <var>E</var><sub>2</sub> は？`,
      answer: ({ E1, R1, R2, R3, Ir }) => R3 * Ir + R2 * (Ir - (E1 - R3 * Ir) / R1),
      run: runLampJob,
      draw: drawLampJob,
    },
    {
      // I2 = 0 なら点A の電位 = E2：予備の電池を使わずに残す R3
      kind: 'dial',
      needs: 5, // 失敗したら準備の⑥（点A の電位から電流）から
      cases: [[12, 8, 2, 1], [20, 15, 1, 2], [24, 18, 2, 1], [16, 12, 3, 2], [25, 20, 2, 3], [14, 12, 1, 2], [27, 18, 3, 1], [10, 6, 4, 2], [20, 12, 2, 1], [28, 21, 1, 2], [21, 14, 2, 1], [9, 6, 2, 3]]
        .map(([E1, E2, R1, R2]) => ({ E1, E2, R1, R2 })),
      dial: { name: '電熱線の抵抗', symbol: 'R_3', unit: 'Ω', min: 1, max: 20, step: 1 },
      request: () => '予備の電池2 は使わずに残したい（電流 0）。電熱線の <var>R</var><sub>3</sub> は？',
      answer: ({ E1, E2, R1 }) => (E2 * R1) / (E1 - E2),
      run: runSpareJob,
      draw: drawSpareJob,
    },
    {
      // 第1法則と閉回路①②：合わない式から、壊れた電流計を探す
      kind: 'probe',
      needs: 0, // 失敗したら準備の①（第1法則）から
      cases: [
        [[20, 10, 4, 2, 2], 0, 4], [[20, 10, 4, 2, 2], 2, 5], [[12, 8, 3, 2, 2], 1, 2], [[12, 12, 4, 4, 4], 2, 3], [[14, 10, 2, 2, 3], 0, 2],
        [[16, 12, 2, 1, 2], 1, 3], [[10, 12, 1, 2, 2], 2, 5], [[14, 16, 1, 4, 4], 0, 3], [[6, 4, 3, 2, 2], 1, 1],
      ].map(([[E1, E2, R1, R2, R3], broken, wrong]) => ({ E1, E2, R1, R2, R3, broken, wrong })),
      probe: {
        parts: METERS.length,
        hint: '電流計をタップすると読みが出る。点A の式と、閉回路①②の式をくらべよう',
        measure: shownCurrent,
        reading: (I) => amperes(I),
      },
      action: 'これが壊れている',
      request: () => '3つの電流計のうち1つが壊れている。どれ？',
      answer: ({ broken }) => broken,
      run: runMeterProbe,
      draw: drawMeterProbe,
    },
  ];

  // 準備（前提の知識）：この順に1つずつ。know は「使う知識」で、問いの上にいつも見せる
  const basics = [
    {
      title: '第1法則（点の電流）',
      kind: 'dial',
      cases: [[3, 2, 1], [5, 1, 2], [2.5, 1.5, 1], [4, 4, 3], [6, 2, 5], [1.5, 3.5, 2], [3, 3, 0.5], [7, 1, 4], [2, 2, 2.5]].map(([a, b, c]) => ({ a, b, c })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 8, step: 0.5 },
      know: '電気は途中で消えもせず、たまりもしない。点に流れこむ電流の和 = 出ていく電流の和（キルヒホッフの第1法則）',
      request: () => '下へ出ていく電流は？ 予想の針を置こう',
      answer: ({ a, b, c }) => a + b - c,
      run: runNodeBasic,
      draw: drawNodeBasic,
    },
    {
      title: '第2法則（1周の電圧）',
      kind: 'dial',
      cases: [[12, 5], [10, 4], [24, 9], [6, 2.5], [20, 12], [15, 6], [9, 4.5], [18, 11]].map(([E, V1]) => ({ E, V1 })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 24, step: 0.5 },
      know: '閉回路を1周すると、電池が上げた電圧の和 = 抵抗で下がった電圧の和（キルヒホッフの第2法則）。直列の分圧も、この法則の1つの形',
      request: () => '<var>R</var><sub>2</sub> の電圧は？',
      answer: ({ E, V1 }) => E - V1,
      run: runLoopBasic,
      draw: drawLoopBasic,
    },
    {
      title: '閉回路の式',
      kind: 'dial',
      cases: [[4, 3, 2, 4], [2, 2, 2, 4], [3, 2, 4, 3], [1, 5, 2, 6], [5, 2, 3, 3], [2, 4, 1, 6], [4, 1, 5, 2], [6, 1, 2, 3], [3, 3, 2, 5]].map(([R1, I1, R3, I3]) => ({ R1, I1, R3, I3 })),
      dial: { name: '予想', symbol: 'E_1', unit: 'V', min: 0, max: 30, step: 1 },
      know: '抵抗の電圧は <var>R</var> × <var>I</var>。1周の抵抗で電流がちがってもよく、それぞれ <var>R</var> × <var>I</var> を足す：<var>E</var><sub>1</sub> = <var>R</var><sub>1</sub><var>I</var><sub>1</sub> + <var>R</var><sub>3</sub><var>I</var><sub>3</sub>',
      request: () => '電池1 の電圧 <var>E</var><sub>1</sub> は？',
      answer: ({ R1, I1, R3, I3 }) => R1 * I1 + R3 * I3,
      run: runLoopEquationBasic,
      draw: drawLoopEquationBasic,
    },
    {
      title: '向きが反対の電池',
      kind: 'dial',
      cases: [[12, 6, 3], [20, 8, 4], [15, 9, 2], [10, 4, 4], [24, 12, 6], [9, 3, 2], [18, 12, 4], [30, 10, 5]].map(([E1, E2, R]) => ({ E1, E2, R })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 6, step: 0.5 },
      know: '1周まわる向きに押す電池は足し、逆に押す電池は引く。図の2つの電池は向き合っているので、<var>E</var><sub>1</sub> − <var>E</var><sub>2</sub> = <var>RI</var>',
      request: () => '電流計の針は？',
      answer: ({ E1, E2, R }) => (E1 - E2) / R,
      run: runOpposeBasic,
      draw: drawOpposeBasic(false),
    },
    {
      title: '負の電流（仮の向き）',
      kind: 'dial',
      cases: [[6, 12, 3], [8, 20, 4], [12, 6, 3], [5, 11, 2], [10, 4, 4], [4, 13, 6], [9, 15, 4], [20, 12, 2]].map(([E1, E2, R]) => ({ E1, E2, R })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: -5, max: 5, step: 0.5 },
      know: '電流の向きは仮に決めて式を立ててよい（ここでは時計回り）。答えが負なら、実際は反対向きに流れている',
      request: () => '時計回りを正とすると、電流計の針は？',
      answer: ({ E1, E2, R }) => (E1 - E2) / R,
      run: runOpposeBasic,
      draw: drawOpposeBasic(true),
    },
    {
      title: '点A の電位から電流',
      kind: 'dial',
      cases: [[10, 2, 4, 1, 4], [10, 8, 4, 1, 4], [12, 4, 2, 1, 2], [12, 12, 2, 2, 1], [16, 6, 2, 1, 2], [16, 10, 4, 2, 4], [20, 4, 2, 2, 1], [20, 10, 2, 1, 1], [24, 6, 2, 1, 2]]
        .map(([E1, E2, R1, R2, R3]) => ({ E1, E2, R1, R2, R3, VA: Number(DcCircuit.twoSources({ E1, E2, R1, R2, R3 }).VA.toFixed(6)) })),
      dial: { name: '予想', symbol: 'I_2', unit: 'A', min: -5, max: 5, step: 0.5 },
      know: '点A の電位 <var>V</var><sub>A</sub> が分かれば、<var>R</var><sub>2</sub> の電圧は <var>E</var><sub>2</sub> − <var>V</var><sub>A</sub>、<var>I</var><sub>2</sub> = (<var>E</var><sub>2</sub> − <var>V</var><sub>A</sub>) ÷ <var>R</var><sub>2</sub>。負なら電池2 へ流れこむ',
      request: () => '電池2 の電流 <var>I</var><sub>2</sub> は？（点A へ向かう向きを正）',
      answer: ({ E2, R2, VA }) => (E2 - VA) / R2,
      run: runPotentialBasic,
      draw: drawPotentialBasic,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays.kirchhoff = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
