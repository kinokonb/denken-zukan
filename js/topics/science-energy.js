// 基礎（理科）：仕事・エネルギー・熱（J と W）。ヒーターで水 1 L を温め、電力（1秒あたりの J）× 秒 = 熱量（J）と、
// 熱量から水の温度の上がり方（水 1 kg を 1 ℃ 上げるのに 4,200 J）を見せる
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 300;
  const WATER_HEAT = 4200; // 水 1 kg を 1 ℃ 上げる熱量 [J]
  const START_TEMP = 20; // はじめの水の温度 [℃]
  const POT = { x: 30, y: 96, w: 90, h: 104 };
  const THERMO = { x: 146, top: 70, bottom: 210 };

  const format = (value) => String(Number(value.toFixed(1)));

  function compute(p) {
    const J = p.P * p.t;
    const boilHeat = (100 - START_TEMP) * WATER_HEAT; // 100 ℃ まで温める熱量。それより多い熱は水を湯気にする
    const boiling = J >= boilHeat;
    const rise = boiling ? 100 - START_TEMP : J / WATER_HEAT;
    return { P: p.P, t: p.t, J, Wh: J / 3600, rise, temp: START_TEMP + rise, boiling, boilHeat };
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    Svg.note(g, 12, 14, `水 1 L（1 kg）を ${START_TEMP} ℃ から温める`, { cls: 'faint' });
    drawPot(g, r);
    drawThermometer(g, r);
    drawNumbers(g, r);
  }

  // なべ（水）と、下のヒーター（光のにじみ＝電力）
  function drawPot(g, { P, boiling }) {
    const { x, y, w, h } = POT;
    Svg.el(g, 'rect', { x, y: y + 18, width: w, height: h - 18, class: 'tile ink' });
    Svg.polyline(g, [[x, y], [x, y + h], [x + w, y + h], [x + w, y]], 'ink thick');
    if (boiling) {
      for (const dx of [22, 45, 68]) {
        Svg.el(g, 'path', { d: `M${x + dx},${y + 8} q-6,-10 0,-20 q6,-10 0,-20`, class: 'steam' });
      }
      Svg.note(g, x + w / 2, y - 48, '沸いた', { cls: 'value', anchor: 'middle' });
    }
    Svg.wire(g, [[x + 10, y + h + 26], [x + w - 10, y + h + 26]]);
    const heater = Svg.el(g, 'g', { transform: `rotate(90 ${x + w / 2} ${y + h + 26})` });
    Svg.heater(heater, x + w / 2, y + h + 26, { level: P / 1000 });
    Svg.note(g, x + w / 2, y + h + 50, `ヒーター ${Notation.number(P, 0)} W`, { cls: 'value q-active', anchor: 'middle' });
  }

  // 温度計（0〜100 ℃）。熱の量なので黄色で満たす。目盛りは右、今の温度は右の計算の欄に出す
  function drawThermometer(g, { temp }) {
    const { x, top, bottom } = THERMO;
    const toY = (celsius) => bottom - (celsius / 100) * (bottom - top);
    Svg.el(g, 'rect', { x: x - 6, y: top, width: 12, height: bottom - top, rx: 6, class: 'thermo' });
    Svg.el(g, 'rect', { x: x - 4, y: toY(temp), width: 8, height: bottom - toY(temp), rx: 4, class: 'thermo-fill' });
    Svg.el(g, 'circle', { cx: x, cy: bottom + 8, r: 10, class: 'thermo-fill' });
    for (const celsius of [0, 50, 100]) Svg.note(g, x + 12, toY(celsius), `${celsius}`, { cls: 'faint', anchor: 'start' });
    Svg.note(g, x, top - 12, '℃', { cls: 'faint', anchor: 'middle' });
  }

  // 熱量の計算（電力 × 秒 → J → kJ・Wh → 上がる温度）
  function drawNumbers(g, { P, t, J, Wh, rise, temp, boiling, boilHeat }) {
    const x = 350;
    const rows = [
      [`${Notation.number(P, 0)} W ＝ 1秒に ${Notation.number(P, 0)} J`, 'value'],
      [`× ${t} 秒`, 'value'],
      [`＝ ${Notation.number(J, 0)} J`, 'value'],
      [`（${format(J / 1000)} kJ・${format(Wh)} Wh）`, 'faint'],
      ...(boiling
        ? [[`${Notation.number(boilHeat, 0)} J で 100 ℃`, 'value'], ['残りは湯気に', 'value'], ['水は 100 ℃ のまま', 'value']]
        : [[`÷ 4,200 J（1 kg・1 ℃）`, 'value'], [`＝ ${format(rise)} ℃ 上がる`, 'value'], [`水は ${format(temp)} ℃`, 'value']]),
    ];
    rows.forEach(([text, cls], i) => Svg.note(g, x, 100 + i * 22, text, { cls, anchor: 'end' }));
  }

  global.TopicScienceEnergy = {
    id: 'science-energy',
    title: '仕事・エネルギー・熱（J と W）',
    lead: 'エネルギーの量は J（ジュール）。電力 W は1秒あたりの J。熱量 ＝ 電力 × 秒。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'P', name: 'ヒーターの電力', symbol: 'P', unit: 'W', min: 100, max: 1500, step: 100, value: 1000 },
      { key: 't', name: '温める時間', symbol: 't', unit: 's', min: 10, max: 600, step: 10, value: 120 },
    ],
    presets: [],
    compute,
    draw,
    caption(p, r) {
      if (r.boiling) return `${Notation.number(r.P, 0)} W で ${r.t} 秒 → 熱量 ${Notation.number(r.J, 0)} J。${Notation.number(r.boilHeat, 0)} J で 100 ℃ になって沸く。`;
      return `${Notation.number(r.P, 0)} W で ${r.t} 秒 → 熱量 ${Notation.number(r.J, 0)} J。水 1 L が ${format(r.rise)} ℃ 上がる。`;
    },
    readouts: (p, r) => [
      { name: '熱量', symbol: 'Q', value: format(r.J / 1000), unit: 'kJ' },
      { name: '電力量', symbol: 'W', value: format(r.Wh), unit: 'Wh', cls: 'q-active' },
      { name: '上がる温度', symbol: 'ΔT', value: format(r.rise), unit: '℃' },
      { name: '水の温度', symbol: '', value: format(r.temp), unit: '℃' },
    ],
    terms: [
      ['エネルギー', '仕事をする力のもと。熱・光・動き・電気は、形を変えても量は同じまま（なくならない）。'],
      ['J（ジュール）', 'エネルギー・熱・仕事の量の単位。1 J は、約 100 g の物を 1 m 持ち上げるくらい。'],
      ['W（ワット）', '1秒あたりの J。1 W = 1 J/s。1,000 W のヒーターは1秒に 1,000 J の熱を出す。'],
      ['熱量 <var>Q</var>', '物を温める熱の量。単位は J。電気で出る熱は、電力 × 秒。'],
      ['比熱', '1 kg を 1 ℃ 上げるのに要る熱量。水は約 4,200 J（4.2 kJ）で、温まりにくい。'],
      ['kWh と J', '1 kWh は 1,000 W を 3,600 秒（1時間）使った量で、3,600,000 J（3,600 kJ）。'],
    ],
    tries: [
      { text: '時間を 120 秒 → 240 秒にすると、水の上がる温度は？', choices: ['半分', 'そのまま', '2倍'], answer: 2, set: { t: 240 }, look: '熱量が 240 kJ と2倍になり、上がる温度も約 29 ℃ → 約 57 ℃ と2倍。' },
      { text: '電力を 500 W にして 240 秒温めると、1,000 W・120 秒とくらべて熱量は？', choices: ['同じ', '半分', '2倍'], answer: 0, set: { P: 500, t: 240 }, look: '500 × 240 = 1,000 × 120 = 120,000 J。電力が半分でも時間が2倍なら同じ熱量。' },
      { text: '1,000 W で水 1 L を 20 ℃ → 100 ℃（80 ℃ 上げる）にするには、およそ何秒？', choices: ['約 34 秒', '約 340 秒', '約 3,400 秒'], answer: 1, set: { t: 340 }, look: '80 × 4,200 = 336,000 J。1,000 W なら 336 秒（約 5.6 分）。340 秒で 100 ℃ に届いて沸く。' },
    ],
    quiz: [
      { q: '1 W とは？', choices: ['1秒に 1 J', '1時間に 1 J', '1分に 1 J'], answer: 0, why: 'W は1秒あたりのエネルギー。1 W = 1 J/s。' },
      { q: '1 kWh は何 kJ？', choices: ['60 kJ', '1,000 kJ', '3,600 kJ', '3,600,000 kJ'], answer: 2, why: '1,000 W × 3,600 s = 3,600,000 J = 3,600 kJ。' },
      { q: '2 kW のヒーターを 10 分使った熱量は？', choices: ['20 kJ', '1,200 kJ', '20,000 kJ'], answer: 1, why: '分は秒に直す（10 分 = 600 s）。2,000 W × 600 s = 1,200,000 J = 1,200 kJ。' },
    ],
    exam: {
      lead: '電力量を J で答える問題や、水を温める熱量（電熱）の計算で、W と J と kWh の行き来をよく使う。',
      often: [
        '熱量 = 電力 × 秒（J = W × s）。1 kWh = 3,600 kJ。',
        '水 1 kg を 1 ℃ 上げるのに約 4.2 kJ。',
      ],
      traps: [
        'J の計算の時間は秒。kWh の計算の時間は時間（h）。',
        'W は「1秒あたり」、J は「合計」。',
      ],
    },
    conditions: '水 1 L（1 kg）、はじめ 20 ℃。熱は全部水へ行くとする。水 1 kg を 1 ℃ 上げるのに 4,200 J。100 ℃ をこえた分の熱は水を湯気にする',
    explain: {
      points: [
        'エネルギー（熱・光・動き）の量の単位は J（ジュール）。',
        '電力 W は1秒あたりの J。熱量 = 電力 × 秒。1 kWh = 3,600 kJ。',
        '水 1 kg を 1 ℃ 上げるには約 4.2 kJ。熱量から温度の上がり方がわかる。',
      ],
      look: [
        ['area', 'ink', 'なべの中＝水 1 L（1 kg）。沸くと湯気が出る。'],
        ['bar', 'q-light', '黄色の柱＝温度計。100 ℃ で沸く。'],
        ['text', 'ink', '右の計算＝電力 × 秒 = 熱量、熱量 ÷ 4,200 = 上がる温度。'],
      ],
      formulas: [
        ['Q = P × t', '熱量（J）は、電力（W）と時間（秒）のかけ算。', '電気で出る熱を求める時'],
        ['1 kWh = 3,600 kJ', '1,000 W で 3,600 秒（1時間）使った量。', 'kWh と J を直す時'],
        ['Q = 4.2 × m × ΔT', '水 $m$ kg を ΔT ℃ 上げる熱量（kJ）。', 'お湯をわかす問題'],
      ],
      symbols: [
        ['Q', '熱量', 'J'],
        ['P', '電力', 'W（= J/s）'],
        ['t', '時間', 's'],
        ['m', '水の質量', 'kg'],
        ['ΔT', '上がる温度', '℃'],
      ],
    },
  };
})(this);
