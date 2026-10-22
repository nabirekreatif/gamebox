/* Kings Gaming Box — core.js : helper, waktu, penyimpanan (SWR), klien API, router, UI (toast/sheet/dialog). Tanpa framework. */
(function (w) {
  'use strict';
  var CFG = w.APP_CONFIG || {};
  var NS = 'kgb:v1:';
  var K = w.KGB = w.KGB || {};

  /* ------------------------------------------------------------------ DOM & format */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };
  var ic = function (n, c) { return typeof w.icon === 'function' ? w.icon(n, c) : ''; };
  var rp = function (n) { return 'Rp ' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var rpk = function (n) { n = Number(n) || 0; return n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.', ',') + ' jt' : n >= 1e3 ? Math.round(n / 1e3) + ' rb' : String(n); };
  var debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; };
  var uid = function () { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };
  var hp08 = function (v) {
    var s = String(v == null ? '' : v).trim().replace(/[^0-9+]/g, '').replace(/^\+/, '');
    if (!s) return '';
    if (s.indexOf('62') === 0) s = '0' + s.substring(2); else if (s.charAt(0) === '8') s = '0' + s;
    return s;
  };
  var hpValid = function (v) { return /^08\d{8,12}$/.test(hp08(v)); };

  /* ------------------------------------------------------------------ waktu (zona waktu usaha) */
  var Time = {
    tz: CFG.TIMEZONE || 'Asia/Jayapura', offset: 0,
    now: function () { return Date.now() + Time.offset; },
    sync: function (serverIso) { var t = Date.parse(serverIso); if (!isNaN(t)) Time.offset = t - Date.now(); },
    parts: function (ms, tz) {
      var f = new Intl.DateTimeFormat('en-GB', { timeZone: tz || Time.tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      var o = {}; f.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
      return { y: +o.year, M: +o.month, d: +o.day, H: +o.hour % 24, m: +o.minute, s: +o.second };
    },
    offsetMs: function (ms, tz) { var p = Time.parts(ms, tz); return Date.UTC(p.y, p.M - 1, p.d, p.H, p.m, p.s) - Math.floor(ms / 1000) * 1000; },
    /** "2026-10-23T14:30" (jam dinding zona usaha) -> ISO UTC */
    fromLocal: function (str, tz) {
      var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(str || ''); if (!m) return '';
      var guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
      var t = guess - Time.offsetMs(guess, tz);
      t = guess - Time.offsetMs(t, tz);
      return new Date(t).toISOString();
    },
    toLocal: function (ms, tz) {
      var p = Time.parts(ms, tz), z = function (n) { return String(n).padStart(2, '0'); };
      return p.y + '-' + z(p.M) + '-' + z(p.d) + 'T' + z(p.H) + ':' + z(p.m);
    },
    fmt: function (iso, o) {
      var t = typeof iso === 'number' ? iso : Date.parse(iso); if (isNaN(t)) return '-';
      o = o || {};
      var dp = new Intl.DateTimeFormat('id-ID', { timeZone: Time.tz, day: 'numeric', month: 'short', year: o.noYear ? undefined : 'numeric' }).format(new Date(t));
      if (o.dateOnly) return dp;
      var p = Time.parts(t), z = function (n) { return String(n).padStart(2, '0'); };
      return dp + ' ' + z(p.H) + '.' + z(p.m);
    },
    fmtDate: function (iso) { return Time.fmt(iso, { dateOnly: true }); },
    fmtShort: function (iso) { return Time.fmt(iso, { noYear: true }); },
    tzLabel: function () { return { 'Asia/Jayapura': 'WIT', 'Asia/Makassar': 'WITA', 'Asia/Jakarta': 'WIB' }[Time.tz] || Time.tz; },
    dayKey: function (ms) { var p = Time.parts(ms); return p.y + '-' + String(p.M).padStart(2, '0') + '-' + String(p.d).padStart(2, '0'); },
    left: function (iso) {
      var d = Date.parse(iso) - Time.now(); if (isNaN(d)) return '';
      var neg = d < 0; d = Math.abs(d);
      var h = Math.floor(d / 3600000), m = Math.floor(d % 3600000 / 60000), s = Math.floor(d % 60000 / 1000), z = function (n) { return String(n).padStart(2, '0'); };
      return (neg ? '+' : '') + z(h) + ':' + z(m) + ':' + z(s);
    }
  };

  /* ------------------------------------------------------------------ penyimpanan lokal (selalu aman terhadap kegagalan) */
  var mem = {};
  var Store = {
    get: function (k, d) {
      if (k in mem) return mem[k];
      try { var v = localStorage.getItem(NS + k); if (v === null) return d; return (mem[k] = JSON.parse(v)); } catch (e) { return d; }
    },
    set: function (k, v) {
      mem[k] = v;
      var s; try { s = JSON.stringify(v); } catch (e) { return; }
      try { localStorage.setItem(NS + k, s); }
      catch (e) {
        try { Object.keys(localStorage).filter(function (x) { return x.indexOf(NS + 'c:') === 0; }).forEach(function (x) { localStorage.removeItem(x); }); localStorage.setItem(NS + k, s); } catch (e2) { /* tetap jalan tanpa cache */ }
      }
    },
    del: function (k) { delete mem[k]; try { localStorage.removeItem(NS + k); } catch (e) { /* abaikan */ } },
    clearUser: function (prefix) { Object.keys(mem).forEach(function (k) { if (k.indexOf(prefix) === 0) delete mem[k]; }); try { Object.keys(localStorage).filter(function (x) { return x.indexOf(NS + prefix) === 0; }).forEach(function (x) { localStorage.removeItem(x); }); } catch (e) { /* abaikan */ } }
  };
  var hashStr = function (s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; };

  /* ------------------------------------------------------------------ sesi */
  var Auth = {
    token: '', role: '', email: '', nama: '', mustChange: false, expiresAt: 0,
    load: function () { var s = Store.get('auth', null); if (s && s.token && (!s.expiresAt || s.expiresAt * 1000 > Date.now())) Object.assign(Auth, s); else if (s) Store.del('auth'); return Auth; },
    save: function (d) { Object.assign(Auth, { token: d.token, role: d.role, email: d.email || '', nama: d.nama || '', mustChange: !!d.mustChange, expiresAt: d.expiresAt || 0 }); Store.set('auth', { token: Auth.token, role: Auth.role, email: Auth.email, nama: Auth.nama, mustChange: Auth.mustChange, expiresAt: Auth.expiresAt }); },
    clear: function () { Auth.token = ''; Auth.role = ''; Auth.email = ''; Auth.nama = ''; Auth.mustChange = false; Auth.expiresAt = 0; Store.del('auth'); },
    ns: function (k) { return 'c:u:' + (Auth.email || Auth.role || 'anon') + ':' + k; },
    isAdmin: function () { return !!Auth.token && (Auth.role === 'admin' || Auth.role === 'superadmin'); },
    isSuper: function () { return !!Auth.token && Auth.role === 'superadmin'; }
  };

  /* sesi PELANGGAN (member) — terpisah dari sesi admin */
  var Mem = {
    token: '', expiresAt: 0, me: null,
    load: function () { var s = Store.get('member', null); if (s && s.token && (!s.expiresAt || s.expiresAt > Date.now())) Object.assign(Mem, s); else if (s) Store.del('member'); return Mem; },
    save: function (d) { Mem.token = d.token; Mem.expiresAt = d.expiresAt || 0; if (d.me) Mem.me = d.me; Store.set('member', { token: Mem.token, expiresAt: Mem.expiresAt, me: Mem.me }); },
    clear: function () { Mem.token = ''; Mem.expiresAt = 0; Mem.me = null; Store.del('member'); },
    isIn: function () { return !!Mem.token; }
  };
  var MEM_ACTIONS = /^member(Me|Update|ChangePassword)$/;

  /* ------------------------------------------------------------------ klien API (timeout, retry, idempoten, ukur waktu) */
  var Perf = {
    rows: [],
    add: function (action, total, server, cached) { Perf.rows.push({ action: action, total: Math.round(total), server: server == null ? null : server, net: server == null ? null : Math.round(total - server), cached: !!cached, at: Date.now() }); if (Perf.rows.length > 200) Perf.rows.shift(); },
    table: function () { if (w.console && console.table) console.table(Perf.rows.slice(-30)); }
  };
  var inflight = {};
  var WRITE = /^(create|update|delete|save|set|remind|member(Register|Update|ChangePassword|Toggle|ResetPassword)|promo(Save|Delete|Blast)|voucher(Grant|Revoke)|notifRetry|notifConfigSave|wa(Validate|BlastCreate|BlastStop)|crm(Sync|Save|Bulk|Import|Merge|Interaksi)|resetDemo|clearDemo|migRun|migRows|changeSuperadminPassword|uploadAsset)/;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var waitOnline = function (ms) {
    if (navigator.onLine !== false) return Promise.resolve();
    return new Promise(function (res) { var t = setTimeout(res, ms); w.addEventListener('online', function f() { clearTimeout(t); w.removeEventListener('online', f); res(); }); });
  };
  function once(action, data, timeout, reqId, tok) {
    var ctl = ('AbortController' in w) ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, timeout), t0 = performance.now();
    return fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, data: data || {}, token: tok || undefined, reqId: reqId }), redirect: 'follow', signal: ctl ? ctl.signal : undefined, cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        clearTimeout(to);
        var j; try { j = JSON.parse(txt); } catch (e) { throw new Error('NONJSON'); }
        Perf.add(action, performance.now() - t0, j && j.ms);
        return j;
      }, function (e) { clearTimeout(to); throw e; });
  }
  function call(action, data, opt) {
    opt = opt || {};
    if (!CFG.API_URL) return Promise.resolve({ success: false, code: 'NOAPI', message: 'Backend belum disambungkan. Isi API_URL di js/config.js.' });
    var isWrite = opt.write !== undefined ? opt.write : WRITE.test(action);
    var reqId = isWrite ? (opt.reqId || uid()) : undefined;
    var tok = opt.token !== undefined ? opt.token : (MEM_ACTIONS.test(action) ? Mem.token : Auth.token), isMem = !!tok && tok === Mem.token && tok !== Auth.token;
    var key = !isWrite && action + ':' + JSON.stringify(data || {}) + ':' + tok;
    if (key && inflight[key]) return inflight[key];
    var timeouts = isWrite ? [50000, 60000] : [25000, 40000, 60000];
    var run = (async function () {
      var last;
      for (var i = 0; i < timeouts.length; i++) {
        await waitOnline(20000);
        try {
          var res = await once(action, data, opt.timeout || timeouts[i], reqId, tok);
          if (res && (res.code === 'AUTH' || res.code === 'AUTH_MEMBER') && tok) {
            if (isMem) { Mem.clear(); w.dispatchEvent(new CustomEvent('kgb:member-expired')); }
            else if (res.code === 'AUTH') { Auth.clear(); w.dispatchEvent(new CustomEvent('kgb:auth-expired')); }
          }
          if (res && res.code === 'BUSY' && i < timeouts.length - 1) { await sleep(900); continue; }
          return res;
        } catch (e) { last = e; if (i < timeouts.length - 1) await sleep(500 * (i + 1)); }
      }
      return { success: false, code: 'NET', message: last && last.message === 'NONJSON' ? 'Server mengirim balasan yang tidak dikenali. Coba lagi sebentar lagi.' : 'Koneksi bermasalah. Periksa internet Anda lalu coba lagi.' };
    })();
    if (key) { inflight[key] = run; run.then(function () { delete inflight[key]; }, function () { delete inflight[key]; }); }
    return run;
  }

  /** Stale-while-revalidate: tampilkan cache seketika, segarkan di latar. render(data, dariCache) dipanggil <= 2x dan hanya bila data berbeda. */
  function swr(key, action, data, render, opt) {
    opt = opt || {};
    var fresh = opt.fresh == null ? (CFG.CACHE_FRESH_MS || 45000) : opt.fresh;
    var c = Store.get(key, null);
    if (c && c.data !== undefined) { try { render(c.data, true); } catch (e) { console.error(e); } }
    if (c && !opt.force && Date.now() - c.t < fresh) return Promise.resolve({ success: true, data: c.data, cached: true });
    return call(action, data, opt).then(function (res) {
      if (res.success) {
        var hh = hashStr(JSON.stringify(res.data));
        Store.set(key, { t: Date.now(), h: hh, data: res.data });
        if (!c || c.h !== hh) { try { render(res.data, false); } catch (e) { console.error(e); } }
      } else if (opt.onError && (!c || opt.alwaysError)) opt.onError(res);
      return res;
    });
  }

  /* ------------------------------------------------------------------ UI: toast, sheet, dialog, lightbox */
  var UI = {
    toast: function (msg, type) {
      var box = $('#toasts'); if (!box) return;
      var el = document.createElement('div'); el.className = 'toast ' + (type || 'ok'); el.setAttribute('role', type === 'bad' ? 'alert' : 'status');
      el.innerHTML = ic(type === 'bad' ? 'xCircle' : type === 'warn' ? 'warn' : 'checkCircle') + '<span>' + esc(msg) + '</span>';
      box.appendChild(el);
      setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 300); }, type === 'bad' ? 5200 : 3200);
      while (box.children.length > 3) box.firstChild.remove();
    },
    sheet: function (o) {
      var prev = document.activeElement, ov = document.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = '<div class="sheet' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title || '') + '"><div class="sheet-head"><h3>' + esc(o.title || '') + '</h3><button class="icon-btn" data-close aria-label="Tutup">' + ic('x') + '</button></div><div class="sheet-body"></div>' + (o.foot === false ? '' : '<div class="sheet-foot"></div>') + '</div>';
      var body = $('.sheet-body', ov), foot = $('.sheet-foot', ov);
      if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
      var api = { el: ov, body: body, foot: foot, close: function (v) { if (api.closed) return; api.closed = true; document.removeEventListener('keydown', onKey, true); ov.remove(); if (!$('.overlay')) document.body.style.overflow = ''; if (prev && prev.focus) try { prev.focus(); } catch (e) { /* abaikan */ } if (o.onClose) o.onClose(v); } };
      var onKey = function (e) {
        if (e.key === 'Escape' && !$('.lightbox') && ov === $$('.overlay').pop()) { e.stopPropagation(); api.close(); }
        if (e.key === 'Tab') { var f = $$('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])', ov).filter(function (x) { return !x.disabled && x.offsetParent !== null; }); if (!f.length) return; var a = f[0], b = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); } else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); } }
      };
      document.addEventListener('keydown', onKey, true);
      ov.addEventListener('mousedown', function (e) { if (e.target === ov && !o.sticky) api.close(); });
      $('[data-close]', ov).addEventListener('click', function () { api.close(); });
      document.body.appendChild(ov); document.body.style.overflow = 'hidden';
      if (o.onOpen) o.onOpen(api);
      var first = $('input:not([type=hidden]),select,textarea', body) || $('button.primary,button.gold', ov); if (first && !o.noFocus) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { /* abaikan */ } }, 60);
      return api;
    },
    /** confirm({title,message,ok,danger,type}) -> Promise<boolean|string>. type = kata yang harus diketik (mis. HAPUS). */
    confirm: function (o) {
      return new Promise(function (res) {
        var s = UI.sheet({ title: o.title || 'Konfirmasi', foot: true, sticky: !!o.type, onClose: function (v) { res(v === true ? (o.type ? true : true) : false); } });
        s.body.innerHTML = '<p>' + (o.html ? o.message : esc(o.message || '')) + '</p>' + (o.type ? '<div class="field mt"><label for="cf-t">Ketik <b class="code">' + esc(o.type) + '</b> untuk melanjutkan</label><input id="cf-t" class="in" autocomplete="off" autocapitalize="characters"></div>' : '');
        s.foot.innerHTML = '<button class="btn ghost" data-no>Batal</button><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-yes' + (o.type ? ' disabled' : '') + '>' + esc(o.ok || 'Ya, lanjutkan') + '</button>';
        var yes = $('[data-yes]', s.foot), t = $('#cf-t', s.body);
        if (t) t.addEventListener('input', function () { yes.disabled = t.value.trim() !== o.type; });
        $('[data-no]', s.foot).onclick = function () { s.close(false); };
        yes.onclick = function () { s.close(true); };
      });
    },
    busy: function (btn, p) {
      if (!btn) return p;
      var html = btn.innerHTML; btn.classList.add('is-busy'); btn.setAttribute('aria-busy', 'true');
      btn.insertAdjacentHTML('afterbegin', ic('loader', 'spin') + ' ');
      var done = function () { btn.classList.remove('is-busy'); btn.removeAttribute('aria-busy'); btn.innerHTML = html; };
      return Promise.resolve(p).then(function (v) { done(); return v; }, function (e) { done(); throw e; });
    },
    lightbox: function (src, alt) {
      var el = document.createElement('div'); el.className = 'lightbox'; el.innerHTML = '<button class="icon-btn" aria-label="Tutup">' + ic('x') + '</button><img alt="' + esc(alt || 'Foto') + '" src="' + esc(src) + '">';
      var close = function () { el.remove(); document.removeEventListener('keydown', kd, true); };
      var kd = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
      el.addEventListener('click', function (e) { if (e.target !== $('img', el)) close(); });
      document.addEventListener('keydown', kd, true); document.body.appendChild(el); $('button', el).focus();
    },
    empty: function (icon, text) { return '<div class="empty">' + ic(icon || 'info') + '<div>' + esc(text) + '</div></div>'; },
    badge: function (status) {
      var m = { 'Menunggu Konfirmasi': 'warn', 'Sedang Disewa': 'info', 'Selesai': 'ok', 'Dibatalkan': 'bad', 'Lunas': 'ok', 'Menunggu Verifikasi': 'warn', 'Belum Bayar / COD': 'bad', 'Tersedia': 'ok', 'Maintenance': 'bad' };
      return '<span class="badge ' + (m[status] || '') + '">' + esc(status || '-') + '</span>';
    }
  };

  /* ------------------------------------------------------------------ router hash (halaman tetap hidup, pindah < 100 ms) */
  var Router = {
    pages: {}, cur: null, hooks: [],
    add: function (name, def) { Router.pages[name] = def; },
    parse: function () { var h = (location.hash || '#/').replace(/^#\/?/, ''); var p = h.split('/').filter(Boolean).map(decodeURIComponent); return { name: p[0] || 'home', args: p.slice(1) }; },
    go: function (path) { var h = '#/' + String(path || '').replace(/^#?\/?/, ''); if (location.hash === h) Router.render(); else location.hash = h; },
    render: function () {
      var r = Router.parse(), def = Router.pages[r.name];
      if (!def) { r = { name: 'home', args: [] }; def = Router.pages.home; }
      var el = document.getElementById(def.el), same = Router.cur === r.name;
      if (!el) return;
      $$('.page').forEach(function (p) { p.classList.toggle('on', p === el); });
      if (!def._init) { def._init = true; if (def.init) def.init(el); }
      Router.cur = r.name;
      var top = $$('.nav a, .bottom-bar a');
      top.forEach(function (a) { var n = a.getAttribute('data-nav'); if (n === r.name || (n === 'home' && r.name === 'home')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      document.body.classList.toggle('admin-mode', r.name === 'admin');
      document.title = (def.title ? def.title + ' · ' : '') + (K.brand || CFG.BRAND || 'Kings Gaming Box');
      if (def.show) def.show(el, r.args, { same: same });
      if (!same) w.scrollTo(0, 0);
      Router.hooks.forEach(function (f) { f(r); });
    },
    start: function () { w.addEventListener('hashchange', Router.render); Router.render(); }
  };

  Object.assign(K, { $: $, $$: $$, esc: esc, ic: ic, rp: rp, rpk: rpk, debounce: debounce, uid: uid, hp08: hp08, hpValid: hpValid, Time: Time, Store: Store, hashStr: hashStr, Auth: Auth, Mem: Mem, Perf: Perf, api: call, swr: swr, UI: UI, Router: Router, CFG: CFG, sleep: sleep });
  w.Perf = Perf;
})(window);
