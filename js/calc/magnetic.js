// 理論：磁界と電磁力。真空（空気）中の、まっすぐで十分に長い電流。
// H = I ÷ 2πr、B = μ₀H（μ₀ = 4π × 10⁻⁷ H/m）、磁界と直角な導線の力 F = BIl、平行な2本の電流の力 F = μ₀I₁I₂l ÷ 2πr
(function (global) {
  'use strict';

  const MU0 = 4 * Math.PI * 1e-7; // H/m

  // 電流 I [A] から距離 r [m] の所の磁界 [A/m]（半径 r の円周 2πr に I が分かれる）
  const field = (I, r) => I / (2 * Math.PI * r);
  // 同じ所の磁束密度 [T]。π が消えて 2 × 10⁻⁷ × I ÷ r になる
  const fluxDensity = (I, r) => MU0 * field(I, r);
  // 磁束密度 B [T] の中で、磁界と直角な長さ l [m] の導線に I [A] を流した時の力 [N]
  const force = (B, I, l) => B * I * l;
  // 平行な2本の電流の、長さ l [m] あたりの力 [N]。電荷の力（Coulomb.force）とそろえて、正なら反発、負なら引き合う。
  // 同じ向きの電流（I₁I₂ が正）は引き合う
  const parallelForce = (I1, I2, r, l = 1) => -force(fluxDensity(I1, r), I2, l);

  const Magnetic = { MU0, field, fluxDensity, force, parallelForce };
  if (typeof module !== 'undefined' && module.exports) module.exports = Magnetic;
  else global.Magnetic = Magnetic;
})(this);
