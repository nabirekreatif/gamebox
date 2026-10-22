/* Kings Gaming Box — service worker.
 * Strategi: JARINGAN DULU, cache sebagai cadangan (untuk berkas milik sendiri saja).
 * Dengan begitu pembaruan yang Anda push ke GitHub langsung terpakai, dan aplikasi tetap terbuka saat sinyal buruk.
 * Panggilan ke Google Apps Script (API) tidak pernah disimpan di sini. */
var V = 'kgb-shell-v1';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css', 'js/config.js', 'js/icons.js', 'js/core.js', 'js/art.js', 'js/member.js', 'js/pwa.js', 'js/app.js', 'img/logo.svg', 'img/icon-192.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () { /* satu berkas gagal tidak menggagalkan semuanya */ }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok && res.type === 'basic') { var copy = res.clone(); caches.open(V).then(function (c) { c.put(r, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(r).then(function (m) { return m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()); });
  }));
});
