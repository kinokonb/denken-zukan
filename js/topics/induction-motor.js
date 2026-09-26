// 機械：三相誘導電動機のトルク－速度特性と、二次入力の分かれ方
(function (global) {
  'use strict';

  // 例として置いた電動機（励磁回路は省略）
  const MOTOR = { V: 200, f: 50, poles: 4, r1: 0.3, x: 1.2 };
  const INITIAL_R2 = 0.3;
  const WIDTH = 360;
  const HEIGHT = 300;

  function compute(p) {
    return {
      ...InductionMotor.analyze({ ...MOTOR, r2: p.r2, s: p.s }),
      sm: InductionMotor.maxTorqueSlip({ ...MOTOR, r2: p.r2 }),
      Tm: InductionMotor.maxTorque(MOTOR),
    };
  }

  function torqueCurve(r2, toX, toY) {
    const points = [];
    for (let i = 0; i <= 200; i++) {
      const s = 1 - (0.998 * i) / 200;
      const { N, T } = InductionMotor.analyze({ ...MOTOR, r2, s });
      points.push([toX(N), toY(T)]);
    }
    return points;
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const area = { x: 48, y: 36, w: 292, h: 144 };
    const Tlimit = 100;
    const toX = (N) => area.x + (N / r.Ns) * area.w;
    const toY = (T) => area.y + area.h - (T / Tlimit) * area.h;
    const bottom = area.y + area.h;
    const g = Svg.el(svg, 'g');

    // 目盛り：下は回転速度 N、上はすべり s
    Svg.guide(g, area.x, bottom, area.x + area.w, bottom, 'axis');
    Svg.guide(g, area.x, area.y - 6, area.x, bottom, 'axis');
    for (const N of [0, 500, 1000, 1500]) {
      Svg.note(g, toX(N), bottom + 13, Notation.number(N, 0), { cls: 'faint', anchor: 'middle' });
    }
    Svg.note(g, area.x + area.w, bottom + 28, '回転速度 N [min⁻¹]', { cls: 'faint', anchor: 'end' });
    for (const [s, anchor] of [[1, 'start'], [0.5, 'middle'], [0, 'end']]) {
      Svg.note(g, toX(r.Ns * (1 - s)), area.y - 14, `s = ${s}`, { cls: 'faint', anchor });
    }
    for (const T of [25, 50, 75, 100]) {
      Svg.note(g, area.x - 6, toY(T), String(T), { cls: 'faint', anchor: 'end' });
    }
    Svg.note(g, 6, 12, 'T [N·m]', { cls: 'faint' });

    // 最大トルクは r2 によらず一定（比例推移）
    Svg.guide(g, area.x, toY(r.Tm), area.x + area.w, toY(r.Tm), 'q-mech');
    Svg.note(g, area.x + 4, toY(r.Tm) - 8, `最大トルク ${Notation.number(r.Tm, 1)} N·m（r₂' によらず一定）`, { cls: 'faint' });

    if (Math.abs(p.r2 - INITIAL_R2) > 0.005) {
      Svg.polyline(g, torqueCurve(INITIAL_R2, toX, toY), 'reference');
      const s = InductionMotor.maxTorqueSlip({ ...MOTOR, r2: INITIAL_R2 });
      Svg.note(g, toX(r.Ns * (1 - s)) + 6, toY(r.Tm) + 12, `元の r₂' = ${INITIAL_R2}`, { cls: 'faint' });
    }
    Svg.polyline(g, torqueCurve(p.r2, toX, toY), 'q-mech thick');

    if (r.sm <= 1.02) {
      Svg.el(g, 'circle', { cx: toX(r.Ns * (1 - r.sm)), cy: toY(r.Tm), r: 4, class: 'ring q-mech' });
    }

    const px = toX(r.N);
    const py = toY(r.T);
    Svg.guide(g, px, py, px, bottom, 'q-mech');
    Svg.el(g, 'circle', { cx: px, cy: py, r: 6, class: 'dot q-mech' });

    drawRotorFrame(svg);
    drawPowerSplit(svg, p, r);
  }

  // 二次入力 P2 = 銅損 sP2 + 出力 (1−s)P2
  function drawPowerSplit(svg, p, r) {
    const bar = { x: 150, y: 252, w: 190, h: 22 };
    const g = Svg.el(svg, 'g');
    const outputWidth = bar.w * (1 - p.s);
    Svg.note(g, bar.x, bar.y - 12, `二次入力 P₂ = ${Notation.number(r.P2 / 1000, 2)} kW の行き先`, { cls: 'faint' });
    Svg.el(g, 'rect', { x: bar.x, y: bar.y, width: outputWidth, height: bar.h, class: 'bar q-mech' });
    Svg.el(g, 'rect', { x: bar.x + outputWidth, y: bar.y, width: bar.w - outputWidth, height: bar.h, class: 'bar loss' });
    const outputText = `出力 ${Notation.number(r.Po / 1000, 2)} kW`;
    const lossText = `銅損 ${Notation.number(r.Pc2 / 1000, 2)} kW`;
    const below = bar.y + bar.h + 13;
    if (outputWidth > 100) Svg.note(g, bar.x + 8, bar.y + bar.h / 2, outputText, { cls: 'on-bar' });
    else Svg.note(g, bar.x, below, outputText, { cls: 'faint' });
    Svg.note(g, bar.x + bar.w, below, lossText, { cls: 'faint', anchor: 'end' });
  }

  const ROTOR = { cx: 82, cy: 262, stator: 36, rotor: 24 };
  const FIELD_TURN_SECONDS = 4; // 回転磁界が表示で1回転する時間（実際は同期速度で回る）

  function drawRotorFrame(svg) {
    const g = Svg.el(svg, 'g');
    Svg.el(g, 'circle', { cx: ROTOR.cx, cy: ROTOR.cy, r: ROTOR.stator, class: 'stator' });
    Svg.note(g, 12, 218, '回転磁界（墨）と回転子（橙）をゆっくり表示', { cls: 'faint' });
  }

  // 回転磁界は同期速度 Ns、回転子は N = Ns(1 − s) で回る。すべりの分だけ回転子が遅れていく
  function drawRotorMotion(g, p, r, time) {
    const field = (2 * Math.PI * time) / FIELD_TURN_SECONDS;
    const rotor = field * (1 - p.s);
    const at = (length, angle) => [ROTOR.cx + length * Math.cos(angle), ROTOR.cy - length * Math.sin(angle)];
    Svg.el(g, 'circle', { cx: ROTOR.cx, cy: ROTOR.cy, r: ROTOR.rotor, class: 'rotor q-mech' });
    const [ax, ay] = at(ROTOR.rotor, rotor);
    const [bx, by] = at(ROTOR.rotor, rotor + Math.PI);
    Svg.el(g, 'line', { x1: bx, y1: by, x2: ax, y2: ay, class: 'rotor-bar q-mech' });
    Svg.el(g, 'circle', { cx: ax, cy: ay, r: 4, class: 'dot q-mech' });
    Svg.arrow(g, ROTOR.cx, ROTOR.cy, ...at(ROTOR.stator + 6, field), { cls: 'ink', width: 2 });
  }

  global.TopicInductionMotor = {
    id: 'induction-motor',
    title: '誘導電動機のトルクとすべり',
    lead: 'すべり s で回転速度・トルク・出力が決まる。二次抵抗を変えると曲線が横にずれる（比例推移）。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 's', name: 'すべり', symbol: 's', unit: '', min: 0.005, max: 1, step: 0.005, value: 0.04 },
      { key: 'r2', name: '二次抵抗（一次換算）', symbol: "r_2'", unit: 'Ω', min: 0.1, max: 2, step: 0.01, value: INITIAL_R2 },
    ],
    presets: [
      { name: '起動の瞬間', apply: () => ({ s: 1 }) },
      { name: '最大トルクで起動', apply: () => ({ s: 1, r2: Math.hypot(MOTOR.r1, MOTOR.x) }) },
    ],
    compute,
    draw,
    motion: { draw: drawRotorMotion },
    caption(p, r) {
      return `二次入力の ${Notation.number(p.s * 100, 1)}% が銅損、${Notation.number((1 - p.s) * 100, 1)}% が出力（1 : ${Notation.html('s')} : 1 − ${Notation.html('s')}）。回転子は磁界より遅れて回る。`;
    },
    readouts: (p, r) => [
      { name: '回転速度', symbol: 'N', value: Notation.number(r.N, 0), unit: 'min⁻¹' },
      { name: 'トルク', symbol: 'T', value: Notation.number(r.T, 1), unit: 'N·m', cls: 'q-mech' },
      { name: '機械出力', symbol: 'P_o', value: Notation.number(r.Po / 1000, 2), unit: 'kW', cls: 'q-mech' },
      { name: '最大トルクのすべり', symbol: 's_m', value: Notation.number(r.sm, 3), unit: '' },
    ],
    terms: [
      ['回転磁界', '三相の電流を固定子（外側）の巻線に流すと、磁界がぐるぐる回る。回転子（内側）はこれに引っぱられて回る。'],
      ['同期速度 <var>N</var><sub>s</sub>', '回転磁界の回る速さ。<var>N</var><sub>s</sub> = 120<var>f</var>/<var>p</var>（<var>p</var> は極数）。単位 min⁻¹ は1分間の回転数。'],
      ['すべり <var>s</var>', '回転子が回転磁界からどれだけ遅れているかの割合。止まっていれば 1、同期速度で回れば 0。ふつうの運転では 0.03〜0.05 くらい。'],
      ['二次入力 <var>P</var><sub>2</sub>', '固定子から回転子へ渡る電力。一部が熱（二次銅損）に、残りが回す力（機械出力）になる。'],
      ['トルク <var>T</var>', '回す力の強さ。単位 N·m（ニュートンメートル）。'],
      ['比例推移', '二次抵抗を大きくすると、トルクの曲線がすべりの大きい方へ伸びること。最大トルクの大きさは変わらない。'],
    ],
    tries: [
      { text: '起動の瞬間（すべり <var>s</var> = 1）にする', set: { s: 1 }, look: '左下の回転子は止まり、磁界だけが回る。トルクは約 42 N·m。二次入力はすべて銅損（熱）になり、出力は 0。' },
      { text: 'すべりを 0.04 → 0.24 にする', set: { s: 0.24 }, look: 'トルクが最大（約 83 N·m）の点に来る。<var>s</var><sub>m</sub> = <var>r</var><sub>2</sub>\'/√(<var>r</var><sub>1</sub>² + <var>x</var>²) ≒ 0.24。回転子は磁界の約 3/4 の速さで回る。' },
      { text: '二次抵抗 <var>r</var><sub>2</sub>\' を 0.30 → 0.90 Ω（3倍）にする', set: { r2: 0.9 }, look: '曲線が低速側へ伸び、最大トルクのすべりも3倍（約 0.73）。最大トルクの大きさは変わらない（点線のまま）。同じ <var>s</var> = 0.04 ではトルクが減る。' },
      { text: '最大トルクで起動する（<var>r</var><sub>2</sub>\' ≒ 1.24 Ω、<var>s</var> = 1）', set: { s: 1, r2: 1.24 }, look: '起動の瞬間に最大トルクが出る。巻線形誘導電動機は、二次側に抵抗をつないでこうして起動する。' },
    ],
    quiz: [
      { q: '4極・50 Hz の誘導電動機の同期速度は？', choices: ['750 min⁻¹', '1,500 min⁻¹', '3,000 min⁻¹', '6,000 min⁻¹'], answer: 1, why: '<var>N</var><sub>s</sub> = 120<var>f</var>/<var>p</var> = 120 × 50 / 4 = 1,500 min⁻¹。' },
      { q: '同期速度 1,500 min⁻¹、すべり 0.04 のときの回転速度は？', choices: ['60 min⁻¹', '1,440 min⁻¹', '1,500 min⁻¹', '1,560 min⁻¹'], answer: 1, why: '<var>N</var> = <var>N</var><sub>s</sub>(1 − <var>s</var>) = 1,500 × 0.96 = 1,440 min⁻¹。' },
      { q: '二次入力 10 kW、すべり 0.05 のとき、二次銅損は？', choices: ['0.05 kW', '0.5 kW', '9.5 kW', '10 kW'], answer: 1, why: '二次銅損 = <var>s</var> × <var>P</var><sub>2</sub> = 0.05 × 10 = 0.5 kW。残りの 9.5 kW が機械出力。' },
    ],
    exam: `<p>機械科目で誘導機は約28問（過去12回、論点名から数えた目安）。直流機・同期機・変圧器と並ぶ「4機」の一つで、毎回のように出る。</p>
      <ul>
        <li>トルクは二次入力を「同期角速度」で割る。出力を割るなら実際の角速度。</li>
        <li>二次銅損 = ${Notation.html('s')} × 二次入力。すべりが大きいほど熱になる割合が増え、効率が下がる。</li>
        <li>比例推移：${Notation.html("r_2'")} を ${Notation.html('k')} 倍すると、同じトルクのすべりも ${Notation.html('k')} 倍。最大トルクの値は変わらない。</li>
        <li>起動時に最大トルクを出すには ${Notation.html('s_m')} = 1 になるよう二次抵抗を足す（「最大トルクで起動」を押してみる）。</li>
      </ul>`,
    conditions: `例の値：${MOTOR.V} V・${MOTOR.f} Hz・${MOTOR.poles} 極（同期速度 1,500 min⁻¹）、${Notation.html('r_1')} = ${MOTOR.r1} Ω、${Notation.html('x')} = ${MOTOR.x} Ω。励磁回路は省いて計算`,
    notesHtml: `
      <h2>しくみ</h2>
      <p>回転子は回転磁界より少し遅れて回る。その遅れの割合が すべり ${Notation.html('s')}。止まっている起動の瞬間は ${Notation.html('s')} = 1、同期速度で回れば ${Notation.html('s')} = 0 でトルクは出ない。</p>
      <p>固定子から回転子へ渡る二次入力 ${Notation.html('P_2')} は、${Notation.html('s')} の割合が二次銅損（熱）になり、残りが機械出力になる。</p>
      <p>二次抵抗 ${Notation.html("r_2'")} を大きくすると、同じトルクが出るすべりが同じ倍率で大きくなる（比例推移）。曲線は横に引き伸ばされるように低速側（左）へずれ、最大トルクの大きさは変わらない。巻線形誘導電動機は、これを使って起動トルクを大きくする。</p>
      <h2>公式</h2>
      <ul class="formulas">
        <li>${Notation.html('N_s')} = 120${Notation.html('f')} / ${Notation.html('p')}　　${Notation.html('N')} = ${Notation.html('N_s')}(1 − ${Notation.html('s')})</li>
        <li>${Notation.html('P_2')} : ${Notation.html('P_{c2}')} : ${Notation.html('P_o')} = 1 : ${Notation.html('s')} : (1 − ${Notation.html('s')})</li>
        <li>${Notation.html('T')} = ${Notation.html('P_2')} / ${Notation.html('ω_s')} = ${Notation.html('P_o')} / ${Notation.html('ω')}　（${Notation.html('ω_s')} = 2π${Notation.html('N_s')} / 60）</li>
        <li>最大トルクのすべり：${Notation.html('s_m')} = ${Notation.html("r_2'")} / √(${Notation.html('r_1')}² + ${Notation.html('x')}²)</li>
      </ul>
      <p class="symbols">${Notation.html('N_s')}：同期速度［min⁻¹］、${Notation.html('N')}：回転速度［min⁻¹］、${Notation.html('f')}：電源の周波数［Hz］、${Notation.html('p')}：極数、${Notation.html('s')}：すべり、${Notation.html('P_2')}：二次入力［W］、${Notation.html('P_{c2}')}：二次銅損［W］、${Notation.html('P_o')}：機械出力［W］、${Notation.html('T')}：トルク［N·m］、${Notation.html('ω_s')}・${Notation.html('ω')}：同期・実際の角速度［rad/s］</p>`,
  };
})(this);
