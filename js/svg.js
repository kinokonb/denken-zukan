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

  global.Svg = { el, clear, paper, frame, arrow, label, note, angleArc, guide, polyline };
})(this);
