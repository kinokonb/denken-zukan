// 理論：RLC直列回路のフェーザ図（回して波形も見せる）と共振曲線
(function (global) {
  'use strict';

  const SOURCE_VOLTAGE = 100; // V
  const WIDTH = 360;
  const HEIGHT = 356;

  function compute(p) {
    return RlcCircuit.analyze({ V: SOURCE_VOLTAGE, R: p.R, L: p.L / 1000, C: p.C * 1e-6, f: p.f });
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    drawPhasorFrame(svg, r);
    drawResonanceCurve(svg, p, r);
  }

  const TURN_SECONDS = 4; // 表示で1回転する時間（実際は f [Hz] で回る）
  const WAVE_PERIODS = 1.5; // 右の波形に見せる周期の数

  // フェーザ図と右の波形の置き場所。矢印は回るので、いちばん長い矢印が一周しても収まる縮尺にする
  function phasorLayout(r) {
    const longest = Math.max(SOURCE_VOLTAGE, r.VL, r.VC);
    const radius = 84; // 電流の矢印（いちばん外側）の長さ
    return {
      ox: 98,
      oy: 118,
      scale: radius / (1.25 * longest), // 電圧 1 V あたりの長さ
      currentLength: radius,
      waveLeft: 200,
      waveRight: 348,
    };
  }

  function drawPhasorFrame(svg, r) {
    const { ox, oy, scale, waveLeft, waveRight } = phasorLayout(r);
    const g = Svg.el(svg, 'g');
    Svg.guide(g, ox - 92, oy, waveRight, oy);
    Svg.guide(g, waveLeft, oy - 96, waveLeft, oy + 96);
    // 電源電圧の大きさは一定なので、V の先は半径 |V| の円の上を動く
    Svg.el(g, 'circle', { cx: ox, cy: oy, r: SOURCE_VOLTAGE * scale, class: 'arc arc-guide' });
    Svg.note(g, 8, 14, 'ゆっくり回して表示。矢印の縦の成分＝その瞬間の値', { cls: 'faint' });
    Svg.note(g, ox, oy + SOURCE_VOLTAGE * scale + 10, `|V| = ${SOURCE_VOLTAGE} V`, { cls: 'faint', anchor: 'middle' });
    Svg.note(g, waveRight, oy + 100, '← 新しい　古い →', { cls: 'faint', anchor: 'end' });
  }

  // 回るフェーザ（電流 I の向き = 回転角 α）と、その縦の成分が描く波形
  function drawRotatingPhasor(g, p, r, time) {
    const { ox, oy, scale, currentLength, waveLeft, waveRight } = phasorLayout(r);
    const alpha = (2 * Math.PI * time) / TURN_SECONDS;
    const at = (length, angle) => [ox + length * Math.cos(angle), oy - length * Math.sin(angle)];
    const labelAt = (length, angle, gap = 12) => at(length + gap, angle);
    const up = alpha + Math.PI / 2;
    const down = alpha - Math.PI / 2;
    const vAngle = alpha + r.phi;
    const VX = r.VL - r.VC;

    const iTip = at(currentLength, alpha);
    const vTip = at(SOURCE_VOLTAGE * scale, vAngle);
    const vrTip = at(r.VR * scale, alpha);
    const vxTip = [vrTip[0] + VX * scale * Math.cos(up), vrTip[1] - VX * scale * Math.sin(up)];

    // 波形：左端が今の値（矢印の先の高さ）、右へ行くほど前の時刻
    const k = (2 * Math.PI * WAVE_PERIODS) / (waveRight - waveLeft);
    const wave = (amplitude, phase) => {
      const points = [];
      for (let x = waveLeft; x <= waveRight; x += 3) points.push([x, oy - amplitude * Math.sin(phase - k * (x - waveLeft))]);
      return points;
    };
    Svg.polyline(g, wave(currentLength, alpha), 'q-current');
    Svg.polyline(g, wave(SOURCE_VOLTAGE * scale, vAngle), 'q-voltage thick');
    Svg.guide(g, iTip[0], iTip[1], waveLeft, iTip[1], 'q-current');
    Svg.guide(g, vTip[0], vTip[1], waveLeft, vTip[1], 'q-voltage');
    Svg.el(g, 'circle', { cx: waveLeft, cy: iTip[1], r: 4, class: 'dot q-current' });
    Svg.el(g, 'circle', { cx: waveLeft, cy: vTip[1], r: 4.5, class: 'dot q-voltage' });
    Svg.label(g, waveLeft + 8, iTip[1] - 10, 'i', { cls: 'q-current', anchor: 'start', size: 14 });
    Svg.label(g, waveLeft + 8, vTip[1] - 10, 'v', { cls: 'q-voltage', anchor: 'start', size: 14 });

    // 電流は基準の向き。V_R と同じ向きなので、V_R より長く描いて下から見えるようにする
    Svg.arrow(g, ox, oy, iTip[0], iTip[1], { cls: 'q-current', width: 2 });
    Svg.label(g, ...labelAt(currentLength, alpha, 10), 'I', { cls: 'q-current', size: 16 });

    Svg.arrow(g, ox, oy, ...at(r.VL * scale, up), { cls: 'q-reactive', width: 1.5 });
    Svg.label(g, ...labelAt(r.VL * scale, up), 'V_L', { cls: 'q-reactive' });
    Svg.arrow(g, ox, oy, ...at(r.VC * scale, down), { cls: 'q-reactive', width: 1.5, dashed: true });
    Svg.label(g, ...labelAt(r.VC * scale, down), 'V_C', { cls: 'q-reactive' });

    Svg.arrow(g, ox, oy, vrTip[0], vrTip[1], { cls: 'q-active', width: 3 });
    const vrMid = at((r.VR * scale) / 2, alpha);
    Svg.label(g, vrMid[0] + 13 * Math.cos(down), vrMid[1] - 13 * Math.sin(down), 'V_R', { cls: 'q-active' });

    Svg.arrow(g, vrTip[0], vrTip[1], vxTip[0], vxTip[1], { cls: 'q-reactive', width: 2.5 });
    Svg.arrow(g, ox, oy, vTip[0], vTip[1], { cls: 'q-voltage', width: 3 });
    Svg.label(g, ...labelAt(SOURCE_VOLTAGE * scale, vAngle), 'V', { cls: 'q-voltage', size: 17 });

    Svg.angleArc(g, ox, oy, 24, alpha, vAngle, { cls: 'arc-angle' });
    if (Math.abs(r.phi) > 0.15) {
      Svg.label(g, ...at(34, alpha + r.phi / 2), 'φ', { size: 14 });
    }
  }

  // 周波数を変えた時の電流（共振曲線）。いまの f に印
  function drawResonanceCurve(svg, p, r) {
    const range = PARAMS.find((param) => param.key === 'f');
    const area = { x: 40, y: 268, w: 300, h: 60 };
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
    motion: { draw: drawRotatingPhasor },
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
