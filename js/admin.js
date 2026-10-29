/* Kings Gaming Box — admin.js : panel admin (dimuat saat dibutuhkan). Login, ringkasan, pesanan, unit, katalog, pengaturan, notifikasi, kontak (CRM), sistem. */
(function (w) {
  'use strict';
  var K = w.KGB, $ = K.$, $$ = K.$$, esc = K.esc, ic = K.ic, rp = K.rp, rpk = K.rpk, Time = K.Time, UI = K.UI, Auth = K.Auth, Router = K.Router, Store = K.Store, api = K.api;

  var BSTAT = ['Menunggu Konfirmasi', 'Sedang Disewa', 'Selesai', 'Dibatalkan'];
  var PSTAT = ['Belum Bayar / COD', 'Menunggu Verifikasi', 'Lunas'];
  var USTAT = ['Tersedia', 'Sedang Disewa', 'Maintenance'];
  var SEGMEN = ['Penyewa', 'Langganan', 'Prospek', 'Lainnya'];
  var TABS = [['ringkasan', 'Ringkasan', 'dashboard'], ['pesanan', 'Pesanan', 'receipt'], ['unit', 'Unit', 'box'], ['katalog', 'Katalog', 'package'], ['promo', 'Promo & Member', 'crown'], ['pengaturan', 'Pengaturan', 'settings'],
    ['notifikasi', 'Notifikasi', 'bell'], ['kontak', 'Kontak', 'contact'], ['sistem', 'Sistem', 'database']];

  var root = null, D = null, tab = 'ringkasan', built = false, loading = false;
  var F = { status: '', q: '', crmQ: '', crmSeg: '', crmWa: '', notifTab: 'konfigurasi', katalogTab: 'paket', crmSel: {} };
  var files = {};   // cache berkas KTP/bukti bayar (dataUrl) selama sesi
  var NC = null, crm = null, blastAud = null, MB = null, HS = null;

  var hp62 = function (v) { var s = K.hp08(v); return s ? '62' + s.slice(1) : ''; };
  var num = function (v) { return Number(v) || 0; };
  var field = function (id, label, inner, hint) { return '<div class="field"><label for="' + id + '">' + label + '</label>' + inner + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>'; };
  var opts = function (list, cur) { return list.map(function (o) { return '<option' + (o === cur ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join(''); };
  var sw = function (id, on, label, extra) { return '<label class="row between" style="min-height:44px;gap:14px"><span>' + label + '</span><span class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + (extra || '') + '><i></i></span></label>'; };
  var fail = function (r) { UI.toast((r && r.message) || 'Terjadi kesalahan.', 'bad'); return r; };

  /** Foto -> JPEG dataUrl, sisi terpanjang max px */
  function imgData(file, max) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('Berkas harus gambar.'));
      if (file.size > 8 * 1024 * 1024) return rej(new Error('Ukuran gambar lebih dari 8 MB.'));
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var r = Math.min(1, (max || 1200) / Math.max(im.width, im.height)), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(im.width * r)); cv.height = Math.max(1, Math.round(im.height * r));
        var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', 0.78));
      };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Gambar tidak bisa dibaca.')); };
      im.src = url;
    });
  }
  function csvParse(text) {
    text = String(text || '').replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '', sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    rows = rows.filter(function (r) { return r.join('').trim() !== ''; });
    if (rows.length < 2) return [];
    var head = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) { var o = {}; head.forEach(function (h, i) { if (h) o[h] = (r[i] || '').trim(); }); return o; });
  }
  function pickCol(o, names) { var keys = Object.keys(o); for (var i = 0; i < names.length; i++) { for (var j = 0; j < keys.length; j++) if (keys[j].toLowerCase().replace(/[^a-z]/g, '') === names[i]) return o[keys[j]]; } return ''; }

  /* ================================================================== LOGIN & KATA SANDI */
  var gsiP = null;
  function loadGsi() {
    if (w.google && w.google.accounts) return Promise.resolve();
    if (gsiP) return gsiP;
    gsiP = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = res; s.onerror = function () { gsiP = null; rej(new Error('gsi')); }; document.head.appendChild(s); });
    return gsiP;
  }
  function afterLogin(res) {
    Auth.save(res.data); Store.clearUser('c:u:'); D = null; built = false; NC = null; crm = null; MB = null; files = {};
    UI.toast(res.message || 'Selamat datang.');
    Router.go(Auth.mustChange ? 'admin' : 'admin/ringkasan'); render();
  }
  var lastCid = null;
  function loginView() {
    var cid = (K.App && K.App.S('google_client_id')) || ''; lastCid = cid;
    root.innerHTML = '<div class="auth-wrap stack"><div class="center"><span class="eyebrow">' + ic('lock') + 'Area pengelola</span><h2>Masuk Admin</h2><p class="muted small">Hanya untuk pengelola ' + esc((K.App && K.App.S('brand_name')) || 'Kings Gaming Box') + '.</p></div>' +
      '<div class="card stack"><h3 class="small muted" style="text-transform:uppercase;letter-spacing:.08em">Admin (akun Google)</h3>' +
      (cid ? '<div id="gsi-btn" class="center" style="min-height:44px"></div><p class="tiny muted center" id="gsi-msg">Memuat tombol Google...</p>' : '<div class="alert warn">' + ic('warn') + '<div>Login Google belum aktif. Superadmin dapat mengisi <b>Google Client ID</b> di Pengaturan, lalu daftarkan email admin.</div></div>') + '</div>' +
      '<div class="card"><form id="sa-form" class="stack" autocomplete="on"><h3 class="small muted" style="text-transform:uppercase;letter-spacing:.08em">Superadmin</h3>' +
      field('sa-u', 'Email atau username', '<input class="in" id="sa-u" name="username" type="text" inputmode="email" autocapitalize="none" autocomplete="username" placeholder="email Anda (kosongkan = superadmin)" value="' + esc(lastLogin()) + '">') +
      field('sa-p', 'Password', '<input class="in" id="sa-p" name="password" type="password" autocomplete="current-password" required>') +
      '<span class="err" id="sa-err" role="alert"></span><button class="btn primary block" type="submit">' + ic('lock') + 'Masuk</button>' +
      '<button class="btn ghost block" type="button" data-act="forgot">' + ic('mail') + 'Lupa password? Kirim kode ke email</button></form></div></div>';
    if (cid) loadGsi().then(function () {
      w.google.accounts.id.initialize({ client_id: cid, callback: function (r) { api('loginGoogle', { idToken: r.credential }).then(function (res) { if (res.success) afterLogin(res); else { fail(res); var m = $('#gsi-msg'); if (m) m.textContent = res.message; } }); } });
      w.google.accounts.id.renderButton($('#gsi-btn'), { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', width: 280 });
      var m = $('#gsi-msg'); if (m) m.textContent = 'Gunakan email yang sudah didaftarkan sebagai admin.';
    }, function () { var m = $('#gsi-msg'); if (m) m.textContent = 'Tombol Google gagal dimuat. Periksa koneksi lalu muat ulang halaman.'; });
  }
  function lastLogin() { try { return localStorage.getItem('kgb:lastadm') || ''; } catch (e) { return ''; } }
  function forgotView(email) {
    root.innerHTML = '<div class="auth-wrap"><div class="card stack"><div class="card-title">' + ic('mail') + '<h3>Lupa password</h3></div>' +
      '<form id="fp-form" class="stack"><p class="small muted">Masukkan email superadmin. Kami kirim kode 6 angka yang berlaku 15 menit.</p>' +
      field('fp-e', 'Email superadmin', '<input class="in" id="fp-e" type="email" inputmode="email" autocapitalize="none" autocomplete="email" value="' + esc(email || lastLogin()) + '" required>') +
      '<span class="err" id="fp-err" role="alert"></span><button class="btn primary block" type="submit">Kirim kode</button></form>' +
      '<form id="rp-form" class="stack" hidden><div class="alert ok" id="rp-info"></div>' +
      field('rp-c', 'Kode 6 angka dari email', '<input class="in" id="rp-c" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required>') +
      field('rp-n', 'Password baru', '<input class="in" id="rp-n" type="password" autocomplete="new-password" required>', 'Minimal 10 karakter, kombinasi huruf dan angka.') +
      field('rp-k', 'Ulangi password baru', '<input class="in" id="rp-k" type="password" autocomplete="new-password" required>') +
      '<span class="err" id="rp-err" role="alert"></span><button class="btn primary block" type="submit">Ganti password</button></form>' +
      '<button class="btn ghost block" type="button" data-act="back-login">Kembali ke halaman masuk</button></div></div>';
  }
  function pwView(forced) {
    root.innerHTML = '<div class="auth-wrap"><div class="card stack"><div class="card-title">' + ic('key') + '<h3>' + (forced ? 'Buat password baru' : 'Ganti password') + '</h3></div>' +
      (forced ? '<div class="alert warn">' + ic('warn') + '<div>Anda masuk memakai password sementara. Buat password baru sebelum melanjutkan.</div></div>' : '') +
      '<form id="pw-form" class="stack">' + field('pw-o', 'Password saat ini', '<input class="in" id="pw-o" type="password" autocomplete="current-password" required>') +
      field('pw-n', 'Password baru', '<input class="in" id="pw-n" type="password" autocomplete="new-password" required>', 'Minimal 10 karakter, kombinasi huruf dan angka.') +
      field('pw-c', 'Ulangi password baru', '<input class="in" id="pw-c" type="password" autocomplete="new-password" required>') +
      '<span class="err" id="pw-err" role="alert"></span><div class="row wrap-r"><button class="btn primary" type="submit">Simpan password</button>' + (forced ? '<button class="btn ghost" type="button" data-act="logout">Keluar</button>' : '') + '</div></form></div></div>';
  }

  /* ================================================================== KERANGKA */
  function pending() { return D ? D.bookings.filter(function (b) { return b.booking_status === 'Menunggu Konfirmasi'; }).length : 0; }
  function nav() {
    var cur = tab;
    return '<nav class="admin-nav" aria-label="Menu admin">' + TABS.filter(function (t) { return t[0] !== 'sistem' || Auth.isSuper(); }).map(function (t) {
      return '<a href="#/admin/' + t[0] + '"' + (t[0] === cur ? ' aria-current="page"' : '') + '>' + ic(t[2]) + t[1] + (t[0] === 'pesanan' && pending() ? '<span class="n">' + pending() + '</span>' : '') + '</a>';
    }).join('') + '<button type="button" class="nav-lic" data-nk-license aria-label="Lisensi template">' + ic('key') + 'Lisensi</button></nav>';
  }
  function shell() {
    root.innerHTML = '<div class="row between wrap-r" style="margin:6px 0 14px"><div><span class="eyebrow">' + ic('shield') + (Auth.isSuper() ? 'Superadmin' : 'Admin') + '</span><h2 style="margin:0">Panel Pengelola</h2></div>' +
      '<div class="row"><span class="small muted hide-m">' + esc(Auth.nama || Auth.email) + '</span><button class="btn sm" data-act="reload">' + ic('refresh') + 'Segarkan</button><button class="btn sm ghost" data-act="logout">' + ic('logout') + 'Keluar</button></div></div>' +
      '<div class="admin-shell"><div id="a-nav"></div><div id="a-body" class="stack" style="min-width:0"></div></div>' + (K.App && K.App.footHtml ? K.App.footHtml() : '');
    if (K.App && K.App.footSync) K.App.footSync();
    built = true;
  }
  function render() {
    if (!root) return;
    if (!Auth.isAdmin()) { built = false; loginView(); return; }
    if (Auth.mustChange) { built = false; pwView(true); return; }
    if (!built) shell();
    $('#a-nav').innerHTML = nav();
    var b = $('#a-body');
    if (!D && tab !== 'sistem') { b.innerHTML = '<div class="empty">' + ic('loader', 'spin') + '<p>Memuat data...</p></div>'; return; }
    ({ ringkasan: vRingkasan, pesanan: vPesanan, unit: vUnit, katalog: vKatalog, promo: vPromo, pengaturan: vPengaturan, notifikasi: vNotif, kontak: vKontak, sistem: vSistem }[tab] || vRingkasan)(b);
  }
  function load(force) {
    if (!Auth.isAdmin() || Auth.mustChange) return Promise.resolve();
    return K.swr(Auth.ns('boot'), 'adminBootstrap', {}, function (d) { D = d; if (d.serverTime) Time.sync(d.serverTime); render(); }, {
      force: force, fresh: 30000, onError: function (r) { if (r.code !== 'AUTH') { var b = $('#a-body'); if (b && !D) b.innerHTML = '<div class="empty">' + ic('warn') + '<p>' + esc(r.message) + '</p><button class="btn primary mt" data-act="reload">Coba lagi</button></div>'; } }
    });
  }
  function refresh() { return load(true); }

  /* ================================================================== RINGKASAN */
  function barChart(data, o) {
    o = o || {}; var Wd = 640, H = 170, pb = 24, pt = 10, n = data.length || 1, max = Math.max.apply(null, data.map(function (d) { return d.v; }).concat([1])), bw = (Wd - 16) / n, step = Math.ceil(n / (o.labels || 6));
    var g = '', i;
    for (i = 0; i <= 3; i++) { var y = pt + (H - pb - pt) * i / 3; g += '<line class="grid" x1="8" x2="' + (Wd - 8) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>'; }
    var bars = data.map(function (d, i) {
      var h = d.v / max * (H - pb - pt), x = 8 + i * bw + bw * .16;
      return '<rect class="bar" x="' + x.toFixed(1) + '" y="' + (H - pb - h).toFixed(1) + '" width="' + (bw * .68).toFixed(1) + '" height="' + Math.max(h, d.v ? 2 : 0).toFixed(1) + '" rx="3"><title>' + esc(d.label + ': ' + rp(d.v)) + '</title></rect>' +
        (i % step === 0 ? '<text x="' + (x + bw * .34).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(d.label) + '</text>' : '');
    }).join('');
    return '<svg class="chart" viewBox="0 0 ' + Wd + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Grafik') + '">' + g + bars + '</svg>';
  }
  function vRingkasan(b) {
    var s = D.stats, bk = D.bookings, need = pending(), pay = bk.filter(function (x) { return x.payment_status === 'Menunggu Verifikasi'; }).length;
    var daily = s.daily.map(function (d) { return { label: d.d.slice(8) + '/' + d.d.slice(5, 7), v: d.v }; });
    var monthly = s.monthly.map(function (d) { return { label: d.m.slice(5) + '/' + d.m.slice(2, 4), v: d.v }; });
    var maxp = Math.max.apply(null, s.packages.map(function (p) { return p.count; }).concat([1]));
    b.innerHTML = '<div class="kpis">' +
      '<div class="kpi need"><div class="k">' + ic('bell') + 'Perlu tindakan</div><div class="v">' + need + '</div><div class="tiny muted">' + pay + ' bukti bayar menunggu cek</div></div>' +
      '<div class="kpi"><div class="k">' + ic('wallet') + 'Pendapatan (lunas)</div><div class="v">' + rp(s.revenue) + '</div><div class="tiny muted">Belum lunas: ' + rp(s.unpaid) + '</div></div>' +
      '<div class="kpi"><div class="k">' + ic('timer') + 'Sewa berjalan/antre</div><div class="v">' + s.active + '</div><div class="tiny muted">' + s.finished + ' selesai &middot; ' + s.total + ' total</div></div>' +
      '<div class="kpi"><div class="k">' + ic('box') + 'Unit tersedia</div><div class="v">' + s.unitsAvailable + ' / ' + s.unitsTotal + '</div><div class="tiny muted">' + s.customers + ' pelanggan</div></div></div>' +
      (D.demo && D.demo.total ? '<div class="alert warn">' + ic('info') + '<div>Masih ada <b>' + D.demo.total + '</b> baris data contoh. ' + (Auth.isSuper() ? '<a href="#/admin/sistem">Kelola di menu Sistem</a>.' : 'Minta Superadmin menghapusnya sebelum tayang.') + '</div></div>' : '') +
      '<div class="card"><div class="card-title">' + ic('trend') + '<h3>Pendapatan 30 hari</h3></div>' + barChart(daily, { aria: 'Pendapatan harian 30 hari terakhir', labels: 6 }) + '</div>' +
      '<div class="grid-2"><div class="card"><div class="card-title">' + ic('calendar') + '<h3>Per bulan</h3></div>' + barChart(monthly, { aria: 'Pendapatan 6 bulan', labels: 6 }) + '</div>' +
      '<div class="card"><div class="card-title">' + ic('trophy') + '<h3>Paket terlaris</h3></div><div class="stack">' + (s.packages.length ? s.packages.slice(0, 6).map(function (p) { return '<div><div class="row between small"><span>' + esc(p.name) + '</span><b>' + p.count + '</b></div><div class="pbar"><i style="width:' + Math.round(p.count / maxp * 100) + '%"></i></div></div>'; }).join('') : UI.empty('info', 'Belum ada data.')) + '</div></div></div>' +
      '<div class="card"><div class="card-title">' + ic('receipt') + '<h3>Pesanan terbaru</h3><a class="btn xs" style="margin-left:auto" href="#/admin/pesanan">Semua</a></div><div class="list-card">' + (bk.slice(0, 5).map(orderItem).join('') || UI.empty('receipt', 'Belum ada pesanan.')) + '</div></div>';
  }

  /* ================================================================== PESANAN */
  function orderItem(o) {
    return '<button class="item" data-act="order" data-id="' + esc(o.booking_id) + '"><div class="main"><b>' + esc(o.customer_name) + ' <span class="muted" style="font-weight:500">&middot; ' + esc(o.booking_id) + '</span></b><span>' + esc(o.package_name) + ' &middot; ' + esc(Time.fmt(o.start_time)) + ' &middot; ' + rp(o.package_price) + '</span></div><div class="stack" style="gap:4px;justify-items:end">' + UI.badge(o.booking_status) + UI.badge(o.payment_status) + '</div></button>';
  }
  function vPesanan(b) {
    var q = F.q.toLowerCase(), list = D.bookings.filter(function (o) { return (!F.status || o.booking_status === F.status) && (!q || (o.customer_name + ' ' + o.booking_id + ' ' + o.whatsapp_number).toLowerCase().indexOf(q) > -1); });
    var cnt = {}; D.bookings.forEach(function (o) { cnt[o.booking_status] = (cnt[o.booking_status] || 0) + 1; });
    b.innerHTML = '<div class="filters"><input class="in" id="f-q" type="search" placeholder="Cari nama, kode, atau nomor WA" value="' + esc(F.q) + '" aria-label="Cari pesanan"><div class="chips">' +
      '<button class="chip" aria-pressed="' + !F.status + '" data-act="fstatus" data-v="">Semua<span class="cnt">' + D.bookings.length + '</span></button>' +
      BSTAT.map(function (s) { return '<button class="chip" aria-pressed="' + (F.status === s) + '" data-act="fstatus" data-v="' + esc(s) + '">' + esc(s) + '<span class="cnt">' + (cnt[s] || 0) + '</span></button>'; }).join('') + '</div></div>' +
      '<div class="list-card" id="o-list">' + (list.slice(0, 120).map(orderItem).join('') || UI.empty('search', 'Tidak ada pesanan yang cocok.')) + '</div>' + (list.length > 120 ? '<p class="small muted center">Menampilkan 120 dari ' + list.length + '. Persempit pencarian.</p>' : '');
  }
  function patchBooking(id, p) { var o = D.bookings.filter(function (x) { return x.booking_id === id; })[0]; if (o) Object.assign(o, p); }
  function proofBox(kind, fid, label) {
    if (!fid) return '<div class="proof-empty"><div class="small muted">' + label + ': belum ada</div></div>';
    return '<button type="button" data-act="proof" data-fid="' + esc(fid) + '" data-label="' + esc(label) + '" aria-label="Lihat ' + esc(label) + '"><span class="small">' + ic('image') + ' ' + esc(label) + '</span></button>';
  }
  function orderSheet(id) {
    var o = D.bookings.filter(function (x) { return x.booking_id === id; })[0]; if (!o) return;
    var u = D.units.filter(function (x) { return x.unit_id === o.unit_id; })[0];
    var s = UI.sheet({ title: 'Pesanan ' + o.booking_id, wide: true, foot: false, body: '' });
    function draw() {
      o = D.bookings.filter(function (x) { return x.booking_id === id; })[0]; if (!o) { s.close(); return; }
      s.body.innerHTML = '<div class="row wrap-r mb">' + UI.badge(o.booking_status) + UI.badge(o.payment_status) + (o.is_demo ? '<span class="badge">Contoh</span>' : '') + '</div>' +
        '<dl class="kv"><dt>Nama</dt><dd>' + esc(o.customer_name) + '</dd><dt>WhatsApp</dt><dd><a href="https://wa.me/' + hp62(o.whatsapp_number) + '" target="_blank" rel="noopener">' + esc(o.whatsapp_number) + '</a></dd>' +
        '<dt>Alamat antar</dt><dd>' + esc(o.delivery_address) + '</dd><dt>Unit</dt><dd>' + esc(u ? u.unit_name : o.unit_id) + '</dd><dt>Paket</dt><dd>' + esc(o.package_name) + ' &middot; ' + rp(o.package_price) + '</dd>' +
        (o.member ? '<dt>Pemesan</dt><dd><span class="badge gold">Member</span> ' + esc(o.customer_id || '') + '</dd>' : '') + (num(o.discount) > 0 ? '<dt>Diskon promo</dt><dd>- ' + rp(o.discount) + ' <span class="muted">(harga normal ' + rp(o.normal_price) + ')</span></dd>' : '') + (num(o.bonus_hours) > 0 ? '<dt>Bonus voucher</dt><dd>+' + num(o.bonus_hours) + ' jam gratis</dd>' : '') +
        '<dt>Mulai</dt><dd>' + esc(Time.fmt(o.start_time)) + ' ' + Time.tzLabel() + '</dd><dt>Selesai</dt><dd>' + esc(Time.fmt(o.end_time)) + ' ' + Time.tzLabel() + '</dd><dt>Request game</dt><dd>' + esc(o.selected_games || '-') + '</dd><dt>Dipesan</dt><dd>' + esc(Time.fmt(o.created_at)) + '</dd></dl>' +
        '<h4 class="mt-lg" style="margin:18px 0 8px">Dokumen</h4><div class="proof" id="pf">' + proofBox('ktp', o.ktp_file_id, 'Foto KTP') + proofBox('pay', o.payment_file_id, 'Bukti bayar') + '</div>' +
        '<h4 style="margin:18px 0 8px">Ubah status</h4><div class="ord-status">' + BSTAT.filter(function (x) { return x !== o.booking_status; }).map(function (x) { return '<button class="btn sm ' + (x === 'Dibatalkan' ? 'danger' : x === 'Selesai' ? '' : 'primary') + '" data-st="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>' +
        '<div class="ord-form">' + field('o-pay', 'Pembayaran', '<select class="in" id="o-pay">' + opts(PSTAT, o.payment_status) + '</select>') + field('o-note', 'Catatan admin', '<textarea class="in" id="o-note" maxlength="500" style="min-height:76px">' + esc(o.admin_notes) + '</textarea>') + '</div>' +
        '<div class="ord-actions"><button class="btn gold block" data-sv>' + ic('check') + 'Simpan pembayaran &amp; catatan</button><div class="ord-acts2"><button class="btn" data-rm>' + ic('whatsapp') + 'Kirim pengingat</button><a class="btn" href="#/struk/' + esc(o.booking_id) + '" data-go>' + ic('receipt') + 'Struk</a></div><button class="btn danger-ghost block" data-del>' + ic('trash') + 'Hapus pesanan</button></div>';
    }
    draw();
    s.el.addEventListener('click', function (e) {
      var st = e.target.closest('[data-st]'), pf = e.target.closest('[data-act=proof]');
      if (e.target.closest('[data-go]')) { s.close(); return; }
      if (pf) { openProof(pf); return; }
      if (st) {
        var to = st.getAttribute('data-st'), prev = o.booking_status;
        var run = function () { patchBooking(id, { booking_status: to }); draw(); render(); return api('updateBookingStatus', { booking_id: id, status: to }).then(function (r) { if (!r.success) { patchBooking(id, { booking_status: prev }); draw(); render(); fail(r); } else UI.toast(r.message || 'Status diperbarui.'); refresh(); }); };
        if (to === 'Dibatalkan') UI.confirm({ title: 'Batalkan pesanan?', message: 'Pesanan ' + id + ' dibatalkan dan jadwalnya dilepas.', ok: 'Ya, batalkan', danger: true }).then(function (y) { if (y) run(); }); else run();
      }
      if (e.target.closest('[data-sv]')) {
        var p = $('#o-pay', s.el).value, n = $('#o-note', s.el).value, prevp = o.payment_status, prevn = o.admin_notes;
        patchBooking(id, { payment_status: p, admin_notes: n }); draw(); render();
        api('updateBooking', { booking_id: id, payment_status: p, admin_notes: n }).then(function (r) { if (!r.success) { patchBooking(id, { payment_status: prevp, admin_notes: prevn }); draw(); render(); fail(r); } else UI.toast('Tersimpan.'); refresh(); });
      }
      if (e.target.closest('[data-rm]')) api('remindBooking', { booking_id: id }).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); if (!r.data.queued) w.open(r.data.wa_url, '_blank', 'noopener'); });
      if (e.target.closest('[data-del]')) UI.confirm({ title: 'Hapus pesanan?', message: 'Pesanan ' + id + ' beserta foto KTP dan bukti bayar akan dihapus permanen.', type: 'HAPUS', ok: 'Hapus permanen', danger: true }).then(function (y) {
        if (!y) return; api('deleteBooking', { booking_id: id, confirm: 'HAPUS' }).then(function (r) { if (!r.success) return fail(r); D.bookings = D.bookings.filter(function (x) { return x.booking_id !== id; }); s.close(); render(); UI.toast(r.message); refresh(); });
      });
    });
    // muat foto otomatis di latar
    $$('[data-act=proof]', s.el).forEach(function (btn) { loadProof(btn); });
  }
  function loadProof(btn) {
    var fid = btn.getAttribute('data-fid');
    var show = function (d) { btn.innerHTML = '<img alt="' + esc(btn.getAttribute('data-label')) + '" src="' + esc(d) + '">'; };
    if (files[fid]) return show(files[fid]);
    api('adminFile', { file_id: fid }).then(function (r) { if (r.success) { files[fid] = r.data.dataUrl; if (btn.isConnected) show(files[fid]); } else if (btn.isConnected) btn.innerHTML = '<span class="small">Gagal memuat</span>'; });
  }
  function openProof(btn) { var fid = btn.getAttribute('data-fid'); if (files[fid]) UI.lightbox(files[fid], btn.getAttribute('data-label')); }

  /* ================================================================== UNIT */
  function vUnit(b) {
    b.innerHTML = '<div class="row between wrap-r"><h3>Unit Playbox</h3><button class="btn primary" data-act="unit-new">' + ic('plus') + 'Tambah unit</button></div><div class="list-card">' +
      (D.units.map(function (u) {
        var left = u.current_status === 'Sedang Disewa' && u.available_at ? ' &middot; sampai ' + esc(Time.fmtShort(u.available_at)) : '';
        return '<div class="item"><div class="thumb"><img alt="" loading="lazy" referrerpolicy="no-referrer" src="' + esc(K.Art.unitImg(u)) + '" onerror="this.onerror=null;this.src=KGB.Art.unit()"></div><div class="main"><b>' + esc(u.unit_name) + (u.is_demo ? ' <span class="badge">Contoh</span>' : '') + '</b><span>' + esc(u.specs) + '</span><span>' + UI.badge(u.current_status) + left + '</span></div>' +
          '<div class="row wrap-r"><button class="btn xs" data-act="unit-status" data-id="' + esc(u.unit_id) + '">Status</button><button class="btn xs" data-act="unit-edit" data-id="' + esc(u.unit_id) + '">' + ic('pencil') + '</button><button class="btn xs danger" data-act="unit-del" data-id="' + esc(u.unit_id) + '" aria-label="Hapus unit">' + ic('trash') + '</button></div></div>';
      }).join('') || UI.empty('box', 'Belum ada unit.')) + '</div>';
  }
  function imageField(id, label, cur, kind) {
    return '<div class="field"><label>' + label + '</label><div class="row wrap-r"><div class="thumb" style="width:96px;height:72px" id="' + id + '-pv">' + (cur ? '<img alt="" referrerpolicy="no-referrer" src="' + esc(K.Art.norm(cur)) + '">' : ic('image')) + '</div><div class="stack grow" style="min-width:200px"><input class="in" id="' + id + '" value="' + esc(cur || '') + '" placeholder="Tempel alamat gambar (https://...) atau unggah" inputmode="url"><label class="btn sm" style="width:fit-content">' + ic('upload') + 'Unggah foto<input type="file" accept="image/*" hidden id="' + id + '-f" data-kind="' + kind + '"></label></div></div><span class="err" id="' + id + '-e"></span></div>';
  }
  function bindImage(scope, id) {
    var f = $('#' + id + '-f', scope), inp = $('#' + id, scope), pv = $('#' + id + '-pv', scope);
    inp.addEventListener('input', function () { pv.innerHTML = inp.value ? '<img alt="" referrerpolicy="no-referrer" src="' + esc(K.Art.norm(inp.value)) + '">' : ic('image'); });
    f.addEventListener('change', function () {
      var file = f.files[0]; if (!file) return; var err = $('#' + id + '-e', scope); err.textContent = 'Mengunggah...';
      imgData(file, f.getAttribute('data-kind') === 'hero' ? 1600 : (f.getAttribute('data-kind') === 'logo' ? 512 : 1000)).then(function (d) { return api('uploadAsset', { kind: f.getAttribute('data-kind'), data: d, name: file.name }); }).then(function (r) {
        if (!r.success) { err.textContent = r.message; return; } err.textContent = ''; inp.value = r.data.url; pv.innerHTML = '<img alt="" referrerpolicy="no-referrer" src="' + esc(r.data.url) + '">'; UI.toast('Gambar diunggah.');
      }, function (e) { err.textContent = e.message; });
    });
  }
  function unitForm(u) {
    u = u || {};
    var s = UI.sheet({ title: u.unit_id ? 'Ubah unit' : 'Unit baru', body: '<form class="stack" id="uf">' + field('u-n', 'Nama unit', '<input class="in" id="u-n" maxlength="80" value="' + esc(u.unit_name || '') + '" required>') + field('u-s', 'Spesifikasi', '<input class="in" id="u-s" maxlength="200" value="' + esc(u.specs || '') + '">') + imageField('u-i', 'Foto unit', u.image_url, 'unit') + '</form>' });
    s.foot.innerHTML = '<button class="btn ghost" data-no>Batal</button><button class="btn primary" data-ok>Simpan</button>'; bindImage(s.el, 'u-i');
    $('[data-no]', s.foot).onclick = function () { s.close(); };
    $('[data-ok]', s.foot).onclick = function (e) {
      UI.busy(e.currentTarget, api('saveUnit', { unit_id: u.unit_id || '', unit_name: $('#u-n').value, specs: $('#u-s').value, image_url: K.Art.norm($('#u-i').value.trim()) })).then(function (r) { if (!r.success) return fail(r); s.close(); UI.toast(r.message); refresh(); K.App && K.App.loadPub(true); });
    };
  }
  function unitStatusForm(u) {
    var s = UI.sheet({ title: 'Status ' + u.unit_name, body: '<div class="stack">' + field('us-s', 'Status', '<select class="in" id="us-s">' + opts(USTAT, u.current_status) + '</select>') +
      '<div id="us-w" hidden>' + field('us-a', 'Selesai sewa (' + Time.tzLabel() + ')', '<input class="in" type="datetime-local" id="us-a" value="' + esc(u.available_at ? Time.toLocal(Date.parse(u.available_at)) : Time.toLocal(Time.now() + 3600e3)) + '">') + '</div>' +
      '<p class="tiny muted">Mengubah ke Tersedia menandai sewa yang sedang berjalan sebagai selesai.</p></div>' });
    s.foot.innerHTML = '<button class="btn ghost" data-no>Batal</button><button class="btn primary" data-ok>Simpan</button>';
    var sel = $('#us-s', s.el), wrap = $('#us-w', s.el), sync = function () { wrap.hidden = sel.value !== 'Sedang Disewa'; }; sel.addEventListener('change', sync); sync();
    $('[data-no]', s.foot).onclick = function () { s.close(); };
    $('[data-ok]', s.foot).onclick = function (e) {
      var d = { unit_id: u.unit_id, status: sel.value }; if (sel.value === 'Sedang Disewa') d.available_at = Time.fromLocal($('#us-a').value);
      UI.busy(e.currentTarget, api('setUnitStatus', d)).then(function (r) { if (!r.success) return fail(r); s.close(); UI.toast(r.message); refresh(); K.App && K.App.loadPub(true); });
    };
  }

  /* ================================================================== KATALOG */
  function vKatalog(b) {
    var p = F.katalogTab === 'paket';
    b.innerHTML = '<div class="tabs" role="tablist"><button role="tab" aria-selected="' + p + '" data-act="ktab" data-v="paket">' + ic('tag') + 'Paket sewa</button><button role="tab" aria-selected="' + !p + '" data-act="ktab" data-v="game">' + ic('play') + 'Daftar game</button></div>' +
      (p ? '<div class="row between wrap-r"><h3>Paket sewa</h3><button class="btn primary" data-act="pkg-new">' + ic('plus') + 'Tambah paket</button></div><div class="list-card">' +
        D.packages.map(function (x) { return '<div class="item"><div class="main"><b>' + esc(x.package_name) + (x.badge_text ? ' <span class="badge gold">' + esc(x.badge_text) + '</span>' : '') + (x.is_active ? '' : ' <span class="badge bad">Nonaktif</span>') + '</b><span>' + x.duration_hours + ' jam &middot; ' + rp(x.price) + '</span></div><div class="row"><button class="btn xs" data-act="pkg-edit" data-id="' + esc(x.package_id) + '">' + ic('pencil') + '</button><button class="btn xs danger" data-act="pkg-del" data-id="' + esc(x.package_id) + '" aria-label="Hapus paket">' + ic('trash') + '</button></div></div>'; }).join('') + '</div>'
        : '<div class="row between wrap-r"><h3>Daftar game (' + D.games.length + ')</h3><button class="btn primary" data-act="game-new">' + ic('plus') + 'Tambah game</button></div><div class="list-card">' +
        D.games.map(function (g) { return '<div class="item"><div class="thumb"><img alt="" loading="lazy" referrerpolicy="no-referrer" src="' + esc(K.Art.cover(g)) + '" onerror="this.onerror=null;this.src=KGB.Art.game(\'' + esc(g.title).replace(/'/g, '') + '\',\'\')"></div><div class="main"><b>' + esc(g.title) + (g.is_featured ? ' <span class="badge gold">Unggulan</span>' : '') + '</b><span>' + esc(g.genre || '-') + '</span></div><div class="row"><button class="btn xs" data-act="game-edit" data-id="' + esc(g.game_id) + '">' + ic('pencil') + '</button><button class="btn xs danger" data-act="game-del" data-id="' + esc(g.game_id) + '" aria-label="Hapus game">' + ic('trash') + '</button></div></div>'; }).join('') + '</div>');
  }
  function simpleSheet(title, body, onOk) {
    var s = UI.sheet({ title: title, body: body }); s.foot.innerHTML = '<button class="btn ghost" data-no>Batal</button><button class="btn primary" data-ok>Simpan</button>';
    $('[data-no]', s.foot).onclick = function () { s.close(); };
    $('[data-ok]', s.foot).onclick = function (e) { UI.busy(e.currentTarget, Promise.resolve(onOk(s))).then(function (r) { if (r && r.success) { s.close(); UI.toast(r.message || 'Tersimpan.'); refresh(); K.App && K.App.loadPub(true); } else if (r) fail(r); }); };
    return s;
  }
  function pkgForm(p) {
    p = p || { is_active: true };
    simpleSheet(p.package_id ? 'Ubah paket' : 'Paket baru', '<div class="stack">' + field('p-n', 'Nama paket', '<input class="in" id="p-n" maxlength="60" value="' + esc(p.package_name || '') + '">') +
      '<div class="grid-2">' + field('p-d', 'Durasi (jam)', '<input class="in" id="p-d" type="number" min="1" max="720" inputmode="numeric" value="' + esc(p.duration_hours || '') + '">') + field('p-p', 'Harga (Rp)', '<input class="in" id="p-p" type="number" min="0" inputmode="numeric" value="' + esc(p.price == null ? '' : p.price) + '">') + '</div>' +
      field('p-b', 'Label (opsional)', '<input class="in" id="p-b" maxlength="30" value="' + esc(p.badge_text || '') + '" placeholder="mis. Populer">') + sw('p-a', p.is_active, 'Tampil di halaman pemesanan') + '</div>',
      function () { return api('savePackage', { package_id: p.package_id || '', package_name: $('#p-n').value, duration_hours: $('#p-d').value, price: $('#p-p').value, badge_text: $('#p-b').value, is_active: $('#p-a').checked }); });
  }
  function gameForm(g) {
    g = g || {};
    var s = simpleSheet(g.game_id ? 'Ubah game' : 'Game baru', '<div class="stack">' + field('g-t', 'Judul', '<input class="in" id="g-t" maxlength="80" value="' + esc(g.title || '') + '">') + field('g-g', 'Genre', '<input class="in" id="g-g" maxlength="40" value="' + esc(g.genre || '') + '" placeholder="mis. Action/Open World">') +
      imageField('g-c', 'Cover (opsional)', g.cover_url, 'game') + sw('g-f', g.is_featured, 'Tandai unggulan') + '</div>',
      function () { return api('saveGame', { game_id: g.game_id || '', title: $('#g-t').value, genre: $('#g-g').value, cover_url: K.Art.norm($('#g-c').value.trim()), is_featured: $('#g-f').checked }); });
    bindImage(s.el, 'g-c');
  }

  /* ================================================================== PENGATURAN */
  // [kunci, label, jenis, khusus-superadmin, opsi]; jenis: text|area|image|color|yn|num
  var SET_GROUPS = [
    ['Identitas & tampilan', [['brand_name', 'Nama usaha', 'text'], ['brand_tagline', 'Slogan singkat (di bawah nama)', 'text'], ['logo_url', 'Logo (kosong = logo bawaan)', 'image', false, 'logo'], ['theme_primary', 'Warna utama (tombol & aksen)', 'color', false, '#0070d1'], ['theme_accent', 'Warna emas (label & promo)', 'color', false, '#f59e0b']]],
    ['Halaman depan', [['hero_title', 'Judul utama', 'text'], ['hero_subtitle', 'Sub judul', 'text'], ['hero_description', 'Deskripsi', 'area'], ['hero_banner_url', 'Gambar banner (opsional)', 'image', false, 'hero'], ['hero_cta_primary', 'Teks tombol utama', 'text'], ['hero_cta_secondary', 'Teks tombol kedua', 'text'], ['facilities_list', 'Kelengkapan (pisahkan dengan |)', 'area'], ['timeline_announcement', 'Pengumuman (kosong = tidak tampil)', 'area']]],
    ['Kontak, alamat & sosial', [['whatsapp_admin', 'Nomor WhatsApp admin (62...)', 'text'], ['instagram_username', 'Username Instagram (tanpa @)', 'text'], ['tiktok_username', 'Username TikTok (tanpa @)', 'text'], ['location_address', 'Alamat', 'text'], ['maps_link', 'Tautan Google Maps', 'text']]],
    ['Footer', [['footer_text', 'Teks footer kiri (kosong = otomatis)', 'text'], ['footer_right', 'Teks footer kanan', 'text']]],
    ['Akun pelanggan & loyalitas', [['member_enabled', 'Fitur akun pelanggan', 'yn'], ['loyalty_enabled', 'Voucher loyalitas', 'yn'], ['loyalty_target', 'Jumlah sewa untuk 1 voucher', 'num'], ['loyalty_window_days', 'Batas waktu mengumpulkan (hari)', 'num'], ['loyalty_reward_hours', 'Hadiah voucher (jam gratis)', 'num'], ['loyalty_valid_days', 'Voucher berlaku (hari)', 'num']]],
    ['Akses & sistem (Superadmin)', [['superadmin_email', 'Email superadmin (login & kode lupa password)', 'text', true], ['admin_emails', 'Email admin (pisahkan koma)', 'area', true], ['google_client_id', 'Google Client ID', 'text', true], ['timezone', 'Zona waktu (mis. Asia/Jayapura)', 'text', true]]]
  ];
  function setField(f, st, sup) {
    var lock = f[3] && !sup, v = st[f[0]] || '', id = 's-' + f[0], dis = lock ? ' disabled' : '', hint = lock ? 'Hanya Superadmin yang dapat mengubah ini.' : '';
    if (f[2] === 'image') return imageField(id, f[1], v, f[4] || 'hero');
    if (f[2] === 'yn') return field(id, f[1], '<select class="in" id="' + id + '" data-k="' + f[0] + '"' + dis + '><option value="YA"' + (v !== 'TIDAK' ? ' selected' : '') + '>Aktif</option><option value="TIDAK"' + (v === 'TIDAK' ? ' selected' : '') + '>Nonaktif</option></select>', hint);
    if (f[2] === 'num') return field(id, f[1], '<input class="in" id="' + id + '" data-k="' + f[0] + '" type="number" min="1" inputmode="numeric" value="' + esc(v) + '"' + dis + '>', hint);
    if (f[2] === 'color') return field(id, f[1], '<div class="row"><input type="color" class="in" id="' + id + '" data-k="' + f[0] + '" data-def="" data-color="' + esc(f[4]) + '" value="' + esc(/^#[0-9a-fA-F]{6}$/.test(v) ? v : f[4]) + '" style="width:64px;padding:4px;height:44px"' + dis + '><button type="button" class="btn xs ghost" data-act="color-reset" data-id="' + id + '">Kembali ke bawaan</button><span class="tiny muted">' + (v ? esc(v) : 'bawaan') + '</span></div>', hint);
    var inp = f[2] === 'area' ? '<textarea class="in" id="' + id + '" data-k="' + f[0] + '"' + dis + '>' + esc(v) + '</textarea>' : '<input class="in" id="' + id + '" data-k="' + f[0] + '" value="' + esc(v) + '"' + dis + '>';
    return field(id, f[1], inp, hint);
  }
  function vPengaturan(b) {
    var st = D.settings, sup = Auth.isSuper();
    HS = K.App.sections(st.home_sections || '[]').map(function (x) { return Object.assign({}, x); });
    b.innerHTML = '<form id="set-form" class="stack">' + SET_GROUPS.map(function (g) {
      return '<div class="card stack"><div class="card-title"><h3>' + g[0] + '</h3></div>' + g[1].map(function (f) { return setField(f, st, sup); }).join('') + '</div>';
    }).join('') + '<div class="card stack"><div class="card-title">' + ic('list') + '<h3>Susunan halaman depan</h3></div><p class="small muted">Atur urutan bagian, sembunyikan yang tidak perlu, dan ganti judulnya. Kolom kosong = teks bawaan. Isi tanda <b>-</b> pada deskripsi untuk menyembunyikannya.</p><div id="hs-list" class="stack"></div><input type="hidden" id="s-home_sections" data-k="home_sections"></div>' +
      '<div class="row"><button class="btn gold" type="submit">' + ic('check') + 'Simpan pengaturan</button></div></form>';
    SET_GROUPS.forEach(function (g) { g[1].forEach(function (f) { if (f[2] === 'image') { bindImage(b, 's-' + f[0]); $('#s-' + f[0], b).setAttribute('data-k', f[0]); } }); });
    $$('input[type=color]', b).forEach(function (c) { c.addEventListener('input', function () { c.setAttribute('data-touch', '1'); }); });
    drawHs();
  }
  function hsSync() {
    var h = $('#s-home_sections'); if (h) h.value = JSON.stringify(HS.map(function (x) { return { id: x.id, show: x.show, eyebrow: x.eyebrow, title: x.title, desc: x.desc }; }));
  }
  function drawHs() {
    var el = $('#hs-list'); if (!el) return; var def = K.App.SEC_DEF;
    el.innerHTML = HS.map(function (x, i) {
      var d = def[x.id];
      return '<div class="hs-row" data-i="' + i + '"><div class="row between wrap-r"><b>' + (i + 1) + '. ' + esc(d.label) + '</b><div class="row">' +
        '<button type="button" class="btn xs" data-act="hs-up" data-i="' + i + '" aria-label="Naikkan"' + (i === 0 ? ' disabled' : '') + '><span style="display:inline-flex;transform:rotate(180deg)">' + ic('chevD') + '</span></button>' +
        '<button type="button" class="btn xs" data-act="hs-down" data-i="' + i + '" aria-label="Turunkan"' + (i === HS.length - 1 ? ' disabled' : '') + '>' + ic('chevD') + '</button>' +
        '<label class="row" style="gap:8px;min-height:44px"><span class="small">Tampil</span><span class="switch"><input type="checkbox" data-hs="show" data-i="' + i + '"' + (x.show ? ' checked' : '') + '><i></i></span></label></div></div>' +
        '<div class="grid-2"><input class="in" data-hs="eyebrow" data-i="' + i + '" maxlength="40" value="' + esc(x.eyebrow) + '" placeholder="Label kecil: ' + esc(d.eyebrow) + '" aria-label="Label kecil ' + esc(d.label) + '"><input class="in" data-hs="title" data-i="' + i + '" maxlength="80" value="' + esc(x.title) + '" placeholder="Judul: ' + esc(d.title) + '" aria-label="Judul ' + esc(d.label) + '"></div>' +
        '<input class="in" data-hs="desc" data-i="' + i + '" maxlength="200" value="' + esc(x.desc) + '" placeholder="Deskripsi: ' + esc(d.desc || '(tanpa deskripsi)') + '" aria-label="Deskripsi ' + esc(d.label) + '"></div>';
    }).join('');
    hsSync();
  }
  function hsMove(i, dir) { var j = i + dir; if (j < 0 || j >= HS.length) return; var t = HS[i]; HS[i] = HS[j]; HS[j] = t; drawHs(); }

  /* ================================================================== PROMO & MEMBER */
  function loadMb(force) {
    if (MB && !force) return Promise.resolve();
    return api('memberAdmin').then(function (r) { if (r.success) { MB = r.data; if (tab === 'promo') render(); } else fail(r); });
  }
  var tglId = function (s) { return s ? String(s).slice(0, 10) : ''; };
  function promoText(p) { return (p.type === 'percent' ? p.value + '%' : rp(p.value)) + ' &middot; ' + (p.package_id ? esc((MB.packages.filter(function (x) { return x.package_id === p.package_id; })[0] || {}).package_name || p.package_id) : 'Semua paket'); }
  function vPromo(b) {
    if (!MB) { b.innerHTML = '<div class="empty">' + ic('loader', 'spin') + '<p>Memuat data member...</p></div>'; loadMb(); return; }
    var L = MB.loyalty, T = F.promoTab || 'promo', tabs = [['promo', 'Promo', 'tag'], ['member', 'Member (' + MB.members.length + ')', 'users'], ['voucher', 'Voucher', 'star']];
    var head = '<div class="tabs" role="tablist">' + tabs.map(function (t) { return '<button role="tab" aria-selected="' + (T === t[0]) + '" data-act="ptab" data-v="' + t[0] + '">' + ic(t[2]) + t[1] + '</button>'; }).join('') + '</div>';
    var body = '';
    if (T === 'promo') {
      body = '<div class="alert">' + ic('info') + '<div>Promo hanya berlaku untuk pelanggan yang <b>masuk akun</b>. Pelanggan tanpa akun membayar harga normal. Aturan loyalitas saat ini: ' + (L.enabled ? '<b>' + L.target + 'x sewa selesai</b> dalam ' + L.windowDays + ' hari = voucher <b>gratis ' + L.rewardHours + ' jam</b> (berlaku ' + L.validDays + ' hari). Ubah di menu Pengaturan.' : 'voucher loyalitas sedang nonaktif.') + '</div></div>' +
        '<div class="row between wrap-r"><h3>Promo diskon</h3><div class="row wrap-r"><button class="btn" data-act="promo-blast">' + ic('megaphone') + 'Kabari semua member</button><button class="btn primary" data-act="promo-new">' + ic('plus') + 'Promo baru</button></div></div><div class="list-card">' +
        (MB.promos.map(function (p) { return '<div class="item"><div class="main"><b>' + esc(p.title) + (p.is_active ? '' : ' <span class="badge bad">Nonaktif</span>') + (p.is_demo ? ' <span class="badge">Contoh</span>' : '') + '</b><span>Diskon ' + promoText(p) + ' &middot; ' + (p.start_at || p.end_at ? esc(tglId(p.start_at) || 'sekarang') + ' s.d. ' + esc(tglId(p.end_at) || 'tanpa batas') : 'Tanpa batas waktu') + '</span></div><div class="row"><button class="btn xs" data-act="promo-edit" data-id="' + esc(p.promo_id) + '" aria-label="Ubah promo">' + ic('pencil') + '</button><button class="btn xs danger" data-act="promo-del" data-id="' + esc(p.promo_id) + '" aria-label="Hapus promo">' + ic('trash') + '</button></div></div>'; }).join('') || UI.empty('tag', 'Belum ada promo. Buat promo pertama untuk menarik pelanggan mendaftar.')) + '</div>';
    } else if (T === 'member') {
      body = '<div class="filters"><input class="in" id="mb-q" type="search" placeholder="Cari nama atau nomor WA" value="' + esc(F.mbQ || '') + '" aria-label="Cari member"></div><div class="list-card" id="mb-list">' + mbRows() + '</div>';
    } else {
      body = '<div class="row between wrap-r"><h3>Voucher gratis sewa</h3><button class="btn primary" data-act="vc-new">' + ic('plus') + 'Beri voucher</button></div><div class="list-card">' +
        (MB.vouchers.map(function (v) { var m = MB.members.filter(function (x) { return x.customer_id === v.customer_id; })[0]; return '<div class="item"><div class="main"><b>' + esc(m ? m.name : v.customer_id) + ' &middot; ' + v.hours + ' jam gratis</b><span>' + esc(v.note || v.source) + ' &middot; berlaku s.d. ' + esc(tglId(v.expires_at)) + (v.used_booking_id ? ' &middot; dipakai di ' + esc(v.used_booking_id) : '') + '</span></div><div class="row wrap-r"><span class="badge ' + (v.status === 'Aktif' ? 'ok' : v.status === 'Dipakai' ? 'info' : 'bad') + '">' + esc(v.status) + '</span>' + (v.status === 'Aktif' ? '<button class="btn xs danger" data-act="vc-revoke" data-id="' + esc(v.voucher_id) + '">Cabut</button>' : '') + '</div></div>'; }).join('') || UI.empty('star', 'Belum ada voucher. Voucher terbit otomatis saat pelanggan menyelesaikan ' + L.target + 'x sewa.')) + '</div>';
    }
    b.innerHTML = '<div class="kpis"><div class="kpi"><div class="k">' + ic('users') + 'Member</div><div class="v">' + MB.members.length + '</div><div class="tiny muted">' + MB.members.filter(function (m) { return m.is_active; }).length + ' aktif</div></div><div class="kpi"><div class="k">' + ic('tag') + 'Promo aktif</div><div class="v">' + MB.promos.filter(function (p) { return p.is_active; }).length + '</div></div><div class="kpi"><div class="k">' + ic('star') + 'Voucher aktif</div><div class="v">' + MB.vouchers.filter(function (v) { return v.status === 'Aktif'; }).length + '</div></div></div>' +
      (MB.memberEnabled ? '' : '<div class="alert warn">' + ic('warn') + '<div>Fitur akun pelanggan sedang <b>dinonaktifkan</b> (Pengaturan &rarr; Akun pelanggan &amp; loyalitas).</div></div>') + head + '<div class="stack">' + body + '</div>';
  }
  function mbRows() {
    var q = (F.mbQ || '').toLowerCase(), list = MB.members.filter(function (m) { return !q || (m.name + ' ' + m.whatsapp_number).toLowerCase().indexOf(q) > -1; });
    return list.slice(0, 150).map(function (m) {
      return '<div class="item"><div class="main"><b>' + esc(m.name) + (m.is_active ? '' : ' <span class="badge bad">Nonaktif</span>') + '</b><span>' + esc(m.whatsapp_number) + ' &middot; ' + m.orders + ' sewa &middot; progres ' + m.progress + '/' + MB.loyalty.target + ' &middot; ' + m.voucher_aktif + ' voucher aktif</span><span class="tiny muted">Terakhir masuk: ' + (m.last_login ? esc(Time.fmt(m.last_login)) : 'belum pernah') + '</span></div><div class="row wrap-r"><button class="btn xs" data-act="mb-reset" data-id="' + esc(m.customer_id) + '">' + ic('key') + 'Reset sandi</button><button class="btn xs ' + (m.is_active ? 'danger' : '') + '" data-act="mb-toggle" data-id="' + esc(m.customer_id) + '">' + (m.is_active ? 'Nonaktifkan' : 'Aktifkan') + '</button></div></div>';
    }).join('') || UI.empty('users', 'Belum ada member terdaftar.');
  }
  function promoForm(p) {
    p = p || { type: 'percent', is_active: true };
    var pk = '<option value="">Semua paket</option>' + MB.packages.map(function (x) { return '<option value="' + esc(x.package_id) + '"' + (p.package_id === x.package_id ? ' selected' : '') + '>' + esc(x.package_name) + '</option>'; }).join('');
    simpleSheet(p.promo_id ? 'Ubah promo' : 'Promo baru', '<div class="stack">' + field('pr-t', 'Judul promo', '<input class="in" id="pr-t" maxlength="80" value="' + esc(p.title || '') + '" placeholder="mis. Diskon Akhir Pekan">') +
      field('pr-d', 'Keterangan singkat', '<input class="in" id="pr-d" maxlength="240" value="' + esc(p.description || '') + '">') +
      '<div class="grid-2">' + field('pr-y', 'Jenis diskon', '<select class="in" id="pr-y"><option value="percent"' + (p.type === 'percent' ? ' selected' : '') + '>Persen (%)</option><option value="nominal"' + (p.type === 'nominal' ? ' selected' : '') + '>Potongan rupiah</option></select>') + field('pr-v', 'Nilai', '<input class="in" id="pr-v" type="number" min="1" inputmode="numeric" value="' + esc(p.value || '') + '">') + '</div>' +
      field('pr-p', 'Berlaku untuk', '<select class="in" id="pr-p">' + pk + '</select>') +
      '<div class="grid-2">' + field('pr-a', 'Mulai (opsional)', '<input class="in" id="pr-a" type="date" value="' + esc(tglId(p.start_at)) + '">') + field('pr-b', 'Berakhir (opsional)', '<input class="in" id="pr-b" type="date" value="' + esc(tglId(p.end_at)) + '">') + '</div>' + sw('pr-x', p.is_active, 'Promo aktif') + '</div>',
      function () { return api('promoSave', { promo_id: p.promo_id || '', title: $('#pr-t').value, description: $('#pr-d').value, type: $('#pr-y').value, value: $('#pr-v').value, package_id: $('#pr-p').value, start_at: $('#pr-a').value, end_at: $('#pr-b').value, is_active: $('#pr-x').checked }).then(function (r) { if (r.success) loadMb(true); return r; }); });
  }
  function voucherForm() {
    var opt = MB.members.filter(function (m) { return m.is_active; }).map(function (m) { return '<option value="' + esc(m.customer_id) + '">' + esc(m.name) + ' (' + esc(m.whatsapp_number) + ')</option>'; }).join('');
    if (!opt) return UI.toast('Belum ada member aktif.', 'warn');
    simpleSheet('Beri voucher', '<div class="stack">' + field('vg-m', 'Member', '<select class="in" id="vg-m">' + opt + '</select>') + field('vg-h', 'Jam gratis', '<input class="in" id="vg-h" type="number" min="1" max="168" value="' + MB.loyalty.rewardHours + '">') + field('vg-n', 'Catatan (opsional)', '<input class="in" id="vg-n" maxlength="100" placeholder="mis. Hadiah ulang tahun">') + '</div>',
      function () { return api('voucherGrant', { customer_id: $('#vg-m').value, hours: $('#vg-h').value, note: $('#vg-n').value }).then(function (r) { if (r.success) loadMb(true); return r; }); });
  }
  function promoBlastForm() {
    var n = MB.members.filter(function (m) { return m.is_active; }).length;
    simpleSheet('Kabari member lewat WhatsApp', '<div class="stack"><div class="alert">' + ic('info') + '<div>Pesan dikirim ke <b>' + n + '</b> member aktif lewat antrean WhatsApp (perlu Fonnte aktif di menu Notifikasi). Pelanggan tanpa akun tidak dikirimi.</div></div>' + field('pb-j', 'Judul (internal)', '<input class="in" id="pb-j" maxlength="80" value="Promo member">') + field('pb-p', 'Isi pesan', '<textarea class="in" id="pb-p" maxlength="900" style="min-height:120px" placeholder="Halo {nama}, ada promo diskon 10% sampai Minggu. Masuk akun lalu pesan sekarang!"></textarea>', 'Gunakan {nama} untuk nama penerima.') + '</div>',
      function () { return api('promoBlast', { judul: $('#pb-j').value, pesan: $('#pb-p').value }); });
  }

  /* ================================================================== NOTIFIKASI */
  function loadNotif(force) {
    if (NC && !force) return Promise.resolve();
    return api('notifConfig').then(function (r) { if (r.success) { NC = r.data; if (tab === 'notifikasi') render(); } else fail(r); });
  }
  function vNotif(b) {
    if (!NC) { b.innerHTML = '<div class="empty">' + ic('loader', 'spin') + '<p>Memuat konfigurasi...</p></div>'; loadNotif(); return; }
    var T = [['konfigurasi', 'Konfigurasi', 'settings'], ['event', 'Event & pesan', 'chat'], ['antrean', 'Antrean', 'list'], ['blast', 'Blast WA', 'megaphone']];
    b.innerHTML = '<div class="tabs" role="tablist">' + T.map(function (t) { return '<button role="tab" aria-selected="' + (F.notifTab === t[0]) + '" data-act="ntab" data-v="' + t[0] + '">' + ic(t[2]) + t[1] + '</button>'; }).join('') + '</div><div id="n-body" class="stack"></div>';
    var nb = $('#n-body'); ({ konfigurasi: nKonfig, event: nEvent, antrean: nAntrean, blast: nBlast }[F.notifTab])(nb);
  }
  function nKonfig(b) {
    var sup = Auth.isSuper(), dis = sup ? '' : ' disabled';
    b.innerHTML = (sup ? '' : '<div class="alert">' + ic('info') + '<div>Konfigurasi dikelola Superadmin. Anda masih bisa melihat antrean dan mengirim blast.</div></div>') +
      '<form id="nc-form" class="card stack"><div class="card-title">' + ic('whatsapp') + '<h3>WhatsApp (Fonnte)</h3></div>' + sw('nc-wa', NC.waAktif, 'Aktifkan notifikasi WhatsApp', dis) +
      field('nc-t', 'Token Fonnte', '<input class="in" id="nc-t" type="password" autocomplete="off" placeholder="' + (NC.tokenAda ? 'Tersimpan: ' + esc(NC.tokenMask) + ' (kosongkan bila tidak diubah)' : 'Tempel token dari dashboard Fonnte') + '"' + dis + '>', 'Token disimpan di server (Script Properties), tidak pernah dikirim ke browser.') +
      '<div class="grid-2">' + field('nc-b', 'Ukuran batch blast', '<select class="in" id="nc-b"' + dis + '>' + [10, 20, 50].map(function (x) { return '<option' + (x === NC.batchDefault ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>') +
      field('nc-j', 'Jeda antar pesan (detik)', '<input class="in" id="nc-j" value="' + esc(NC.jeda) + '"' + dis + '>', 'Angka tunggal (5) atau acak (3-8).') + '</div>' + sw('nc-d', NC.deteksiOtomatis, 'Cek otomatis apakah nomor terdaftar WhatsApp', dis) +
      '<hr style="border:0;border-top:1px solid var(--line)"><div class="card-title">' + ic('mail') + '<h3>Email</h3></div>' + sw('nc-em', NC.emailAktif, 'Aktifkan notifikasi email (sisa kuota hari ini: ' + NC.emailKuota + ')', dis) +
      '<div class="grid-2">' + field('nc-n', 'Nama pengirim', '<input class="in" id="nc-n" value="' + esc(NC.namaPengirim) + '"' + dis + '>') + field('nc-u', 'Alamat aplikasi (untuk {link})', '<input class="in" id="nc-u" value="' + esc(NC.appUrl) + '" placeholder="https://username.github.io/repo/"' + dis + '>') + '</div>' +
      (sup ? '<div class="row wrap-r"><button class="btn gold" type="submit">' + ic('check') + 'Simpan konfigurasi</button></div>' : '') + '<p class="tiny muted">Pengirim pesan berjalan otomatis tiap menit: ' + (NC.triggerAktif ? '<b style="color:var(--ok)">aktif</b>' : '<b style="color:var(--bad)">belum terpasang</b> (aktif otomatis saat WhatsApp/email dinyalakan atau jalankan <span class="code">pasangTrigger</span>)') + '.</p></form>' +
      (sup ? '<div class="card stack"><div class="card-title">' + ic('zap') + '<h3>Uji koneksi</h3></div><div class="row wrap-r"><button class="btn" data-act="wa-device">' + ic('phone') + 'Cek perangkat Fonnte</button></div><div id="wa-dev" class="small muted"></div>' +
        '<div class="grid-2">' + field('t-wa', 'Kirim WA tes ke', '<div class="row"><input class="in" id="t-wa" placeholder="0857..." inputmode="tel"><button class="btn" data-act="wa-test">Kirim</button></div>') + field('t-em', 'Kirim email tes ke', '<div class="row"><input class="in" id="t-em" type="email" placeholder="nama@email.com"><button class="btn" data-act="em-test">Kirim</button></div>') + '</div></div>' : '');
  }
  function nEvent(b) {
    var sup = Auth.isSuper();
    b.innerHTML = '<div class="alert">' + ic('info') + '<div>Variabel yang bisa dipakai: ' + NC.variabel.map(function (v) { return '<span class="code">{' + v + '}</span>'; }).join(' ') + '</div></div><form id="ne-form" class="stack">' +
      NC.events.map(function (e) {
        return '<div class="tpl-ed" data-ev="' + esc(e.kode) + '"><div class="row between wrap-r"><b>' + esc(e.label) + '</b><div class="row">' + sw('e-wa-' + e.kode, e.wa, 'WA', sup ? '' : ' disabled') + sw('e-em-' + e.kode, e.email, 'Email', sup ? '' : ' disabled') + '</div></div>' +
          '<input class="in" id="e-sj-' + e.kode + '" value="' + esc(e.subjek) + '" aria-label="Subjek email ' + esc(e.label) + '" placeholder="Subjek email"' + (sup ? '' : ' disabled') + '><textarea class="in" id="e-ps-' + e.kode + '" aria-label="Pesan ' + esc(e.label) + '" style="min-height:96px"' + (sup ? '' : ' disabled') + '>' + esc(e.pesan) + '</textarea>' +
          (sup ? '<button type="button" class="btn xs ghost" data-act="ev-reset" data-id="' + esc(e.kode) + '" style="width:fit-content">Kembalikan ke bawaan</button>' : '') + '</div>';
      }).join('') + (sup ? '<div class="row"><button class="btn gold" type="submit">' + ic('check') + 'Simpan semua</button></div>' : '') + '</form>';
  }
  function nAntrean(b) {
    b.innerHTML = '<div class="empty">' + ic('loader', 'spin') + '</div>';
    api('notifQueue', {}).then(function (r) {
      if (!r.success) return fail(r); var s = r.data.ringkas;
      b.innerHTML = '<div class="kpis"><div class="kpi"><div class="k">Antri</div><div class="v">' + s.Antri + '</div></div><div class="kpi"><div class="k">Terkirim</div><div class="v">' + s.Terkirim + '</div></div><div class="kpi"><div class="k">Gagal</div><div class="v">' + s.Gagal + '</div></div><div class="kpi"><div class="k">Batal</div><div class="v">' + s.Batal + '</div></div></div>' +
        '<div class="row wrap-r"><button class="btn primary" data-act="q-now">' + ic('send') + 'Proses sekarang</button><button class="btn" data-act="q-retry">' + ic('rotate') + 'Ulangi yang gagal</button><button class="btn ghost" data-act="q-reload">' + ic('refresh') + 'Segarkan</button></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Kanal</th><th>Tujuan</th><th>Event</th><th>Status</th><th>Respons</th></tr></thead><tbody>' +
        (r.data.rows.map(function (x) { return '<tr><td>' + esc(Time.fmt(x.dibuat)) + '</td><td>' + esc(x.kanal) + '</td><td>' + esc(x.nama || x.tujuan) + '<div class="tiny muted">' + esc(x.tujuan) + '</div></td><td>' + esc(x.event) + '</td><td><span class="badge ' + (x.status === 'Terkirim' ? 'ok' : x.status === 'Gagal' ? 'bad' : x.status === 'Antri' ? 'warn' : '') + '">' + esc(x.status) + '</span></td><td class="small muted">' + esc(x.respon) + '</td></tr>'; }).join('') || '<tr><td colspan="6" class="center muted">Antrean kosong.</td></tr>') + '</tbody></table></div>';
    });
  }
  function nBlast(b) {
    var segs = SEGMEN.map(function (s) { return '<option>' + s + '</option>'; }).join('');
    b.innerHTML = '<div class="card stack"><div class="card-title">' + ic('megaphone') + '<h3>Blast baru</h3></div>' +
      '<div class="grid-2">' + field('b-sum', 'Sasaran', '<select class="in" id="b-sum"><option value="crm">Kontak (CRM)</option><option value="manual">Tempel nomor manual</option></select>') + field('b-seg', 'Segmen', '<select class="in" id="b-seg"><option value="">Semua segmen</option>' + segs + '</select>') + '</div>' +
      '<div class="grid-2">' + field('b-wa', 'Status WhatsApp', '<select class="in" id="b-wa"><option value="">Semua</option><option>Terdaftar</option><option>Tidak Terdaftar</option><option value="Belum">Belum dicek</option></select>') + field('b-tag', 'Tag (opsional)', '<input class="in" id="b-tag">') + '</div>' +
      '<div id="b-man" hidden>' + field('b-mtxt', 'Satu baris per penerima: nomor|nama', '<textarea class="in" id="b-mtxt" style="min-height:90px" placeholder="0857xxxxxxx|Budi"></textarea>') + '</div>' +
      '<div class="row wrap-r"><button class="btn" data-act="b-aud">' + ic('users') + 'Hitung penerima</button><button class="btn" data-act="b-chk">' + ic('checkCircle') + 'Cek nomor terdaftar WA</button></div><div id="b-ring" class="small muted"></div>' +
      field('b-judul', 'Judul (internal)', '<input class="in" id="b-judul" maxlength="80">') + field('b-pesan', 'Isi pesan', '<textarea class="in" id="b-pesan" style="min-height:110px" maxlength="900" placeholder="Halo {nama}, ..."></textarea>', 'Gunakan {nama} dan {brand}. Kontak yang opt-out otomatis dilewati.') +
      '<div class="grid-2">' + field('b-bat', 'Ukuran batch', '<select class="in" id="b-bat">' + [10, 20, 50].map(function (x) { return '<option' + (x === (NC && NC.batchDefault) ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>') + field('b-jed', 'Jeda (detik)', '<input class="in" id="b-jed" value="' + esc(NC ? NC.jeda : '5') + '">') + '</div>' +
      '<button class="btn gold" data-act="b-create">' + ic('send') + 'Buat blast</button></div><div class="card"><div class="card-title">' + ic('list') + '<h3>Riwayat blast</h3></div><div id="b-list" class="list-card"></div></div>';
    $('#b-sum').addEventListener('change', function () { $('#b-man').hidden = this.value !== 'manual'; });
    blastList();
  }
  function blastList() {
    api('waBlastList').then(function (r) {
      var el = $('#b-list'); if (!el) return; if (!r.success) return fail(r);
      el.innerHTML = r.data.map(function (x) {
        return '<div class="item" style="align-items:flex-start;flex-wrap:wrap"><div class="main" style="min-width:200px"><b>' + esc(x.judul) + '</b><span>' + esc(Time.fmt(x.tanggal)) + ' &middot; ' + x.terkirim + ' terkirim, ' + x.gagal + ' gagal, ' + x.sisa + ' sisa &middot; batch ' + x.batch + '</span><div class="pbar" style="margin-top:8px"><i style="width:' + x.persen + '%"></i></div></div><div class="row wrap-r"><span class="badge ' + (x.status === 'Selesai' ? 'ok' : x.status === 'Berjalan' ? 'info' : '') + '">' + esc(x.status) + '</span>' +
          (x.status === 'Berjalan' ? '<button class="btn xs primary" data-act="b-next" data-id="' + esc(x.id) + '">Kirim batch berikutnya</button><button class="btn xs danger" data-act="b-stop" data-id="' + esc(x.id) + '">Hentikan</button>' : '') + '</div></div>';
      }).join('') || UI.empty('megaphone', 'Belum ada blast.');
    });
  }
  function audParams() { return { sumber: $('#b-sum').value, segmen: $('#b-seg').value, statusWA: $('#b-wa').value, tag: $('#b-tag').value.trim(), manual: $('#b-mtxt').value }; }

  /* ================================================================== KONTAK (CRM) */
  function loadCrm(force) {
    var d = { cari: F.crmQ, segmen: F.crmSeg, statusWA: F.crmWa, limit: 300 };
    return Promise.all([api('crmList', d), api('crmStats', {})]).then(function (a) { if (!a[0].success) return fail(a[0]); crm = { list: a[0].data, stats: a[1].success ? a[1].data : null }; if (tab === 'kontak') drawCrm(); });
  }
  function vKontak(b) {
    b.innerHTML = '<div id="crm-stats"></div><div class="filters"><input class="in" id="crm-q" type="search" placeholder="Cari nama, nomor, atau email" value="' + esc(F.crmQ) + '" aria-label="Cari kontak"><select class="in" id="crm-seg" style="max-width:170px" aria-label="Segmen"><option value="">Semua segmen</option>' + opts(SEGMEN, F.crmSeg) + '</select><select class="in" id="crm-wa" style="max-width:190px" aria-label="Status WhatsApp"><option value="">Semua status WA</option><option' + (F.crmWa === 'Terdaftar' ? ' selected' : '') + '>Terdaftar</option><option' + (F.crmWa === 'Tidak Terdaftar' ? ' selected' : '') + '>Tidak Terdaftar</option><option value="Belum"' + (F.crmWa === 'Belum' ? ' selected' : '') + '>Belum dicek</option></select></div>' +
      '<div class="row wrap-r mb"><button class="btn primary" data-act="crm-new">' + ic('plus') + 'Kontak baru</button><button class="btn" data-act="crm-sync">' + ic('refresh') + 'Sinkron dari pesanan</button><button class="btn" data-act="crm-import">' + ic('upload') + 'Impor CSV</button>' + (Auth.isSuper() ? '<button class="btn" data-act="crm-export">' + ic('download') + 'Ekspor CSV</button>' : '') + '</div><div id="crm-bulk"></div><div id="crm-list" class="list-card"></div>';
    if (!crm) { $('#crm-list').innerHTML = '<div class="empty">' + ic('loader', 'spin') + '</div>'; loadCrm(); } else drawCrm();
  }
  function drawCrm() {
    var st = crm.stats, el = $('#crm-list'); if (!el) return;
    $('#crm-stats').innerHTML = st ? '<div class="kpis" style="margin-bottom:14px"><div class="kpi"><div class="k">Total kontak</div><div class="v">' + st.total + '</div></div><div class="kpi"><div class="k">Terdaftar WA</div><div class="v">' + st.terdaftarWA + '</div><div class="tiny muted">' + st.belumDicek + ' belum dicek</div></div><div class="kpi"><div class="k">Punya email</div><div class="v">' + st.adaEmail + '</div></div><div class="kpi"><div class="k">Opt-out</div><div class="v">' + st.optOut + '</div></div></div>' : '';
    var sel = Object.keys(F.crmSel).length;
    $('#crm-bulk').innerHTML = sel ? '<div class="card row wrap-r mb"><b>' + sel + ' dipilih</b><button class="btn xs" data-act="bulk" data-v="tag_tambah">+ Tag</button><button class="btn xs" data-act="bulk" data-v="tag_hapus">- Tag</button><button class="btn xs" data-act="bulk" data-v="segmen">Ubah segmen</button><button class="btn xs" data-act="bulk" data-v="optout">Opt-out</button><button class="btn xs" data-act="bulk" data-v="optin">Opt-in</button><button class="btn xs danger" data-act="bulk" data-v="hapus">Hapus</button>' + (sel === 2 ? '<button class="btn xs" data-act="crm-merge">Gabungkan</button>' : '') + '<button class="btn xs ghost" data-act="bulk-clear">Batal pilih</button></div>' : '';
    el.innerHTML = crm.list.rows.map(function (k) {
      return '<div class="item"><input type="checkbox" data-act="crm-sel" data-id="' + esc(k.id) + '"' + (F.crmSel[k.id] ? ' checked' : '') + ' aria-label="Pilih ' + esc(k.nama) + '" style="width:20px;height:20px"><button class="main" style="text-align:left;background:none;border:0;color:inherit;min-width:0" data-act="crm-open" data-id="' + esc(k.id) + '"><b>' + esc(k.nama) + '</b><span>' + esc(k.hp) + (k.email ? ' &middot; ' + esc(k.email) : '') + '</span></button><div class="row wrap-r" style="justify-content:flex-end"><span class="badge">' + esc(k.segmen) + '</span>' + (k.statusWA ? '<span class="badge ' + (k.statusWA === 'Terdaftar' ? 'ok' : 'bad') + '">' + esc(k.statusWA) + '</span>' : '') + (k.optOut ? '<span class="badge bad">Opt-out</span>' : '') + '</div></div>';
    }).join('') || UI.empty('contact', 'Belum ada kontak. Gunakan Sinkron dari pesanan atau Impor CSV.');
    if (crm.list.total > crm.list.rows.length) el.insertAdjacentHTML('beforeend', '<p class="small muted center">Menampilkan ' + crm.list.rows.length + ' dari ' + crm.list.total + '. Gunakan pencarian.</p>');
  }
  function crmForm(k) {
    k = k || {};
    simpleSheet(k.id ? 'Ubah kontak' : 'Kontak baru', '<div class="stack">' + field('k-n', 'Nama', '<input class="in" id="k-n" maxlength="60" value="' + esc(k.nama || '') + '">') + '<div class="grid-2">' + field('k-h', 'Nomor WhatsApp', '<input class="in" id="k-h" inputmode="tel" value="' + esc(k.hp || '') + '">') + field('k-e', 'Email', '<input class="in" id="k-e" type="email" value="' + esc(k.email || '') + '">') + '</div>' +
      '<div class="grid-2">' + field('k-s', 'Segmen', '<select class="in" id="k-s">' + opts(SEGMEN, k.segmen || 'Prospek') + '</select>') + field('k-t', 'Tag (pisahkan koma)', '<input class="in" id="k-t" value="' + esc(k.tag || '') + '">') + '</div>' +
      field('k-c', 'Catatan', '<textarea class="in" id="k-c" maxlength="300">' + esc(k.catatan || '') + '</textarea>') + sw('k-o', k.optOut, 'Opt-out (jangan dihubungi lewat blast)') + '</div>',
      function () { return api('crmSave', { id: k.id || '', nama: $('#k-n').value, hp: $('#k-h').value, email: $('#k-e').value, segmen: $('#k-s').value, tag: $('#k-t').value, catatan: $('#k-c').value, optOut: $('#k-o').checked }).then(function (r) { if (r.success) { crm = null; loadCrm(); } return r; }); });
  }
  function crmDetail(id) {
    var s = UI.sheet({ title: 'Kontak', wide: true, foot: false, body: '<div class="empty">' + ic('loader', 'spin') + '</div>' });
    api('crmDetail', { id: id }).then(function (r) {
      if (!r.success) { s.close(); return fail(r); } var k = r.data.kontak;
      s.body.innerHTML = '<div class="row between wrap-r"><div><h3 style="margin:0">' + esc(k.nama) + '</h3><div class="muted small">' + esc(k.hp) + (k.email ? ' &middot; ' + esc(k.email) : '') + '</div></div><div class="row wrap-r"><a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/' + hp62(k.hp) + '">' + ic('whatsapp') + 'Chat</a><button class="btn sm" data-ed>' + ic('pencil') + 'Ubah</button></div></div>' +
        '<div class="row wrap-r mt"><span class="badge">' + esc(k.segmen) + '</span>' + (k.statusWA ? '<span class="badge ' + (k.statusWA === 'Terdaftar' ? 'ok' : 'bad') + '">' + esc(k.statusWA) + '</span>' : '') + (k.optOut ? '<span class="badge bad">Opt-out</span>' : '') + (k.tag ? k.tag.split(/\s*,\s*/).map(function (t) { return '<span class="badge info">' + esc(t) + '</span>'; }).join('') : '') + '</div>' +
        (k.catatan ? '<p class="small" style="margin-top:10px">' + esc(k.catatan) + '</p>' : '') +
        '<h4 style="margin:18px 0 8px">Riwayat sewa</h4><div class="list-card">' + (r.data.sewa.map(function (x) { return '<div class="item"><div class="main"><b>' + esc(x.id) + '</b><span>' + esc(x.paket) + ' &middot; ' + esc(Time.fmt(x.mulai)) + ' &middot; ' + rp(x.total) + '</span></div>' + UI.badge(x.status) + '</div>'; }).join('') || '<p class="small muted">Belum ada sewa.</p>') + '</div>' +
        '<h4 style="margin:18px 0 8px">Interaksi</h4><form id="ix-form" class="row wrap-r"><select class="in" id="ix-k" style="max-width:130px" aria-label="Kanal">' + ['WA', 'Email', 'Telepon', 'Tatap Muka', 'Lainnya'].map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select><input class="in grow" id="ix-r" placeholder="Catat interaksi..." maxlength="300" style="min-width:160px"><button class="btn primary" type="submit">Catat</button></form>' +
        '<div class="list-card" style="margin-top:10px">' + (r.data.interaksi.map(function (x) { return '<div class="item"><div class="main"><b>' + esc(x.kanal) + ' &middot; ' + esc(x.arah) + '</b><span>' + esc(x.ringkasan) + ' &middot; ' + esc(Time.fmt(x.tanggal)) + '</span></div></div>'; }).join('') || '<p class="small muted">Belum ada catatan.</p>') + '</div>';
      $('[data-ed]', s.body).onclick = function () { s.close(); crmForm(k); };
      $('#ix-form', s.body).onsubmit = function (e) { e.preventDefault(); api('crmInteraksi', { kontakId: id, kanal: $('#ix-k').value, ringkasan: $('#ix-r').value, arah: 'Keluar' }).then(function (x) { if (!x.success) return fail(x); UI.toast(x.message); s.close(); crmDetail(id); }); };
    });
  }
  function csvImportSheet() {
    var parsed = [];
    var s = UI.sheet({ title: 'Impor kontak dari CSV', wide: true, body: '<div class="stack"><p class="small muted">Kolom yang dikenali: <span class="code">nama</span>, <span class="code">hp</span> (atau wa/telepon), <span class="code">email</span>, <span class="code">tag</span>, <span class="code">segmen</span>. Baris pertama harus judul kolom. Nomor yang sudah ada tidak digandakan.</p><div class="row wrap-r"><input type="file" accept=".csv,text/csv,text/plain" id="ci-f" class="in"><button class="btn xs ghost" data-tpl>Unduh contoh</button></div><div id="ci-r" class="small"></div></div>' });
    s.foot.innerHTML = '<button class="btn ghost" data-no>Tutup</button><button class="btn" data-pv disabled>Pratinjau</button><button class="btn primary" data-ok disabled>Impor</button>';
    var map = function () { return parsed.map(function (o) { return { nama: pickCol(o, ['nama', 'name']), hp: pickCol(o, ['hp', 'wa', 'whatsapp', 'nowa', 'nohp', 'telepon', 'phone', 'nomor']), email: pickCol(o, ['email']), tag: pickCol(o, ['tag']), segmen: pickCol(o, ['segmen']) }; }); };
    $('#ci-f', s.el).onchange = function (e) { var f = e.target.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { parsed = csvParse(rd.result); $('#ci-r', s.el).textContent = parsed.length + ' baris terbaca.'; $('[data-pv]', s.foot).disabled = $('[data-ok]', s.foot).disabled = !parsed.length; }; rd.readAsText(f); };
    $('[data-tpl]', s.el).onclick = function () { var a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('nama,hp,email,tag,segmen\nBudi,085750686582,budi@email.com,kost,Prospek\n'); a.download = 'contoh-kontak.csv'; a.click(); };
    $('[data-no]', s.foot).onclick = function () { s.close(); };
    var go = function (dry, btn) { UI.busy(btn, api('crmImport', { rows: map(), dryRun: dry })).then(function (r) { if (!r.success) return fail(r); var d = r.data; $('#ci-r', s.el).innerHTML = '<div class="alert ok">' + ic('checkCircle') + '<div>' + (dry ? 'Pratinjau: ' : 'Selesai: ') + '<b>' + d.ditambah + '</b> ditambah, <b>' + d.diperbarui + '</b> diperbarui, <b>' + d.dilewati + '</b> dilewati, <b>' + d.tidakValid + '</b> tidak valid.</div></div>'; if (!dry) { crm = null; loadCrm(); } }); };
    $('[data-pv]', s.foot).onclick = function (e) { go(true, e.currentTarget); };
    $('[data-ok]', s.foot).onclick = function (e) { go(false, e.currentTarget); };
  }

  /* ================================================================== SISTEM */
  var demo = null;
  function vSistem(b) {
    if (!Auth.isSuper()) { b.innerHTML = UI.empty('lock', 'Menu ini khusus Superadmin.'); return; }
    var d = (D && D.demo) || demo || { total: 0, bookings: 0, units: 0, games: 0, settings: 0 };
    b.innerHTML = '<div class="card stack"><div class="card-title">' + ic('database') + '<h3>Data contoh</h3></div><p class="small muted">Saat ini ada <b>' + d.total + '</b> baris contoh (' + d.bookings + ' pesanan, ' + d.units + ' unit, ' + d.games + ' game, ' + d.settings + ' pengaturan). Data asli tidak pernah tersentuh.</p>' +
      '<div class="row wrap-r"><button class="btn" data-act="demo-reset">' + ic('rotate') + 'Muat ulang data contoh</button><button class="btn danger" data-act="demo-clear">' + ic('trash') + 'Hapus semua data contoh</button></div></div>' +
      '<div class="card stack"><div class="card-title">' + ic('history') + '<h3>Migrasi dari spreadsheet lama</h3></div><p class="small muted">Spreadsheet lama hanya dibaca, tidak diubah. Aman diulang (tidak menggandakan). Gunakan akun Google yang sama.</p>' +
      field('m-src', 'Alamat atau ID spreadsheet lama', '<input class="in" id="m-src" placeholder="https://docs.google.com/spreadsheets/d/...">') +
      '<div class="chips" id="m-sheets">' + ['Units', 'Packages', 'Games', 'Settings', 'Bookings'].map(function (x) { return '<label class="chip" style="cursor:pointer"><input type="checkbox" value="' + x + '" checked style="margin-right:6px">' + x + '</label>'; }).join('') + '</div>' + sw('m-timpa', false, 'Timpa data yang sudah ada') +
      '<div class="row wrap-r"><button class="btn" data-act="mig-scan">' + ic('search') + 'Pindai (tanpa menulis)</button><button class="btn primary" data-act="mig-run">' + ic('download') + 'Jalankan impor</button></div><div id="m-res"></div>' +
      '<hr style="border:0;border-top:1px solid var(--line)"><div class="grid-2">' + field('mc-t', 'Impor dari CSV: jenis data', '<select class="in" id="mc-t"><option>Bookings</option><option>Units</option><option>Packages</option><option>Games</option><option>Settings</option></select>') + field('mc-f', 'Berkas CSV', '<input class="in" type="file" id="mc-f" accept=".csv,text/csv">') + '</div><div class="row wrap-r"><button class="btn" data-act="mig-csv" data-dry="1">Pratinjau CSV</button><button class="btn primary" data-act="mig-csv">Impor CSV</button></div></div>' +
      '<div class="card stack"><div class="card-title">' + ic('key') + '<h3>Keamanan</h3></div><div class="row wrap-r"><button class="btn" data-act="pw">' + ic('key') + 'Ganti password Superadmin</button></div>' +
      '<div class="alert">' + ic('info') + '<div>Lupa password? Buka editor Apps Script, jalankan <span class="code">resetSuperadminPassword</span>, lalu baca password sementara di <i>Eksekusi &rarr; Log</i>. Fungsi reset sengaja tidak tersedia lewat internet.</div></div></div>';
  }
  function migReport(r) {
    var d = r.data, rows = Object.keys(d.report).map(function (n) { var x = d.report[n]; return '<tr><td>' + esc(n) + '</td><td>' + x.source + '</td><td>' + x.inserted + '</td><td>' + x.updated + '</td><td>' + x.skipped + '</td></tr>'; }).join('');
    return '<div class="alert ' + (d.dryRun ? '' : 'ok') + '">' + ic(d.dryRun ? 'info' : 'checkCircle') + '<div>' + esc(r.message) + '</div></div><div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>Data</th><th>Di sumber</th><th>Ditambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (d.warnings && d.warnings.length ? '<div class="alert warn mt">' + ic('warn') + '<ul style="padding-left:18px">' + d.warnings.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '');
  }

  /* ================================================================== AKSI (delegasi klik) */
  var ACT = {
    forgot: function () { forgotView(); },
    'back-login': function () { loginView(); },
    reload: function (el) { load(true); if (tab === 'notifikasi') loadNotif(true); if (tab === 'kontak') { crm = null; loadCrm(); } if (tab === 'promo') loadMb(true); },
    logout: function () { api('logout').then(function () { }); Auth.clear(); Store.clearUser('c:u:'); D = null; built = false; NC = null; crm = null; MB = null; HS = null; files = {}; UI.toast('Anda sudah keluar.'); render(); },
    order: function (el) { orderSheet(el.getAttribute('data-id')); },
    fstatus: function (el) { F.status = el.getAttribute('data-v'); render(); },
    'unit-new': function () { unitForm(); },
    'unit-edit': function (el) { unitForm(D.units.filter(function (u) { return u.unit_id === el.getAttribute('data-id'); })[0]); },
    'unit-status': function (el) { unitStatusForm(D.units.filter(function (u) { return u.unit_id === el.getAttribute('data-id'); })[0]); },
    'unit-del': function (el) { var id = el.getAttribute('data-id'); UI.confirm({ title: 'Hapus unit?', message: 'Unit ' + id + ' dihapus dari katalog. Unit yang masih punya pesanan aktif tidak bisa dihapus.', ok: 'Hapus', danger: true }).then(function (y) { if (y) api('deleteUnit', { unit_id: id }).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); refresh(); K.App && K.App.loadPub(true); }); }); },
    ktab: function (el) { F.katalogTab = el.getAttribute('data-v'); render(); },
    'pkg-new': function () { pkgForm(); },
    'pkg-edit': function (el) { pkgForm(D.packages.filter(function (p) { return p.package_id === el.getAttribute('data-id'); })[0]); },
    'pkg-del': function (el) { var id = el.getAttribute('data-id'); UI.confirm({ title: 'Hapus paket?', message: 'Paket ' + id + ' dihapus. Pesanan lama tetap menyimpan nama paketnya.', ok: 'Hapus', danger: true }).then(function (y) { if (y) api('deletePackage', { package_id: id }).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); refresh(); K.App && K.App.loadPub(true); }); }); },
    'game-new': function () { gameForm(); },
    'game-edit': function (el) { gameForm(D.games.filter(function (g) { return g.game_id === el.getAttribute('data-id'); })[0]); },
    'game-del': function (el) { var id = el.getAttribute('data-id'); UI.confirm({ title: 'Hapus game?', message: 'Game dihapus dari daftar.', ok: 'Hapus', danger: true }).then(function (y) { if (y) api('deleteGame', { game_id: id }).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); refresh(); K.App && K.App.loadPub(true); }); }); },
    ptab: function (el) { F.promoTab = el.getAttribute('data-v'); render(); },
    'promo-new': function () { promoForm(); },
    'promo-edit': function (el) { promoForm(MB.promos.filter(function (p) { return p.promo_id === el.getAttribute('data-id'); })[0]); },
    'promo-del': function (el) { var id = el.getAttribute('data-id'); UI.confirm({ title: 'Hapus promo?', message: 'Promo ini tidak lagi tampil. Pesanan lama tetap menyimpan diskonnya.', ok: 'Hapus', danger: true }).then(function (y) { if (y) api('promoDelete', { promo_id: id }).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); loadMb(true); K.App && K.App.loadPub(true); }); }); },
    'promo-blast': function () { promoBlastForm(); },
    'vc-new': function () { voucherForm(); },
    'vc-revoke': function (el) { var id = el.getAttribute('data-id'); UI.confirm({ title: 'Cabut voucher?', message: 'Voucher tidak bisa dipakai lagi oleh pelanggan.', ok: 'Cabut', danger: true }).then(function (y) { if (y) api('voucherRevoke', { voucher_id: id }).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); loadMb(true); }); }); },
    'mb-toggle': function (el) { var id = el.getAttribute('data-id'); UI.busy(el, api('memberToggle', { customer_id: id })).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); loadMb(true); }); },
    'mb-reset': function (el) {
      var id = el.getAttribute('data-id'), m = MB.members.filter(function (x) { return x.customer_id === id; })[0];
      UI.confirm({ title: 'Reset sandi ' + (m ? m.name : '') + '?', message: 'Sandi lama tidak berlaku lagi. Sandi sementara akan tampil sekali di layar ini.', ok: 'Buat sandi sementara' }).then(function (y) {
        if (!y) return; api('memberResetPassword', { customer_id: id }).then(function (r) {
          if (!r.success) return fail(r);
          var s = UI.sheet({ title: 'Sandi sementara', body: '<div class="stack"><p class="small">Kirimkan ke <b>' + esc(m ? m.name : '') + '</b> lalu minta ia menggantinya setelah masuk. Sandi ini <b>tidak disimpan</b> dan tidak akan tampil lagi.</p><div class="card center"><span class="code" style="font-size:1.4rem;letter-spacing:.06em" id="tmp-pw">' + esc(r.data.password) + '</span></div></div>', foot: false });
          s.foot && (s.foot.innerHTML = '');
        });
      });
    },
    'hs-up': function (el) { hsMove(Number(el.getAttribute('data-i')), -1); },
    'hs-down': function (el) { hsMove(Number(el.getAttribute('data-i')), 1); },
    'color-reset': function (el) { var c = $('#' + el.getAttribute('data-id')); if (!c) return; c.value = c.getAttribute('data-color'); c.setAttribute('data-touch', '2'); },
    ntab: function (el) { F.notifTab = el.getAttribute('data-v'); render(); },
    'wa-device': function (el) { UI.busy(el, api('waDevice')).then(function (r) { $('#wa-dev').innerHTML = r.success ? 'Perangkat <b>' + esc(r.data.device) + '</b> &middot; ' + esc(r.data.status) + ' &middot; paket ' + esc(r.data.paket) + ' &middot; kuota ' + esc(r.data.kuota) + ' &middot; berlaku s.d. ' + esc(r.data.kedaluwarsa) : '<span style="color:var(--bad)">' + esc(r.message) + '</span>'; }); },
    'wa-test': function (el) { UI.busy(el, api('waTest', { nomor: $('#t-wa').value })).then(function (r) { r.success ? UI.toast(r.message) : fail(r); }); },
    'em-test': function (el) { UI.busy(el, api('emailTest', { email: $('#t-em').value })).then(function (r) { r.success ? UI.toast(r.message) : fail(r); }); },
    'ev-reset': function (el) { var code = el.getAttribute('data-id'), e = NC.events.filter(function (x) { return x.kode === code; })[0]; $('#e-sj-' + code).value = e.subjekDefault; $('#e-ps-' + code).value = e.pesanDefault; UI.toast('Template dikembalikan. Klik Simpan semua.', 'warn'); },
    'q-now': function (el) { UI.busy(el, api('notifProcessNow')).then(function (r) { r.success ? UI.toast(r.message) : fail(r); nAntrean($('#n-body')); }); },
    'q-retry': function (el) { UI.busy(el, api('notifRetry', {})).then(function (r) { r.success ? UI.toast(r.message) : fail(r); nAntrean($('#n-body')); }); },
    'q-reload': function () { nAntrean($('#n-body')); },
    'b-aud': function (el) { UI.busy(el, api('waAudience', audParams())).then(function (r) { if (!r.success) return fail(r); blastAud = r.data; var s = r.data.ringkas; $('#b-ring').innerHTML = '<b>' + s.valid + '</b> nomor valid dari ' + s.total + ' (tidak valid ' + s.tidakValid + ', ganda ' + s.ganda + ', opt-out ' + s.optOut + ', terdaftar WA ' + s.terdaftarWA + ').'; }); },
    'b-chk': function (el) {
      var nums = (blastAud ? blastAud.rows : []).filter(function (x) { return x.valid && !x.statusWA; }).map(function (x) { return x.hp; });
      if (!nums.length) return UI.toast('Hitung penerima dulu, atau semua sudah dicek.', 'warn');
      var done = 0, tot = nums.length, errs = 0, chunk = function () {
        if (!nums.length) { UI.toast('Pengecekan selesai (' + (tot - errs) + ' nomor).'); el.disabled = false; return; }
        var part = nums.splice(0, 50); el.disabled = true; el.textContent = 'Mengecek ' + done + '/' + tot + '...';
        api('waValidate', { nomor: part }).then(function (r) { if (!r.success) { el.disabled = false; el.innerHTML = ic('checkCircle') + 'Cek nomor terdaftar WA'; return fail(r); } done += part.length; el.textContent = 'Mengecek ' + done + '/' + tot + '...'; chunk(); });
      }; chunk();
    },
    'b-create': function (el) {
      var p = audParams(); UI.busy(el, api('waAudience', p).then(function (a) {
        if (!a.success) return a;
        var rcpt = a.data.rows.filter(function (x) { return x.valid && !x.ganda && !x.optOut; }).map(function (x) { return { hp: x.hp, nama: x.nama }; });
        return UI.confirm({ title: 'Buat blast?', message: 'Pesan akan dikirim ke ' + rcpt.length + ' nomor, ' + $('#b-bat').value + ' nomor per batch.', ok: 'Buat blast' }).then(function (y) {
          if (!y) return null; return api('waBlastCreate', { judul: $('#b-judul').value, pesan: $('#b-pesan').value, ukuranBatch: Number($('#b-bat').value), jeda: $('#b-jed').value, sasaran: p.sumber === 'manual' ? 'Manual' : (p.segmen || 'Semua kontak'), penerima: rcpt });
        });
      })).then(function (r) { if (!r) return; if (!r.success) return fail(r); UI.toast(r.message); blastList(); });
    },
    'b-next': function (el) { UI.busy(el, api('waBlastProcess', { blastId: el.getAttribute('data-id') })).then(function (r) { r.success ? UI.toast('Batch diproses.') : fail(r); blastList(); }); },
    'b-stop': function (el) { var id = el.getAttribute('data-id'); UI.confirm({ title: 'Hentikan blast?', message: 'Pesan yang belum terkirim dibatalkan.', ok: 'Hentikan', danger: true }).then(function (y) { if (y) api('waBlastStop', { blastId: id }).then(function (r) { r.success ? UI.toast(r.message) : fail(r); blastList(); }); }); },
    'crm-new': function () { crmForm(); },
    'crm-open': function (el) { crmDetail(el.getAttribute('data-id')); },
    'crm-sync': function (el) { UI.busy(el, api('crmSync')).then(function (r) { r.success ? UI.toast(r.message || 'Sinkron selesai.') : fail(r); crm = null; loadCrm(); }); },
    'crm-import': function () { csvImportSheet(); },
    'crm-export': function (el) { UI.busy(el, api('crmExport', {})).then(function (r) { if (!r.success) return fail(r); var a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(r.data.csv); a.download = r.data.filename; a.click(); UI.toast(r.data.jumlah + ' kontak diekspor.'); }); },
    'crm-sel': function (el) { var id = el.getAttribute('data-id'); if (el.checked) F.crmSel[id] = 1; else delete F.crmSel[id]; drawCrm(); },
    'bulk-clear': function () { F.crmSel = {}; drawCrm(); },
    bulk: function (el) {
      var aksi = el.getAttribute('data-v'), ids = Object.keys(F.crmSel), d = { ids: ids, aksi: aksi };
      var go = function () { api('crmBulk', d).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); F.crmSel = {}; crm = null; loadCrm(); }); };
      if (aksi === 'tag_tambah' || aksi === 'tag_hapus') { var s = simpleSheet(aksi === 'tag_tambah' ? 'Tambah tag' : 'Hapus tag', field('bt', 'Tag (pisahkan koma)', '<input class="in" id="bt">'), function () { d.tag = $('#bt').value; return api('crmBulk', d).then(function (r) { if (r.success) { F.crmSel = {}; crm = null; loadCrm(); } return r; }); }); return; }
      if (aksi === 'segmen') { simpleSheet('Ubah segmen', field('bs', 'Segmen', '<select class="in" id="bs">' + opts(SEGMEN) + '</select>'), function () { d.segmen = $('#bs').value; return api('crmBulk', d).then(function (r) { if (r.success) { F.crmSel = {}; crm = null; loadCrm(); } return r; }); }); return; }
      if (aksi === 'hapus') return UI.confirm({ title: 'Hapus ' + ids.length + ' kontak?', message: 'Kontak dari pesanan tidak dihapus (gunakan Opt-out).', type: 'HAPUS', ok: 'Hapus', danger: true }).then(function (y) { if (y) go(); });
      go();
    },
    'crm-merge': function () {
      var ids = Object.keys(F.crmSel), a = crm.list.rows.filter(function (k) { return k.id === ids[0]; })[0], b = crm.list.rows.filter(function (k) { return k.id === ids[1]; })[0];
      if (!a || !b) return;
      UI.confirm({ title: 'Gabungkan kontak?', message: 'Pertahankan "' + a.nama + '" (' + a.hp + ') dan hapus "' + b.nama + '" (' + b.hp + '). Riwayat interaksi dipindahkan.', ok: 'Gabungkan' }).then(function (y) { if (y) api('crmMerge', { keepId: a.id, dropId: b.id }).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); F.crmSel = {}; crm = null; loadCrm(); }); });
    },
    'demo-reset': function () { UI.confirm({ title: 'Muat ulang data contoh?', message: 'Data contoh lama diganti yang baru. Data asli tidak tersentuh.', type: 'RESET', ok: 'Reset data contoh' }).then(function (y) { if (y) api('resetDemo', { confirm: 'RESET' }).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); refresh().then(function () { K.App && K.App.loadPub(true); }); }); }); },
    'demo-clear': function () { UI.confirm({ title: 'Hapus semua data contoh?', message: 'Pesanan, unit, game, dan pengaturan contoh dihapus. Data asli tetap aman.', type: 'HAPUS', ok: 'Hapus data contoh', danger: true }).then(function (y) { if (y) api('clearDemo', { confirm: 'HAPUS' }).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); refresh().then(function () { K.App && K.App.loadPub(true); }); }); }); },
    'mig-scan': function (el) { mig(el, true); },
    'mig-run': function (el) { UI.confirm({ title: 'Jalankan impor?', message: 'Data dari spreadsheet lama ditambahkan ke aplikasi ini. Aman diulang.', ok: 'Jalankan' }).then(function (y) { if (y) mig(el, false); }); },
    'mig-csv': function (el) {
      var f = $('#mc-f').files[0]; if (!f) return UI.toast('Pilih berkas CSV dulu.', 'warn'); var dry = !!el.getAttribute('data-dry');
      var rd = new FileReader(); rd.onload = function () { var rows = csvParse(rd.result); if (!rows.length) return UI.toast('CSV kosong atau tidak terbaca.', 'bad'); UI.busy(el, api('migRows', { tipe: $('#mc-t').value, rows: rows, dryRun: dry, timpa: $('#m-timpa').checked })).then(function (r) { if (!r.success) return fail(r); $('#m-res').innerHTML = migReport(r); if (!dry) { refresh(); K.App && K.App.loadPub(true); } }); }; rd.readAsText(f);
    },
    pw: function () { built = false; pwView(false); $('#pw-form').insertAdjacentHTML('afterend', '<div class="center mt"><button class="btn ghost" data-act="back">Kembali</button></div>'); },
    back: function () { built = false; render(); }
  };
  function mig(el, dry) {
    var src = $('#m-src').value.trim(); if (!src) return UI.toast('Isi alamat spreadsheet lama.', 'warn');
    var sheets = $$('#m-sheets input:checked').map(function (x) { return x.value; });
    UI.busy(el, api(dry ? 'migScan' : 'migRun', { source: src, sheets: sheets, timpa: $('#m-timpa').checked })).then(function (r) { if (!r.success) return fail(r); $('#m-res').innerHTML = migReport(r); if (!dry) { refresh(); K.App && K.App.loadPub(true); } });
  }

  /* ================================================================== PENGIKAT EVENT */
  function bind() {
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act]'); if (!t || !root.contains(t)) return;
      if (t.tagName === 'INPUT' && t.type === 'checkbox') return;
      var fn = ACT[t.getAttribute('data-act')]; if (fn) { fn(t, e); }
    });
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.getAttribute && t.getAttribute('data-act') === 'crm-sel') ACT['crm-sel'](t);
      if (t.getAttribute && t.getAttribute('data-hs')) { var hi = Number(t.getAttribute('data-i')), hk = t.getAttribute('data-hs'); if (HS && HS[hi]) { HS[hi][hk] = hk === 'show' ? t.checked : t.value.trim(); hsSync(); } }
      if (t.id === 'crm-seg') { F.crmSeg = t.value; crm = null; loadCrm(); }
      if (t.id === 'crm-wa') { F.crmWa = t.value; crm = null; loadCrm(); }
    });
    root.addEventListener('input', K.debounce(function (e) {
      if (e.target.id === 'f-q') { F.q = e.target.value; var pos = e.target.selectionStart; vPesanan($('#a-body')); var n = $('#f-q'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
      if (e.target.id === 'mb-q') { F.mbQ = e.target.value; var ml = $('#mb-list'); if (ml) ml.innerHTML = mbRows(); }
      if (e.target.getAttribute && e.target.getAttribute('data-hs') && e.target.type !== 'checkbox') { var hj = Number(e.target.getAttribute('data-i')); if (HS && HS[hj]) { HS[hj][e.target.getAttribute('data-hs')] = e.target.value.trim(); hsSync(); } }
      if (e.target.id === 'crm-q') { F.crmQ = e.target.value; loadCrm().then(function () { var n = $('#crm-q'); if (n) { n.focus(); var l = n.value.length; n.setSelectionRange(l, l); } }); }
    }, 250));
    root.addEventListener('submit', function (e) {
      var id = e.target.id; if (['sa-form', 'pw-form', 'set-form', 'nc-form', 'ne-form', 'fp-form', 'rp-form'].indexOf(id) === -1) return; e.preventDefault();
      var btn = $('button[type=submit]', e.target);
      if (id === 'fp-form') {
        var em = $('#fp-e').value.trim();
        UI.busy(btn, api('forgotPassword', { email: em })).then(function (r) {
          if (!r.success) { $('#fp-err').textContent = r.message || 'Gagal mengirim kode.'; return; }
          $('#fp-err').textContent = ''; $('#rp-info').textContent = r.message; e.target.hidden = true; $('#rp-form').hidden = false; $('#rp-form').setAttribute('data-em', em); $('#rp-c').focus();
        });
      } else if (id === 'rp-form') {
        if ($('#rp-n').value !== $('#rp-k').value) { $('#rp-err').textContent = 'Konfirmasi password tidak sama.'; return; }
        UI.busy(btn, api('resetPasswordCode', { email: e.target.getAttribute('data-em'), code: $('#rp-c').value, newPassword: $('#rp-n').value })).then(function (r) {
          if (!r.success) { $('#rp-err').textContent = r.message || 'Gagal mengganti password.'; return; }
          UI.toast(r.message); loginView(); var u = $('#sa-u'); if (u) u.value = e.target.getAttribute('data-em') || '';
        });
      } else if (id === 'sa-form') {
        UI.busy(btn, api('loginSuperadmin', { username: $('#sa-u').value.trim() || 'superadmin', password: $('#sa-p').value })).then(function (r) { if (r.success) { try { if (/@/.test($('#sa-u').value)) localStorage.setItem('kgb:lastadm', $('#sa-u').value.trim()); } catch (x) { } afterLogin(r); } else { $('#sa-err').textContent = r.message || 'Gagal masuk.'; $('#sa-p').value = ''; $('#sa-p').focus(); } });
      } else if (id === 'pw-form') {
        var n = $('#pw-n').value; if (n !== $('#pw-c').value) { $('#pw-err').textContent = 'Konfirmasi password tidak sama.'; return; }
        UI.busy(btn, api('changeSuperadminPassword', { oldPassword: $('#pw-o').value, newPassword: n })).then(function (r) { if (!r.success) { $('#pw-err').textContent = r.message; return; } Auth.save(r.data); UI.toast(r.message); built = false; Router.go('admin/ringkasan'); render(); load(true); });
      } else if (id === 'set-form') {
        var vals = {}; $$('[data-k]', e.target).forEach(function (el) {
          if (el.disabled) return; var k = el.getAttribute('data-k'), cur = D.settings[k] || '', val = el.value.trim();
          if (el.type === 'color') { var tc = el.getAttribute('data-touch'); if (tc === '2') val = ''; else if (!tc) return; }
          if (k === 'home_sections') { var a = []; try { a = JSON.stringify(JSON.parse(cur || '[]')); } catch (x) { a = ''; } if (!cur && JSON.stringify(K.App.sections('[]').map(function (z) { return { id: z.id, show: z.show, eyebrow: z.eyebrow, title: z.title, desc: z.desc }; })) === val) return; if (a === val) return; }
          if (cur !== val) vals[k] = val;
        });
        if (!Object.keys(vals).length) return UI.toast('Belum ada yang diubah.', 'warn');
        UI.busy(btn, api('saveSettings', { values: vals })).then(function (r) { if (!r.success) return fail(r); UI.toast(r.message); Object.assign(D.settings, vals); if (vals.loyalty_target || vals.loyalty_window_days || vals.loyalty_reward_hours || vals.loyalty_valid_days || vals.loyalty_enabled || vals.member_enabled) MB = null; refresh(); K.App && K.App.loadPub(true); });
      } else if (id === 'nc-form') {
        var d = { waAktif: $('#nc-wa').checked, emailAktif: $('#nc-em').checked, batchDefault: Number($('#nc-b').value), jeda: $('#nc-j').value, deteksiOtomatis: $('#nc-d').checked, namaPengirim: $('#nc-n').value, appUrl: $('#nc-u').value.trim() };
        if ($('#nc-t').value.trim()) d.token = $('#nc-t').value.trim();
        UI.busy(btn, api('notifConfigSave', d)).then(function (r) { if (!r.success) return fail(r); UI.toast('Konfigurasi disimpan.'); NC = r.data || null; loadNotif(true); });
      } else if (id === 'ne-form') {
        var m = {}; NC.events.forEach(function (ev) { m[ev.kode] = { wa: $('#e-wa-' + ev.kode).checked, email: $('#e-em-' + ev.kode).checked, subjek: $('#e-sj-' + ev.kode).value, pesan: $('#e-ps-' + ev.kode).value }; });
        UI.busy(btn, api('notifConfigSave', { matriks: m })).then(function (r) { if (!r.success) return fail(r); UI.toast('Pengaturan event disimpan.'); loadNotif(true); });
      }
    });
  }

  /* ================================================================== API MODUL */
  K.Admin = {
    show: function (el, args) {
      if (root !== el) { root = el; built = false; bind(); }
      var t = args && args[0]; tab = TABS.some(function (x) { return x[0] === t; }) ? t : 'ringkasan';
      if (tab === 'sistem' && !Auth.isSuper()) tab = 'ringkasan';
      render();
      if (Auth.isAdmin() && !Auth.mustChange) { var c = Store.get(Auth.ns('boot'), null); if (!D && c && c.data) { D = c.data; render(); } load(false); }
    },
    leave: function () { /* halaman tetap hidup; tidak ada yang dibersihkan */ },
    pubChanged: function () { if (root && !Auth.isAdmin() && lastCid !== null && lastCid !== ((K.App && K.App.S('google_client_id')) || '') && !($('#sa-p') && $('#sa-p').value)) loginView(); }
  };
  w.addEventListener('kgb:auth-expired', function () { D = null; built = false; if (root) render(); });
})(window);
