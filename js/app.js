/* Kings Gaming Box — app.js : halaman publik (Beranda, Pesan, Cek Status, Struk, Kontak) + pemuat modul admin. */
(function (w) {
  'use strict';
  var K = w.KGB, $ = K.$, $$ = K.$$, esc = K.esc, ic = K.ic, rp = K.rp, Time = K.Time, Store = K.Store, UI = K.UI, Router = K.Router, Art = K.Art, CFG = K.CFG;

  /* ------------------------------------------------------------------ data bawaan (dipakai sebelum server menjawab / bila API_URL kosong) */
  var FALLBACK = {
    settings: { brand_name: 'KINGS GAMING BOX', brand_tagline: 'Sewa Playbox PS4', hero_title: 'SEWA PLAYBOX PS4', hero_subtitle: 'BAWA PULANG KERUMAH | KOST | CAFE | TONGKRONGAN',
      hero_description: 'Main PS4 praktis di mana saja! Lengkap dengan layar monitor terintegrasi di dalam box eksklusif, 2 stik wireless, dan koleksi game terbaru.',
      hero_banner_url: 'img/hero.svg', facilities_list: '1 Unit Playbox PS4|2 Control Stik PS4|HDMI - USB - Power|Bisa Antar ke Lokasi|Pembayaran Mudah', timeline_announcement: '',
      whatsapp_admin: CFG.WA_ADMIN, instagram_username: 'nabirekreatif', tiktok_username: 'nabirekreatif', location_address: 'Jl. Merdeka, Oyehe, Nabire', maps_link: '', google_client_id: '', timezone: CFG.TIMEZONE,
      member_enabled: 'YA', loyalty_enabled: 'YA', loyalty_target: '7', loyalty_window_days: '60', loyalty_reward_hours: '24', loyalty_valid_days: '60' },
    packages: [['PKG-1H', 'Paket 1 Jam', 1, 15000, 'Coba Main'], ['PKG-6H', 'Paket 6 Jam', 6, 50000, 'Hemat'], ['PKG-12H', 'Paket 12 Jam', 12, 100000, 'Populer'], ['PKG-24H', 'Paket 1 Hari', 24, 150000, 'Puas Seharian']]
      .map(function (p) { return { package_id: p[0], package_name: p[1], duration_hours: p[2], price: p[3], badge_text: p[4] }; }),
    games: [['eFootball PES 2026', 'Sports'], ['Grand Theft Auto V', 'Action/Open World'], ['Mortal Kombat XL', 'Fighting'], ['Minecraft', 'Adventure'], ['EA Sports FC 26', 'Sports'], ['Resident Evil 4', 'Survival Horror'], ['Naruto Shippuden Ultimate Ninja Storm 4', 'Fighting'], ['God of War', 'Action/Open World']]
      .map(function (g, i) { return { game_id: 'GM-0' + (i + 1), title: g[0], genre: g[1], cover_url: 'img/gm-0' + (i + 1) + '.svg', is_featured: true }; }),
    units: [{ unit_id: 'BOX-01', unit_name: 'Playbox PS4 #1 - Reguler', specs: '1 Unit Playbox PS4, 2 Stik Ori, HDMI-USB-Power', current_status: 'Tersedia', available_at: '', image_url: 'img/unit-1.svg' },
      { unit_id: 'BOX-02', unit_name: 'Playbox PS4 #2 - VIP', specs: '1 Unit Playbox PS4, 2 Stik Ori, HDMI-USB-Power, Hard Disk 1 TB', current_status: 'Tersedia', available_at: '', image_url: 'img/unit-2.svg' }],
    promos: [], schedule: [], demo: false, offline: true
  };
  /** Data dari server/cache bisa rusak atau berasal dari versi lama; lengkapi agar tampilan tidak pernah kosong. */
  function normPub(d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
    if (!Array.isArray(d.units) || !Array.isArray(d.packages)) return null;   // bentuk tidak dikenal = jangan dipakai
    var o = Object.assign({}, d);
    ['units', 'packages', 'games', 'schedule', 'promos'].forEach(function (k) { if (!Array.isArray(o[k])) o[k] = []; });
    if (!o.settings || typeof o.settings !== 'object') o.settings = {};
    return o;
  }
  var CKEY = 'c:pub2';
  Store.del && Store.del('c:pub');   // cache versi lama dibuang
  var pub = (function () { var c = Store.get(CKEY, null); return (c && normPub(c.data)) || normPub(FALLBACK) || FALLBACK; })();
  var S = function (k, d) { var v = pub.settings && pub.settings[k]; return v === undefined || v === '' ? (d === undefined ? '' : d) : v; };
  var waNum = function () { return String(S('whatsapp_admin', CFG.WA_ADMIN)).replace(/\D/g, ''); };
  var waShow = function () { var n = waNum(); return n.indexOf('62') === 0 ? '0' + n.slice(2) : n; };
  var waLink = function (text) { return 'https://wa.me/' + waNum() + (text ? '?text=' + encodeURIComponent(text) : ''); };
  var brand = function () { return S('brand_name', CFG.BRAND); };
  var pkgById = function (id) { return pub.packages.filter(function (p) { return p.package_id === id; })[0]; };
  var unitById = function (id) { return pub.units.filter(function (u) { return u.unit_id === id; })[0]; };
  var durLabel = function (h) { return h % 24 === 0 ? (h / 24) + ' hari' : h + ' jam'; };

  /* ------------------------------------------------------------------ pesanan milik perangkat ini */
  var Orders = {
    list: function () { return Store.get('orders', []); },
    add: function (r) { var l = Orders.list().filter(function (o) { return o.booking_id !== r.booking_id; }); l.unshift(r); Store.set('orders', l.slice(0, 20)); Store.set('profile', { nama: r.customer_name, hp: r.whatsapp_number, alamat: r.delivery_address }); },
    get: function (id) { return Orders.list().filter(function (o) { return o.booking_id === id; })[0]; },
    hps: function () { var m = {}; Orders.list().forEach(function (o) { m[o.whatsapp_number] = 1; }); return Object.keys(m); }
  };

  /* ------------------------------------------------------------------ data publik */
  var listeners = [];
  function applyPub(d, fromCache) {
    d = normPub(d); if (!d) throw new Error('Data publik tidak lengkap');
    pub = d; K.pub = d;
    if (d.settings && d.settings.timezone) Time.tz = d.settings.timezone;
    if (d.serverTime && !fromCache) Time.sync(d.serverTime);
    K.brand = brand();
    applyBranding();
    var db = $('#demo-banner'); if (db) db.hidden = !d.demo;
    listeners.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
  }
  /** Merek, logo, warna tema, dan menu Akun — semuanya berasal dari Pengaturan admin. */
  function darken(hex, f) { var n = parseInt(hex.slice(1), 16); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { return ('0' + Math.round(v * f).toString(16)).slice(-2); }).join(''); }
  function applyBranding() {
    var logo = S('logo_url'), bn = $('.brand');
    if (bn) {
      bn.innerHTML = (logo ? '<img class="brand-logo" alt="" src="' + esc(logo) + '" onerror="this.outerHTML=KGB.ic(\'logo\')">' : ic('logo')) + '<span id="brand-name">' + esc(brand()) + '<small>' + esc(S('brand_tagline', 'Sewa Playbox PS4')) + '</small></span>';
      bn.setAttribute('aria-label', brand() + ', beranda');
    }
    var fav = $('link[rel=icon]'); if (fav && logo) fav.setAttribute('href', logo);
    var root = document.documentElement.style, pr = S('theme_primary'), ac = S('theme_accent');
    if (/^#[0-9a-fA-F]{6}$/.test(pr)) { root.setProperty('--primary', pr); root.setProperty('--primary-hover', darken(pr, .86)); root.setProperty('--c-blue-400', pr); }
    else { root.removeProperty('--primary'); root.removeProperty('--primary-hover'); root.removeProperty('--c-blue-400'); }
    if (/^#[0-9a-fA-F]{6}$/.test(ac)) { root.setProperty('--gold', ac); root.setProperty('--gold-deep', darken(ac, .82)); }
    else { root.removeProperty('--gold'); root.removeProperty('--gold-deep'); }
    var off = S('member_enabled', 'YA') === 'TIDAK';
    $$('[data-nav=akun]').forEach(function (a) { a.hidden = off; });
    var meta = $('meta[name=description]'); if (meta) meta.setAttribute('content', S('hero_description', '').slice(0, 155) || meta.getAttribute('content'));
  }
  function loadPub(force) {
    return K.swr(CKEY, 'publicData', {}, applyPub, {
      force: force, fresh: CFG.CACHE_FRESH_MS,
      onError: function (res) { if (res.code === 'NOAPI') { applyPub(Object.assign({}, FALLBACK), true); } else { var r = $('#home-root'); if (r && !r.dataset.ready) r.innerHTML = errBox(res.message); } }
    });
  }
  function errBox(msg) { return '<div class="empty">' + ic('warn') + '<p>' + esc(msg || 'Gagal memuat data.') + '</p><button class="btn primary mt" data-retry>' + ic('refresh') + 'Coba lagi</button></div>'; }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-retry]')) { loadPub(true); } });

  /* ------------------------------------------------------------------ promo, voucher, loyalitas */
  var memberData = function () { return K.Mem.isIn() && K.Member ? K.Member.data() : null; };
  var promosFor = function (pkgId) { return (pub.promos || []).filter(function (p) { return !p.package_id || p.package_id === pkgId; }); };
  var promoDisc = function (p, price) { var v = Number(p.value) || 0, raw = p.type === 'nominal' ? v : Math.round(price * Math.min(v, 100) / 100); return Math.max(0, Math.min(Math.round(raw), price)); };
  var promoLabel = function (p) { return p.type === 'nominal' ? 'Hemat ' + rp(p.value) : 'Diskon ' + p.value + '%'; };
  var bestPromo = function (pkg) { var best = null, bd = 0; promosFor(pkg.package_id).forEach(function (p) { var d = promoDisc(p, pkg.price); if (d > bd) { bd = d; best = p; } }); return best; };
  var fmtYmd = function (v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  function loyalty() {
    var n = function (k, d) { var v = parseInt(S(k, d), 10); return isNaN(v) ? parseInt(d, 10) : v; };
    return { enabled: S('loyalty_enabled', 'YA') !== 'TIDAK', target: n('loyalty_target', '7'), windowDays: n('loyalty_window_days', '60'), rewardHours: n('loyalty_reward_hours', '24'), validDays: n('loyalty_valid_days', '60') };
  }
  function loyaltyDots(count, target) { var h = ''; for (var i = 0; i < target; i++) h += '<i class="' + (i < count ? 'on' : '') + '"></i>'; return '<div class="dots" role="img" aria-label="Progres ' + count + ' dari ' + target + ' sewa">' + h + '</div>'; }

  /* ------------------------------------------------------------------ potongan tampilan */
  function unitState(u) {
    var now = Time.now(), av = Date.parse(u.available_at);
    if (u.current_status === 'Maintenance') return { cls: 'off', text: 'Maintenance', ok: false };
    if (u.current_status === 'Sedang Disewa' && av > now) return { cls: 'busy', text: 'Dipakai sampai ' + Time.fmtShort(u.available_at) + ' ' + Time.tzLabel(), ok: true };
    var next = pub.schedule.filter(function (s) { return s.unit_id === u.unit_id && Date.parse(s.end) > now; })[0];
    if (next && Date.parse(next.start) <= now) return { cls: 'busy', text: 'Sedang dipakai sampai ' + Time.fmtShort(next.end) + ' ' + Time.tzLabel(), ok: true };
    return { cls: 'ok', text: 'Tersedia sekarang', ok: true };
  }
  function pkCard(p, sel, asBtn) {
    var dur = '<span class="dur">' + esc(durLabel(p.duration_hours)) + '</span><span class="price">' + rp(p.price) + '</span><span class="small muted">' + esc(p.package_name) + '</span>';
    var badge = p.badge_text ? '<span class="badge ' + (/populer/i.test(p.badge_text) ? 'gold' : 'info') + '">' + esc(p.badge_text) + '</span>' : '';
    return asBtn ? '<button type="button" class="pk" role="radio" aria-checked="' + !!sel + '" data-pk="' + esc(p.package_id) + '">' + badge + dur + '<span class="sel">' + ic('check') + '</span></button>'
      : '<a class="pk" href="#/pesan/' + encodeURIComponent(p.package_id) + '" aria-label="Pesan ' + esc(p.package_name) + '">' + badge + dur + '<span class="small" style="color:var(--link);margin-top:6px;font-weight:700">Pilih paket ' + ic('arrowR') + '</span></a>';
  }
  function gameCard(g, pick, on) {
    return '<' + (pick ? 'button type="button"' : 'div') + ' class="game' + (pick ? ' pick' : '') + '"' + (pick ? ' aria-pressed="' + !!on + '" data-game="' + esc(g.title) + '"' : '') + '>' +
      '<div class="cover"><img loading="lazy" decoding="async" alt="Cover ' + esc(g.title) + '" src="' + esc(Art.cover(g)) + '" onerror="this.onerror=null;this.src=KGB.Art.game(this.alt.slice(6),\'\')"></div>' +
      (g.is_featured ? '<span class="star badge gold">' + ic('star') + 'Unggulan</span>' : '') + (pick ? '<span class="tick">' + ic('check') + '</span>' : '') +
      '<div class="meta"><b>' + esc(g.title) + '</b><span>' + esc(g.genre || 'Game') + '</span></div></' + (pick ? 'button' : 'div') + '>';
  }

  /* ================================================================== BERANDA */
  var gameQ = '', gameG = '', gameAll = false;
  /* Bagian beranda: urutan, tampil/sembunyi, dan teksnya diatur admin (Pengaturan > Susunan beranda). */
  var SEC_DEF = {
    avail: { icon: 'zap', eyebrow: 'Ketersediaan', title: 'Unit Siap Pakai', desc: '', label: 'Ketersediaan unit' },
    packages: { icon: 'tag', eyebrow: 'Harga', title: 'Paket Sewa', desc: 'Harga pasti, tanpa biaya tersembunyi. Pilih durasi lalu lanjut pesan.', label: 'Paket sewa' },
    member: { icon: 'crown', eyebrow: 'Member', title: 'Lebih Hemat dengan Akun', desc: 'Daftar gratis untuk promo diskon dan voucher gratis sewa. Tanpa akun tetap bisa memesan dengan harga normal.', label: 'Promo & member' },
    units: { icon: 'box', eyebrow: 'Perangkat', title: 'Pilih Unit', desc: '', label: 'Pilihan unit' },
    games: { icon: 'play', eyebrow: 'Koleksi', title: 'Daftar Game', desc: 'Request game lain saat memesan; kami usahakan tersedia.', label: 'Daftar game' },
    facilities: { icon: 'shield', eyebrow: 'Termasuk', title: 'Kelengkapan', desc: '', label: 'Kelengkapan' },
    schedule: { icon: 'calendar', eyebrow: 'Jadwal', title: 'Jadwal Terisi', desc: 'Bar biru = unit sedang/akan disewa. Pilih waktu di luar itu.', label: 'Jadwal terisi' },
    social: { icon: 'pin', eyebrow: 'Temui kami', title: 'Lokasi & Sosial', desc: '', label: 'Lokasi & sosial' }
  };
  var SEC_ORDER = ['avail', 'packages', 'member', 'units', 'games', 'facilities', 'schedule', 'social'];
  function sections(raw) {
    var saved = []; try { saved = JSON.parse(raw === undefined ? S('home_sections', '[]') : raw) || []; } catch (e) { saved = []; }
    var seen = {}, out = [];
    saved.forEach(function (x) { if (x && SEC_DEF[x.id] && !seen[x.id]) { seen[x.id] = 1; out.push({ id: x.id, show: x.show !== false, eyebrow: x.eyebrow || '', title: x.title || '', desc: x.desc || '' }); } });
    SEC_ORDER.forEach(function (id) { if (!seen[id]) out.push({ id: id, show: true, eyebrow: '', title: '', desc: '' }); });
    return out;
  }
  function secHead(s, extra) {
    var d = SEC_DEF[s.id], desc = s.desc || d.desc; if (desc === '-') desc = '';
    return '<div class="section-head"><div><span class="eyebrow">' + ic(d.icon) + esc(s.eyebrow || d.eyebrow) + '</span><h2>' + esc(s.title || d.title) + '</h2></div>' + (desc ? '<p>' + esc(desc) + '</p>' : '') + (extra || '') + '</div>';
  }
  var SEC = {
    avail: function (s) {
      return secHead(s) + '<div class="avail-strip">' + pub.units.map(function (u) { var st = unitState(u); return '<div class="avail ' + st.cls + '"><i class="dot"></i><div class="grow"><b>' + esc(u.unit_name) + '</b><div class="small muted">' + esc(st.text) + '</div></div>' + (st.ok ? '<a class="btn xs gold" href="#/pesan//' + encodeURIComponent(u.unit_id) + '">Pesan</a>' : '') + '</div>'; }).join('') + '</div>';
    },
    packages: function (s) { return secHead(s) + '<div class="pk-grid">' + pub.packages.map(function (p) { return pkCard(p); }).join('') + '</div>'; },
    member: function (s) {
      if (S('member_enabled', 'YA') === 'TIDAK') return '';
      var L = loyalty(), promos = pub.promos || [], inM = K.Mem.isIn(), md = memberData(), cnt = md && md.loyalty ? md.loyalty.count : 0;
      var pc = promos.map(function (p) {
        var pk = p.package_id && pkgById(p.package_id), until = p.end_at ? ' · sampai ' + fmtYmd(p.end_at) : '';
        return '<div class="promo"><span class="promo-val">' + esc(promoLabel(p)) + '</span><div class="grow"><b>' + esc(p.title) + '</b>' + (p.description ? '<div class="small muted">' + esc(p.description) + '</div>' : '') + '<div class="tiny muted">' + (pk ? esc(pk.package_name) : 'Semua paket') + esc(until) + '</div></div></div>';
      }).join('');
      var loy = L.enabled ? '<div class="card loy"><div class="card-title">' + ic('trophy') + '<h3>Voucher gratis sewa</h3></div><p class="muted">Sewa <b>' + L.target + 'x</b> dalam maksimal <b>' + L.windowDays + ' hari</b> (' + Math.round(L.windowDays / 30 * 10) / 10 + ' bulan), tukar dengan voucher <b>GRATIS ' + esc(durLabel(L.rewardHours)) + '</b>. Pesanan berikutnya jadi <b>durasi pilihan + ' + esc(durLabel(L.rewardHours)) + ' gratis</b>.</p>' + loyaltyDots(cnt, L.target) + (inM ? '<p class="small muted">Progres Anda: ' + cnt + ' dari ' + L.target + ' sewa selesai.</p>' : '') + '</div>' : '';
      return secHead(s) + '<div class="member-grid"><div class="stack">' + (pc ? '<div class="card"><div class="card-title">' + ic('tag') + '<h3>Promo member saat ini</h3></div><div class="promo-list">' + pc + '</div></div>' : '<div class="card"><div class="card-title">' + ic('tag') + '<h3>Promo member</h3></div><p class="muted">Belum ada promo aktif. Pantau terus, admin menambahkan promo secara berkala.</p></div>') + '</div><div class="stack">' + loy +
        '<div class="row wrap-r">' + (inM ? '<a class="btn gold" href="#/akun">' + ic('user') + 'Buka akun saya</a>' : '<a class="btn gold" href="#/akun">' + ic('user') + 'Daftar / Masuk</a><a class="btn" href="#/pesan">Pesan tanpa akun</a>') + '</div></div></div>';
    },
    units: function (s) {
      return secHead(s) + '<div class="unit-grid">' + pub.units.map(function (u) { var st = unitState(u); return '<a class="unit" href="#/pesan//' + encodeURIComponent(u.unit_id) + '" aria-disabled="' + !st.ok + '"><div class="art"><img loading="lazy" alt="' + esc(u.unit_name) + '" src="' + esc(Art.unitImg(u)) + '" onerror="this.onerror=null;this.src=KGB.Art.unit()"></div><div><h4>' + esc(u.unit_name) + '</h4><div class="specs">' + esc(u.specs) + '</div><span class="badge ' + (st.cls === 'ok' ? 'ok' : st.cls === 'busy' ? 'warn' : 'bad') + '">' + esc(st.text) + '</span></div></a>'; }).join('') + '</div>';
    },
    games: function (s) {
      var genres = {}; pub.games.forEach(function (g) { if (g.genre) genres[g.genre] = (genres[g.genre] || 0) + 1; });
      return secHead(s) + '<div class="game-tools"><input class="in" id="g-q" type="search" placeholder="Cari game..." aria-label="Cari game" value="' + esc(gameQ) + '"><div class="chips" id="g-chips"><button class="chip" aria-pressed="' + !gameG + '" data-g="">Semua</button>' +
        Object.keys(genres).sort().map(function (g) { return '<button class="chip" aria-pressed="' + (gameG === g) + '" data-g="' + esc(g) + '">' + esc(g) + '<span class="cnt">' + genres[g] + '</span></button>'; }).join('') + '</div></div><div id="g-grid"></div>';
    },
    facilities: function (s) { return secHead(s) + '<ul class="facility">' + String(S('facilities_list')).split('|').filter(Boolean).map(function (f) { return '<li>' + ic('checkCircle') + esc(f) + '</li>'; }).join('') + '</ul>'; },
    schedule: function (s) { return secHead(s) + '<div class="card" id="sched-box"></div>'; },
    social: function (s) { return secHead(s, '<a class="btn sm" href="#/kontak">Lihat semua ' + ic('arrowR') + '</a>') + socialHtml(); }
  };
  function renderHome() {
    try { renderHome_(); } catch (e) {
      console.error(e); Store.del(CKEY);
      var r = $('#home-root'); if (r) { r.dataset.ready = '1'; r.innerHTML = errBox('Tampilan beranda gagal dimuat. Data tersimpan dibersihkan; coba lagi.'); }
    }
  }
  function renderHome_() {
    var root = $('#home-root'); if (!root) return; root.dataset.ready = '1';
    var title = esc(S('hero_title', 'SEWA PLAYBOX PS4')).replace(/(playbox\s*ps4)/i, '<em>$1</em>');
    var ann = S('timeline_announcement'), hero = S('hero_banner_url');
    root.innerHTML =
      '<div class="hero"><div class="hero-grid"><div>' +
        '<span class="eyebrow">' + ic('crown') + esc(brand()) + '</span><h1>' + title + '</h1>' +
        '<p class="lead"><b>' + esc(S('hero_subtitle')) + '</b></p><p class="lead mt" style="margin-top:10px">' + esc(S('hero_description')) + '</p>' +
        '<div class="ctas"><a class="btn gold" href="#/pesan">' + ic('gamepad') + esc(S('hero_cta_primary', 'Pesan Sekarang')) + '</a><a class="btn" href="#/cek">' + ic('search') + esc(S('hero_cta_secondary', 'Cek Status Pesanan')) + '</a></div>' +
        '<div class="ps-row" aria-hidden="true">' + ic('psTriangle') + ic('psCircle') + ic('psCross') + ic('psSquare') + '</div>' +
      '</div><div>' + (hero ? '<img class="hero-banner" alt="Banner ' + esc(brand()) + '" src="' + esc(hero) + '" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{innerHTML:KGB.ic(\'playbox\',\'hero-art\')}).firstChild)">' : ic('playbox', 'hero-art')) + '</div></div></div>' +
      (ann ? '<div class="announce" role="note">' + ic('megaphone') + '<span>' + esc(ann) + '</span></div>' : '') +
      (pub.offline ? '<div class="alert warn mt">' + ic('warn') + '<div>Menampilkan data bawaan karena backend belum tersambung. Isi <span class="code">API_URL</span> di <span class="code">js/config.js</span> agar pemesanan berfungsi.</div></div>' : '') +
      sections().filter(function (x) { return x.show; }).map(function (x) { return '<section class="home-sec" data-sec="' + x.id + '">' + SEC[x.id](x) + '</section>'; }).join('') + footHtml();
    renderGames(); renderSched();
  }
  function renderGames() {
    var g = $('#g-grid'); if (!g) return;
    var q = gameQ.toLowerCase(), list = pub.games.filter(function (x) { return (!gameG || x.genre === gameG) && (!q || (x.title + ' ' + x.genre).toLowerCase().indexOf(q) > -1); });
    list.sort(function (a, b) { return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0); });
    var shown = gameAll ? list : list.slice(0, 15);
    g.innerHTML = list.length ? '<div class="game-grid">' + shown.map(function (x) { return gameCard(x); }).join('') + '</div>' + (list.length > shown.length ? '<div class="center mt"><button class="btn" data-allg>Tampilkan semua (' + list.length + ')</button></div>' : '') : UI.empty('search', 'Game tidak ditemukan. Request saja saat memesan.');
  }
  function renderSched() {
    var box = $('#sched-box'); if (!box) return;
    var now = Time.now(), start = now - 3600e3, span = 72 * 3600e3, rows = pub.units.map(function (u) {
      var bars = pub.schedule.filter(function (s) { return s.unit_id === u.unit_id; }).map(function (s) {
        var a = Math.max(Date.parse(s.start), start), b = Math.min(Date.parse(s.end), start + span); if (b <= a) return '';
        return '<i style="left:' + ((a - start) / span * 100).toFixed(2) + '%;width:' + Math.max((b - a) / span * 100, 1).toFixed(2) + '%" title="' + esc(Time.fmtShort(s.start) + ' - ' + Time.fmtShort(s.end)) + '"></i>';
      }).join('');
      return '<div class="sched-row"><b class="small">' + esc(u.unit_name.replace(/^Playbox PS4\s*/i, '')) + '</b><div class="sched-bar" role="img" aria-label="Jadwal ' + esc(u.unit_name) + '">' + bars + '<i class="now" style="left:' + ((now - start) / span * 100).toFixed(2) + '%"></i></div></div>';
    }).join('');
    var days = [0, 1, 2, 3].map(function (i) { return Time.fmt(start + i * 24 * 3600e3, { dateOnly: true, noYear: true }); });
    box.innerHTML = '<div class="sched">' + rows + '<div class="sched-axis"><span></span><div><span>' + days[0] + '</span><span>' + days[1] + '</span><span>' + days[2] + '</span><span>+3 hari</span></div></div></div>' +
      '<p class="tiny muted mt">Garis kuning = sekarang. Waktu dalam ' + esc(Time.tzLabel()) + '.</p>';
  }
  function socialHtml() {
    var ig = S('instagram_username'), tt = S('tiktok_username'), addr = S('location_address'), mp = S('maps_link') || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(/nabire/i.test(addr) ? addr : addr + ' Nabire');
    return '<div class="social">' +
      '<a class="soc wa" href="' + esc(waLink('Halo Admin ' + brand() + ', saya ingin bertanya tentang sewa Playbox PS4.')) + '" target="_blank" rel="noopener"><span class="ico">' + ic('whatsapp') + '</span><div><b>WhatsApp Admin</b><span>' + esc(waShow()) + '</span></div></a>' +
      (ig ? '<a class="soc ig" href="https://instagram.com/' + encodeURIComponent(ig) + '" target="_blank" rel="noopener"><span class="ico">' + ic('instagram') + '</span><div><b>Instagram</b><span>@' + esc(ig) + '</span></div></a>' : '') +
      (tt ? '<a class="soc tt" href="https://www.tiktok.com/@' + encodeURIComponent(tt) + '" target="_blank" rel="noopener"><span class="ico">' + ic('tiktok') + '</span><div><b>TikTok</b><span>@' + esc(tt) + '</span></div></a>' : '') +
      '<a class="soc mp" href="' + esc(mp) + '" target="_blank" rel="noopener"><span class="ico">' + ic('gmaps') + '</span><div><b>Lokasi</b><span>' + esc(addr) + '</span></div></a></div>';
  }
  function footHtml() { return '<footer class="foot"><div class="row between wrap-r"><span>' + (S('footer_text') ? esc(S('footer_text')) : '&copy; ' + new Date().getFullYear() + ' ' + esc(brand()) + '. Semua hak dilindungi.') + '</span><span>' + esc(S('footer_right', 'Sewa Playbox PS4 · Nabire')) + '</span></div></footer>'; }

  /* ================================================================== PESAN */
  var B = null;   // keadaan formulir
  function newB(args) {
    var pr = Store.get('profile', {}) || {}, me = K.Mem.isIn() && K.Mem.me, paket = '', unit = '';
    (args || []).forEach(function (a) { if (pkgById(a)) paket = a; else if (unitById(a)) unit = a; });      // "#/pesan//BOX-01" kehilangan segmen kosong, jadi dikenali dari isinya
    return { paket: paket, unit: unit, start: '', nama: me ? me.name : pr.nama || '', hp: me ? me.whatsapp_number : pr.hp || '', alamat: pr.alamat || (me && me.default_address) || '', games: [], gamesText: '', ktp: null, bayar: null, reqId: '', busy: false, promo: undefined, voucher: false };
  }
  function minLocal() { var t = Time.now() + 10 * 60000; t = Math.ceil(t / 900000) * 900000; return Time.toLocal(t); }
  function maxLocal() { return Time.toLocal(Time.now() + 60 * 86400000); }
  function bookingCalc() {
    var p = pkgById(B.paket), u = unitById(B.unit), r = { p: p, u: u, startMs: 0, endMs: 0, err: '' };
    r.price = p ? p.price : 0; r.disc = 0; r.promo = null; r.voucher = null; r.bonus = 0; r.member = K.Mem.isIn();
    if (r.member && p) {
      var opts = promosFor(p.package_id), pid = B.promo === undefined ? (bestPromo(p) || {}).promo_id : B.promo;
      r.promo = pid ? opts.filter(function (x) { return x.promo_id === pid; })[0] || null : null;
      if (r.promo) r.disc = promoDisc(r.promo, p.price);
      var md = memberData(), vs = md ? (md.vouchers || []).filter(function (v) { return v.status === 'Aktif'; }) : [];
      if (B.voucher && vs.length) { r.voucher = vs[0]; r.bonus = vs[0].hours; }
    }
    r.pay = r.price - r.disc;
    if (B.start) { r.startMs = Date.parse(Time.fromLocal(B.start)); if (p && r.startMs) r.endMs = r.startMs + (p.duration_hours + r.bonus) * 3600e3; }
    if (u && p && r.startMs) {
      if (r.startMs < Time.now() - 600000) r.err = 'Waktu mulai sudah lewat. Pilih waktu yang akan datang.';
      else if (u.current_status === 'Maintenance') r.err = 'Unit sedang maintenance. Pilih unit lain.';
      else {
        var hit = pub.schedule.filter(function (s) { return s.unit_id === u.unit_id && r.startMs < Date.parse(s.end) && r.endMs > Date.parse(s.start); })[0];
        var av = Date.parse(u.available_at);
        if (hit) r.err = 'Jadwal bentrok: unit ini terisi sampai ' + Time.fmt(hit.end) + ' ' + Time.tzLabel() + '. Pilih waktu lain atau unit lain.';
        else if (u.current_status === 'Sedang Disewa' && av > r.startMs) r.err = 'Unit masih disewa sampai ' + Time.fmt(u.available_at) + ' ' + Time.tzLabel() + '.';
      }
    }
    return r;
  }
  function renderPesan() {
    var root = $('#pesan-root'); if (!root || !B) return;
    var keep = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : '';
    var c = bookingCalc();
    var gamesSel = B.games;
    root.innerHTML =
      '<div class="section-head" style="margin-top:6px"><div><span class="eyebrow">' + ic('gamepad') + 'Langkah cepat</span><h2>Pesan Sewa Playbox</h2></div></div>' +
      '<form id="bk" class="book-grid" novalidate autocomplete="on"><div class="stack">' + memberCardHtml(c) +
      '<div class="card"><div class="card-title"><span class="step-num">1</span><h3>Pilih Paket</h3></div><div class="pk-grid" role="radiogroup" aria-label="Paket sewa">' + pub.packages.map(function (p) { return pkCard(p, p.package_id === B.paket, true); }).join('') + '</div><div class="field"><span class="err" id="e-paket"></span></div></div>' +
      '<div class="card"><div class="card-title"><span class="step-num">2</span><h3>Pilih Unit</h3></div><div class="unit-grid" role="radiogroup" aria-label="Unit Playbox">' + pub.units.map(function (u) {
        var st = unitState(u), off = u.current_status === 'Maintenance';
        return '<button type="button" class="unit" role="radio" aria-checked="' + (u.unit_id === B.unit) + '" aria-disabled="' + off + '" ' + (off ? 'disabled ' : '') + 'data-unit="' + esc(u.unit_id) + '"><div class="art"><img loading="lazy" alt="" src="' + esc(Art.unitImg(u)) + '" onerror="this.onerror=null;this.src=KGB.Art.unit()"></div><div><h4>' + esc(u.unit_name) + '</h4><div class="specs">' + esc(u.specs) + '</div><span class="badge ' + (st.cls === 'ok' ? 'ok' : st.cls === 'busy' ? 'warn' : 'bad') + '">' + esc(st.text) + '</span></div></button>';
      }).join('') + '</div><div class="field"><span class="err" id="e-unit"></span></div></div>' +
      '<div class="card"><div class="card-title"><span class="step-num">3</span><h3>Jadwal Mulai</h3></div><div class="field"><label for="f-start">Mulai sewa (' + esc(Time.tzLabel()) + ')</label><input class="in" id="f-start" type="datetime-local" step="900" min="' + minLocal() + '" max="' + maxLocal() + '" value="' + esc(B.start) + '" required>' +
        '<span class="hint">' + (c.endMs ? 'Selesai: <b>' + esc(Time.fmt(c.endMs)) + ' ' + esc(Time.tzLabel()) + '</b> (' + esc(durLabel(c.p.duration_hours)) + (c.bonus ? ' + ' + esc(durLabel(c.bonus)) + ' gratis' : '') + ')' : 'Pilih paket dan waktu untuk melihat jam selesai.') + '</span><span class="err" id="e-start">' + esc(c.err) + '</span></div></div>' +
      '<div class="card"><div class="card-title"><span class="step-num">4</span><h3>Data Penyewa</h3></div><div class="grid-2">' +
        '<div class="field"><label for="f-nama">Nama lengkap</label><input class="in" id="f-nama" name="name" autocomplete="name" maxlength="80" value="' + esc(B.nama) + '" placeholder="Sesuai KTP" required><span class="err" id="e-nama"></span></div>' +
        '<div class="field"><label for="f-hp">Nomor WhatsApp</label><input class="in" id="f-hp" name="tel" type="tel" inputmode="tel" autocomplete="tel" value="' + esc(B.hp) + '" placeholder="0857xxxxxxxx" required><span class="err" id="e-hp"></span></div></div>' +
        '<div class="field mt"><label for="f-alamat">Alamat pengantaran</label><textarea class="in" id="f-alamat" maxlength="300" placeholder="Jalan, nomor rumah/kamar, patokan" required>' + esc(B.alamat) + '</textarea><span class="err" id="e-alamat"></span></div>' +
        '<input class="hp" id="f-web" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"></div>' +
      '<div class="card"><div class="card-title"><span class="step-num">5</span><h3>Request Game <span class="muted small">(opsional)</span></h3></div><div class="game-grid" id="pick-games">' + pub.games.slice(0, 20).map(function (g) { return gameCard(g, true, gamesSel.indexOf(g.title) > -1); }).join('') + '</div>' +
        '<div class="field mt"><label for="f-gtxt">Game lain</label><input class="in" id="f-gtxt" maxlength="150" value="' + esc(B.gamesText) + '" placeholder="Ketik judul game lain bila perlu"></div></div>' +
      '<div class="card"><div class="card-title"><span class="step-num">6</span><h3>Dokumen</h3></div><div class="grid-2">' +
        uploadHtml('ktp', 'Foto KTP / jaminan', 'Wajib. Dipakai untuk verifikasi, hanya terlihat oleh admin.', B.ktp) + uploadHtml('bayar', 'Bukti pembayaran', 'Opsional. Kosongkan bila bayar di tempat (COD).', B.bayar) + '</div>' +
        '<p class="tiny muted mt">' + ic('shield') + ' Foto dikompres otomatis di HP Anda dan disimpan privat di Google Drive pemilik.</p></div>' +
      '</div>' +
      '<aside class="summary stack"><div class="card hl"><div class="card-title">' + ic('receipt') + '<h3>Ringkasan</h3></div>' + summaryHtml(c) +
        '<button class="btn gold block mt hide-m-x" type="submit" id="bk-submit"' + (B.busy ? ' disabled' : '') + '>' + ic('send') + (B.busy ? 'Mengirim...' : 'Kirim Pesanan') + '</button>' +
        '<p class="tiny muted mt center">Dengan mengirim, Anda menyetujui data diproses untuk keperluan sewa. Admin akan mengonfirmasi lewat WhatsApp.</p></div>' +
        '<div class="alert">' + ic('info') + '<div>Butuh bantuan? <a href="' + esc(waLink('Halo Admin, saya butuh bantuan memesan Playbox PS4.')) + '" target="_blank" rel="noopener">Chat admin di WhatsApp</a>.</div></div></aside></form>' +
      '<div class="mobile-total"><div class="grow"><div class="tiny muted">Total</div><b id="mt-total">' + rp(c.p ? c.pay : 0) + '</b></div><button class="btn gold" id="mt-submit" type="button"' + (B.busy ? ' disabled' : '') + '>' + ic('send') + 'Kirim</button></div>';
    var fe = keep && document.getElementById(keep); if (fe && fe.focus) { fe.focus(); try { var v = fe.value; if (fe.setSelectionRange && /text|tel|search/.test(fe.type || 'textarea')) fe.setSelectionRange(v.length, v.length); } catch (e) { /* abaikan */ } }
    $$('.hide-m-x', root).forEach(function (b) { b.classList.add('hide-m-btn'); });
  }
  /** Kartu di atas formulir: tamu diajak mendaftar (opsional), member memilih promo/voucher. */
  function memberCardHtml(c) {
    if (S('member_enabled', 'YA') === 'TIDAK') return '';
    var L = loyalty();
    if (!K.Mem.isIn()) {
      return '<div class="card member-nudge"><div class="row wrap-r" style="align-items:flex-start;gap:14px"><span class="nudge-ic">' + ic('crown') + '</span><div class="grow"><b>Punya akun? Lebih hemat.</b><p class="small muted" style="margin-top:4px">Member mendapat promo diskon dari admin' + (L.enabled ? ' dan voucher <b>GRATIS ' + esc(durLabel(L.rewardHours)) + '</b> setiap ' + L.target + 'x sewa (dalam ' + L.windowDays + ' hari)' : '') + '. Tanpa akun tetap bisa memesan sekarang dengan harga normal.</p></div></div><div class="row wrap-r mt"><a class="btn sm gold" href="#/akun/pesan">' + ic('user') + 'Masuk / Daftar gratis</a><span class="small muted">atau lanjutkan di bawah sebagai tamu</span></div></div>';
    }
    var md = memberData(), me = K.Mem.me || {}, vs = md ? (md.vouchers || []).filter(function (v) { return v.status === 'Aktif'; }) : [];
    var opts = c.p ? promosFor(c.p.package_id) : [], sel = c.promo ? c.promo.promo_id : '';
    var pl = !c.p ? '<p class="small muted">Pilih paket untuk melihat promo yang tersedia.</p>' : opts.length ?
      '<div class="opt-list" role="radiogroup" aria-label="Promo">' + opts.map(function (p) { return '<button type="button" class="opt" role="radio" aria-checked="' + (sel === p.promo_id) + '" data-promo="' + esc(p.promo_id) + '"><span class="dotr"></span><span class="grow"><b>' + esc(p.title) + '</b><span class="small muted"> ' + esc(promoLabel(p)) + (p.end_at ? ' · sampai ' + fmtYmd(p.end_at) : '') + '</span></span><b class="ok-t">-' + rp(promoDisc(p, c.p.price)) + '</b></button>'; }).join('') +
        '<button type="button" class="opt" role="radio" aria-checked="' + (!sel) + '" data-promo=""><span class="dotr"></span><span class="grow">Tanpa promo</span></button></div>' : '<p class="small muted">Belum ada promo untuk paket ini.</p>';
    var vl = vs.length ? '<label class="vouch' + (B.voucher ? ' on' : '') + '"><input type="checkbox" id="f-voucher"' + (B.voucher ? ' checked' : '') + '><span class="grow"><b>Pakai voucher GRATIS ' + esc(durLabel(vs[0].hours)) + '</b><span class="small muted"> · berlaku sampai ' + esc(Time.fmt(vs[0].expires_at, { dateOnly: true })) + '</span><span class="tiny muted" style="display:block">Total sewa jadi paket pilihan + ' + esc(durLabel(vs[0].hours)) + ' gratis. Anda punya ' + vs.length + ' voucher.</span></span></label>' :
      (L.enabled ? '<p class="small muted">' + ic('trophy') + ' Progres voucher: ' + (md && md.loyalty ? md.loyalty.count : 0) + ' dari ' + L.target + ' sewa selesai.</p>' : '');
    return '<div class="card hl member-card"><div class="row between wrap-r"><div class="row"><span class="nudge-ic">' + ic('crown') + '</span><div><span class="eyebrow">Memesan sebagai member</span><div><b>' + esc(me.name || 'Member') + '</b></div></div></div><a class="btn xs" href="#/akun">Akun</a></div><div class="stack mt">' + pl + vl + '</div></div>';
  }
  function uploadHtml(kind, label, hint, f) {
    return '<div class="field"><label for="up-' + kind + '">' + label + '</label><div class="upload' + (f ? ' has' : '') + '" data-up="' + kind + '">' +
      (f ? '<img alt="Pratinjau ' + esc(label) + '" src="' + esc(f.dataUrl) + '"><span class="small">' + esc(f.name) + ' &middot; ' + Math.round(f.size / 1024) + ' KB</span><button type="button" class="btn xs danger" data-rm="' + kind + '">' + ic('trash') + 'Hapus</button>'
        : ic('camera', 'ic-lg') + '<b>Ketuk untuk unggah / foto</b><span class="small">JPG atau PNG, maksimal 5 MB</span>') +
      '<input id="up-' + kind + '" type="file" accept="image/*"' + (kind === 'ktp' ? ' capture="environment"' : '') + (f ? ' tabindex="-1" style="display:none"' : '') + '></div><span class="hint">' + hint + '</span><span class="err" id="e-' + kind + '"></span></div>';
  }
  function summaryHtml(c) {
    var g = B.games.concat(B.gamesText ? [B.gamesText] : []).join(', ');
    return '<div class="sum-line"><span>Paket</span><b>' + (c.p ? esc(c.p.package_name) : '-') + '</b></div><div class="sum-line"><span>Unit</span><b>' + (c.u ? esc(c.u.unit_name) : '-') + '</b></div>' +
      '<div class="sum-line"><span>Mulai</span><b>' + (c.startMs ? esc(Time.fmt(c.startMs)) : '-') + '</b></div><div class="sum-line"><span>Selesai</span><b>' + (c.endMs ? esc(Time.fmt(c.endMs)) : '-') + '</b></div>' +
      '<div class="sum-line"><span>Game</span><b>' + (g ? esc(g) : '-') + '</b></div><div class="sum-line"><span>Pembayaran</span><b>' + (B.bayar ? 'Bukti terlampir' : 'Bayar di tempat / nanti') + '</b></div>' +
      (c.disc ? '<div class="sum-line"><span>Harga normal</span><b>' + rp(c.price) + '</b></div><div class="sum-line ok"><span>Promo ' + esc(c.promo.title) + '</span><b>-' + rp(c.disc) + '</b></div>' : '') +
      (c.bonus ? '<div class="sum-line ok"><span>Bonus voucher</span><b>GRATIS ' + esc(durLabel(c.bonus)) + '</b></div>' : '') +
      (!c.member && c.p ? '<div class="sum-line muted"><span>Tanpa akun</span><b>Harga normal</b></div>' : '') +
      '<div class="sum-total"><span>Total bayar</span><b id="sum-total">' + rp(c.p ? c.pay : 0) + '</b></div>';
  }
  function refreshSummary() {
    var c = bookingCalc(), box = $('.summary .card'), e = $('#e-start');
    if (box) { var tot = $('.sum-total', box); var lines = box.querySelectorAll('.sum-line, .sum-total'); lines.forEach(function (n) { n.remove(); }); var anchor = $('#bk-submit', box); anchor.insertAdjacentHTML('beforebegin', summaryHtml(c)); }
    if (e) e.textContent = c.err;
    var mt = $('#mt-total'); if (mt) mt.textContent = rp(c.p ? c.pay : 0);
    var hint = $('#f-start') && $('#f-start').parentNode.querySelector('.hint'); if (hint) hint.innerHTML = c.endMs ? 'Selesai: <b>' + esc(Time.fmt(c.endMs)) + ' ' + esc(Time.tzLabel()) + '</b> (' + esc(durLabel(c.p.duration_hours)) + (c.bonus ? ' + ' + esc(durLabel(c.bonus)) + ' gratis' : '') + ')' : 'Pilih paket dan waktu untuk melihat jam selesai.';
  }
  function validatePesan() {
    var c = bookingCalc(), err = {}, hp = K.hp08(B.hp);
    if (!B.paket) err.paket = 'Pilih salah satu paket.';
    if (!B.unit) err.unit = 'Pilih unit Playbox.';
    if (!B.start) err.start = 'Pilih tanggal dan jam mulai.'; else if (c.err) err.start = c.err;
    if (B.nama.trim().length < 2) err.nama = 'Nama lengkap wajib diisi.';
    if (!/^08\d{8,12}$/.test(hp)) err.hp = 'Nomor WhatsApp tidak valid. Contoh: 085750686582.';
    if (B.alamat.trim().length < 10) err.alamat = 'Tulis alamat lengkap dan patokan (min. 10 huruf).';
    if (!B.ktp) err.ktp = 'Foto KTP / jaminan wajib diunggah.';
    ['paket', 'unit', 'start', 'nama', 'hp', 'alamat', 'ktp'].forEach(function (k) { var el = $('#e-' + k); if (el) el.textContent = err[k] || ''; var inp = $('#f-' + k); if (inp) inp.setAttribute('aria-invalid', err[k] ? 'true' : 'false'); });
    return err;
  }
  /** Kompres di perangkat: sisi terpanjang 1200 px, JPEG 0,75. Menolak berkas > 5 MB sebelum kompresi. */
  function compress(file) {
    return new Promise(function (res, rej) {
      if (!file) return rej(new Error('Tidak ada berkas.'));
      if (!/^image\//.test(file.type)) return rej(new Error('Berkas harus berupa gambar (JPG/PNG).'));
      if (file.size > 5 * 1024 * 1024) return rej(new Error('Ukuran foto lebih dari 5 MB. Pilih foto yang lebih kecil.'));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 1200, r = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.width * r)); cv.height = Math.max(1, Math.round(img.height * r));
        var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
        var q = 0.75, d = cv.toDataURL('image/jpeg', q);
        while (d.length * 0.75 > 2.6 * 1024 * 1024 && q > 0.35) { q -= 0.1; d = cv.toDataURL('image/jpeg', q); }
        URL.revokeObjectURL(url); res({ dataUrl: d, name: (file.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg', size: Math.round(d.length * 0.75) });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Foto tidak bisa dibaca. Coba foto lain.')); };
      img.src = url;
    });
  }
  function saveDraft() { Store.set('profile', { nama: B.nama, hp: B.hp, alamat: B.alamat }); }
  function bindPesan(root) {
    root.addEventListener('click', function (e) {
      var pk = e.target.closest('[data-pk]'); if (pk) { B.paket = pk.getAttribute('data-pk'); renderPesan(); return; }
      var pm = e.target.closest('[data-promo]'); if (pm) { B.promo = pm.getAttribute('data-promo'); renderPesan(); return; }
      var un = e.target.closest('[data-unit]'); if (un && !un.disabled) { B.unit = un.getAttribute('data-unit'); renderPesan(); return; }
      var gm = e.target.closest('[data-game]'); if (gm) { var t = gm.getAttribute('data-game'), i = B.games.indexOf(t); if (i > -1) B.games.splice(i, 1); else B.games.push(t); gm.setAttribute('aria-pressed', i === -1); refreshSummary(); return; }
      var rm = e.target.closest('[data-rm]'); if (rm) { B[rm.getAttribute('data-rm')] = null; renderPesan(); return; }
      if (e.target.closest('#mt-submit')) { submitPesan(); }
    });
    root.addEventListener('input', function (e) {
      var id = e.target.id;
      if (id === 'f-nama') B.nama = e.target.value; else if (id === 'f-hp') B.hp = e.target.value; else if (id === 'f-alamat') B.alamat = e.target.value; else if (id === 'f-gtxt') { B.gamesText = e.target.value; refreshSummary(); }
      if (id === 'f-nama' || id === 'f-hp' || id === 'f-alamat') saveDraft();
    });
    root.addEventListener('change', function (e) {
      var id = e.target.id;
      if (id === 'f-start') { B.start = e.target.value; refreshSummary(); return; }
      if (id === 'f-voucher') { B.voucher = e.target.checked; renderPesan(); return; }
      if (id === 'up-ktp' || id === 'up-bayar') {
        var kind = id.slice(3), f = e.target.files && e.target.files[0], err = $('#e-' + kind);
        if (!f) return; if (err) err.textContent = 'Memproses foto...';
        compress(f).then(function (r) { B[kind] = r; renderPesan(); }, function (er) { if (err) err.textContent = er.message; UI.toast(er.message, 'bad'); e.target.value = ''; });
      }
    });
    ['dragover', 'dragenter'].forEach(function (ev) { root.addEventListener(ev, function (e) { var u = e.target.closest('.upload'); if (u) { e.preventDefault(); u.classList.add('drag'); } }); });
    ['dragleave', 'drop'].forEach(function (ev) { root.addEventListener(ev, function (e) { var u = e.target.closest('.upload'); if (u) u.classList.remove('drag'); }); });
    root.addEventListener('drop', function (e) { var u = e.target.closest('.upload'); if (!u) return; e.preventDefault(); var f = e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return; var kind = u.getAttribute('data-up'); compress(f).then(function (r) { B[kind] = r; renderPesan(); }, function (er) { UI.toast(er.message, 'bad'); }); });
    root.addEventListener('submit', function (e) { e.preventDefault(); submitPesan(); });
  }
  function submitPesan() {
    if (B.busy) return;
    var err = validatePesan(), keys = Object.keys(err);
    if (keys.length) { UI.toast(err[keys[0]], 'bad'); var el = $('#e-' + keys[0]); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    B.busy = true; renderPesan();
    if (!B.reqId) B.reqId = K.uid();
    var data = { customer_name: B.nama.trim(), whatsapp_number: K.hp08(B.hp), delivery_address: B.alamat.trim(), unit_id: B.unit, package_id: B.paket,
      selected_games: B.games.concat(B.gamesText ? [B.gamesText.trim()] : []).join(', '), start_time: Time.fromLocal(B.start), ktp_data: B.ktp.dataUrl, payment_data: B.bayar ? B.bayar.dataUrl : '', website: ($('#f-web') || {}).value || '' };
    var cc = bookingCalc(), asM = K.Mem.isIn();
    if (asM) { data.as_member = true; data.promo_id = cc.promo ? cc.promo.promo_id : ''; data.voucher_id = cc.voucher ? cc.voucher.voucher_id : ''; }
    K.api('createBooking', data, { reqId: B.reqId, write: true, token: asM ? K.Mem.token : '' }).then(function (res) {
      B.busy = false;
      if (!res.success) {
        B.reqId = res.code === 'NET' ? B.reqId : ''; if (res.code === 'AUTH_MEMBER') B.promo = undefined;
        renderPesan(); UI.toast(res.message || 'Gagal mengirim pesanan.', 'bad');
        if (res.code === 'BENTROK' || res.code === 'PROMO') loadPub(true);
        if (res.code === 'VOUCHER' && K.Member) K.Member.refresh(true);
        return;
      }
      Orders.add(res.data); B = newB([]); loadPub(true); if (asM && K.Member) K.Member.refresh(true);
      UI.toast('Pesanan terkirim. Kode: ' + res.data.booking_id);
      Router.go('struk/' + res.data.booking_id);
    });
  }

  /* ================================================================== STRUK */
  function renderStruk(args) {
    var root = $('#struk-root'), id = args[0] || '', o = Orders.get(id);
    if (!id) { root.innerHTML = UI.empty('receipt', 'Belum ada struk. Pesan dulu untuk mendapatkan struk.') + '<div class="center"><a class="btn gold" href="#/pesan">Pesan sekarang</a></div>'; return; }
    if (!o) {
      root.innerHTML = '<div class="empty">' + ic('loader', 'spin') + '<p>Memuat struk ' + esc(id) + '...</p></div>';
      K.api('checkOrder', { query: id }).then(function (r) {
        var x = r.success && r.data.orders && r.data.orders[0];
        if (!x) { root.innerHTML = UI.empty('search', 'Struk ' + id + ' tidak ditemukan.') + '<div class="center"><a class="btn" href="#/cek">Cek status</a></div>'; return; }
        root.innerHTML = receiptHtml(Object.assign({ delivery_address: '(disamarkan)', selected_games: '', duration_hours: 0, brand_name: brand(), location_address: S('location_address') }, x, { whatsapp_number: x.whatsapp_masked }), true);
      });
      return;
    }
    root.innerHTML = receiptHtml(o, false);
  }
  function receiptHtml(o, masked) {
    var st = o.booking_status, wa = o.wa_url || waLink('Halo Admin, saya ingin konfirmasi pesanan ' + o.booking_id);
    return '<div class="no-print row between wrap-r mb" style="max-width:560px;margin:0 auto 14px"><a class="btn sm ghost" href="#/">' + ic('home') + 'Beranda</a><div class="row wrap-r"><button class="btn sm" data-copy="' + esc(o.booking_id) + '">' + ic('copy') + 'Salin kode</button><button class="btn sm primary" data-print>' + ic('printer') + 'Cetak / Simpan PDF</button></div></div>' +
      '<article class="receipt" aria-label="Struk pesanan ' + esc(o.booking_id) + '"><div class="receipt-head">' + ic('logo') + '<div><b>' + esc(o.brand_name || brand()) + '</b><small>Struk Pemesanan Sewa Playbox PS4</small></div></div>' +
      '<div class="receipt-body"><div class="line"><span>Kode booking</span><b>' + esc(o.booking_id) + '</b></div>' +
      (o.created_at ? '<div class="line"><span>Dipesan</span><b>' + esc(Time.fmt(o.created_at)) + '</b></div>' : '') +
      '<div class="line"><span>Nama</span><b>' + esc(o.customer_name) + '</b></div><div class="line"><span>WhatsApp</span><b>' + esc(o.whatsapp_number) + '</b></div>' +
      (masked ? '' : '<div class="line"><span>Alamat antar</span><b>' + esc(o.delivery_address) + '</b></div>') +
      '<div class="line"><span>Unit</span><b>' + esc(o.unit_name) + '</b></div><div class="line"><span>Paket</span><b>' + esc(o.package_name) + (o.duration_hours ? ' (' + esc(durLabel(o.duration_hours)) + (o.bonus_hours ? ' + ' + esc(durLabel(o.bonus_hours)) + ' gratis' : '') + ')' : '') + '</b></div>' +
      '<div class="line"><span>Mulai</span><b>' + esc(Time.fmt(o.start_time)) + ' ' + esc(Time.tzLabel()) + '</b></div><div class="line"><span>Selesai</span><b>' + esc(Time.fmt(o.end_time)) + ' ' + esc(Time.tzLabel()) + '</b></div>' +
      (o.selected_games ? '<div class="line"><span>Request game</span><b>' + esc(o.selected_games) + '</b></div>' : '') +
      '<div class="line"><span>Status</span><b>' + UI.badge(st) + ' ' + UI.badge(o.payment_status) + '</b></div>' +
      (o.discount ? '<div class="line"><span>Harga normal</span><b>' + rp(o.normal_price || (o.package_price + o.discount)) + '</b></div><div class="line"><span>Promo' + (o.promo_title ? ' ' + esc(o.promo_title) : '') + '</span><b>-' + rp(o.discount) + '</b></div>' : '') +
      (o.bonus_hours ? '<div class="line"><span>Bonus voucher</span><b>GRATIS ' + esc(durLabel(o.bonus_hours)) + '</b></div>' : '') + (o.member ? '<div class="line"><span>Akun</span><b>Member</b></div>' : '') +
      '<div class="total"><span>TOTAL BAYAR</span><b>' + rp(o.package_price) + '</b></div>' +
      '<div class="barcode">' + K.Barcode.svg(o.booking_id, { module: 2, height: 70 }) + '<small>' + esc(o.booking_id) + '</small></div></div>' +
      '<div class="note">Simpan kode booking ini untuk cek status di menu <b>Cek Status</b>. Admin akan menghubungi Anda lewat WhatsApp untuk konfirmasi. ' + esc(o.location_address || S('location_address')) + '</div></article>' +
      '<div class="no-print stack center" style="max-width:560px;margin:18px auto 0"><a class="btn wa block" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ic('whatsapp') + 'Konfirmasi ke Admin via WhatsApp</a><a class="btn block" href="#/cek/' + encodeURIComponent(o.booking_id) + '">' + ic('search') + 'Lihat status pesanan</a></div>';
  }

  /* ================================================================== CEK STATUS */
  var cekData = {}, cekTimer = null, tickTimer = null, cekQuery = '';
  function orderCard(o) {
    var st = o.booking_status, idx = { 'Menunggu Konfirmasi': 0, 'Sedang Disewa': 1, 'Selesai': 2 }[st], cancel = st === 'Dibatalkan';
    var stepper = cancel ? '<div class="stepper cancel"><div class="now">Dibatalkan</div><div></div><div></div></div>' :
      '<div class="stepper">' + ['Menunggu', 'Sedang Disewa', 'Selesai'].map(function (t, i) { return '<div class="' + (i < idx ? 'done' : i === idx ? 'done now' : '') + '">' + t + '</div>'; }).join('') + '</div>';
    var cd = '';
    if (st === 'Sedang Disewa') cd = '<div class="alert ok mt">' + ic('timer') + '<div>Sisa waktu sewa<div class="countdown" data-cd="' + esc(o.end_time) + '">--:--:--</div></div></div>';
    else if (st === 'Menunggu Konfirmasi') cd = '<div class="alert mt">' + ic('clock') + '<div>Menunggu konfirmasi admin. Anda akan dihubungi lewat WhatsApp.</div></div>';
    return '<article class="card order-card mt"><div class="row between wrap-r"><div><div class="num" style="font-size:17px">' + esc(o.booking_id) + '</div><div class="small muted">' + esc(o.customer_name) + ' &middot; ' + esc(o.whatsapp_masked || '') + '</div></div><div class="row wrap-r">' + UI.badge(st) + UI.badge(o.payment_status) + '</div></div>' + stepper + cd +
      '<div class="meta"><span>Unit</span><b>' + esc(o.unit_name) + '</b><span>Paket</span><b>' + esc(o.package_name) + '</b><span>Mulai</span><b>' + esc(Time.fmt(o.start_time)) + '</b><span>Selesai</span><b>' + esc(Time.fmt(o.end_time)) + '</b><span>Total</span><b>' + rp(o.package_price) + (o.discount ? ' <span class="small ok-t">(hemat ' + rp(o.discount) + ')</span>' : '') + '</b>' + (o.bonus_hours ? '<span>Bonus</span><b class="ok-t">GRATIS ' + esc(durLabel(o.bonus_hours)) + '</b>' : '') + '</div>' +
      '<div class="row wrap-r mt"><a class="btn sm" href="#/struk/' + encodeURIComponent(o.booking_id) + '">' + ic('receipt') + 'Struk</a><a class="btn sm wa" href="' + esc(waLink('Halo Admin, saya ingin menanyakan pesanan ' + o.booking_id)) + '" target="_blank" rel="noopener">' + ic('whatsapp') + 'Tanya admin</a></div></article>';
  }
  function renderCek() {
    var root = $('#cek-root'); if (!root) return;
    var q = $('#c-q'), val = q ? q.value : cekQuery;
    var list = Object.keys(cekData).map(function (k) { return cekData[k]; }).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    root.innerHTML = '<div class="section-head" style="margin-top:6px"><div><span class="eyebrow">' + ic('search') + 'Pantau pesanan</span><h2>Cek Status Pesanan</h2></div></div>' +
      '<form id="c-form" class="card row wrap-r" style="align-items:flex-end"><div class="field grow" style="min-width:220px"><label for="c-q">Kode booking atau nomor WhatsApp</label><input id="c-q" class="in" value="' + esc(val) + '" placeholder="KGB-20261022-001 atau 0857..." autocomplete="off"></div><button class="btn primary" type="submit">' + ic('search') + 'Cek</button></form>' +
      '<div id="c-res">' + (list.length ? list.map(orderCard).join('') : (cekQuery ? UI.empty('search', 'Pesanan tidak ditemukan. Periksa kode atau nomor WhatsApp.') : '<div class="empty">' + ic('receipt') + '<p>Masukkan kode booking atau nomor WhatsApp Anda.</p></div>')) + '</div>';
    tick();
  }
  function tick() { $$('[data-cd]').forEach(function (el) { var l = Time.left(el.getAttribute('data-cd')); el.textContent = l; if (l.charAt(0) === '+') el.style.color = 'var(--bad)'; }); }
  function addOrders(arr) { (arr || []).forEach(function (o) { cekData[o.booking_id] = o; }); }
  function fetchCek(query, force) {
    return K.swr('c:chk:' + query, 'checkOrder', { query: query }, function (d) { addOrders(d.orders); if (Router.cur === 'cek') renderCek(); }, { force: force, fresh: 8000 });
  }
  function startPoll() {
    stopPoll();
    cekTimer = setInterval(function () {
      if (document.hidden || Router.cur !== 'cek') return;
      var active = Object.keys(cekData).some(function (k) { var s = cekData[k].booking_status; return s === 'Menunggu Konfirmasi' || s === 'Sedang Disewa'; });
      if (!active) return;
      var qs = {}; Object.keys(cekData).forEach(function (k) { var o = cekData[k]; qs[Orders.get(k) ? Orders.get(k).whatsapp_number : (cekQuery || k)] = 1; });
      Object.keys(qs).slice(0, 2).forEach(function (q) { fetchCek(q, true); });
    }, CFG.POLL_STATUS_MS || 20000);
    tickTimer = setInterval(function () { if (!document.hidden && Router.cur === 'cek') tick(); }, 1000);
  }
  function stopPoll() { clearInterval(cekTimer); clearInterval(tickTimer); }
  function bindCek(root) {
    root.addEventListener('submit', function (e) {
      if (e.target.id !== 'c-form') return; e.preventDefault();
      var v = $('#c-q').value.trim(); cekQuery = v; if (v.length < 6) { UI.toast('Masukkan kode booking atau nomor WhatsApp yang lengkap.', 'bad'); return; }
      cekData = {}; var btn = $('button[type=submit]', e.target);
      UI.busy(btn, fetchCek(/^kgb-/i.test(v) ? v.toUpperCase() : K.hp08(v), true)).then(function (r) { if (!r.success) UI.toast(r.message || 'Gagal memeriksa.', 'bad'); else renderCek(); });
    });
  }

  /* ================================================================== KONTAK */
  function renderKontak() {
    $('#kontak-root').innerHTML = '<div class="section-head" style="margin-top:6px"><div><span class="eyebrow">' + ic('pin') + 'Hubungi kami</span><h2>Lokasi &amp; Kontak</h2></div></div>' + socialHtml() +
      '<div class="card mt-lg" style="margin-top:22px"><div class="card-title">' + ic('truck') + '<h3>Layanan antar jemput</h3></div><p class="muted">Playbox diantar ke rumah, kost, cafe, atau tempat tongkrongan Anda dan diambil kembali setelah masa sewa selesai. Alamat antar diisi saat pemesanan.</p></div>' +
      '<div class="card" style="margin-top:14px"><div class="card-title">' + ic('shield') + '<h3>Syarat singkat</h3></div><ul class="stack muted" style="padding-left:18px"><li>Wajib melampirkan foto KTP atau identitas jaminan.</li><li>Kerusakan akibat kelalaian penyewa menjadi tanggung jawab penyewa.</li><li>Perpanjangan waktu: hubungi admin sebelum masa sewa berakhir.</li></ul></div>' + footHtml();
  }

  /* ================================================================== ADMIN (dimuat saat dibutuhkan) */
  var adminP = null;
  function loadAdmin() {
    if (K.Admin) return Promise.resolve();
    if (adminP) return adminP;
    adminP = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'js/admin.js'; s.onload = res; s.onerror = function () { adminP = null; rej(new Error('Modul admin gagal dimuat.')); }; document.head.appendChild(s); });
    return adminP;
  }

  /* ================================================================== PENDAFTARAN HALAMAN & BOOT */
  function initHome(el) {
    if (el.dataset.hinit) return; el.dataset.hinit = '1';
    el.addEventListener('input', function (e) { if (e.target.id === 'g-q') { gameQ = e.target.value; gameAll = false; renderGames(); } });
    el.addEventListener('click', function (e) {
      var c = e.target.closest('[data-g]'); if (c) { gameG = c.getAttribute('data-g'); gameAll = false; $$('#g-chips .chip').forEach(function (b) { b.setAttribute('aria-pressed', b === c); }); renderGames(); }
      if (e.target.closest('[data-allg]')) { gameAll = true; renderGames(); }
    });
    renderHome();
  }
  Router.add('home', { el: 'pg-home', title: 'Sewa Playbox PS4', init: initHome });
  /** Menu Paket: halaman beranda yang langsung menggulir ke bagian paket sewa. */
  var wantPaket = false;
  function scrollPaket() {
    if (!wantPaket || Router.cur !== 'paket') return;
    var t = $('[data-sec=packages]') || $('[data-sec=avail]'); if (!t) return;
    wantPaket = false; t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  Router.add('paket', { el: 'pg-home', title: 'Paket Sewa', init: initHome, show: function () { wantPaket = true; setTimeout(scrollPaket, 80); } });
  Router.add('pesan', { el: 'pg-pesan', title: 'Pesan Sewa', init: function (el) { bindPesan(el); }, show: function (el, args) {
    if (!B || (args.length && (args[0] || args[1]))) { var keepGames = B && B.games; B = newB(args); if (keepGames && !args.length) B.games = keepGames; }
    if (args[0] === '' && !args[1]) { /* tanpa pilihan */ }
    if (!B.start) { B.start = ''; }
    renderPesan(); loadPub(false);
  } });
  Router.add('cek', { el: 'pg-cek', title: 'Cek Status', init: function (el) { bindCek(el); }, show: function (el, args) {
    renderCek(); startPoll();
    var arg = args[0] ? decodeURIComponent(args[0]) : '';
    if (arg) { cekQuery = arg; fetchCek(arg.toUpperCase(), false); }
    else if (!Object.keys(cekData).length && Orders.hps().length) { Orders.hps().slice(0, 2).forEach(function (hp) { fetchCek(hp, false); }); }
    else if (Object.keys(cekData).length) { Orders.hps().slice(0, 2).forEach(function (hp) { fetchCek(hp, false); }); }
  } });
  Router.add('struk', { el: 'pg-struk', title: 'Struk', show: function (el, args) { renderStruk(args); } });
  Router.add('kontak', { el: 'pg-kontak', title: 'Lokasi & Kontak', show: function () { renderKontak(); } });
  Router.add('admin', { el: 'pg-admin', title: 'Admin', init: function (el) {
    el.querySelector('#admin-root').innerHTML = '<div class="empty">' + ic('loader', 'spin') + '<p>Memuat panel admin...</p></div>';
  }, show: function (el, args) {
    var root = $('#admin-root');
    loadAdmin().then(function () { K.Admin.show(root, args); }, function (e) { root.innerHTML = errBox(e.message); });
  } });
  Router.hooks.push(function (r) { if (r.name !== 'cek') stopPoll(); if (r.name !== 'admin' && K.Admin && K.Admin.leave) K.Admin.leave(); });
  listeners.push(function () {
    var cur = Router.cur;
    if (cur === 'home' || cur === 'paket' || $('#home-root').dataset.ready) { renderHome(); if (cur === 'paket') setTimeout(scrollPaket, 60); }
    if (cur === 'pesan' && B && !B.busy) { var active = document.activeElement; if (!(active && /INPUT|TEXTAREA/.test(active.tagName))) renderPesan(); else refreshSummary(); }
    if (cur === 'admin' && K.Admin && K.Admin.pubChanged) K.Admin.pubChanged();
    if (cur === 'kontak') renderKontak();
    if (cur === 'struk') renderStruk(Router.parse().args);
  });

  // klik pada elemen struk (cetak/salin)
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-print]')) { w.print(); }
    var cp = e.target.closest('[data-copy]'); if (cp) { var t = cp.getAttribute('data-copy'); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { UI.toast('Kode disalin: ' + t); }, function () { UI.toast('Kode: ' + t, 'warn'); }); }
  });

  // tema
  function setTheme(t) { document.documentElement.setAttribute('data-theme', t); var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t === 'light' ? '#f3f6fb' : '#090d16'); var b = $('#theme-btn'); if (b) b.innerHTML = ic(t === 'light' ? 'moon' : 'sun'); }
  setTheme(Store.get('theme', 'dark'));
  $('#theme-btn').addEventListener('click', function () { var t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; Store.set('theme', t); setTheme(t); });
  w.paintIcons(document); setTheme(Store.get('theme', 'dark'));

  // prefetch modul admin saat disentuh/di-hover & saat idle bila sudah pernah login
  var warm = function () { loadAdmin().catch(function () { /* diam */ }); };
  K.Auth.load(); K.Mem.load();
  if (K.Auth.isAdmin()) setTimeout(function () { try { warm(); } catch (e) { /* tidak boleh menghentikan tampilan */ } }, 800);

  // pulihkan data tersimpan agar halaman langsung terisi, lalu segarkan
  K.pub = pub; K.brand = brand(); if (pub.settings && pub.settings.timezone) Time.tz = pub.settings.timezone;
  K.App = { loadPub: loadPub, pub: function () { return pub; }, waLink: waLink, S: S, Orders: Orders, durLabel: durLabel, applyPub: applyPub, loyalty: loyalty, promoLabel: promoLabel, promoDisc: promoDisc, fmtYmd: fmtYmd, loyaltyDots: loyaltyDots, sections: sections, SEC_DEF: SEC_DEF, SEC_ORDER: SEC_ORDER, pkgById: pkgById, rerenderPesan: function () { if (B && !B.busy) renderPesan(); }, rerenderHome: function () { if ($('#home-root').dataset.ready) renderHome(); } };
  Router.start();
  loadPub(false);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - (Store.get(CKEY, {}) || {}).t > 120000) loadPub(true); });
  w.addEventListener('kgb:member-expired', function () { UI.toast('Sesi akun berakhir. Silakan masuk lagi.', 'warn'); if (B) { B.promo = undefined; B.voucher = false; } if (Router.cur === 'akun' || Router.cur === 'pesan') Router.render(); });
  w.addEventListener('kgb:auth-expired', function () { UI.toast('Sesi admin berakhir. Silakan masuk lagi.', 'warn'); if (Router.cur === 'admin') Router.render(); });
})(window);
