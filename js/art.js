/* Kings Gaming Box — art.js : gambar CONTOH buatan sendiri (poster vektor, tanpa berkas/hotlink) + barcode Code128.
   Poster hanya dipakai bila cover/foto asli belum diunggah admin. Tanpa emoji. */
(function (w) {
  'use strict';
  var K = w.KGB;
  var PAL = [['#0b3a73', '#0070d1'], ['#3b1d6e', '#7c3aed'], ['#0f4c3a', '#10b981'], ['#6b1d2a', '#e11d48'], ['#5a3a05', '#f59e0b'], ['#1e3a5f', '#38bdf8'], ['#44200a', '#ea580c'], ['#1f2a44', '#64748b']];
  var hash = function (s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var uri = function (svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); };

  function wrap(title, max) {
    var words = String(title).split(/\s+/), lines = [], cur = '';
    words.forEach(function (wd) { if ((cur + ' ' + wd).trim().length > max && cur) { lines.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); });
    if (cur) lines.push(cur);
    return lines.slice(0, 4);
  }
  var Art = {
    /** Poster 3:4 untuk game */
    game: function (title, genre) {
      var p = PAL[hash(title) % PAL.length], lines = wrap(title.toUpperCase(), 13), y0 = 150 - (lines.length - 1) * 17;
      var t = lines.map(function (l, i) { return '<text x="150" y="' + (y0 + i * 36) + '" text-anchor="middle" font-family="Rajdhani,Orbitron,Arial Narrow,sans-serif" font-weight="700" font-size="31" fill="#fff" letter-spacing="1">' + esc(l) + '</text>'; }).join('');
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + p[0] + '"/><stop offset="1" stop-color="' + p[1] + '"/></linearGradient>' +
        '<radialGradient id="r" cx=".8" cy=".1" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="300" height="400" fill="url(#g)"/><rect width="300" height="400" fill="url(#r)"/>' +
        '<g fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="7" stroke-linejoin="round"><path d="M60 320 90 268H30z" transform="translate(20 -6) scale(1.5)"/><circle cx="240" cy="330" r="34"/><path d="M200 70l44 44M244 70l-44 44"/><rect x="26" y="40" width="46" height="46" rx="3"/></g>' +
        t + '<rect x="0" y="342" width="300" height="58" fill="#000" fill-opacity=".38"/><text x="18" y="378" font-family="Plus Jakarta Sans,Arial,sans-serif" font-weight="700" font-size="15" fill="#facc15" letter-spacing="1.5">' + esc(String(genre || 'GAME').toUpperCase().slice(0, 22)) + '</text></svg>';
      return uri(svg);
    },
    /** Ilustrasi unit Playbox (dipakai bila foto unit belum diunggah) */
    unit: function () {
      var d = w.ICONS && w.ICONS.playbox; if (!d) return '';
      return uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + d.vb + '"><rect width="320" height="240" fill="#0a1226"/>' + d.b + '</svg>');
    },
    cover: function (g) { return g.cover_url ? g.cover_url : Art.game(g.title || 'Game', g.genre); },
    unitImg: function (u) { return u && u.image_url ? u.image_url : Art.unit(); }
  };

  /* ------------------------------------------------------------------ Code128 (set B) -> <svg> */
  var P = '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
  var Barcode = {
    patterns: P,
    encode: function (text) {
      var codes = [104], sum = 104;
      for (var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i) - 32; if (c < 0 || c > 95) c = 0;
        codes.push(c); sum += c * (i + 1);
      }
      codes.push(sum % 103); codes.push(106);
      return codes;
    },
    svg: function (text, o) {
      o = o || {}; var mod = o.module || 2, h = o.height || 70, codes = Barcode.encode(String(text)), x = 10 * mod, bars = '';
      codes.forEach(function (c) {
        var pat = P[c], dark = true;
        for (var i = 0; i < pat.length; i++) { var wd = +pat[i] * mod; if (dark) bars += '<rect x="' + x + '" y="0" width="' + wd + '" height="' + h + '"/>'; x += wd; dark = !dark; }
      });
      var W = x + 10 * mod;
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + h + '" width="' + W + '" height="' + h + '" role="img" aria-label="Barcode ' + esc(text) + '" preserveAspectRatio="none" fill="#000">' + bars + '</svg>';
    }
  };
  K.Art = Art; K.Barcode = Barcode;
})(window);
