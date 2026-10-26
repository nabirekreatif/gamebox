# Kings Gaming Box — Frontend (GitHub Pages)

Situs statis penyewaan Playbox PS4. Backend berupa Google Apps Script (REST API JSON), terpisah dari folder ini.

Isi folder (folder inilah yang di-`git init`; `index.html` harus terlihat di sini):

```
css/style.css   tampilan (tema gelap/terang)
index.html      isi API_URL di blok <script type="application/json" id="kgb-config"> (satu-satunya yang diedit)
js/config.js    nilai bawaan (DISEGEL lisensi, jangan diedit)
nk-license.js   modul lisensi Nabire Kreatif (jangan diubah)
js/core.js      klien API, cache, router, komponen UI
js/app.js       halaman publik
js/admin.js     panel admin (dimuat saat dibutuhkan)
js/art.js       gambar contoh vektor + barcode Code128
js/icons.js     ikon SVG (dibangkitkan; jangan diedit tangan)
```

Langkah lengkap ada di `PANDUAN-INSTALASI.md`.
