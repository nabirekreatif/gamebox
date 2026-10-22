/* Kings Gaming Box — pwa.js : pasang sebagai aplikasi (PWA). Tombol hanya tampil bila belum terpasang. */
(function (w) {
  'use strict';
  var K = w.KGB, $ = K.$, esc = K.esc, ic = K.ic, UI = K.UI;
  var btn = $('#pwa-btn'), deferred = null, installed = false;

  var standalone = function () {
    try { if (w.matchMedia('(display-mode: standalone)').matches || w.matchMedia('(display-mode: fullscreen)').matches || w.matchMedia('(display-mode: minimal-ui)').matches) return true; } catch (e) { /* abaikan */ }
    return w.navigator.standalone === true;
  };
  var ua = w.navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (w.navigator.platform === 'MacIntel' && w.navigator.maxTouchPoints > 1);
  var iosSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);

  function sync() {
    if (!btn) return;
    btn.hidden = standalone() || installed || !(deferred || isIOS);
  }

  w.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; sync(); });
  w.addEventListener('appinstalled', function () { installed = true; deferred = null; sync(); if (UI && UI.toast) UI.toast('Aplikasi terpasang. Buka dari layar utama.'); });
  try { w.matchMedia('(display-mode: standalone)').addEventListener('change', sync); } catch (e) { /* abaikan */ }

  if (btn) btn.addEventListener('click', function () {
    if (deferred) {
      var d = deferred; deferred = null; sync();
      d.prompt();
      (d.userChoice || Promise.resolve({})).then(function (c) { if (c && c.outcome === 'accepted') { installed = true; } else { deferred = d; } sync(); });
      return;
    }
    if (isIOS) {
      UI.sheet({ title: 'Pasang di iPhone / iPad', foot: false, body: '<div class="stack"><p class="small muted">' + (iosSafari ? '' : 'Buka halaman ini di <b>Safari</b> terlebih dahulu. ') + 'Lalu:</p><ol class="small" style="padding-left:20px;display:grid;gap:8px"><li>Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) di bilah Safari.</li><li>Pilih <b>Tambah ke Layar Utama</b>.</li><li>Ketuk <b>Tambah</b>. Ikon Kings Box muncul di layar utama.</li></ol></div>' });
    }
  });

  sync();

  // service worker (hanya lewat https atau localhost)
  if ('serviceWorker' in w.navigator && /^(https:|http:)$/.test(w.location.protocol)) {
    w.addEventListener('load', function () { w.navigator.serviceWorker.register('sw.js').catch(function () { /* PWA opsional; situs tetap jalan */ }); });
  }
})(window);
