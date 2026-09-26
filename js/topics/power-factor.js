// 法規（施設管理）：進相コンデンサによる力率改善と電力の三角形
(function (global) {
  'use strict';

  const TARGET = 0.95;
  const WIDTH = 360;
  const HEIGHT = 270;

  function compute(p) {
    const r = PowerFactor.analyze({ P: p.P, powerFactor1: p.cos1, Qc: p.Qc });
    return { ...r, QcForTarget: p.cos1 < TARGET ? PowerFactor.capacitorFor(p.P, p.cos1, TARGET) : 0 };
  }

  function draw(svg, p, r) {
    Svg.paper(svg, WIDTH, HEIGHT);
    const improved = p.Qc > 0;
    const f = Svg.frame(
      { minX: 0, maxX: p.P, minY: Math.min(0, r.Q2), maxY: Math.max(r.Q1, 0) },
      { x: 40, y: 40, w: 220, h: 180 },
    );
    const g = Svg.el(svg, 'g');
    const ox = f.x(0);
    const oy = f.y(0);
    const px = f.x(p.P);

    Svg.guide(g, ox - 10, oy, WIDTH - 10, oy);
    Svg.note(g, 12, 16, '上向き＝遅れの無効電力（コイル性）', { cls: 'faint' });

    if (improved) {
      Svg.arrow(g, ox, oy, px, f.y(r.Q1), { cls: 'faint-ink', width: 1.5, dashed: true });
      Svg.label(g, (ox + px) / 2 - 10, (oy + f.y(r.Q1)) / 2 - 12, 'S_1', { cls: 'faint-ink', anchor: 'end', size: 14 });
      Svg.arrow(g, px, oy, px, f.y(r.Q1), { cls: 'q-reactive faded', width: 1.5 });
      Svg.label(g, px, f.y(r.Q1) - 14, 'Q_1', { cls: 'q-reactive', size: 14 });
      // コンデンサの進みの無効電力が、遅れの Q1 を打ち消す
      const cx = px + 34;
      Svg.arrow(g, cx, f.y(r.Q1), cx, f.y(r.Q2), { cls: 'q-reactive', width: 2, dashed: true });
      Svg.label(g, cx + 8, (f.y(r.Q1) + f.y(r.Q2)) / 2, 'Q_c', { cls: 'q-reactive', anchor: 'start', size: 15 });
      Svg.guide(g, px, f.y(r.Q1), cx, f.y(r.Q1));
      Svg.guide(g, px, f.y(r.Q2), cx, f.y(r.Q2));
    }

    Svg.arrow(g, ox, oy, px, oy, { cls: 'q-active', width: 3 });
    Svg.label(g, (ox + px) / 2, oy + (r.Q2 >= 0 ? 16 : -14), 'P', { cls: 'q-active', size: 16 });

    const q2Label = improved ? 'Q_2' : 'Q';
    Svg.arrow(g, px, oy, px, f.y(r.Q2), { cls: 'q-reactive', width: 3 });
    if (Math.abs(r.Q2) * f.scale > 14) {
      Svg.label(g, px - 8, (oy + f.y(r.Q2)) / 2, q2Label, { cls: 'q-reactive', anchor: 'end', size: 15 });
    }

    Svg.arrow(g, ox, oy, px, f.y(r.Q2), { cls: 'ink', width: 3 });
    const sLabelY = (oy + f.y(r.Q2)) / 2 + (r.Q2 >= 0 ? 16 : -16);
    Svg.label(g, (ox + px) / 2 + 12, sLabelY, improved ? 'S_2' : 'S', { cls: 'ink', anchor: 'start', size: 15 });

    const theta1 = Math.atan2(r.Q1, p.P);
    const theta2 = Math.atan2(r.Q2, p.P);
    if (improved) Svg.angleArc(g, ox, oy, 50, 0, theta1, { cls: 'arc-angle faded' });
    Svg.angleArc(g, ox, oy, 34, 0, theta2, { cls: 'arc-angle' });
    if (Math.abs(theta2) > 0.1) {
      Svg.label(g, ox + 44 * Math.cos(theta2 / 2), oy - 44 * Math.sin(theta2 / 2), improved ? 'θ_2' : 'θ', { size: 13 });
    }
    if (r.leading) Svg.note(g, px + 8, f.y(r.Q2) + 14, '進み（入れすぎ）', { cls: 'q-reactive' });
  }

  function lagOrLead(r) {
    if (Math.abs(r.Q2) < 0.5) return '';
    return r.leading ? '（進み）' : '（遅れ）';
  }

  global.TopicPowerFactor = {
    id: 'power-factor',
    title: '力率改善とコンデンサ',
    lead: 'コンデンサの進みの無効電力で、負荷の遅れの無効電力を打ち消す。仕事（P）はそのまま、電流が減る。',
    viewBox: [WIDTH, HEIGHT],
    params: [
      { key: 'P', name: '負荷の有効電力', symbol: 'P', unit: 'kW', min: 100, max: 1000, step: 10, value: 400 },
      { key: 'cos1', name: '改善前の力率（遅れ）', symbol: 'cosθ_1', unit: '', min: 0.5, max: 0.99, step: 0.01, value: 0.8 },
      { key: 'Qc', name: 'コンデンサ容量', symbol: 'Q_c', unit: 'kvar', min: 0, max: 1800, step: 1, value: 150 },
    ],
    presets: [
      { name: `力率 ${TARGET} にする`, apply: (p) => ({ Qc: Math.round(compute(p).QcForTarget) }) },
      { name: '力率 1 にする', apply: (p) => ({ Qc: Math.round(compute(p).Q1) }) },
    ],
    compute,
    draw,
    caption(p, r) {
      if (p.Qc === 0) return `コンデンサなし：力率 ${Notation.number(p.cos1, 2)}。${Notation.html('Q_c')} を増やしてみる。`;
      return `力率 ${Notation.number(p.cos1, 2)} → ${Notation.number(r.powerFactor2, 3)}${lagOrLead(r)}。同じ電圧なら電流は ${Notation.number(r.currentRatio * 100, 0)}%、線路損失は ${Notation.number(r.lossRatio * 100, 0)}% になる。`;
    },
    readouts: (p, r) => [
      { name: '改善後の力率', symbol: 'cosθ_2', value: Notation.number(r.powerFactor2, 3), unit: lagOrLead(r) },
      { name: '無効電力', symbol: 'Q_2', value: Notation.number(r.Q2, 0), unit: 'kvar', cls: 'q-reactive' },
      { name: '皮相電力', symbol: 'S_2', value: Notation.number(r.S2, 0), unit: 'kV·A' },
      { name: `${TARGET} に必要な容量`, symbol: 'Q_c', value: Notation.number(r.QcForTarget, 0), unit: 'kvar' },
    ],
    conditions: '電圧は一定とする',
    notesHtml: `
      <h2>しくみ</h2>
      <p>モータなどの負荷は、仕事をする有効電力 ${Notation.html('P')} のほかに、遅れの無効電力 ${Notation.html('Q')} を必要とする。進相コンデンサは進みの無効電力を出すので、負荷の ${Notation.html('Q')} を打ち消せる。</p>
      <p>${Notation.html('P')} は変わらないまま皮相電力 ${Notation.html('S')} が小さくなるので、同じ仕事をするのに流れる電流が減る。電線の損失も電圧降下も減り、変圧器にも余裕ができる。</p>
      <h2>公式</h2>
      <ul class="formulas">
        <li>${Notation.html('Q_c')} = ${Notation.html('P')}(tan${Notation.html('θ_1')} − tan${Notation.html('θ_2')})</li>
        <li>tan${Notation.html('θ')} = √(1 − cos²${Notation.html('θ')}) / cos${Notation.html('θ')}</li>
        <li>${Notation.html('S')} = √(${Notation.html('P')}² + ${Notation.html('Q')}²)　　cos${Notation.html('θ')} = ${Notation.html('P')} / ${Notation.html('S')}</li>
        <li>線路損失は電流の2乗に比例：改善後 / 改善前 = (cos${Notation.html('θ_1')} / cos${Notation.html('θ_2')})²</li>
      </ul>
      <h2>試験のツボ</h2>
      <ul>
        <li>力率0.8 → sin 0.6 → tan 0.75 のように、cos から tan へ直す計算に慣れておく。</li>
        <li>単位：有効電力 kW、無効電力 kvar、皮相電力 kV·A。</li>
        <li>有効電力 ${Notation.html('P')} は変わらない。変わるのは ${Notation.html('Q')} と ${Notation.html('S')}（と電流）。</li>
        <li>入れすぎると進み力率になる。軽負荷の時に進み力率になると電圧が上がるので、負荷に合わせてコンデンサを切り離す。</li>
      </ul>`,
  };
})(this);
