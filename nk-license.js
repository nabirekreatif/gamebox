/*! nk-license.js — Pengaman lisensi template web Nabire Kreatif
 *  Pasang di <head> template SEBELUM skrip lain:
 *    <script src="nk-license.js"></script>
 *  Konfigurasi (window.NKL) diisi otomatis lewat menu Admin → Lisensi → "Unduh nk-license.js".
 *  Cara kerja: bila template dibuka di domain yang bukan milik penjual dan domain itu belum diaktifkan,
 *  halaman disembunyikan dan diminta kode lisensi — SEKALI saja oleh pembeli; setelah domain aktif,
 *  semua pengunjung langsung melihat halaman tanpa kode. Kode divalidasi ke server Nabire Kreatif → token bertanda tangan (RSA) yang
 *  diverifikasi di browser dengan kunci publik. Token berlaku 7 hari, disegarkan tiap ≤24 jam.
 *  Gunakan: NKLicense.ready.then(function(){ jalankanAplikasiTemplate(); });
 */
(function (w, d) {
  'use strict';
  var C = w.NKL || {}, DAY = 86400, STORE = 'nkl:v1:';
  var host = String(location.hostname || '').toLowerCase().replace(/^www\./, '');
  var res, rej, ready = new Promise(function (a, b) { res = a; rej = b; });
  var state = { ok: false, host: host, reason: '', exp: 0, owner: false, dev: false };
  w.NKLicense = { ready: ready, status: function () { return JSON.parse(JSON.stringify(state)); }, host: host };

  /* ---------- utilitas ---------- */
  var enc = new TextEncoder();
  function b64u(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function now() { return Math.floor(Date.now() / 1000); }
  function get(k) { try { return JSON.parse(localStorage.getItem(STORE + k) || 'null'); } catch (e) { return null; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(STORE + k); else localStorage.setItem(STORE + k, JSON.stringify(v)); } catch (e) { } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var isDev = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(host) || /\.localhost$/.test(host);
  function isOwner() { var o = C.owner || []; for (var i = 0; i < o.length; i++) { var x = String(o[i]).toLowerCase().replace(/^www\./, ''); if (x && (host === x || host.slice(-(x.length + 1)) === '.' + x)) return true; } return false; }

  /* ---------- sembunyikan halaman sampai lisensi terbukti ---------- */
  var hide = d.createElement('style'); hide.id = 'nkl-hide';
  hide.textContent = 'html.nkl-wait body>*:not(#nkl-gate){display:none!important}html.nkl-wait body{background:#0b1220!important;overflow:hidden!important}';
  function lock() { d.documentElement.classList.add('nkl-wait'); (d.head || d.documentElement).appendChild(hide); }
  function unlock() { d.documentElement.classList.remove('nkl-wait'); if (hide.parentNode) hide.parentNode.removeChild(hide); var g = d.getElementById('nkl-gate'); if (g) g.remove(); }

  /* ---------- verifikasi token (offline, kunci publik) ---------- */
  var keyP = null;
  function pubKey() {
    if (!keyP) keyP = crypto.subtle.importKey('spki', b64u(C.pub || ''), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return keyP;
  }
  function checkToken(tok) {
    if (!tok || typeof tok !== 'string' || tok.indexOf('.') < 1) return Promise.resolve(null);
    var pr = tok.split('.');
    return pubKey().then(function (k) { return crypto.subtle.verify('RSASSA-PKCS1-v1_5', k, b64u(pr[1]), enc.encode(pr[0])); }).then(function (okSig) {
      if (!okSig) return null;
      var p = JSON.parse(new TextDecoder().decode(b64u(pr[0])));
      if (p.dom !== host || (C.pid && p.pid !== C.pid) || !p.exp || p.exp < now()) return null;
      return p;
    }).catch(function () { return null; });
  }

  /* ---------- panggilan ke server ---------- */
  function verify(kode) {
    return fetch(C.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'license.verify', data: { kode: kode, domain: host, pid: C.pid || '' } }), redirect: 'follow' })
      .then(function (r) { return r.json(); });
  }
  function pass(p, kode) { state.ok = true; state.exp = p.exp; state.reason = ''; unlock(); res(state); schedule(kode); }
  var tmr = null;
  function schedule() { clearInterval(tmr); tmr = setInterval(function () { recheck(false); }, 30 * 60 * 1000); }

  /* Cek lisensi domain. Pengunjung tanpa kode pun dikenali bila domain ini sudah diaktifkan pembeli
   * (cukup SATU kali memasukkan kode per domain). Token segar (<24 jam) diverifikasi offline.
   * Gagal jaringan → tetap berlaku sampai token kedaluwarsa. */
  function recheck(force) {
    var st = get(host) || {};
    return checkToken(st.token).then(function (p) {
      var fresh = p && (now() - p.iat) < DAY;
      if (fresh && !force) { if (!state.ok) pass(p, st.kode); return; }
      return verify(st.kode || '').then(function (j) {
        if (j && j.success && j.data && j.data.token) { return checkToken(j.data.token).then(function (np) { if (np) { put(host, { kode: st.kode || '', token: j.data.token }); if (!state.ok) pass(np, st.kode); } else if (!p) gate('Respons server tidak valid. Pastikan konfigurasi lisensi benar.'); }); }
        var msg = (j && j.message) || 'Lisensi tidak valid.', code = j && j.data && j.data.code;
        if (code === 'RATE') { if (p) { if (!state.ok) pass(p, st.kode); return; } return gate(msg); }
        put(host, null); state.ok = false; lock(); gate(code === 'NOREG' && !st.token ? '' : msg, st.kode);
      }).catch(function () { if (p) { if (!state.ok) pass(p, st.kode); } else gate('Tidak dapat terhubung ke server lisensi. Periksa koneksi internet lalu muat ulang.', st.kode); });
    });
  }

  /* ---------- gerbang kode lisensi ---------- */
  function gate(msg, prefill) {
    lock(); state.ok = false; state.reason = msg || '';
    var g = d.getElementById('nkl-gate'); if (g) g.remove();
    g = d.createElement('div'); g.id = 'nkl-gate'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true');
    g.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:linear-gradient(160deg,#072B4A,#0A4C7A);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:auto';
    var buy = C.beli || C.portal || '#', nama = C.nama || 'template ini';
    g.innerHTML = '<div style="width:100%;max-width:440px;background:#fff;color:#0F172A;border-radius:22px;padding:28px 24px;box-shadow:0 24px 70px rgba(0,0,0,.45);text-align:center">' +
      '<div style="width:60px;height:60px;border-radius:50%;background:#FFF1E0;color:#F28500;display:grid;place-items:center;margin:0 auto 14px"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>' +
      '<h1 style="font-size:21px;line-height:28px;margin:0 0 6px;font-weight:800">Halaman ini terkunci</h1>' +
      '<p style="margin:0 0 16px;font-size:14.5px;line-height:22px;color:#475569">Domain <b style="color:#0F172A;word-break:break-all">' + esc(host) + '</b> belum memiliki lisensi untuk <b>' + esc(nama) + '</b>. Masukkan kode lisensi (kode akses) untuk menampilkan halaman, atau kunjungi Nabire Kreatif untuk mendapatkan akses.</p>' +
      '<form id="nkl-f" autocomplete="off"><input id="nkl-k" type="text" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="Kode lisensi, mis. NK-XXXX-XXXX" value="' + esc(prefill || '') + '" style="width:100%;box-sizing:border-box;height:50px;border:1.5px solid #CBD5E1;border-radius:12px;padding:0 14px;font:700 16px ui-monospace,Menlo,monospace;text-align:center;letter-spacing:.04em;outline:none">' +
      '<div id="nkl-e" role="alert" style="min-height:20px;margin:8px 0 2px;font-size:13px;color:#B91C1C;font-weight:600">' + esc(msg || '') + '</div>' +
      '<button id="nkl-b" type="submit" style="width:100%;height:50px;border:0;border-radius:12px;background:#F28500;color:#fff;font-weight:800;font-size:16px;cursor:pointer">Aktifkan Lisensi</button></form>' +
      '<a href="' + esc(buy) + '" target="_blank" rel="noopener" style="display:block;margin-top:14px;font-size:14px;font-weight:700;color:#0A4C7A">Kunjungi Nabire Kreatif untuk mendapatkan akses →</a>' +
      '<p style="margin:16px 0 0;font-size:11.5px;color:#94A3B8">Dilindungi sistem lisensi Nabire Kreatif · satu kode untuk domain terdaftar</p></div>';
    (d.body || d.documentElement).appendChild(g);
    var f = g.querySelector('#nkl-f'), inp = g.querySelector('#nkl-k'), er = g.querySelector('#nkl-e'), bt = g.querySelector('#nkl-b');
    setTimeout(function () { try { inp.focus(); } catch (e) { } }, 50);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); var kode = inp.value.trim(); if (kode.length < 6) { er.textContent = 'Masukkan kode lisensi yang valid.'; return; }
      bt.disabled = true; bt.textContent = 'Memeriksa…'; er.textContent = '';
      verify(kode).then(function (j) {
        if (j && j.success && j.data && j.data.token) {
          return checkToken(j.data.token).then(function (p) { if (!p) throw new Error('Token tidak valid. Pastikan kunci publik di konfigurasi benar.'); put(host, { kode: kode.toUpperCase().replace(/\s+/g, ''), token: j.data.token }); pass(p, kode); });
        }
        er.textContent = (j && j.message) || 'Kode ditolak.';
      }).catch(function (e) { er.textContent = e && e.message && e.message !== 'Failed to fetch' ? e.message : 'Tidak dapat terhubung ke server lisensi. Periksa koneksi internet.'; })
        .then(function () { bt.disabled = false; bt.textContent = 'Aktifkan Lisensi'; });
    });
  }

  /* Anti-tamper ringan: bila gerbang/gaya penyembunyi dihapus saat belum berlisensi, pasang kembali. */
  function guard() {
    if (!w.MutationObserver) return;
    new MutationObserver(function () { if (state.ok) return; if (!d.getElementById('nkl-gate') || !d.getElementById('nkl-hide') || !d.documentElement.classList.contains('nkl-wait')) { if (d.body) gate(state.reason); } })
      .observe(d.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- mulai ---------- */
  function start() {
    if (isDev) { state.ok = state.dev = true; state.reason = 'dev'; return res(state); }
    if (isOwner()) { state.ok = state.owner = true; return res(state); }
    lock();
    if (!C.api || !C.pub) { var go = function () { gate('Konfigurasi lisensi belum lengkap (api / pub). Unduh ulang nk-license.js dari dasbor admin.'); }; return d.body ? go() : d.addEventListener('DOMContentLoaded', go); }
    if (!(w.crypto && crypto.subtle)) { var g2 = function () { gate('Browser/alamat ini tidak mendukung verifikasi lisensi. Buka lewat HTTPS.'); }; return d.body ? g2() : d.addEventListener('DOMContentLoaded', g2); }
    var run = function () { guard(); recheck(false); };
    if (d.body) run(); else d.addEventListener('DOMContentLoaded', run);
  }
  start();
})(window, document);
