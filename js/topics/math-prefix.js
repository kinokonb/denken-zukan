// 基礎：大きい数・小さい数（k・M・m・μ と 10 の n 乗）。接頭語のはしごと、小数点が何けた動くかを見せる。
// 数学の数なので量の色は使わない（墨で描く）
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 300;
  const PREFIXES = [
    { n: -6, mark: 'μ', reading: 'マイクロ', times: '0.000001' },
    { n: -3, mark: 'm', reading: 'ミリ', times: '0.001' },
    { n: 0, mark: '1', reading: 'そのまま', times: '1' },
    { n: 3, mark: 'k', reading: 'キロ', times: '1,000' },
    { n: 6, mark: 'M', reading: 'メガ', times: '1,000,000' },
  ];
  const SUPERSCRIPT = { '-6': '⁻⁶', '-3': '⁻³', 0: '⁰', 3: '³', 6: '⁶' };
  const CELL = 22;

  const prefixOf = (n) => PREFIXES.find((prefix) => prefix.n === n);

  // 小数点の位置つきの数字の並び。point はふつうの数の小数点の位置、from は元の数（a）の小数点の位置
  function digitsOf(a, n) {
    const digits = String(a);
    if (n >= 0) return { cells: digits + '0'.repeat(n), from: digits.length, point: digits.length + n };
    const shift = -n;
    const padded = '0'.repeat(Math.max(0, shift - digits.length + 1)) + digits;
    return { cells: padded, from: padded.length, point: padded.length - shift };
  }

  function plainNumber(a, n) {
    return n >= 0 ? Notation.number(a * 10 ** n, 0) : (a / 10 ** -n).toFixed(-n);
  }

  function compute(p) {
    const prefix = prefixOf(p.n);
    return { a: p.a, n: p.n, prefix, plain: plainNumber(p.a, p.n), ...digitsOf(p.a, p.n) };
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    drawLadder(svg, r);
    drawNumber(svg, r);
  }

  // 接頭語のはしご（1段ごとに 1,000倍）。いまの段を太い枠で
  function drawLadder(svg, r) {
    const g = Svg.el(svg, 'g');
    Svg.note(g, 12, 14, '接頭語のはしご：右へ1段ごとに 1,000倍', { cls: 'faint' });
    PREFIXES.forEach((prefix, i) => {
      const x = 44 + i * 68;
      const current = prefix.n === r.n;
      Svg.el(g, 'rect', { x: x - 31, y: 30, width: 62, height: 48, rx: 3, class: `rung${current ? ' current' : ''}` });
      Svg.note(g, x, 46, prefix.mark, { cls: current ? 'value' : 'faint', anchor: 'middle' });
      Svg.note(g, x, 64, `10${SUPERSCRIPT[prefix.n]}`, { cls: current ? 'value' : 'faint', anchor: 'middle' });
    });
    Svg.note(g, 180, 96, `${r.prefix.mark === '1' ? '接頭語なし' : `${r.prefix.mark}（${r.prefix.reading}）`} ＝ ${r.prefix.times}倍`, { cls: 'value', anchor: 'middle' });
  }

  // ふつうの数を1けたずつマスに書き、元の小数点（点線の輪）から今の小数点（黒い点）へ矢印
  function drawNumber(svg, r) {
    const g = Svg.el(svg, 'g');
    const top = 150;
    const left = 180 - (r.cells.length * CELL) / 2;
    const boundary = (index) => left + index * CELL;
    Svg.note(g, 180, 126, `${r.a}${r.prefix.mark === '1' ? '' : ` ${r.prefix.mark}`} ＝ ${r.a} × ${r.prefix.times} ＝ ${r.plain}`, { cls: 'value', anchor: 'middle' });
    [...r.cells].forEach((digit, i) => {
      Svg.el(g, 'rect', { x: boundary(i), y: top, width: CELL, height: 30, class: 'digit-cell' });
      Svg.note(g, boundary(i) + CELL / 2, top + 15, digit, { cls: 'value', anchor: 'middle' });
    });
    Svg.el(g, 'circle', { cx: boundary(r.point), cy: top + 36, r: 3.5, class: 'dot ink' });
    if (r.n !== 0) {
      Svg.el(g, 'circle', { cx: boundary(r.from), cy: top + 36, r: 3.5, class: 'digit-from' });
      Svg.arrow(g, boundary(r.from), top + 54, boundary(r.point), top + 54, { cls: 'ink', width: 1.5 });
      Svg.note(g, 180, top + 76, `小数点を ${Math.abs(r.n)}けた${r.n > 0 ? '右' : '左'}へ（${r.n > 0 ? '大きく' : '小さく'}なる）`, { cls: 'value', anchor: 'middle' });
    }
    Svg.note(g, 180, top + 100, '点線の輪＝元の小数点、黒い点＝ふつうの数の小数点', { cls: 'faint', anchor: 'middle' });
  }

  global.TopicMathPrefix = {
    id: 'math-prefix',
    title: '大きい数・小さい数（k・M・m・μ）',
    lead: 'k は1,000倍、m は1,000分の1。小数点を3けた動かすだけ。単位をそろえてから計算する。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'a', name: '数', symbol: 'a', unit: '', min: 1, max: 999, step: 1, value: 47 },
      { key: 'n', name: 'けた（10 の n 乗）', symbol: 'n', unit: '', min: -6, max: 6, step: 3, value: 3 },
    ],
    presets: [],
    compute,
    draw,
    caption(p, r) {
      const written = r.prefix.mark === '1' ? `${r.a}` : `${r.a} ${r.prefix.mark}（${r.prefix.reading}）`;
      return `${written} ＝ ${r.a} × 10<sup>${r.n}</sup> ＝ ${r.plain}。`;
    },
    readouts: (p, r) => [
      { name: '書き方', symbol: '', value: `${r.a}${r.prefix.mark === '1' ? '' : ` ${r.prefix.mark}`}`, unit: '' },
      { name: 'ふつうの数', symbol: '', value: r.plain, unit: '' },
      { name: '10 の n 乗で', symbol: '', value: `${r.a} × 10<sup>${r.n}</sup>`, unit: '' },
      { name: '読み方', symbol: '', value: r.prefix.reading, unit: '' },
    ],
    terms: [
      ['接頭語', '単位の前に付けて、けたの大きさを表す文字。kΩ の k、mA の m など。'],
      ['k（キロ）・M（メガ）', 'k は 1,000倍（1 kΩ = 1,000 Ω）。M は 1,000,000倍（1 MW = 1,000 kW）。'],
      ['m（ミリ）・μ（マイクロ）', 'm は 1,000分の1（1 mA = 0.001 A）。μ は 1,000,000分の1（1 μF = 0.000001 F）。'],
      ['10 の n 乗', '1 の後に 0 が n 個つく数。10³ = 1,000。マイナスの時は分の1で、10⁻³ = 0.001。'],
      ['小数点を動かす', '10倍は小数点を1けた右へ。1,000倍は3けた右へ。1,000分の1は3けた左へ。'],
    ],
    tries: [
      { text: 'けたを k（10³）→ M（10⁶）にすると、ふつうの数は？', choices: ['47,000', '470,000', '47,000,000'], answer: 2, set: { n: 6 }, look: 'M は k のさらに 1,000倍。小数点が 6けた右へ動いて 47,000,000。' },
      { text: 'けたを m（ミリ、10⁻³）にすると、47 m は？', choices: ['47,000', '0.47', '0.047', '0.0047'], answer: 2, set: { n: -3 }, look: 'm は 1,000分の1。小数点が 3けた左へ動いて 0.047。' },
      { text: '2 mA は何 A？（数を 2、けたを m にして確かめる）', choices: ['2,000 A', '0.2 A', '0.02 A', '0.002 A'], answer: 3, set: { a: 2, n: -3 }, look: 'm は 1,000分の1 なので、2 mA = 0.002 A。' },
    ],
    quiz: [
      { q: '4.7 kΩ は何 Ω？', choices: ['0.0047 Ω', '47 Ω', '4,700 Ω', '4,700,000 Ω'], answer: 2, why: 'k は 1,000倍。4.7 × 1,000 = 4,700 Ω（小数点を3けた右へ）。' },
      { q: '300 mA は何 A？', choices: ['0.3 A', '3 A', '30 A', '300,000 A'], answer: 0, why: 'm は 1,000分の1。300 ÷ 1,000 = 0.3 A。' },
      { q: '100 μF は何 F？', choices: ['0.0001 F', '0.1 F', '100,000 F'], answer: 0, why: 'μ は 100万分の1。100 ÷ 1,000,000 = 0.0001 F（10⁻⁴ F）。' },
    ],
    exam: {
      lead: '計算の前に単位をそろえるのが基本。kW と W、mA と A、μF と F をまちがえて、答えが 1,000倍ずれる失点が多い。',
      often: [
        'k = 10³（1,000倍）、M = 10⁶、m = 10⁻³（1,000分の1）、μ = 10⁻⁶。',
        '式に入れる前に、V・A・Ω・F・H などの基本の単位に直す。',
      ],
      traps: [
        'kWh の k も 1,000倍。1 kWh = 1,000 Wh。',
        'm（ミリ）と M（メガ）は小文字と大文字でちがう。',
      ],
    },
    conditions: 'k・M・m・μ は単位の前に付く（kΩ・MW・mA・μF）。つまみの「けた」は 3 ずつ動く',
    explain: {
      points: [
        'k は 1,000倍、M は 100万倍。m は 1,000分の1、μ は 100万分の1。',
        '1,000倍は小数点を3けた右へ、1,000分の1は3けた左へ動かすこと。',
        '計算の前に kΩ・mA・μF などを Ω・A・F に直してから式に入れる。',
      ],
      look: [
        ['text', 'ink', '上のはしご＝接頭語。右へ1段ごとに 1,000倍。'],
        ['text', 'ink', '下のマス＝ふつうの数。1けたずつ書いてある。'],
        ['arrow', 'ink', '矢印＝小数点が動く向き。右で大きく、左で小さくなる。'],
      ],
      formulas: [
        ['k = 10³', '1,000倍。', 'kΩ・kW・kV を直す時'],
        ['M = 10⁶', '1,000,000倍。', 'MW・MΩ を直す時'],
        ['m = 10⁻³', '1,000分の1。', 'mA・mH を直す時'],
        ['μ = 10⁻⁶', '1,000,000分の1。', 'μF を直す時'],
      ],
      symbols: [
        ['k', 'キロ（1,000倍）', '—'],
        ['M', 'メガ（100万倍）', '—'],
        ['m', 'ミリ（1,000分の1）', '—'],
        ['μ', 'マイクロ（100万分の1）', '—'],
      ],
    },
  };
})(this);
