// 理論：RLC直列回路のフェーザ図と共振曲線
(function (global) {
  'use strict';

  const SOURCE_VOLTAGE = 100; // V
  const WIDTH = 360;
  const HEIGHT = 340;

  function compute(p) {
    return RlcCircuit.analyze({ V: SOURCE_VOLTAGE, R: p.R, L: p.L / 1000, C: p.C * 1e-6, f: p.f });
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    drawPhasor(svg, r);
    drawResonanceCurve(svg, p, r);
  }

  // 電流 I を横向きの基準にしたフェーザ図
  function drawPhasor(svg, r) {
    const V = SOURCE_VOLTAGE;
    const VX = r.VL - r.VC;
    const bounds = {
      minX: 0,
      maxX: Math.max(r.VR, V),
      minY: Math.min(-r.VC, -V),
      maxY: Math.max(r.VL, V),
    };
    const f = Svg.frame(bounds, { x: 54, y: 30, w: 250, h: 180 });
    const ox = f.x(0);
    const oy = f.y(0);
    const g = Svg.el(svg, 'g');

    Svg.guide(g, ox - 14, oy, WIDTH - 14, oy);
    // 電源電圧の大きさは一定なので、V の先は半径 |V| の円の上を動く
    Svg.angleArc(g, ox, oy, V * f.scale, -Math.PI / 2, Math.PI / 2, { cls: 'arc-guide' });
    Svg.note(g, ox + 4, f.y(V) - 10, `|V| = ${V} V の円`, { cls: 'faint' });

    Svg.arrow(g, ox, oy, ox, f.y(r.VL), { cls: 'q-reactive', width: 1.5 });
    Svg.label(g, ox - 8, f.y(r.VL) + 4, 'V_L', { cls: 'q-reactive', anchor: 'end' });
    Svg.arrow(g, ox, oy, ox, f.y(-r.VC), { cls: 'q-reactive', width: 1.5, dashed: true });
    Svg.label(g, ox - 8, f.y(-r.VC) - 4, 'V_C', { cls: 'q-reactive', anchor: 'end' });

    Svg.arrow(g, ox, oy, f.x(r.VR), oy, { cls: 'q-active', width: 2.5 });
    Svg.label(g, (ox + f.x(r.VR)) / 2, oy + (VX >= 0 ? 16 : -14), 'V_R', { cls: 'q-active' });

    Svg.arrow(g, f.x(r.VR), oy, f.x(r.VR), f.y(VX), { cls: 'q-reactive', width: 2.5 });
    if (Math.abs(VX) * f.scale > 18) {
      Svg.label(g, f.x(r.VR) + 8, (oy + f.y(VX)) / 2, 'V_L − V_C', { cls: 'q-reactive', anchor: 'start', size: 13 });
    }

    Svg.arrow(g, ox, oy, f.x(r.VR), f.y(VX), { cls: 'q-voltage', width: 3 });
    const tipX = f.x(r.VR);
    const tipY = f.y(VX);
    Svg.label(g, tipX + (Math.abs(VX) * f.scale > 18 ? -10 : 12), tipY + (VX >= 0 ? -12 : 12), 'V', { cls: 'q-voltage', size: 17 });

    const arcRadius = 30;
    Svg.angleArc(g, ox, oy, arcRadius, 0, r.phi, { cls: 'arc-angle' });
    if (Math.abs(r.phi) > 0.12) {
      const mid = r.phi / 2;
      Svg.label(g, ox + (arcRadius + 10) * Math.cos(mid), oy - (arcRadius + 10) * Math.sin(mid), 'φ', { size: 14 });
    }

    // 電流は基準の向きを示す（長さは一定）
    const iy = oy + (VX >= 0 ? 30 : -30);
    Svg.arrow(g, ox, iy, ox + 56, iy, { cls: 'q-current', width: 2.5 });
    Svg.label(g, ox + 68, iy, 'I', { cls: 'q-current', anchor: 'start', size: 16 });
  }

  // 周波数を変えた時の電流（共振曲線）。いまの f に印
  function drawResonanceCurve(svg, p, r) {
    const range = PARAMS.find((param) => param.key === 'f');
    const area = { x: 40, y: 250, w: 300, h: 62 };
    const g = Svg.el(svg, 'g');
    const toX = (freq) => area.x + ((freq - range.min) / (range.max - range.min)) * area.w;
    const peak = SOURCE_VOLTAGE / p.R;
    const toY = (current) => area.y + area.h - Math.min(current / peak, 1) * area.h;

    Svg.note(g, area.x - 26, area.y - 16, '周波数を変えた時の電流 I（共振曲線）', { cls: 'faint' });
    Svg.guide(g, area.x, area.y + area.h, area.x + area.w, area.y + area.h, 'axis');
    for (const tick of [50, 100, 150, 200]) {
      Svg.note(g, toX(tick), area.y + area.h + 13, String(tick), { cls: 'faint', anchor: 'middle' });
    }
    Svg.note(g, area.x - 6, area.y + area.h + 13, 'f [Hz]', { cls: 'faint', anchor: 'end' });

    const points = [];
    for (let i = 0; i <= 150; i++) {
      const freq = range.min + ((range.max - range.min) * i) / 150;
      const current = RlcCircuit.analyze({ V: SOURCE_VOLTAGE, R: p.R, L: p.L / 1000, C: p.C * 1e-6, f: freq }).I;
      points.push([toX(freq), toY(current)]);
    }
    Svg.polyline(g, points, 'q-current');

    if (r.f0 >= range.min && r.f0 <= range.max) {
      Svg.guide(g, toX(r.f0), area.y - 4, toX(r.f0), area.y + area.h);
      Svg.label(g, toX(r.f0) + 4, area.y + area.h - 10, 'f_0', { anchor: 'start', size: 13 });
    }
    Svg.guide(g, toX(p.f), toY(r.I), toX(p.f), area.y + area.h, 'q-current');
    Svg.el(g, 'circle', { cx: toX(p.f), cy: toY(r.I), r: 5, class: 'dot q-current' });
  }

  const PARAMS = [
    { key: 'R', name: '抵抗', symbol: 'R', unit: 'Ω', min: 1, max: 100, step: 1, value: 40 },
    { key: 'L', name: 'インダクタンス', symbol: 'L', unit: 'mH', min: 10, max: 300, step: 1, value: 127 },
    { key: 'C', name: '静電容量', symbol: 'C', unit: 'μF', min: 10, max: 500, step: 1, value: 318 },
    { key: 'f', name: '周波数', symbol: 'f', unit: 'Hz', min: 10, max: 200, step: 1, value: 50 },
  ];

  function lagOrLead(phi) {
    if (Math.abs(phi) < 0.005) return '（1）';
    return phi > 0 ? '（遅れ）' : '（進み）';
  }

  global.TopicRlc = {
    id: 'rlc',
    title: 'RLC直列回路とフェーザ図',
    lead: 'R・L・C の電圧は向きが違う。だから電圧は矢印（ベクトル）で足す。',
    viewBox: [WIDTH, HEIGHT],
    params: PARAMS,
    presets: [
      {
        name: '共振させる',
        apply: (p) => ({ f: Math.round(compute(p).f0) }),
      },
    ],
    compute,
    draw,
    caption(p, r) {
      const degrees = Notation.number(Math.abs((r.phi * 180) / Math.PI), 1);
      if (Math.abs(r.X) < 0.5) return `ほぼ共振：${Notation.html('X_L')} ≒ ${Notation.html('X_C')} なので ${Notation.html('Z')} ≒ ${Notation.html('R')}、電流がいちばん大きい。`;
      if (r.X > 0) return `${Notation.html('X_L')} ＞ ${Notation.html('X_C')}（誘導性）：電流は電圧より ${degrees}° 遅れる。`;
      return `${Notation.html('X_L')} ＜ ${Notation.html('X_C')}（容量性）：電流は電圧より ${degrees}° 進む。`;
    },
    readouts: (p, r) => [
      { name: 'インピーダンス', symbol: 'Z', value: Notation.number(r.Z, 1), unit: 'Ω' },
      { name: '電流', symbol: 'I', value: Notation.number(r.I, 2), unit: 'A', cls: 'q-current' },
      { name: '力率', symbol: 'cosφ', value: Notation.number(r.powerFactor, 2), unit: lagOrLead(r.phi) },
      { name: '共振周波数', symbol: 'f_0', value: Notation.number(r.f0, 1), unit: 'Hz' },
    ],
    conditions: `電源電圧 ${Notation.html('V')} = ${SOURCE_VOLTAGE} V（一定）`,
    notesHtml: `
      <h2>しくみ</h2>
      <p>直列回路では、どの素子にも同じ電流 ${Notation.html('I')} が流れる。そこで ${Notation.html('I')} を横向きの基準にして電圧を描く。</p>
      <ul>
        <li>抵抗の電圧 ${Notation.html('V_R')} は ${Notation.html('I')} と同じ向き。</li>
        <li>コイルの電圧 ${Notation.html('V_L')} は 90° 進む（上向き）。</li>
        <li>コンデンサの電圧 ${Notation.html('V_C')} は 90° 遅れる（下向き）。</li>
      </ul>
      <p>上下の ${Notation.html('V_L')} と ${Notation.html('V_C')} は打ち消し合い、残った ${Notation.html('V_L')} − ${Notation.html('V_C')} と ${Notation.html('V_R')} を矢印で足したものが電源電圧 ${Notation.html('V')} になる。</p>
      <h2>公式</h2>
      <ul class="formulas">
        <li>${Notation.html('X_L')} = 2π${Notation.html('fL')}　　${Notation.html('X_C')} = 1 / (2π${Notation.html('fC')})</li>
        <li>${Notation.html('Z')} = √(${Notation.html('R')}² + (${Notation.html('X_L')} − ${Notation.html('X_C')})²)　　${Notation.html('I')} = ${Notation.html('V')} / ${Notation.html('Z')}</li>
        <li>cos${Notation.html('φ')} = ${Notation.html('R')} / ${Notation.html('Z')}</li>
        <li>${Notation.html('f_0')} = 1 / (2π√(${Notation.html('LC')}))</li>
      </ul>
      <h2>試験のツボ</h2>
      <ul>
        <li>${Notation.html('X_L')} は周波数に比例、${Notation.html('X_C')} は周波数に反比例する。</li>
        <li>共振（${Notation.html('X_L')} = ${Notation.html('X_C')}）では ${Notation.html('Z')} = ${Notation.html('R')} で最小、電流は最大、電流と電圧は同相。</li>
        <li>電圧の大きさはそのまま足せない。${Notation.html('V')} ≠ ${Notation.html('V_R')} + ${Notation.html('V_L')} + ${Notation.html('V_C')}。</li>
        <li>共振の近くで ${Notation.html('R')} が小さいと、${Notation.html('V_L')}・${Notation.html('V_C')} が電源電圧より大きくなることがある（図で ${Notation.html('R')} を小さくして共振させてみる）。</li>
      </ul>`,
  };
})(this);
