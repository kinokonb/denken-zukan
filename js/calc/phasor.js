// 理論：フェーザ（交流の電圧・電流を、長さ＝実効値・向き＝位相の矢印、または複素数 a + jb で表す）。角度は度で、反時計回り（進み）を正とする。
(function (global) {
  'use strict';

  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const fromPolar = (magnitude, deg) => ({ re: magnitude * Math.cos(toRad(deg)), im: magnitude * Math.sin(toRad(deg)) });
  const add = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
  const magnitude = ({ re, im }) => Math.hypot(re, im);
  const angle = ({ re, im }) => toDeg(Math.atan2(im, re));

  // 位相差 θ の2つの矢印（長さ A・B）の和の長さ（余弦定理）：√(A² + B² + 2AB cos θ)
  const sumMagnitude = (A, B, deg) => Math.sqrt(Math.max(0, A * A + B * B + 2 * A * B * Math.cos(toRad(deg))));

  // 角度を π の分数で書く（30° → π/6）。きれいに書けない角度は度のまま
  function piText(deg) {
    if (Math.abs(deg) < 1e-9) return '0';
    const sign = deg < 0 ? '−' : '';
    const table = { 30: 'π/6', 45: 'π/4', 60: 'π/3', 90: 'π/2', 120: '2π/3', 135: '3π/4', 150: '5π/6', 180: 'π' };
    return table[Math.abs(deg)] ? `${sign}${table[Math.abs(deg)]}` : `${deg}°`;
  }

  const Phasor = { toRad, toDeg, fromPolar, add, magnitude, angle, sumMagnitude, piText };
  if (typeof module !== 'undefined' && module.exports) module.exports = Phasor;
  else global.Phasor = Phasor;
})(this);
