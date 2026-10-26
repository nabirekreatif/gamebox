/**
 * Kings Gaming Box — konfigurasi frontend.
 * SATU-SATUNYA berkas yang perlu Anda edit sebelum `git push`:
 *   API_URL = alamat Web App Apps Script Anda (berakhiran /exec).
 * (Berkas ini sengaja tidak disegel lisensi, jadi aman diedit.)
 * Selama API_URL kosong, halaman tetap tampil memakai data contoh bawaan, tetapi pemesanan & admin belum berfungsi.
 */
window.APP_CONFIG = {
  API_URL: 'ONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzKuf8GUWiX7-vbGvfvrZKXmj0h_n_UI-G9d9eQ5KGdsL6eEn1nQI6Cjh8y12yEtptM/exec',                         // contoh: 'https://script.google.com/macros/s/AKfycb.../exec'
  BRAND: 'KINGS GAMING BOX',
  WA_ADMIN: '6282121210694',           // cadangan; nilai sebenarnya diambil dari Pengaturan di server
  WA_ADMIN_TAMPIL: '082121210694',
  TIMEZONE: 'Asia/Jayapura',           // cadangan; nilai sebenarnya dari Pengaturan di server
  CACHE_FRESH_MS: 45000,               // data dianggap segar selama ini (tidak memanggil server lagi)
  POLL_STATUS_MS: 20000                // pembaruan otomatis halaman Cek Status saat ada pesanan aktif
};
