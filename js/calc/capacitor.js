// 理論：平行平板コンデンサ。C = ε₀εr S ÷ d、Q = CV、電界 E = V ÷ d、エネルギー W = CV² ÷ 2。
// 電池をつないだまま（V 一定）と、充電してから外した（Q 一定）で、間隔や誘電体を変えた時の変わり方がちがう
(function (global) {
  'use strict';

  const EPSILON0 = 8.854e-12; // F/m

  // 面積 S [m²]・間隔 d [m]・比誘電率 εr の静電容量 [F]
  const capacitance = ({ S, d, er = 1 }) => (EPSILON0 * er * S) / d;

  // つないだまま（connected）は電圧 V0 のまま。外した時は、はじめの容量 C0 で V0 に充電した電荷 Q が残る
  function state({ C, C0, V0, connected, d }) {
    const Q = connected ? C * V0 : C0 * V0;
    const V = Q / C;
    return { C, Q, V, E: V / d, W: (C * V * V) / 2 };
  }

  const Capacitor = { EPSILON0, capacitance, state };
  if (typeof module !== 'undefined' && module.exports) module.exports = Capacitor;
  else global.Capacitor = Capacitor;
})(this);
