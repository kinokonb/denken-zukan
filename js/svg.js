// 図を描くための小さな部品。色は class（q-current など）で決め、CSSがライト／ダークを切り替える。
// 図の中の座標は「数学の向き」（右が +x、上が +y）で持ち、frame で画面の座標へ直す。
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  function el(parent, tag, attrs = {}, text) {
    const node = document.createElementNS(NS, tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (value !== undefined && value !== null && value !== false) node.setAttribute(name, value);
    }
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }

  function clear(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  // 方眼の紙。図の全面に敷く
  function paper(svg, width, height, step = 20) {
    const g = el(svg, 'g', { class: 'paper' });
    el(g, 'rect', { x: 0, y: 0, width, height, class: 'paper-sheet' });
    for (let x = step; x < width; x += step) el(g, 'line', { x1: x, y1: 0, x2: x, y2: height });
    for (let y = step; y < height; y += step) el(g, 'line', { x1: 0, y1: y, x2: width, y2: y });
    return g;
  }

  // 数学座標の範囲 bounds を、画面の四角 area に縦横同じ縮尺で収める
  function frame(bounds, area) {
    const spanX = Math.max(bounds.maxX - bounds.minX, 1e-9);
    const spanY = Math.max(bounds.maxY - bounds.minY, 1e-9);
    const scale = Math.min(area.w / spanX, area.h / spanY);
    const left = area.x + (area.w - spanX * scale) / 2;
    const top = area.y + (area.h - spanY * scale) / 2;
    return {
      scale,
      x: (value) => left + (value - bounds.minX) * scale,
      y: (value) => top + (bounds.maxY - value) * scale,
    };
  }

  // ベクトルの矢印（画面座標）
  function arrow(parent, x1, y1, x2, y2, { cls = '', width = 2, dashed = false } = {}) {
    const g = el(parent, 'g', { class: `vec ${cls}` });
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 0.5) return g;
    const ux = (x2 - x1) / length;
    const uy = (y2 - y1) / length;
    const head = Math.min(5 + width * 2.5, length);
    const half = head * 0.42;
    const baseX = x2 - ux * head;
    const baseY = y2 - uy * head;
    el(g, 'line', { x1, y1, x2: baseX, y2: baseY, 'stroke-width': width, 'stroke-dasharray': dashed ? '5 4' : null });
    el(g, 'polygon', {
      points: `${x2},${y2} ${baseX - uy * half},${baseY + ux * half} ${baseX + uy * half},${baseY - ux * half}`,
    });
    return g;
  }

  // 量記号のラベル（"V_R" の "_" の後ろは添字）
  function label(parent, x, y, symbol, { cls = '', anchor = 'middle', size } = {}) {
    const text = el(parent, 'text', {
      x, y, class: `lbl ${cls}`, 'text-anchor': anchor, 'dominant-baseline': 'middle',
      style: size ? `font-size:${size}px` : null,
    });
    let lowered = false;
    for (const part of Notation.parse(symbol)) {
      if (part.sub) {
        el(text, 'tspan', { class: 'lbl-sub', dy: lowered ? null : '0.3em' }, part.text);
        lowered = true;
      } else {
        el(text, 'tspan', { dy: lowered ? '-0.3em' : null }, part.text);
        lowered = false;
      }
    }
    return text;
  }

  // 図中の説明文字（ゴシック・小さめ）
  function note(parent, x, y, text, { cls = '', anchor = 'start' } = {}) {
    return el(parent, 'text', { x, y, class: `note ${cls}`, 'text-anchor': anchor, 'dominant-baseline': 'middle' }, text);
  }

  // 角度の弧。角度は数学の向き（反時計回りが正、ラジアン）
  function angleArc(parent, cx, cy, radius, from, to, { cls = '' } = {}) {
    if (Math.abs(to - from) < 0.01) return null;
    const x1 = cx + radius * Math.cos(from);
    const y1 = cy - radius * Math.sin(from);
    const x2 = cx + radius * Math.cos(to);
    const y2 = cy - radius * Math.sin(to);
    const large = Math.abs(to - from) > Math.PI ? 1 : 0;
    const sweep = to > from ? 0 : 1;
    return el(parent, 'path', { d: `M${x1},${y1} A${radius},${radius} 0 ${large} ${sweep} ${x2},${y2}`, class: `arc ${cls}` });
  }

  function guide(parent, x1, y1, x2, y2, cls = '') {
    return el(parent, 'line', { x1, y1, x2, y2, class: `guide ${cls}` });
  }

  function polyline(parent, points, cls = '') {
    const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
    return el(parent, 'path', { d, class: `curve ${cls}` });
  }

  // ---- 回路図 ----

  // 導線。points は角の点の並び
  function wire(parent, points) {
    const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join('');
    return el(parent, 'path', { d, class: 'wire' });
  }

  // 電池（縦向き、上が＋）。下の導線を紙色で消してから極板を描く。sign を false にすると「+」を書かない（重ねた電池の2個目から）
  function battery(parent, x, y, { sign = true } = {}) {
    const g = el(parent, 'g', { class: 'battery' });
    el(g, 'rect', { x: x - 3, y: y - 7, width: 6, height: 14, class: 'cut' });
    el(g, 'line', { x1: x - 15, y1: y - 5, x2: x + 15, y2: y - 5, class: 'plate' });
    el(g, 'line', { x1: x - 8, y1: y + 5, x2: x + 8, y2: y + 5, class: 'plate thick' });
    if (sign) el(g, 'text', { x: x + 18, y: y - 10, class: 'note faint', 'text-anchor': 'start' }, '+');
    return g;
  }

  // 抵抗（JISの長方形）。vertical で縦向き
  function resistor(parent, cx, cy, { vertical = false, cls = 'q-active' } = {}) {
    const [w, h] = vertical ? [16, 40] : [40, 16];
    return el(parent, 'rect', { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 2, class: `resistor ${cls}` });
  }

  // 電流の流れを点で描く（動く層用）。points の道のりに沿って、offset だけ進めた位置に spacing おきに置く
  function flowDots(parent, points, offset, { spacing = 16, cls = 'q-current' } = {}) {
    const segments = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const length = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      segments.push({ from: points[i - 1], to: points[i], start: total, length });
      total += length;
    }
    if (total <= 0) return;
    const g = el(parent, 'g', { class: `flow ${cls}` });
    const first = ((offset % spacing) + spacing) % spacing;
    for (let at = first; at < total; at += spacing) {
      const seg = segments.find((sg) => at < sg.start + sg.length) || segments[segments.length - 1];
      const t = (at - seg.start) / seg.length;
      el(g, 'circle', { cx: seg.from[0] + (seg.to[0] - seg.from[0]) * t, cy: seg.from[1] + (seg.to[1] - seg.from[1]) * t, r: 2.6 });
    }
  }

  // 帯グラフ（分け方）。parts は { value, label, cls } の並び。全体の幅を値の比で分ける
  function splitBar(parent, x, y, width, height, parts) {
    const g = el(parent, 'g', { class: 'split-bar' });
    const sum = parts.reduce((acc, part) => acc + part.value, 0);
    let left = x;
    for (const part of parts) {
      const w = sum > 0 ? (width * part.value) / sum : 0;
      el(g, 'rect', { x: left, y, width: w, height, class: `bar-part ${part.cls || ''}` });
      if (part.label && w > 34) note(g, left + w / 2, y + height / 2, part.label, { cls: 'on-bar', anchor: 'middle' });
      left += w;
    }
    return g;
  }

  // ---- 現場の図（ミッション）の部品 ----

  // 電球の光のにじみ。図の <defs> に1度だけ置き、電球が id で参照する
  function glowDefs(svg) {
    const defs = el(svg, 'defs');
    const gradient = el(defs, 'radialGradient', { id: 'lamp-glow' });
    el(gradient, 'stop', { offset: '0', style: 'stop-color: var(--q-light); stop-opacity: 0.9' });
    el(gradient, 'stop', { offset: '0.45', style: 'stop-color: var(--q-light); stop-opacity: 0.35' });
    el(gradient, 'stop', { offset: '1', style: 'stop-color: var(--q-light); stop-opacity: 0' });
    return defs;
  }

  // 電球（JISの丸にバツ）。level は定格の明るさを 1 とした明るさで、光のにじみの大きさと濃さになる。broken は切れた電球
  function lamp(parent, x, y, { level = 0, broken = false } = {}) {
    const g = el(parent, 'g', { class: `lamp${broken ? ' broken' : ''}` });
    const glow = Math.min(level, 1.8);
    if (glow > 0) el(g, 'circle', { cx: x, cy: y, r: 12 + 24 * glow, fill: 'url(#lamp-glow)', opacity: Math.min(1, 0.25 + 0.75 * glow) });
    el(g, 'circle', { cx: x, cy: y, r: 10, class: 'lamp-bulb' });
    if (glow > 0) el(g, 'circle', { cx: x, cy: y, r: 10, class: 'lamp-lit', opacity: Math.min(1, glow) });
    const d = 10 * Math.SQRT1_2;
    el(g, 'line', { x1: x - d, y1: y - d, x2: x + d, y2: y + d, class: 'lamp-filament' });
    if (broken) { // バツの片方が途中で途切れる
      el(g, 'line', { x1: x - d, y1: y + d, x2: x - 2.5, y2: y + 2.5, class: 'lamp-filament' });
      el(g, 'line', { x1: x + 3.5, y1: y - 3.5, x2: x + d, y2: y - d, class: 'lamp-filament' });
    } else {
      el(g, 'line', { x1: x - d, y1: y + d, x2: x + d, y2: y - d, class: 'lamp-filament' });
    }
    return g;
  }

  // 電熱線（縦の抵抗）。level は決まった熱さを 1 とした熱さで、電球と同じ光のにじみになる。broken は焼き切れた電熱線（真ん中が切れて焦げる）
  function heater(parent, x, y, { level = 0, broken = false } = {}) {
    const g = el(parent, 'g', { class: 'heater' });
    const heat = Math.min(level, 1.5);
    if (heat > 0) el(g, 'circle', { cx: x, cy: y, r: 14 + 18 * heat, fill: 'url(#lamp-glow)', opacity: Math.min(1, 0.2 + 0.8 * heat) });
    resistor(g, x, y, { vertical: true });
    if (broken) {
      el(g, 'rect', { x: x - 10, y: y - 3, width: 20, height: 6, class: 'cut' });
      el(g, 'circle', { cx: x, cy: y, r: 3.5, class: 'fuse-scorch' });
    }
    return g;
  }

  // ヒューズ（横の導線の上の細長い箱と、中の細い線）。blown は飛んだヒューズ（中の線が切れて焦げる）
  function fuse(parent, x, y, { blown = false } = {}) {
    const g = el(parent, 'g', { class: `fuse${blown ? ' blown' : ''}` });
    el(g, 'rect', { x: x - 14, y: y - 6, width: 28, height: 12, rx: 2, class: 'fuse-body' });
    if (blown) {
      el(g, 'line', { x1: x - 14, y1: y, x2: x - 5, y2: y, class: 'fuse-element' });
      el(g, 'line', { x1: x + 5, y1: y, x2: x + 14, y2: y, class: 'fuse-element' });
      el(g, 'circle', { cx: x, cy: y, r: 3.5, class: 'fuse-scorch' });
    } else {
      el(g, 'line', { x1: x - 14, y1: y, x2: x + 14, y2: y, class: 'fuse-element' });
    }
    return g;
  }

  // ブレーカー（横の導線の上の箱と、中のレバー）。tripped は落ちた（レバーが上がって切れた）ブレーカー
  function breaker(parent, x, y, { tripped = false } = {}) {
    const g = el(parent, 'g', { class: `breaker${tripped ? ' tripped' : ''}` });
    el(g, 'rect', { x: x - 18, y: y - 17, width: 36, height: 24, rx: 2, class: 'breaker-box' });
    knifeSwitch(g, x, y, { on: tripped ? 0 : 1 });
    return g;
  }

  // スイッチ（横の導線の上）。on は 0（開いている）〜1（閉じている）で、レバーが倒れていく
  function knifeSwitch(parent, x, y, { on = 0 } = {}) {
    const g = el(parent, 'g', { class: 'switch' });
    el(g, 'rect', { x: x - 12, y: y - 3, width: 24, height: 6, class: 'cut' });
    const angle = (1 - on) * 0.6;
    el(g, 'line', { x1: x - 12, y1: y, x2: x - 12 + 24 * Math.cos(angle), y2: y - 24 * Math.sin(angle), class: 'switch-lever' });
    el(g, 'circle', { cx: x - 12, cy: y, r: 2.6, class: 'switch-post' });
    el(g, 'circle', { cx: x + 12, cy: y, r: 2.6, class: 'switch-post' });
    return g;
  }

  // 針の計器（電流計 'A'、電圧計 'V'）。value を 0〜max の目盛りで指す（振り切れは少しだけ越えて止まる）。
  // mark は目盛りに付ける印（ヒューズの定格など）で、計器と同じ量の色で描く。ghost は予想の針（点線）
  function gauge(parent, x, y, { value = 0, max, letter, cls = '', mark = null, ghost = null } = {}) {
    const g = el(parent, 'g', { class: `gauge ${cls}` });
    const from = Math.PI * 1.15; // 左下
    const to = -Math.PI * 0.15; // 右下
    const angleOf = (v) => from + (to - from) * Math.max(-0.04, Math.min(1.06, v / max));
    const point = (angle, radius) => [x + radius * Math.cos(angle), y - radius * Math.sin(angle)];
    el(g, 'circle', { cx: x, cy: y, r: 24, class: 'gauge-face' });
    angleArc(g, x, y, 18, from, to, { cls: 'gauge-scale' });
    for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
      const angle = from + (to - from) * ratio;
      const [x1, y1] = point(angle, 18);
      const [x2, y2] = point(angle, ratio % 0.5 === 0 ? 13 : 15.5);
      el(g, 'line', { x1, y1, x2, y2, class: 'gauge-tick' });
    }
    if (mark !== null) {
      const [x1, y1] = point(angleOf(mark), 21);
      const [x2, y2] = point(angleOf(mark), 12);
      el(g, 'line', { x1, y1, x2, y2, class: 'gauge-mark' });
    }
    if (ghost !== null) {
      const [gx, gy] = point(angleOf(ghost), 17);
      el(g, 'line', { x1: x, y1: y, x2: gx, y2: gy, class: 'gauge-ghost' });
    }
    const [nx, ny] = point(angleOf(value), 17);
    el(g, 'line', { x1: x, y1: y, x2: nx, y2: ny, class: 'gauge-needle' });
    el(g, 'circle', { cx: x, cy: y, r: 2.2, class: 'gauge-pivot' });
    el(g, 'text', { x, y: y + 13, class: 'gauge-letter', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, letter);
    return g;
  }

  // テスターの2本のリード線。測る部品のある側（上・下・左・右）の計器の縁から、部品の両端 ends へ少したるませて引く
  function leads(parent, [tx, ty], ends) {
    const cx = (ends[0][0] + ends[1][0]) / 2 - tx;
    const cy = (ends[0][1] + ends[1][1]) / 2 - ty;
    const vertical = Math.abs(cy) > Math.abs(cx);
    ends.forEach(([ex, ey], k) => {
      const offset = k === 0 ? -9 : 9;
      const [sx, sy] = vertical ? [tx + offset, ty + Math.sign(cy) * 22] : [tx + Math.sign(cx) * 22, ty + offset];
      el(parent, 'path', { d: `M${sx},${sy} Q${(sx + ex) / 2},${(sy + ey) / 2 + 8} ${ex},${ey}`, class: 'lead' });
      el(parent, 'circle', { cx: ex, cy: ey, r: 2.4, class: 'lead-tip' });
    });
  }

  global.Svg = {
    el, clear, paper, frame, arrow, label, note, angleArc, guide, polyline, wire, battery, resistor, flowDots, splitBar,
    glowDefs, lamp, heater, fuse, breaker, knifeSwitch, gauge, leads,
  };
})(this);
