// 基礎：三角比（sin・cos・tan）。斜辺 c・角 θ の直角三角形で、cos θ = 横 ÷ 斜め、sin θ = 縦 ÷ 斜め が角だけで決まることを見せる。
// 交流の力率 cos φ = R ÷ Z はこの形。数学の図なので量の色は使わない（墨で描く）
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 300;
  const UNIT = 40; // 1 の長さ
  const O = { x: 40, y: 258 }; // 角 θ の頂点

  const format = (value) => String(Number(value.toFixed(2)));

  function compute(p) {
    const rad = (p.deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return { deg: p.deg, c: p.c, cos, sin, tan: p.deg >= 90 ? null : sin / cos, across: p.c * cos, up: p.c * sin };
  }

  const tanText = (tan) => (tan === null ? '—（とても大きい）' : format(tan));

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    const radius = r.c * UNIT;
    const A = [O.x + r.across * UNIT, O.y]; // 直角の頂点
    const B = [A[0], O.y - r.up * UNIT]; // 斜辺の先
    Svg.el(g, 'path', { d: `M${O.x + radius},${O.y}A${radius},${radius} 0 0 0 ${O.x},${O.y - radius}`, class: 'arc arc-guide' });
    Svg.note(g, 12, 14, '点線の弧＝斜めの長さ。θ を変えても長さは同じ', { cls: 'faint' });
    Svg.el(g, 'path', { d: `M${O.x},${O.y}L${A[0]},${A[1]}L${B[0]},${B[1]}Z`, class: 'tile ink' });
    Svg.polyline(g, [[O.x, O.y], B], 'ink thick');
    Svg.polyline(g, [[O.x, O.y], A], 'ink');
    Svg.polyline(g, [A, B], 'ink');
    if (r.deg > 0 && r.deg < 90) {
      Svg.el(g, 'path', { d: `M${A[0] - 8},${A[1]}L${A[0] - 8},${A[1] - 8}L${A[0]},${A[1] - 8}`, class: 'right-angle' });
    }
    Svg.angleArc(g, O.x, O.y, 26, 0, (r.deg * Math.PI) / 180, { cls: 'arc-angle' });
    // 角の文字：小さい角では斜辺に重なるので、横の辺の下の左端へ
    if (r.deg >= 20) Svg.note(g, O.x + 32, O.y - 10, `θ = ${r.deg}°`, { cls: 'value', anchor: 'start' });
    else Svg.note(g, O.x, O.y + 16, `θ = ${r.deg}°`, { cls: 'value', anchor: 'start' });
    Svg.note(g, (O.x + A[0]) / 2, O.y + 16, `横 ${format(r.across)}`, { cls: 'value', anchor: 'middle' });
    Svg.note(g, A[0] + 8, (A[1] + B[1]) / 2, `縦 ${format(r.up)}`, { cls: 'value', anchor: 'start' });
    Svg.note(g, B[0] + 8, B[1] - 8, `斜め ${r.c}`, { cls: 'value', anchor: 'start' });
    const rows = [
      [`cos θ = 横 ÷ 斜め = ${format(r.cos)}`, 'value'],
      [`sin θ = 縦 ÷ 斜め = ${format(r.sin)}`, 'value'],
      [`tan θ = 縦 ÷ 横 = ${tanText(r.tan)}`, 'value'],
    ];
    rows.forEach(([text, cls], i) => Svg.note(g, 352, 40 + i * 22, text, { cls, anchor: 'end' }));
  }

  global.TopicMathTrig = {
    id: 'math-trig',
    title: '三角比（sin・cos・tan）',
    lead: 'cos は横 ÷ 斜め、sin は縦 ÷ 斜め。角だけで決まる。交流の力率 cos φ はこれ。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'deg', name: '角', symbol: 'θ', unit: '°', min: 0, max: 90, step: 5, value: 30 },
      { key: 'c', name: '斜めの長さ', symbol: 'c', unit: '', min: 1, max: 5, step: 1, value: 4 },
    ],
    presets: [],
    compute,
    draw,
    caption(p, r) {
      return `θ = ${r.deg}° のとき cos θ = ${format(r.cos)}、sin θ = ${format(r.sin)}。斜めの長さを変えても同じ。`;
    },
    readouts: (p, r) => [
      { name: '横 ÷ 斜め', symbol: 'cosθ', value: format(r.cos), unit: '' },
      { name: '縦 ÷ 斜め', symbol: 'sinθ', value: format(r.sin), unit: '' },
      { name: '縦 ÷ 横', symbol: 'tanθ', value: tanText(r.tan), unit: '' },
      { name: '横の長さ', symbol: '', value: format(r.across), unit: '' },
    ],
    terms: [
      ['角 θ（シータ）', '角の大きさ。単位は °（度）。まっすぐ横が 0°、まっすぐ上が 90°。'],
      ['cos θ（コサイン）', '斜めの長さを 1 とした時の横の長さ。横 ÷ 斜め。'],
      ['sin θ（サイン）', '斜めの長さを 1 とした時の縦の長さ。縦 ÷ 斜め。'],
      ['tan θ（タンジェント）', '縦 ÷ 横。坂の傾き。'],
      ['力率 cos φ', '交流で、電圧と電流のずれの角 φ の cos。<var>R</var> ÷ <var>Z</var>、<var>P</var> ÷ <var>S</var> で、1 に近いほど電気を無駄なく使える。'],
    ],
    tries: [
      { text: '角 θ を 30° → 60° にすると、cos θ は？', choices: ['大きくなる', 'そのまま', '小さくなる'], answer: 2, set: { deg: 60 }, look: 'cos 30° ≒ 0.87 → cos 60° = 0.5。角が大きいほど横が短くなり、cos は小さく、sin は大きくなる。' },
      { text: '斜めの長さを 4 → 2 にすると、cos θ は？（θ は 30° のまま）', choices: ['半分', 'そのまま', '2倍'], answer: 1, set: { c: 2 }, look: '横も斜めも半分になるので、割った値 cos θ は 0.87 のまま。三角比は大きさによらず、角だけで決まる。' },
      { text: 'θ = 45° のとき、cos θ と sin θ は？', choices: ['cos のほうが大きい', '同じ', 'sin のほうが大きい'], answer: 1, set: { deg: 45 }, look: '横と縦が同じ長さ。cos 45° = sin 45° ≒ 0.71（= 1 ÷ √2）。' },
    ],
    quiz: [
      { q: '力率 cos φ = <var>R</var> ÷ <var>Z</var>。<var>R</var> = 80 Ω・<var>Z</var> = 100 Ω なら力率は？', choices: ['0.6', '0.8', '1.25', '8,000'], answer: 1, why: '80 ÷ 100 = 0.8。横（<var>R</var>）÷ 斜め（<var>Z</var>）。' },
      { q: 'cos φ = 0.8 のとき sin φ は？', choices: ['0.2', '0.6', '0.8', '1.0'], answer: 1, why: '斜め 1・横 0.8 なら縦は √(1 − 0.64) = 0.6。3・4・5 の三角形。' },
      { q: 'cos 60° は？', choices: ['0', '0.5', '0.87', '1'], answer: 1, why: '60° では横が斜めのちょうど半分。cos 60° = 0.5、sin 60° ≒ 0.87。' },
    ],
    exam: {
      lead: '交流では電圧と電流のずれを角 φ で表し、力率 cos φ と sin φ を毎回使う。',
      often: [
        'cos φ = $R$ ÷ $Z$ = $P$ ÷ $S$（力率）、sin φ = $X$ ÷ $Z$ = $Q$ ÷ $S$。',
        'cos φ = 0.8 なら sin φ = 0.6（3・4・5）。cos² φ + sin² φ = 1。',
      ],
      traps: [
        'cos は「横 ÷ 斜め」、sin は「縦 ÷ 斜め」。逆にしない。',
        '角が大きいほど cos は小さく、sin は大きい。',
      ],
    },
    conditions: '角 θ は左下。0° で横いっぱい、90° で縦いっぱい',
    explain: {
      points: [
        '三角比は直角三角形の辺の比。角 θ だけで決まり、大きさによらない。',
        'cos θ = 横 ÷ 斜め、sin θ = 縦 ÷ 斜め、tan θ = 縦 ÷ 横。',
        '力率 cos φ = $R$ ÷ $Z$。cos φ = 0.8 なら sin φ = 0.6。',
      ],
      look: [
        ['line', 'ink', '太い線＝斜め（斜辺）。長さ $c$。'],
        ['arc', 'ink', '左下の弧＝角 θ。'],
        ['curve', 'ink', '点線の弧＝斜めの長さの円。θ を変えても斜めの長さは同じ。'],
      ],
      formulas: [
        ['cos θ = 横 ÷ 斜め', '斜めを 1 とした時の横。', '力率 cos φ = $R$ ÷ $Z$'],
        ['sin θ = 縦 ÷ 斜め', '斜めを 1 とした時の縦。', '無効分 sin φ = $X$ ÷ $Z$'],
        ['tan θ = 縦 ÷ 横', '傾き。', '$X$ ÷ $R$ から角を知る時'],
        ['cos²θ + sin²θ = 1', '三平方の定理を斜め 1 で書いた形。', 'cos から sin を出す時'],
      ],
      symbols: [
        ['θ', '角（シータ）', '°（度）'],
        ['cosθ', 'コサイン（横 ÷ 斜め）', '—'],
        ['sinθ', 'サイン（縦 ÷ 斜め）', '—'],
        ['tanθ', 'タンジェント（縦 ÷ 横）', '—'],
      ],
    },
  };
})(this);
