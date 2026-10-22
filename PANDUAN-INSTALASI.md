# Panduan Instalasi — Kings Gaming Box (Sewa Playbox PS4)

Aplikasi ini terdiri dari dua bagian yang terpisah:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** | **Satu berkas** `Kode.gs` + `appsscript.json` | Google Apps Script (akun Google Anda) |
| **Frontend** | ZIP `kings-gaming-box-frontend.zip` (`index.html`, `css/`, `js/`) | GitHub Pages |

Urutan pemasangan: **backend dulu → salin alamat `/exec` → isi `config.js` → upload frontend**. Kerjakan satu tahap, pastikan berhasil, baru lanjut.

---

## Tahap 1 — Pasang backend di Google Apps Script

1. Masuk ke akun Google yang akan menjadi **pemilik** aplikasi (semua data tersimpan di Drive akun ini).
2. Buka <https://script.google.com> → **New project**. Beri nama `Kings Gaming Box`.
3. Aktifkan manifest: ikon roda gigi **Project Settings** → centang **Show "appsscript.json" manifest file in editor**.
4. **Hanya boleh ada SATU berkas skrip: `Kode`.** Hapus berkas skrip lain bila ada (`Superadmin`, `DemoData`, `Notifikasi`, `CRM`, `Crm`, `Migrasi`, `Member`, dan sebagainya): klik tanda titik tiga di sebelah nama berkas → **Delete**. Lalu buka `Kode`, **hapus semua isinya**, dan tempel seluruh isi `Kode.gs` yang saya kirim (sudah menggabungkan semua modul).
   > **Kenapa?** Pesan `SyntaxError: Identifier 'FONNTE_API' has already been declared` muncul karena isi yang sama ada di dua berkas (misalnya isi Notifikasi tertempel juga di Crm.gs). Semua berkas Apps Script berbagi satu ruang nama, jadi satu nama tidak boleh dideklarasikan dua kali. Dengan satu berkas, galat ini tidak bisa terjadi.
5. Buka `appsscript.json` → ganti seluruh isinya dengan berkas `appsscript.json` yang saya kirim (zona waktu Asia/Jayapura dan izin yang dibutuhkan sudah diatur).
6. Klik **Save** (ikon disket / Ctrl+S).
7. Pilih fungsi **`setupAppEnvironment`** di menu dropdown atas → klik **Run**.
8. Google meminta izin: **Review permissions** → pilih akun Anda → **Advanced** → **Go to Kings Gaming Box (unsafe)** → **Allow**. (Peringatan ini normal untuk skrip buatan sendiri.)
9. Buka **Execution log** (bagian bawah). Anda akan melihat:
   - `Password sementara: XXXX-XXXX-XXXX` ← **catat**, jangan kirim lewat chat.
   - Alamat folder Drive dan Spreadsheet yang dibuat otomatis.

Bila Anda **meng-upgrade dari versi sebelumnya**: tempel `Kode.gs` baru, jalankan `setupAppEnvironment` lagi (aman diulang; kolom dan sheet baru ditambahkan, data tidak berubah), lalu **Deploy → Manage deployments → Edit → New version → Deploy**. Nomor WA, Instagram, TikTok, dan alamat lama otomatis diganti ke yang baru **hanya jika belum pernah Anda ubah**.

Setup membuat: folder Drive `Kings Gaming Box` berisi 3 subfolder (foto pelanggan, aset katalog, struk), satu Spreadsheet berisi sheet `Bookings`, `Units`, `Packages`, `Games`, `Settings` (+ sheet `Customers`, `Promos`, `Vouchers`, antrean notifikasi, CRM, dan log audit), serta data contoh. **Aman dijalankan ulang** — data tidak digandakan dan password tidak berubah.

## Tahap 2 — Deploy sebagai Web App

1. Klik **Deploy** → **New deployment** → ikon roda gigi → **Web app**.
2. Isi:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
3. Klik **Deploy** → salin **Web app URL** yang berakhiran `/exec`.
4. Uji cepat: tempel URL di browser lalu tambahkan `?action=ping`. Harus muncul teks JSON `"success":true`.

> **Setiap kali Anda mengubah kode backend**, jangan buat deployment baru. Pakai: **Deploy → Manage deployments → ikon pensil (Edit) → Version: New version → Deploy**. URL `/exec` tetap sama.

## Tahap 3 — Hubungkan frontend ke backend

1. Ekstrak `kings-gaming-box-frontend.zip`. Anda mendapat folder **`kings-gaming-box-frontend`**.
2. Buka `js/config.js` dengan Notepad. Ganti:
   ```js
   API_URL: '',
   ```
   menjadi (tempel URL `/exec` Anda):
   ```js
   API_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
   ```
3. Simpan. Berkas lain tidak perlu diubah.

## Tahap 4 — Upload ke GitHub Pages (lewat terminal, bukan "Upload files")

> **Penting:** jangan memakai tombol *Add file → Upload files* di situs GitHub. Cara itu meratakan folder `css/` dan `js/` sehingga tampilan rusak.

**4a. Install Git** — Windows: <https://git-scm.com/download/win> (pengaturan bawaan). Mac: ketik `git --version` di Terminal. Cek dengan `git --version`.

**4b. Identitas Git (sekali saja):**
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email@akungithub.com"
```

**4c. Buat repository di GitHub:** <https://github.com/new> → nama misalnya `kings-gaming-box` → **Public** → **jangan** centang README/.gitignore/license → **Create repository**.

**4d. Masuk ke folder yang benar — ini langkah yang paling sering keliru.**
Folder kerja Anda adalah **`kings-gaming-box-frontend`** (hasil ekstrak ZIP). Di dalamnya langsung terlihat `index.html`, folder `css` dan `js`. **Jangan masuk lebih dalam, jangan naik satu tingkat.**

Cara cepat di Windows: buka folder itu di File Explorer → klik kolom alamat → ketik `powershell` → Enter.
Atau:
```powershell
cd "C:\Users\NAMA_ANDA\Documents\kings-gaming-box-frontend"
dir
```
Hasil `dir` **harus** menampilkan `index.html`, `css`, `js` di baris teratas. Bila yang muncul folder lain (mis. `frontend` atau `backend`), Anda berada di tempat yang salah — jangan lanjut.

**4e. Inisialisasi dan push** (satu per satu):
```bash
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/kings-gaming-box.git
git push -u origin main
```
Ganti `USERNAME` dengan username GitHub Anda. Saat diminta *Password*, tempel **Personal Access Token** (bukan password akun):
GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new token → centang **repo** → salin token `ghp_...`.
Saat mengetik/menempel token layar tampak kosong — itu normal. Tekan Enter.
Berhasil bila muncul `* [new branch] main -> main`.

**4f. Aktifkan Pages:** repo → **Settings → Pages** → Source **Deploy from a branch** → Branch **main** / **(root)** → **Save**. Tunggu 1–2 menit. Situs Anda: `https://USERNAME.github.io/kings-gaming-box/`.

**4g. Periksa di GitHub:** halaman repo harus menampilkan `index.html`, folder `css`, `js` di tingkat atas (bukan folder `frontend/` atau berkas CSS/JS yang berserakan).

**Update setelah itu** (dari folder yang sama):
```bash
git add .
git commit -m "Perubahan"
git push
```
Bila tampilan lama masih muncul: tekan **Ctrl+Shift+R**.

## Tahap 5 — Login pertama & keamanan

1. Buka `https://USERNAME.github.io/kings-gaming-box/#/admin`.
2. **Superadmin:** username `superadmin`, password = password sementara dari log. Anda langsung diminta **membuat password baru** (min. 10 karakter, huruf + angka).
3. **Login Google untuk admin biasa (opsional, disarankan):**
   1. <https://console.cloud.google.com> → buat project → **APIs & Services → OAuth consent screen** (External, isi nama aplikasi) → **Credentials → Create credentials → OAuth client ID → Web application**.
   2. **Authorized JavaScript origins:** `https://USERNAME.github.io` (tanpa garis miring dan tanpa nama repo).
   3. Salin **Client ID** (berakhiran `.apps.googleusercontent.com`).
   4. Di panel admin (sebagai superadmin) → **Pengaturan → Akses & sistem**: isi **Google Client ID** dan **Email admin** (pisahkan koma) → Simpan.
   5. Admin membuka `#/admin` dan memakai tombol **Masuk dengan Google**.
   Hanya email yang terdaftar yang diterima; token diverifikasi ke Google oleh server.

## Tahap 6 — Isi konten dan siapkan tayang

Data bawaan: WhatsApp admin **0821-2121-0694** (disimpan sebagai `6282121210694`), Instagram dan TikTok **@nabirekreatif**, alamat **Jl. Merdeka, Oyehe, Nabire**. Semuanya bisa diganti dari panel, tanpa menyentuh kode.

Di panel admin → **Pengaturan** (Superadmin dan Admin):

| Kelompok | Yang bisa diubah |
|---|---|
| **Identitas & tampilan** | Nama usaha, slogan, **unggah logo**, warna utama, warna emas |
| **Halaman depan** | Judul, sub judul, deskripsi, **unggah gambar banner**, teks dua tombol, kelengkapan, pengumuman |
| **Kontak, alamat & sosial** | Nomor WhatsApp, Instagram, TikTok, alamat, tautan Google Maps |
| **Footer** | Teks kiri dan kanan |
| **Susunan halaman depan** | Urutan 8 bagian (naik/turun), tampil/sembunyi tiap bagian, ganti label, judul, dan deskripsi bagian |
| **Akun pelanggan & loyalitas** | Nyalakan/matikan akun, aturan voucher (jumlah sewa, batas hari, jam gratis, masa berlaku) |

Menu lain: **Unit** (nama, spesifikasi, unggah foto), **Katalog** (paket, game, cover), **Promo & Member** (lihat Tahap 6b).

- **Sistem → Data contoh:** bila siap tayang, klik **Hapus semua data contoh** (ketik `HAPUS`). Pesanan, unit, dan pengaturan yang sudah Anda ubah tidak ikut terhapus. Banner "Mode contoh" otomatis hilang.
- Gambar contoh (unit, game, banner) adalah ilustrasi vektor buatan sendiri, ada di folder `img/`; ganti dengan foto asli lewat panel.
- Logo yang diunggah disimpan sebagai JPEG berlatar putih (tidak transparan). Untuk logo transparan, unggah ke tempat lain lalu tempel alamat gambarnya di kolom Logo.
- Perubahan di panel langsung terlihat di sisi Anda; pengunjung lain melihatnya paling lambat sekitar 45 detik kemudian.
- Alur pelanggan: Beranda → pilih paket/unit → isi data + foto KTP → struk dengan barcode → konfirmasi lewat WhatsApp admin → cek status memakai kode booking atau nomor WA.

## Tahap 6b — Akun pelanggan, promo, dan voucher loyalitas

**Untuk pelanggan.** Menu **Akun**: daftar gratis memakai nomor WhatsApp + password. Pelanggan **tanpa akun tetap bisa memesan** dengan harga normal. Member mendapat:
- **Promo diskon** dari admin (persen atau potongan rupiah, per paket atau semua paket, dengan tanggal mulai/berakhir). Promo terbaik terpilih otomatis dan bisa diganti di halaman pesan.
- **Voucher loyalitas:** setiap **7 sewa yang selesai dalam maksimal 60 hari** = 1 voucher **gratis 1 hari (24 jam)**. Pada pesanan berikutnya, voucher dicentang sehingga hasilnya misalnya 1 hari + gratis 1 hari. Voucher berlaku 60 hari; jika pesanan dibatalkan atau dihapus, voucher dikembalikan. Jam gratis ikut mengunci jadwal unit.
- Riwayat pesanan, data diri yang terisi otomatis saat memesan, dan notifikasi WhatsApp saat voucher terbit (bila Fonnte aktif).

**Untuk admin.** Menu **Promo & Member**:
1. **Promo:** buat, ubah, hapus, nonaktifkan. Tombol **Kabari semua member** mengirim pesan promo lewat antrean WhatsApp (butuh Fonnte aktif).
2. **Member:** daftar, progres menuju voucher, **Reset sandi** (sandi sementara tampil sekali di layar; kirimkan ke pelanggan), nonaktifkan akun.
3. **Voucher:** beri voucher manual (mis. hadiah) dan cabut voucher yang belum dipakai.
4. Aturan loyalitas diubah di **Pengaturan → Akun pelanggan & loyalitas**.

**Catatan jujur:** pendaftaran **tidak memakai kode OTP**, jadi nomor WhatsApp tidak diverifikasi. Seseorang bisa mendaftar dengan nomor orang lain. Dampaknya terbatas (akun hanya menyimpan riwayat sewa dan voucher), tetapi pantau daftar member. Pelanggan yang lupa password meminta reset ke admin lewat WhatsApp. Voucher hanya terhitung dari sewa yang dipesan saat **sudah masuk akun** dan berstatus **Selesai**.

## Tahap 7 — Notifikasi WhatsApp (Fonnte) + Email + Kontak (CRM)

1. Daftar di <https://fonnte.com>, hubungkan nomor WhatsApp pengirim (scan QR), salin **token** perangkat.
2. Panel admin → **Notifikasi → Konfigurasi** (Superadmin): tempel token, nyalakan **WhatsApp**, nyalakan **Email** bila perlu, isi **Alamat aplikasi** (URL GitHub Pages) → Simpan. Token disimpan di server (Script Properties) dan tidak pernah dikirim ke browser.
3. Menyalakan notifikasi otomatis memasang pengirim otomatis tiap 1 menit. Bila tidak: di editor jalankan **`pasangTrigger`** sekali (izinkan akses bila diminta).
4. **Event & pesan:** tiap kejadian (booking baru ke pelanggan/admin, sewa dimulai/selesai, dibatalkan, lunas, pengingat waktu) dapat dinyalakan terpisah untuk WA dan email, template bisa diubah. Pesan masuk **antrean** sehingga tombol di admin tetap cepat; gagal kirim dicoba ulang otomatis (maks. 3×) dan bisa diulang manual di tab **Antrean**.
5. **Blast WA:** pilih sasaran (segmen, tag, status WA), **Hitung penerima**, tulis pesan (`{nama}`, `{brand}`), pilih batch 10/20/50 dan jeda antar pesan (angka atau acak `3-8`), **Buat blast**. Tiap batch terkirim otomatis oleh trigger, atau paksa lewat **Kirim batch berikutnya**. Gunakan jeda ≥5 detik dan batch kecil untuk mengurangi risiko nomor dibatasi WhatsApp.
6. **Kontak (CRM):** terisi otomatis dari pesanan (data contoh tidak ikut). Segmen: Penyewa, Langganan (≥3 sewa), Prospek, Lainnya. Fitur: tag, catatan, riwayat interaksi, opt-out (dihormati blast), impor CSV (kolom `nama,hp,email,tag,segmen`), gabung kontak ganda, ekspor CSV (Superadmin).
7. Kuota email Gmail biasa ±100/hari (Workspace ±1.500); sisa kuota tampil di konfigurasi.

## Tahap 8 — Migrasi dari spreadsheet lama (bila ada)

Panel admin → **Sistem → Migrasi** (Superadmin).
1. Tempel alamat/ID spreadsheet lama. **Spreadsheet lama hanya dibaca**, tidak diubah. Gunakan akun Google yang sama agar berkas foto lama tetap terbaca.
2. Pilih data (Units, Packages, Games, Settings, Bookings) → **Pindai** (tidak menulis apa pun) → periksa tabel hasil dan peringatan.
3. **Jalankan impor.** Aman diulang: tidak ada baris ganda; pesanan yang masih *Menunggu* diperbarui dari data lama.
4. Judul kolom dibaca berdasarkan **nama**, bukan urutan, sehingga urutan kolom boleh berbeda. Pengaturan sensitif (email admin, Client ID, zona waktu, apa pun berisi password/token) **tidak pernah** diimpor; pilihan admin di aplikasi baru tidak ditimpa.
5. Tersedia juga **impor CSV** per jenis data (maks. 3.000 baris).
6. **Cutover:** jalankan impor sekali lagi tepat sebelum pindah (menangkap pesanan baru), umumkan alamat baru, arsipkan deployment lama.

## Reset dari backend (tanpa lewat internet)

Fungsi berikut **sengaja tidak ada di API**; hanya pemilik skrip yang bisa menjalankannya dari **editor Apps Script** (pilih fungsi → Run → baca **Execution log**).

| Kebutuhan | Fungsi |
|---|---|
| **Lupa password superadmin** | `resetSuperadminPassword` → membuat password sementara baru di log, membuka kunci login, mengeluarkan semua sesi |
| Tentukan password sendiri | Project Settings → Script Properties → tambah `SA_NEW_PASSWORD` = password pilihan → jalankan `setSuperadminPasswordFromProperty` (properti otomatis dihapus) |
| Login terkunci (5× salah) | `bukaKunciSuperadmin` (atau tunggu 15 menit) |
| Keluarkan semua sesi admin | `cabutSemuaSesi` |
| **Reset data contoh** (hapus lama, isi baru) | `resetDemoData` |
| Hapus semua data contoh | `hapusDemoData` |
| Tambah data contoh yang belum ada | `seedDemoData` |

Data contoh bertanda `is_demo`; data asli (unit/pengaturan yang sudah Anda ubah, semua pesanan pelanggan) tidak tersentuh. Reset data contoh juga tersedia di panel: **Sistem → Data contoh** (ketik `RESET` / `HAPUS`).

## Pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| Situs 404 di GitHub Pages | `git init` dijalankan di folder yang salah. Pindah ke `kings-gaming-box-frontend` (yang berisi `index.html`), `git init`, `git add .`, `git commit`, `git push -u origin main --force` |
| Halaman tanpa warna / 404 CSS-JS | Berkas rata di root. Ulangi lewat terminal seperti Tahap 4 |
| Banner "backend belum tersambung" | `API_URL` di `js/config.js` masih kosong atau salah (harus berakhiran `/exec`) |
| "Sesi berakhir" / izin ditolak | Deployment bukan *Execute as Me / Anyone*, atau lupa **New version** setelah ubah kode |
| Perubahan kode backend tidak terasa | Deploy → Manage deployments → Edit → **New version** → Deploy |
| Tombol Google tidak muncul | Client ID belum diisi di Pengaturan, atau *Authorized JavaScript origins* tidak sama dengan `https://USERNAME.github.io` |
| "Email tidak terdaftar sebagai admin" | Tambahkan email di Pengaturan → Email admin (Superadmin) |
| `git push` menolak password | Pakai Personal Access Token (Tahap 4e) |
| WA tidak terkirim | Cek: WhatsApp dinyalakan, token benar, perangkat Fonnte terhubung (tombol **Cek perangkat**), tab **Antrean** → kolom Respons |
| Notifikasi tertunda | Pengirim otomatis belum terpasang → jalankan `pasangTrigger` |
| Angka 0 di depan nomor hilang | Sudah ditangani (kolom teks + normalisasi). Jangan ubah format kolom nomor di Sheets |

## Batasan yang perlu Anda ketahui

- Aplikasi sudah diuji lengkap di lingkungan simulasi (275 pemeriksaan backend, 85 pemeriksaan akun/promo/voucher, dan 93 pemeriksaan browser di ukuran HP dan desktop). **Yang baru terbukti setelah dicoba di akun Anda:** izin dan kuota Google sebenarnya, tombol Login Google, pengiriman Fonnte, dan batas ukuran Sheets nyata.
- Grafik memakai SVG buatan sendiri (bukan Chart.js) agar ringan dan tanpa bergantung pada CDN.
- Struk memakai **barcode** Code128; kode QR tidak disertakan.
- Gambar unit/game contoh adalah ilustrasi vektor buatan sendiri; ganti dengan foto asli lewat panel.
- Font Rajdhani/Orbitron/Plus Jakarta Sans dimuat dari Google Fonts; bila gagal dimuat, tampilan memakai font sistem.
- Foto KTP tersimpan privat di Drive pemilik dan hanya dapat dilihat lewat panel admin. Aset katalog (foto unit/banner) bersifat publik.
