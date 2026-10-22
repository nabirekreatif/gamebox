/* Kings Gaming Box — member.js : akun pelanggan (daftar/masuk), progres voucher, promo, riwayat. Dimuat sebelum app.js. */
(function (w) {
  'use strict';
  var K = w.KGB, $ = K.$, $$ = K.$$, esc = K.esc, ic = K.ic, rp = K.rp, Time = K.Time, Store = K.Store, UI = K.UI, Router = K.Router, Mem = K.Mem;
  var A = function () { return K.App; };
  var tab = 'masuk', next = '', cache = null;

  /* ------------------------------------------------------------------ data akun (stale-while-revalidate, dipisah per akun) */
  function key() { return 'c:m:' + ((Mem.me && Mem.me.customer_id) || 'x'); }
  function loadLocal() { if (!Mem.isIn()) { cache = null; return; } var c = Store.get(key(), null); cache = c && c.data || null; }
  function apply(d) {
    cache = d; if (d && d.me) { Mem.me = d.me; Store.set('member', { token: Mem.token, expiresAt: Mem.expiresAt, me: Mem.me }); }
    navLabel();
    if (Router.cur === 'akun') render();
    if (A()) { A().rerenderPesan(); A().rerenderHome(); }
  }
  function refresh(force) {
    if (!Mem.isIn()) return Promise.resolve();
    return K.swr(key(), 'memberMe', {}, function (d) { apply(d); }, { force: !!force, fresh: 30000 });
  }
  function navLabel() {
    var nm = Mem.isIn() && Mem.me ? String(Mem.me.name || '').split(' ')[0] : '';
    $$('[data-nav=akun]').forEach(function (a) { var sp = $('span', a); if (sp) sp.textContent = nm || 'Akun'; });
  }
  function login(res, msg) {
    Mem.save({ token: res.data.token, expiresAt: res.data.expiresAt, me: res.data.me }); loadLocal(); navLabel();
    UI.toast(msg || res.message || 'Berhasil masuk.');
    refresh(true);
    if (A()) { A().rerenderPesan(); A().rerenderHome(); }
    var go = next; next = ''; Router.go(go === 'pesan' ? 'pesan' : 'akun');
  }
  function logout() {
    Mem.clear(); cache = null; navLabel(); UI.toast('Anda sudah keluar.');
    if (A()) { A().rerenderPesan(); A().rerenderHome(); }
    render();
  }

  /* ------------------------------------------------------------------ tampilan */
  function field(id, label, inp, hint) { return '<div class="field"><label for="' + id + '">' + label + '</label>' + inp + (hint ? '<span class="hint">' + hint + '</span>' : '') + '<span class="err" id="e-' + id + '"></span></div>'; }
  function benefitsHtml() {
    var L = A().loyalty();
    return '<ul class="facility" style="margin-top:6px"><li>' + ic('checkCircle') + 'Promo diskon dari admin khusus member</li>' + (L.enabled ? '<li>' + ic('checkCircle') + 'Sewa ' + L.target + 'x dalam ' + L.windowDays + ' hari = voucher GRATIS ' + esc(A().durLabel(L.rewardHours)) + ' di pesanan berikutnya</li>' : '') +
      '<li>' + ic('checkCircle') + 'Data diisi otomatis saat memesan dan riwayat tersimpan</li><li>' + ic('checkCircle') + 'Notifikasi promo lewat WhatsApp</li></ul><p class="small muted">Tidak perlu akun untuk memesan: tamu tetap bisa menyewa dengan harga normal.</p>';
  }
  function authHtml() {
    var reg = tab === 'daftar';
    return '<div class="section-head" style="margin-top:6px"><div><span class="eyebrow">' + ic('crown') + 'Member</span><h2>Akun Pelanggan</h2></div></div>' +
      '<div class="auth-grid"><div class="card"><div class="tabs" role="tablist"><button role="tab" aria-selected="' + !reg + '" data-mtab="masuk">Masuk</button><button role="tab" aria-selected="' + reg + '" data-mtab="daftar">Daftar gratis</button></div>' +
      '<form id="m-form" class="stack mt" novalidate autocomplete="on">' +
      (reg ? field('m-nama', 'Nama lengkap', '<input class="in" id="m-nama" autocomplete="name" maxlength="80" placeholder="Nama Anda" required>') : '') +
      field('m-hp', 'Nomor WhatsApp', '<input class="in" id="m-hp" type="tel" inputmode="tel" autocomplete="username" placeholder="0821xxxxxxxx" required>', reg ? 'Dipakai sebagai nama pengguna dan untuk notifikasi promo.' : '') +
      field('m-pw', 'Password', '<input class="in" id="m-pw" type="password" autocomplete="' + (reg ? 'new-password' : 'current-password') + '" placeholder="' + (reg ? 'Minimal 6 karakter' : 'Password Anda') + '" required>') +
      '<input class="hp" id="m-web" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="btn gold block" type="submit">' + ic(reg ? 'user' : 'lock') + (reg ? 'Buat akun' : 'Masuk') + '</button>' +
      (reg ? '<p class="tiny muted">Nomor WhatsApp tidak diverifikasi dengan kode OTP. Pastikan nomor yang Anda isi benar dan milik Anda.</p>' : '<p class="small muted">Lupa password? <a href="' + esc(A().waLink('Halo Admin, saya lupa password akun member saya.')) + '" target="_blank" rel="noopener">Minta reset ke admin lewat WhatsApp</a>.</p>') +
      '</form></div><div class="card hl"><div class="card-title">' + ic('trophy') + '<h3>Keuntungan member</h3></div>' + benefitsHtml() + '</div></div>';
  }
  function voucherCard(v) {
    var cls = v.status === 'Aktif' ? 'ok' : v.status === 'Dipakai' ? 'info' : 'bad';
    return '<div class="voucher ' + (v.status === 'Aktif' ? 'on' : 'off') + '"><div class="v-l"><b>' + esc(A().durLabel(v.hours)) + '</b><span>GRATIS</span></div><div class="grow"><b>Voucher gratis sewa</b><div class="small muted">' + esc(v.note || '') + '</div><div class="tiny muted">' +
      (v.status === 'Aktif' ? 'Berlaku sampai ' + esc(Time.fmt(v.expires_at, { dateOnly: true })) : v.status === 'Dipakai' ? 'Dipakai di ' + esc(v.used_booking_id) : esc(v.status)) + '</div></div><span class="badge ' + cls + '">' + esc(v.status) + '</span></div>';
  }
  function dashHtml() {
    var d = cache || {}, me = Mem.me || d.me || {}, L = A().loyalty(), lp = d.loyalty || { count: 0, target: L.target, sisa: L.target, tertunda: 0 };
    var vs = d.vouchers || [], aktif = vs.filter(function (v) { return v.status === 'Aktif'; }), promos = d.promos || A().pub().promos || [], orders = d.orders || [];
    var loy = L.enabled ? '<div class="card hl"><div class="card-title">' + ic('trophy') + '<h3>Progres voucher gratis</h3></div>' + A().loyaltyDots(lp.count, lp.target) +
      '<p style="margin-top:10px"><b>' + lp.count + ' dari ' + lp.target + '</b> sewa selesai. ' + (lp.sisa > 0 ? 'Tinggal <b>' + lp.sisa + ' sewa lagi</b> untuk mendapat voucher GRATIS ' + esc(A().durLabel(L.rewardHours)) + '.' : 'Voucher segera terbit.') + '</p>' +
      '<p class="small muted">Hitungan: sewa yang SELESAI dalam ' + L.windowDays + ' hari terakhir' + (lp.periodeSampai ? ' (sewa tertua dihitung sampai ' + esc(Time.fmt(lp.periodeSampai, { dateOnly: true })) + ')' : '') + '. ' + (lp.tertunda ? lp.tertunda + ' pesanan masih berjalan/menunggu.' : '') + '</p></div>' : '';
    return '<div class="section-head" style="margin-top:6px"><div><span class="eyebrow">' + ic('crown') + 'Member</span><h2>Halo, ' + esc(String(me.name || '').split(' ')[0] || 'Member') + '</h2></div><div class="row wrap-r"><a class="btn gold" href="#/pesan">' + ic('gamepad') + 'Pesan sekarang</a><button class="btn" data-m="logout">' + ic('logout') + 'Keluar</button></div></div>' +
      '<div class="grid-2 acc-grid"><div class="stack">' + loy +
        '<div class="card"><div class="card-title">' + ic('tag') + '<h3>Voucher saya</h3><span class="badge ' + (aktif.length ? 'ok' : '') + '">' + aktif.length + ' aktif</span></div>' + (vs.length ? '<div class="stack">' + vs.map(voucherCard).join('') + '</div>' : '<p class="muted">Belum ada voucher. Selesaikan ' + L.target + ' sewa untuk mendapatkan yang pertama.</p>') + '</div>' +
        '<div class="card"><div class="card-title">' + ic('tag') + '<h3>Promo untuk Anda</h3></div>' + (promos.length ? '<div class="promo-list">' + promos.map(function (p) { var pk = p.package_id && A().pkgById(p.package_id); return '<div class="promo"><span class="promo-val">' + esc(A().promoLabel(p)) + '</span><div class="grow"><b>' + esc(p.title) + '</b>' + (p.description ? '<div class="small muted">' + esc(p.description) + '</div>' : '') + '<div class="tiny muted">' + (pk ? esc(pk.package_name) : 'Semua paket') + (p.end_at ? ' · sampai ' + esc(A().fmtYmd(p.end_at)) : '') + '</div></div></div>'; }).join('') + '</div><p class="small muted mt">Promo terbaik dipilih otomatis saat Anda memesan.</p>' : '<p class="muted">Belum ada promo aktif saat ini.</p>') + '</div></div>' +
      '<div class="stack"><div class="card"><div class="card-title">' + ic('user') + '<h3>Profil</h3></div><div class="stack"><div class="line2"><span class="muted">Nama</span><b>' + esc(me.name || '-') + '</b></div><div class="line2"><span class="muted">WhatsApp</span><b>' + esc(me.whatsapp_number || '-') + '</b></div><div class="line2"><span class="muted">Alamat bawaan</span><b>' + esc(me.default_address || '-') + '</b></div></div>' +
        '<div class="row wrap-r mt"><button class="btn sm" data-m="profil">' + ic('pencil') + 'Ubah profil</button><button class="btn sm" data-m="pw">' + ic('key') + 'Ganti password</button></div></div>' +
        '<div class="card"><div class="card-title">' + ic('history') + '<h3>Riwayat pesanan</h3></div>' + (orders.length ? '<div class="stack">' + orders.map(function (o) {
          return '<a class="item hist" href="#/cek/' + encodeURIComponent(o.booking_id) + '"><div class="grow"><b>' + esc(o.booking_id) + '</b><div class="small muted">' + esc(o.package_name) + ' · ' + esc(Time.fmt(o.start_time)) + (o.bonus_hours ? ' · +' + esc(A().durLabel(o.bonus_hours)) + ' gratis' : '') + '</div></div><div class="right">' + UI.badge(o.booking_status) + '<div class="small">' + rp(o.package_price) + (o.discount ? ' <span class="ok-t">(-' + rp(o.discount) + ')</span>' : '') + '</div></div></a>';
        }).join('') + '</div>' : '<p class="muted">Belum ada pesanan.</p>') + '</div></div></div>';
  }
  function render() {
    var root = $('#akun-root'); if (!root) return;
    if (!A()) return;
    if (A().S('member_enabled', 'YA') === 'TIDAK') { root.innerHTML = UI.empty('info', 'Fitur akun pelanggan sedang tidak aktif. Anda tetap bisa memesan tanpa akun.') + '<div class="center"><a class="btn gold" href="#/pesan">Pesan sekarang</a></div>'; return; }
    root.innerHTML = Mem.isIn() ? dashHtml() : authHtml();
  }

  /* ------------------------------------------------------------------ aksi */
  function pwSheet() {
    var s = UI.sheet({ title: 'Ganti password', body: '<form class="stack" id="pw-f">' + field('pw-o', 'Password lama', '<input class="in" id="pw-o" type="password" autocomplete="current-password">') + field('pw-n', 'Password baru', '<input class="in" id="pw-n" type="password" autocomplete="new-password" placeholder="Minimal 6 karakter">') + '</form>' });
    s.foot.innerHTML = '<button class="btn ghost" data-no>Batal</button><button class="btn primary" data-ok>Simpan</button>';
    $('[data-no]', s.foot).onclick = function () { s.close(); };
    $('[data-ok]', s.foot).onclick = function (e) {
      UI.busy(e.currentTarget, K.api('memberChangePassword', { oldPassword: $('#pw-o').value, newPassword: $('#pw-n').value })).then(function (r) { if (!r.success) { UI.toast(r.message, 'bad'); return; } s.close(); UI.toast(r.message); });
    };
  }
  function profilSheet() {
    var me = Mem.me || {};
    var s = UI.sheet({ title: 'Ubah profil', body: '<form class="stack" id="pf-f">' + field('pf-n', 'Nama lengkap', '<input class="in" id="pf-n" maxlength="80" value="' + esc(me.name || '') + '">') + field('pf-a', 'Alamat pengantaran bawaan', '<textarea class="in" id="pf-a" maxlength="300">' + esc(me.default_address || '') + '</textarea>') + '</form>' });
    s.foot.innerHTML = '<button class="btn ghost" data-no>Batal</button><button class="btn primary" data-ok>Simpan</button>';
    $('[data-no]', s.foot).onclick = function () { s.close(); };
    $('[data-ok]', s.foot).onclick = function (e) {
      UI.busy(e.currentTarget, K.api('memberUpdate', { name: $('#pf-n').value, default_address: $('#pf-a').value })).then(function (r) { if (!r.success) { UI.toast(r.message, 'bad'); return; } s.close(); UI.toast(r.message); Mem.me = r.data.me; apply(Object.assign({}, cache || {}, { me: r.data.me })); refresh(true); });
    };
  }
  function bind(root) {
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-mtab]'); if (t) { tab = t.getAttribute('data-mtab'); render(); return; }
      var m = e.target.closest('[data-m]'); if (!m) return;
      var a = m.getAttribute('data-m');
      if (a === 'logout') logout(); else if (a === 'pw') pwSheet(); else if (a === 'profil') profilSheet();
    });
    root.addEventListener('submit', function (e) {
      if (e.target.id !== 'm-form') return; e.preventDefault();
      var reg = tab === 'daftar', hp = K.hp08($('#m-hp').value), pw = $('#m-pw').value, nama = reg ? $('#m-nama').value.trim() : '', bad = false;
      var setE = function (id, t) { var el = $('#e-' + id); if (el) el.textContent = t || ''; if (t) bad = true; };
      setE('m-hp', K.hpValid(hp) ? '' : 'Nomor WhatsApp tidak valid. Contoh: 082121210694.');
      setE('m-pw', pw.length >= (reg ? 6 : 1) ? '' : (reg ? 'Password minimal 6 karakter.' : 'Password wajib diisi.'));
      if (reg) setE('m-nama', nama.length >= 2 ? '' : 'Nama lengkap wajib diisi.');
      if (bad) return;
      var btn = $('button[type=submit]', e.target), web = ($('#m-web') || {}).value || '';
      var p = reg ? K.api('memberRegister', { name: nama, whatsapp_number: hp, password: pw, website: web }, { token: '' }) : K.api('memberLogin', { whatsapp_number: hp, password: pw }, { token: '' });
      UI.busy(btn, p).then(function (r) { if (!r.success) { UI.toast(r.message || 'Gagal.', 'bad'); setE(reg ? 'm-hp' : 'm-pw', r.message); return; } login(r, reg ? 'Akun dibuat. Selamat datang!' : 'Berhasil masuk.'); });
    });
  }

  Router.add('akun', { el: 'pg-akun', title: 'Akun', init: function (el) { bind(el); }, show: function (el, args) {
    next = args && args[0] === 'pesan' ? 'pesan' : next;
    if (Mem.isIn() && !cache) loadLocal();
    render(); refresh(false);
  } });

  K.Member = { data: function () { return cache; }, refresh: refresh, render: render, navLabel: navLabel };
  loadLocal(); (w.requestAnimationFrame || setTimeout)(navLabel);
})(window);
