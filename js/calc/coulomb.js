// 理論：クーロンの法則と電界。真空中の点電荷。F = kQ₁Q₂ ÷ r²、E = kQ ÷ r²（k = 1 ÷ 4πε₀ ≒ 9 × 10⁹）。
// 電荷は μC、距離は m で受け取り、力は N、電界は V/m を返す
(function (global) {
  'use strict';

  const K = 9e9; // N·m²/C²（試験の値）
  const MICRO = 1e-6;

  // 力（正なら反発、負なら引き合う）
  const force = (q1, q2, r) => (K * q1 * MICRO * q2 * MICRO) / (r * r);
  // 点電荷 q が距離 r の所につくる電界の大きさ（正の電荷なら外向き）
  const field = (q, r) => (K * q * MICRO) / (r * r);

  const Coulomb = { K, force, field };
  if (typeof module !== 'undefined' && module.exports) module.exports = Coulomb;
  else global.Coulomb = Coulomb;
})(this);
