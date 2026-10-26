/**
 * Kings Gaming Box — konfigurasi frontend.
 * Yang perlu Anda isi sebelum `git push`: API_URL = alamat Web App Apps Script Anda (berakhiran /exec).
 * Pada template berlisensi, isi API_URL di index.html (blok <script type="application/json" id="kgb-config">);
 * berkas .js disegel dan tidak boleh diedit. Nilai di blok itu menimpa nilai default di bawah ini.
 * Selama API_URL kosong, halaman tetap tampil memakai data contoh bawaan, tetapi pemesanan & admin belum berfungsi.
 */
window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzKuf8GUWiX7-vbGvfvrZKXmj0h_n_UI-G9d9eQ5KGdsL6eEn1nQI6Cjh8y12yEtptM/exec',                         // contoh: 'https://script.google.com/macros/s/AKfycb.../exec'
  BRAND: 'KINGS GAMING BOX',
  WA_ADMIN: '6285750686582',           // cadangan; nilai sebenarnya diambil dari Pengaturan di server
  WA_ADMIN_TAMPIL: '085750686582',
  TIMEZONE: 'Asia/Jayapura',           // cadangan; nilai sebenarnya dari Pengaturan di server
  CACHE_FRESH_MS: 45000,               // data dianggap segar selama ini (tidak memanggil server lagi)
  POLL_STATUS_MS: 20000                // pembaruan otomatis halaman Cek Status saat ada pesanan aktif
};
/* nilai dari blok #kgb-config di index.html (bila ada) menimpa default */
(function () {
  try {
    var el = document.getElementById('kgb-config'); if (!el) return;
    var o = JSON.parse(el.textContent || '{}');
    Object.keys(o).forEach(function (k) { if (o[k] !== '' && o[k] != null) window.APP_CONFIG[k] = o[k]; });
  } catch (e) { /* abaikan: pakai default */ }
})();
