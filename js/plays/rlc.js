// 理論4「RLC直列回路とフェーザ図」の遊び：ミッション（現場の依頼）と、その前提を1つずつ身につける準備（basics）。
// 型の決まりは js/job.js、画面と演出は js/job-play.js、draw が受け取る look（今の様子）は js/plays/series-parallel.js の先頭。
// 交流の入口なので、準備は「交流でも抵抗だけなら I = V ÷ R」から始め、コイル・コンデンサの周波数による変わり方、
// インピーダンス（直角三角形）、電圧を矢印で足すこと、共振へ進む。数値は直角三角形の辺が整数になる組（3・4・5 など）だけを使う。
(function (global) {
  'use strict';

  const { num, near, predicted } = PlayKit;
  const amperes = (value) => Notation.number(value, 2);
  const XL = '<var>X</var><sub>L</sub>';
  const XC = '<var>X</var><sub>C</sub>';
  const BASE_F = 50; // リアクタンスを教える基準の周波数
  const NOTE_Y = 262;
  const LOOP = { left: 40, right: 300, top: 64, bottom: 196, mid: 130 };

  function drawLoop(g) {
    const { left, right, top, bottom, mid } = LOOP;
    Svg.wire(g, [[left, mid], [left, top], [right, top], [right, bottom], [left, bottom], [left, mid]]);
  }

  function drawSource(g, text) {
    Svg.acSource(g, LOOP.left, LOOP.mid);
    Svg.note(g, LOOP.left + 20, LOOP.mid + 24, text, { cls: 'value q-voltage' });
  }

  const ammeter = (g, look, max, mark = null, ghost = null) => PlayKit.meter(g, 176, LOOP.bottom, look, { max, letter: 'A', cls: 'q-current', mark, ghost });

  // 倍率の言い方（2 → 「2倍」、0.5 → 「2分の1」）
  const times = (k) => (k >= 1 ? `${num(k)}倍` : `${num(1 / k)}分の1`);

  // ---- ミッション（現場の依頼） ----

  // コイルで電球を定格に合わせる（Z = √(R² + X²)。R + X と考えると電球が切れる）
  function lampWithCoil({ V, R }, X) {
    const Z = Math.hypot(R, X);
    const I = V / Z;
    return { Z, I, VR: I * R, VL: I * X };
  }

  function runChokeJob({ V, R, Ir }, X) {
    const r = lampWithCoil({ V, R }, X);
    const base = { meter: r.I, lamps: [(r.I / Ir) ** 2] };
    const z = `<var>Z</var> = √(${R}² + ${X}²) = ${num(r.Z)} Ω`;
    if (near(r.I, Ir)) {
      return { ...base, ok: true, burst: null, reading: `${amperes(r.I)} A`, reason: `定格どおり！ ${z}。電球 ${num(r.VR)} V とコイル ${num(r.VL)} V は足しても ${V} V にならない（矢印で足す）` };
    }
    if (r.I < Ir) return { ...base, ok: false, burst: null, reading: `${amperes(r.I)} A`, reason: `暗い。${z} で ${num(r.I)} A（定格 ${Ir} A）。${XL} を小さく` };
    return { ...base, ok: false, burst: { lamp: 0 }, reading: `${amperes(r.I)} A → 0 A`, reason: `切れた！ ${z} で ${num(r.I)} A（定格 ${Ir} A をこえた）。${XL} を大きく` };
  }

  const CHOKE_X = 190;

  function drawChokeJob(g, { V, R, Ir }, X, look) {
    const { right, top, mid } = LOOP;
    drawLoop(g);
    drawSource(g, `${V} V・${BASE_F} Hz`);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.coil(g, CHOKE_X, top);
    Svg.note(g, CHOKE_X, top - 20, `コイル X = ${X} Ω`, { cls: 'value q-reactive', anchor: 'middle' });
    Svg.lamp(g, right, mid, { level: look.lamps[0] || 0, broken: look.broken.lamps[0] });
    Svg.note(g, right - 20, mid, `${R} Ω・定格 ${Ir} A`, { cls: 'value', anchor: 'end' });
    // 結果が出たら、電球とコイルの電圧（足しても電源の電圧にならない）
    if (look.reading && !look.broken.lamps[0]) {
      const r = lampWithCoil({ V, R }, X);
      Svg.note(g, CHOKE_X, top + 24, `${num(r.VL)} V`, { cls: 'value q-voltage', anchor: 'middle' });
      Svg.note(g, right - 20, mid + 18, `${num(r.VR)} V`, { cls: 'value q-voltage', anchor: 'end' });
    }
    ammeter(g, look, Ir * 2, Ir);
    Svg.note(g, 180, NOTE_Y, '電球の抵抗は一定、定格の電流をこえると切れる決まり', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // 電球・コイル・コンデンサの直列で、周波数を決める。X_L = X_C（共振）で電流がいちばん大きい
  const TUNE = { V: 100, R: 50, coilX: 136, capX: 236 };

  function tuned({ XL50, XC50 }, f) {
    const xl = (XL50 * f) / BASE_F;
    const xc = (XC50 * BASE_F) / f;
    const I = TUNE.V / Math.hypot(TUNE.R, xl - xc);
    return { xl, xc, I };
  }

  function runTune(values, f) {
    const r = tuned(values, f);
    const peak = TUNE.V / TUNE.R;
    const base = { meter: r.I, lamps: [(r.I / peak) ** 2], burst: null, reading: `${amperes(r.I)} A` };
    const x = `${f} Hz で ${XL} = ${num(r.xl)} Ω・${XC} = ${num(r.xc)} Ω`;
    if (near(r.xl, r.xc)) return { ...base, ok: true, reason: `共振！ ${x}。打ち消し合って <var>Z</var> = <var>R</var>、電流がいちばん大きい` };
    return { ...base, ok: false, reason: `まだ明るくできる。${x}。周波数を${r.xl < r.xc ? '上げる' : '下げる'}` };
  }

  function drawTune(g, values, f, look) {
    const { right, top, mid } = LOOP;
    const r = tuned(values, f);
    drawLoop(g);
    drawSource(g, `${TUNE.V} V・${f} Hz`);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.coil(g, TUNE.coilX, top);
    Svg.capacitor(g, TUNE.capX, top);
    // リアクタンスの値は結果が出てから（決めている間に見えると、端から試すだけで解ける）
    Svg.note(g, TUNE.coilX, top - 20, 'コイル', { cls: 'value q-reactive', anchor: 'middle' });
    Svg.note(g, TUNE.capX, top - 20, 'コンデンサ', { cls: 'value q-reactive', anchor: 'middle' });
    if (look.reading) {
      Svg.note(g, TUNE.coilX, top + 24, `${num(r.xl)} Ω`, { cls: 'value q-reactive', anchor: 'middle' });
      Svg.note(g, TUNE.capX, top + 24, `${num(r.xc)} Ω`, { cls: 'value q-reactive', anchor: 'middle' });
    }
    Svg.lamp(g, right, mid, { level: look.lamps[0] || 0 });
    Svg.note(g, right - 20, mid, `電球 ${TUNE.R} Ω`, { cls: 'value', anchor: 'end' });
    ammeter(g, look, (TUNE.V / TUNE.R) * 1.25);
    Svg.note(g, 180, NOTE_Y, `50 Hz のとき コイル ${values.XL50} Ω・コンデンサ ${values.XC50} Ω`, { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // 中身の分からない3つの箱（抵抗・コイル・コンデンサ）。テスターで 50 Hz と 100 Hz の電流をくらべて当てる
  const NAME = { R: '抵抗', L: 'コイル', C: 'コンデンサ' };
  const BEHAVIOR = {
    R: '周波数を変えても電流は同じ',
    L: `周波数2倍で電流が半分（${XL} は周波数に比例）`,
    C: `周波数2倍で電流が2倍（${XC} は周波数に反比例）`,
  };
  const BOXES = { xs: [90, 180, 270], y: 92 };
  const BOX_TESTER = [180, 196];
  const current100 = (kind, I) => ({ R: I, L: I / 2, C: I * 2 })[kind];

  function runBoxJob({ kinds, target }, i) {
    const kind = kinds[i];
    const base = { meter: 0, lamps: [], burst: null, reading: null };
    if (kind === target) return { ...base, ok: true, reason: `当たり！ ${i + 1}番は${NAME[kind]}：${BEHAVIOR[kind]}` };
    return { ...base, ok: false, reason: `${i + 1}番は${NAME[kind]}（${BEHAVIOR[kind]}）。${NAME[target]}は${BEHAVIOR[target]}` };
  }

  function drawBoxPart(g, kind, x, y) {
    Svg.wire(g, [[x - 28, y], [x + 28, y]]);
    if (kind === 'R') Svg.resistor(g, x, y);
    else if (kind === 'L') Svg.coil(g, x, y);
    else Svg.capacitor(g, x, y);
  }

  function drawBoxJob(g, { kinds, I }, selected, look) {
    const { xs, y } = BOXES;
    const open = !look.deciding;
    xs.forEach((x, i) => {
      Svg.el(g, 'rect', { x: x - 28, y: y - 20, width: 56, height: 40, rx: 3, class: `black-box${open ? '' : ' closed'}` });
      Svg.note(g, x, y - 32, `${i + 1}`, { cls: 'value', anchor: 'middle' });
      if (open) {
        drawBoxPart(g, kinds[i], x, y);
        Svg.note(g, x, y + 32, NAME[kinds[i]], { cls: `value ${kinds[i] === 'R' ? 'q-active' : 'q-reactive'}`, anchor: 'middle' });
      } else {
        Svg.note(g, x, y, '？', { cls: 'faint', anchor: 'middle' });
      }
    });
    const [tx, ty] = BOX_TESTER;
    const measured = look.probe ? kinds[look.probe.index] : null;
    Svg.gauge(g, tx, ty, { value: look.probe ? look.probe.needle : 0, max: I * 2.25, letter: 'A', cls: 'q-current', mark: measured ? I : null });
    Svg.note(g, tx - 58, ty - 8, '50 Hz', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, tx - 58, ty + 10, measured ? `${amperes(I)} A` : '？ A', { cls: measured ? 'value q-current' : 'faint', anchor: 'middle' });
    Svg.note(g, tx + 58, ty - 8, '100 Hz', { cls: 'faint', anchor: 'middle' });
    Svg.note(g, tx + 58, ty + 10, measured ? look.probe.reading : '？ A', { cls: measured ? 'value q-current' : 'faint', anchor: 'middle' });
    Svg.note(g, tx, ty + 42, 'テスター（100 V の交流）', { cls: 'faint', anchor: 'middle' });
    if (look.probe && !open) Svg.leads(g, BOX_TESTER, [[xs[look.probe.index] - 28, y], [xs[look.probe.index] + 28, y]]);
    // タップできる所（決めている間だけ）。測っている箱は実線の輪
    if (look.deciding) {
      xs.forEach((x, i) => {
        const part = Svg.el(g, 'g', { class: `job-tap${i === selected ? ' selected' : ''}`, 'data-part': String(i) });
        Svg.el(part, 'circle', { cx: x, cy: y, r: 34, class: 'job-tap-ring' });
      });
    }
    Svg.note(g, 180, NOTE_Y, '印＝50 Hz の電流、針＝100 Hz の電流', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[xs[1], y]] };
  }

  // ---- 準備（前提の知識）：計器の針を予想して置く（または値を決める）→ スイッチ → 本物とくらべる ----

  // ① 交流と抵抗：抵抗だけなら交流でも I = V ÷ R（計器の読みは実効値）
  function runAcBasic({ V, R }, guess) {
    const I = V / R;
    return { ...predicted(guess, I, 'A', `${V} V ÷ ${R} Ω = ${num(I)} A。抵抗だけなら直流と同じ計算`), meter: I, lamps: [1], burst: null, reading: `${amperes(I)} A` };
  }

  function drawAcBasic(g, { V, R }, guess, look) {
    const { right, top, mid } = LOOP;
    drawLoop(g);
    drawSource(g, `${V} V・${BASE_F} Hz`);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.lamp(g, right, mid, { level: look.lamps[0] || 0 });
    Svg.note(g, right - 20, mid, `電球 ${R} Ω`, { cls: 'value', anchor: 'end' });
    ammeter(g, look, 6, null, guess);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // ②③ コイル・コンデンサ：周波数を変えると電流がどう変わるか（X_L は比例、X_C は反比例）
  function runReactorBasic(kind) {
    return ({ f1, I1, f2 }, guess) => {
      const k = f2 / f1;
      const I2 = kind === 'L' ? I1 / k : I1 * k;
      const x = kind === 'L' ? XL : XC;
      const why = `周波数が ${times(k)}なので ${x} は ${times(kind === 'L' ? k : 1 / k)}、電流は ${times(I2 / I1)}の ${num(I2)} A`;
      return { ...predicted(guess, I2, 'A', why), meter: I2, lamps: [], burst: null, reading: `${amperes(I2)} A` };
    };
  }

  function drawReactorBasic(kind) {
    return (g, { f1, I1, f2 }, guess, look) => {
      const { right, top, mid } = LOOP;
      drawLoop(g);
      drawSource(g, `100 V・${f2} Hz`);
      Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
      if (kind === 'L') Svg.coil(g, right, mid, { vertical: true });
      else Svg.capacitor(g, right, mid, { vertical: true });
      Svg.note(g, right - 18, mid, NAME[kind], { cls: 'value q-reactive', anchor: 'end' });
      Svg.note(g, 200, 30, `${f1} Hz のときは ${num(I1)} A`, { cls: 'value q-current', anchor: 'middle' });
      ammeter(g, look, 6, null, guess);
      Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想。電圧は 100 V のまま', { cls: 'faint', anchor: 'middle' });
      return { lamps: [] };
    };
  }

  // ④ インピーダンス：電球（R）とコイル（X）の直列の電流を予想する
  function runImpedanceBasic({ V, R, X }, guess) {
    const Z = Math.hypot(R, X);
    const I = V / Z;
    const why = `<var>Z</var> = √(${R}² + ${X}²) = ${num(Z)} Ω、${V} ÷ ${num(Z)} = ${num(I)} A（${R} + ${X} = ${R + X} Ω ではない）`;
    return { ...predicted(guess, I, 'A', why), meter: I, lamps: [1], burst: null, reading: `${amperes(I)} A` };
  }

  function drawImpedanceBasic(g, { V, R, X }, guess, look) {
    const { right, top, mid } = LOOP;
    drawLoop(g);
    drawSource(g, `${V} V・${BASE_F} Hz`);
    Svg.knifeSwitch(g, 84, top, { on: look.switchOn });
    Svg.coil(g, CHOKE_X, top);
    Svg.note(g, CHOKE_X, top - 20, `コイル X = ${X} Ω`, { cls: 'value q-reactive', anchor: 'middle' });
    Svg.lamp(g, right, mid, { level: look.lamps[0] || 0 });
    Svg.note(g, right - 20, mid, `電球 R = ${R} Ω`, { cls: 'value q-active', anchor: 'end' });
    ammeter(g, look, 10, null, guess);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  // ⑤ 電圧は矢印で足す：電球とコイルの電圧から、電源の電圧を予想する
  const SOURCE_METER = [112, LOOP.mid];

  function runVoltageBasic({ VR, VL }, guess) {
    const V = Math.hypot(VR, VL);
    const why = `√(${VR}² + ${VL}²) = ${num(V)} V（${VR} + ${VL} = ${VR + VL} V ではない）`;
    return { ...predicted(guess, V, 'V', why), meter: V, lamps: [1], burst: null, reading: `${num(V)} V` };
  }

  function drawVoltageBasic(g, { VR, VL }, guess, look) {
    const { left, right, top, mid } = LOOP;
    drawLoop(g);
    Svg.acSource(g, left, mid);
    Svg.knifeSwitch(g, 76, top, { on: look.switchOn });
    Svg.coil(g, CHOKE_X, top);
    Svg.note(g, CHOKE_X, top - 20, `コイル ${VL} V`, { cls: 'value q-voltage', anchor: 'middle' });
    Svg.lamp(g, right, mid, { level: look.lamps[0] || 0 });
    Svg.note(g, right - 20, mid, `電球 ${VR} V`, { cls: 'value q-voltage', anchor: 'end' });
    const [mx, my] = SOURCE_METER;
    PlayKit.meter(g, mx, my, look, { max: 300, letter: 'V', cls: 'q-voltage', ghost: guess });
    Svg.leads(g, SOURCE_METER, [[left, mid - 16], [left, mid + 16]]);
    Svg.note(g, 180, NOTE_Y, '点線の針があなたの予想（電源の電圧計）', { cls: 'faint', anchor: 'middle' });
    return { lamps: [[right, mid]] };
  }

  const jobs = [
    {
      // Z = √(R² + X²)：コイルで電球を定格の電流に合わせる
      kind: 'dial',
      needs: 3, // 失敗したら準備の④（インピーダンス）から
      cases: [[100, 60, 1], [100, 80, 1], [100, 30, 2], [100, 40, 2], [200, 120, 1], [200, 160, 1], [200, 60, 2], [200, 80, 2], [100, 12, 5], [100, 28, 1], [200, 96, 2]]
        .map(([V, R, Ir]) => ({ V, R, Ir })),
      dial: { name: 'コイルのリアクタンス', symbol: 'X_L', unit: 'Ω', min: 1, max: 200, step: 1 },
      request: ({ Ir }) => `電球を定格の ${Ir} A で光らせたい。コイルの ${XL} は何 Ω？`,
      answer: ({ V, R, Ir }) => Math.sqrt((V / Ir) ** 2 - R ** 2),
      run: runChokeJob,
      draw: drawChokeJob,
    },
    {
      // 共振：X_L は周波数に比例、X_C は反比例。等しくなる周波数で電流が最大
      kind: 'dial',
      needs: 5, // 失敗したら準備の⑥（共振）から
      cases: [[10, 90], [40, 10], [5, 80], [20, 45], [25, 36], [8, 50], [50, 32], [50, 18], [100, 49], [20, 80]].map(([XL50, XC50]) => ({ XL50, XC50 })),
      dial: { name: '周波数', symbol: 'f', unit: 'Hz', min: 10, max: 200, step: 5 },
      request: () => '電球をいちばん明るく光らせる周波数を決めよう',
      answer: ({ XL50, XC50 }) => BASE_F * Math.sqrt(XC50 / XL50),
      run: runTune,
      draw: drawTune,
    },
    {
      // 周波数による変わり方で、箱の中身（コイル・コンデンサ）を当てる
      kind: 'probe',
      needs: 1, // 失敗したら準備の②（コイル）から
      cases: [['R', 'L', 'C'], ['L', 'C', 'R'], ['C', 'R', 'L'], ['R', 'C', 'L'], ['L', 'R', 'C'], ['C', 'L', 'R']]
        .flatMap((kinds, k) => ['L', 'C'].map((target) => ({ kinds, target, I: k % 2 === 0 ? 2 : 1 }))),
      probe: {
        parts: BOXES.xs.length,
        hint: '箱をタップすると、テスターが 50 Hz と 100 Hz（どちらも 100 V）の電流を測る',
        measure: ({ kinds, I }, i) => current100(kinds[i], I),
        reading: (I) => `${amperes(I)} A`,
      },
      action: 'これに決める',
      request: ({ target }) => `${NAME[target]}の入った箱はどれ？ テスターで 50 Hz と 100 Hz をくらべよう`,
      answer: ({ kinds, target }) => kinds.indexOf(target),
      run: runBoxJob,
      draw: drawBoxJob,
    },
  ];

  // 準備（前提の知識）：この順に1つずつ。know は「使う知識」で、問いの上にいつも見せる
  const basics = [
    {
      title: '交流と抵抗',
      kind: 'dial',
      cases: [[100, 50], [100, 20], [100, 25], [100, 40], [100, 200], [200, 50], [200, 100], [100, 100], [200, 40]].map(([V, R]) => ({ V, R })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 6, step: 0.5 },
      know: '交流は向きが1秒に何十回も入れかわる電気。計器の 100 V（実効値）は、直流 100 V と同じ明るさ・熱。抵抗だけなら <var>I</var> = <var>V</var> ÷ <var>R</var>',
      request: () => '交流の電流計の針はどこを指す？ 予想の針を置こう',
      answer: ({ V, R }) => V / R,
      run: runAcBasic,
      draw: drawAcBasic,
    },
    {
      title: 'コイル',
      kind: 'dial',
      cases: [[50, 2, 100], [50, 4, 100], [50, 3, 150], [60, 2, 120], [100, 1, 50], [50, 6, 150], [50, 1, 25], [50, 4, 200], [100, 3, 50]].map(([f1, I1, f2]) => ({ f1, I1, f2 })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 6, step: 0.5 },
      know: `コイルは電流の変化をじゃまする。じゃまの大きさ ${XL} = 2π<var>fL</var>（Ω）は周波数に比例する（直流なら 0）`,
      request: ({ f2 }) => `周波数を ${f2} Hz にかえた。コイルの電流は？`,
      answer: ({ f1, I1, f2 }) => (I1 * f1) / f2,
      run: runReactorBasic('L'),
      draw: drawReactorBasic('L'),
    },
    {
      title: 'コンデンサ',
      kind: 'dial',
      cases: [[50, 1, 100], [50, 2, 100], [100, 4, 50], [50, 1, 150], [60, 1, 120], [50, 0.5, 200], [100, 6, 50], [50, 2, 25], [150, 3, 50]].map(([f1, I1, f2]) => ({ f1, I1, f2 })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 6, step: 0.5 },
      know: `コンデンサは直流を通さない（たまるだけ）。交流のじゃま ${XC} = 1 ÷ (2π<var>fC</var>)（Ω）は周波数に反比例する`,
      request: ({ f2 }) => `周波数を ${f2} Hz にかえた。コンデンサの電流は？`,
      answer: ({ f1, I1, f2 }) => (I1 * f2) / f1,
      run: runReactorBasic('C'),
      draw: drawReactorBasic('C'),
    },
    {
      title: 'インピーダンス',
      kind: 'dial',
      cases: [[100, 60, 80], [100, 80, 60], [100, 30, 40], [100, 40, 30], [200, 60, 80], [100, 6, 8], [50, 30, 40], [100, 12, 16], [200, 120, 160], [100, 24, 32]]
        .map(([V, R, X]) => ({ V, R, X })),
      dial: { name: '予想', symbol: 'I', unit: 'A', min: 0, max: 10, step: 0.5 },
      know: '<var>R</var> と <var>X</var> は向きが90°ちがうので、そのまま足せない。合わせた流れにくさ <var>Z</var> = √(<var>R</var>² + <var>X</var>²)（直角三角形の斜辺）。<var>I</var> = <var>V</var> ÷ <var>Z</var>',
      request: () => '電球とコイルの直列。電流計の針はどこを指す？',
      answer: ({ V, R, X }) => V / Math.hypot(R, X),
      run: runImpedanceBasic,
      draw: drawImpedanceBasic,
    },
    {
      title: '電圧は矢印で足す',
      kind: 'dial',
      cases: [[60, 80], [30, 40], [80, 60], [120, 160], [90, 120], [50, 120], [120, 50], [160, 120], [40, 30], [150, 200]].map(([VR, VL]) => ({ VR, VL })),
      dial: { name: '予想', symbol: 'V', unit: 'V', min: 0, max: 300, step: 10 },
      know: '電球（<var>R</var>）とコイル（<var>L</var>）の電圧は向きが90°ちがう。電源の電圧は足し算ではなく √(<var>V</var><sub>R</sub>² + <var>V</var><sub>L</sub>²)',
      request: ({ VR, VL }) => `電球に ${VR} V、コイルに ${VL} V。電源の電圧は？`,
      answer: ({ VR, VL }) => Math.hypot(VR, VL),
      run: runVoltageBasic,
      draw: drawVoltageBasic,
    },
    {
      title: '共振',
      kind: 'dial',
      cases: [[10, 40], [20, 80], [40, 10], [80, 20], [5, 20], [15, 60], [60, 15], [30, 120], [12, 48]].map(([XL50, XC50]) => ({ XL50, XC50 })),
      dial: { name: '周波数', symbol: 'f', unit: 'Hz', min: 10, max: 200, step: 5 },
      know: `周波数を2倍にすると ${XL} は2倍、${XC} は半分。${XL} = ${XC} になる周波数が共振で、打ち消し合って電流がいちばん大きい`,
      request: ({ XL50, XC50 }) => `50 Hz で ${XL} = ${XL50} Ω・${XC} = ${XC50} Ω。電球がいちばん明るい周波数は？`,
      answer: ({ XL50, XC50 }) => BASE_F * Math.sqrt(XC50 / XL50),
      run: runTune,
      draw: drawTune,
    },
  ];

  const play = { jobs, basics };
  global.Plays = global.Plays || {};
  global.Plays.rlc = play;
  if (typeof module !== 'undefined' && module.exports) module.exports = play;
})(this);
