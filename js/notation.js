// 量記号と数値の書き方。記号は "V_R" のように書き、"_" の後ろを添字にする（"X_{L}" のように波括弧でも可）。
(function (global) {
  'use strict';

  function parse(symbol) {
    const parts = [];
    const pattern = /_\{([^}]*)\}|_([A-Za-z0-9₀-₉']+)|([^_]+)/g;
    let match;
    while ((match = pattern.exec(symbol))) {
      if (match[3] !== undefined) parts.push({ text: match[3], sub: false });
      else parts.push({ text: match[1] !== undefined ? match[1] : match[2], sub: true });
    }
    return parts;
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }

  // 量記号をHTMLにする。量を表す文字は斜体（<var>）、cos などの関数名・数字・演算子・添字は立体
  function html(symbol) {
    return parse(symbol)
      .map((part) => {
        const text = escapeHtml(part.text);
        if (part.sub) return `<sub>${text}</sub>`;
        return text.replace(/(cos|sin|tan)|([A-Za-zα-ωΑ-Ω]+)/g, (all, fn, letters) => (fn ? fn : `<var>${letters}</var>`));
      })
      .join('');
  }

  function number(value, digits) {
    if (!Number.isFinite(value)) return '—';
    return value.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function decimalsOf(step) {
    const text = String(step);
    return text.includes('.') ? text.split('.')[1].length : 0;
  }

  const Notation = { parse, html, number, decimalsOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = Notation;
  else global.Notation = Notation;
})(this);
