// 基礎：矢印の足し算（ベクトル）。A の先に B をつなぎ、始まりから最後の先までの矢印が足した結果になることを見せる。
// 同じ向きなら足し算、反対向きなら引き算、直角なら三平方の定理。交流の電圧（フェーザ）はこの足し算で足す。
// 数学の図なので量の色は使わない（墨で描く）
(function (global) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 300;
  const FRAME = { left: 30, right: 330, baseline: 244, top: 70 };

  const format = (value) => String(Number(value.toFixed(2)));

  function compute(p) {
    const rad = (p.deg * Math.PI) / 180;
    const bx = p.b * Math.cos(rad);
    const by = p.b * Math.sin(rad);
    const length = Math.hypot(p.a + bx, by);
    return { a: p.a, b: p.b, deg: p.deg, rad, bx, by, length };
  }

  function relation(deg) {
    if (deg === 0) return '同じ向き：長さの足し算';
    if (deg === 180) return '反対向き：長さの引き算';
    if (deg === 90) return '直角：三平方の定理';
    return '長さの足し算にはならない';
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const g = Svg.el(svg, 'g');
    // 矢印が枠に収まるように 1 の長さを決める（最大 34）
    const minX = Math.min(0, r.bx, r.a + r.bx);
    const maxX = Math.max(r.a, r.a + r.bx);
    const unit = Math.min(34, (FRAME.right - FRAME.left) / (maxX - minX), (FRAME.baseline - FRAME.top) / Math.max(r.by, 1));
    const O = [FRAME.left - minX * unit, FRAME.baseline];
    const at = (x, y) => [O[0] + x * unit, O[1] - y * unit];
    const A = at(r.a, 0);
    const C = at(r.a + r.bx, r.by);
    const B0 = at(r.bx, r.by);
    // 一直線（0°・180°）の時は重なって見えないので、足した結果を少し下にずらして描き、平行四辺形の点線は省く
    const inLine = r.by < 0.01;
    const drop = inLine ? 16 : 0;
    if (!inLine) {
      Svg.arrow(g, O[0], O[1], B0[0], B0[1], { cls: 'ink', width: 1.2, dashed: true });
      Svg.arrow(g, B0[0], B0[1], C[0], C[1], { cls: 'ink', width: 1.2, dashed: true });
    }
    Svg.arrow(g, O[0], O[1], A[0], A[1], { cls: 'ink', width: 2 });
    Svg.arrow(g, A[0], A[1] - (inLine ? 6 : 0), C[0], C[1] - (inLine ? 6 : 0), { cls: 'ink', width: 2 });
    Svg.arrow(g, O[0], O[1] + drop, C[0], C[1] + drop, { cls: 'ink', width: 4 });
    Svg.angleArc(g, A[0], A[1], 18, 0, r.rad, { cls: 'arc-angle' });
    Svg.note(g, (O[0] + A[0]) / 2, O[1] + drop + 16, `A ${r.a}`, { cls: 'value', anchor: 'middle' });
    if (inLine) Svg.note(g, (A[0] + C[0]) / 2, A[1] - 18, `B ${r.b}`, { cls: 'value', anchor: 'middle' });
    else Svg.note(g, (A[0] + C[0]) / 2 + 10, (A[1] + C[1]) / 2, `B ${r.b}`, { cls: 'value', anchor: 'start' });
    Svg.note(g, 12, 14, 'A の先に B をつなぐ。太い矢印＝足した結果', { cls: 'faint' });
    const rows = [
      [`角 ${r.deg}°　${relation(r.deg)}`, 'value'],
      [`足した長さ ${format(r.length)}`, 'value'],
      [`（そのまま足すと ${r.a + r.b}）`, 'faint'],
    ];
    rows.forEach(([text, cls], i) => Svg.note(g, 352, 34 + i * 20, text, { cls, anchor: 'end' }));
  }

  global.TopicMathVector = {
    id: 'math-vector',
    title: '矢印の足し算（ベクトル）',
    lead: '向きのある量は矢印で足す。同じ向きなら足し算、反対なら引き算、直角なら三平方。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'a', name: '矢印 A の長さ', symbol: 'a', unit: '', min: 1, max: 5, step: 1, value: 4 },
      { key: 'b', name: '矢印 B の長さ', symbol: 'b', unit: '', min: 1, max: 5, step: 1, value: 3 },
      { key: 'deg', name: 'B の向き（A との角）', symbol: 'θ', unit: '°', min: 0, max: 180, step: 15, value: 90 },
    ],
    presets: [],
    compute,
    draw,
    caption(p, r) {
      return `A ${r.a} と B ${r.b}（角 ${r.deg}°）を足すと長さ ${format(r.length)}。${relation(r.deg)}。`;
    },
    readouts: (p, r) => [
      { name: '足した長さ', symbol: '|C|', value: format(r.length), unit: '' },
      { name: 'そのまま足すと', symbol: 'a+b', value: String(r.a + r.b), unit: '' },
      { name: 'A の長さ', symbol: 'a', value: String(r.a), unit: '' },
      { name: 'B の長さ', symbol: 'b', value: String(r.b), unit: '' },
    ],
    terms: [
      ['ベクトル', '長さ（大きさ）と向きをもつ量。矢印で描く。力・速さ・交流の電圧や電流など。'],
      ['矢印の足し算', 'A の先に B の根元をつなぎ、A の根元から B の先まで矢印を引く。それが A + B。'],
      ['フェーザ', '交流の電圧・電流を、長さ（大きさ）と向き（ずれ）の矢印で表したもの。理論4で使う。'],
      ['打ち消し合う', '同じ長さの反対向きの矢印を足すと 0。コイルとコンデンサの電圧が共振で打ち消し合うのはこれ。'],
    ],
    tries: [
      { text: 'B を A と同じ向き（0°）にすると、足した長さは？', choices: ['1', '5', '7'], answer: 2, set: { deg: 0 }, look: '同じ向きなら長さはそのまま足し算：4 + 3 = 7。' },
      { text: 'B を反対向き（180°）にすると、足した長さは？', choices: ['1', '5', '7'], answer: 0, set: { deg: 180 }, look: '反対向きなら引き算：4 − 3 = 1。コイルとコンデンサの電圧が打ち消し合うのはこれ。' },
      { text: '角を 90° → 60° にすると、足した長さは 5 より？', choices: ['短い', '同じ', '長い'], answer: 2, set: { deg: 60 }, look: '向きが近いほど長くなり、60° では約 6.08。90° の 5（三平方）と 0° の 7 の間。' },
    ],
    quiz: [
      { q: '同じ向きの長さ 3 と 5 の矢印を足すと？', choices: ['2', '8', '√34'], answer: 1, why: '同じ向きなら足し算で 8。' },
      { q: '直角の長さ 6 と 8 の矢印を足した長さは？', choices: ['2', '10', '14'], answer: 1, why: '直角なら三平方：√(36 + 64) = 10。' },
      { q: '電球に 60 V、コイルに 80 V（向きが90°ちがう）。電源の電圧は？', choices: ['20 V', '100 V', '140 V'], answer: 1, why: '90°ちがう矢印の足し算：√(60² + 80²) = 100 V。' },
    ],
    exam: {
      lead: '交流の電圧・電流はベクトル（フェーザ）で足す。向きのちがうものを数の足し算で足すのが、いちばん多いまちがい。',
      often: [
        '90°ちがう2つは √($a$² + $b$²)、反対向きは引き算、同じ向きは足し算。',
        '$V_L$ と $V_C$ は反対向きなので、先に引き算してから $V_R$ と直角に足す。',
      ],
      traps: [
        '向きのちがう矢印の長さは、そのまま足せない。',
        '反対向きの矢印は打ち消し合う（共振では $V_L$ − $V_C$ = 0）。',
      ],
    },
    conditions: 'A は横向きで固定。B の向きを A からの角で動かす。矢印が長い時は図を小さく描く',
    explain: {
      points: [
        'ベクトルは長さと向きをもつ矢印。足す時は A の先に B をつなぐ。',
        '同じ向きなら足し算、反対向きなら引き算、直角なら三平方の定理。',
        '交流の電圧（フェーザ）も、この矢印の足し算で足す。',
      ],
      look: [
        ['arrow', 'ink', '細い矢印＝A と、その先につないだ B。'],
        ['arrow', 'ink', '太い矢印＝足した結果。A の根元から B の先まで。'],
        ['dashed', 'ink', '点線＝B を根元から描いたもの。平行四辺形になる。'],
        ['arc', 'ink', '弧＝A と B の向きのちがい（角）。'],
      ],
      formulas: [
        ['C = A + B', '矢印の足し算。長さは向きで変わる。', '電圧・電流のフェーザを足す時'],
        ['|C| = √(a² + b²)', '直角の時の長さ（三平方）。', '$V_R$ と $V_L$ を足す時'],
        ['|C| = a − b', '反対向きの時の長さ。', '$V_L$ と $V_C$ を足す時'],
      ],
      symbols: [
        ['a・b', '矢印 A・B の長さ', '—'],
        ['θ', 'A と B の向きのちがい', '°'],
        ['|C|', '足した矢印の長さ', '—'],
      ],
    },
  };
})(this);
