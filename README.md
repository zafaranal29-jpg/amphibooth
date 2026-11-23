# Amphibooth 📸

Photo booth imut berbasis web: satu sesi **3 jepretan** jadi **satu strip vertikal** yang bisa dihias frame, dikasih caption, disimpan ke gallery pribadi, diunduh, dicetak, dan dibagikan lewat link publik. Dibangun dengan **Laravel 12** + MySQL. CSS/JS ditulis langsung di `public/` (tanpa Vite/Tailwind); satu-satunya langkah build adalah bundle animasi UI (`npm run build:anim`).

## Fitur

**Sesi & hasil**
- **Strip 3 foto (2×6 inch)** — jeda + hitungan per shot, otomatis lanjut ke slot berikutnya.
- **Retake per slot** — kalau pose ke-3 kedip, cukup ulangi slot itu (tidak mengulang seluruh sesi).
- **15 preset frame + pemilih visual** — Polaroid, Film Strip, Wedding, Maroon Classy, Hollywood, Retro 70s, Boarding Pass, Koran, Candy Stripe, Scallop, Halloween, Pop Art, Paradise, Minimalis, dan Warna Solid (pilih warna sendiri). Tiap opsi ditampilkan sebagai **thumbnail hasil sesi kamu sendiri**, bukan cuma nama; `Tanpa Frame` tetap ada untuk foto lama.
- **Caption custom + date stamp** — ikut tergambar di lembar hasil.
- **Efek foto** — Original, Hangat, B&W, Vintage, Dreamy, Alien (diterapkan ke semua sel).
- **Download JPG** (render 1.5× untuk cetak) + **Print** (print CSS: cuma lembarnya yang keluar) + info ukuran file & batas cetak 300 dpi di layar hasil.
- **Simpan ringkas** — yang dikirim ke server bukan render 1.5×: lembar 760 px + shot 960 px + thumbnail 360 px, jadi satu sesi ± 400–600 KB (unduhan tetap dirender ulang 1.5× di browser).

**Kamera & filter**
- **Filter wajah** — MediaPipe FaceMesh 478 titik, stiker mengikuti roll/yaw/jarak kepala, plus indikator status AI.
- **Pengaturan kamera** — pilih sumber kamera, kualitas (Standar/HD), lama hitungan (3/5/tanpa), toggle cermin, toggle suara shutter & beep.

**Gallery & share**
- **Gallery per strip** — kartu pakai **thumbnail ~35 KB** (dibuat browser, bukan GD) supaya 12 kartu tidak menarik file lembar penuh; badge layout, tanggal, caption; aksi love, download, salin link share, hapus (benar-benar menghapus baris DB + file).
- **Link share publik** `/p/{token}` + **OG image**, jadi preview WhatsApp/Twitter langsung menampilkan strip-nya.
- **Mode demo** `/demo` — coba booth tanpa akun (bisa unduh, tidak disimpan) dan hasilnya otomatis **ada watermark** + ajakan daftar biar bersih.
- **Halaman profil** `/profile` — ringkasan data (jumlah strip, love, foto mentah, MB terpakai), ganti nama, ganti password (wajib password lama), dan zona bahaya **hapus semua data** (butuh konfirmasi password, file mentahnya ikut dibersihkan).

**Halaman publik**
- **Landing page** `/` — hero + 3 contoh strip (digambar ulang dari ilustrasi, bukan foto orang) + 3 langkah + daftar fitur + CTA demo. User yang sudah login langsung dilempar ke booth.
- **Catatan privasi** `/privasi` — data apa yang disimpan, siapa yang bisa lihat, cara menghapusnya. Kontaknya diatur `CONTACT_EMAIL`.

**Akun & email**
- **Daftar/masuk** dengan copy Indonesia, halaman lupa password + reset password.
- **Email reset password** lewat SMTP (Brevo) dengan template sendiri (bukan bawaan Laravel), plus versi teks. Kalau `MAIL_MAILER=log`, link cuma ditulis ke `storage/logs/laravel.log` dan halamannya bilang jujur.
- **Anti-enumeration**: email terdaftar atau tidak, pesannya sama.
- **`php artisan mail:test alamat@email.com`** — cek kredensial SMTP tanpa bikin akun baru.

**Keamanan & rapi-rapi**
- Halaman utama di balik guard `auth`, CSRF di semua form/fetch, validasi base64 + MIME + dimensi + ukuran, otorisasi per-strip (403 kalau bukan pemilik), throttle simpan 20x/menit.
- **Kuota per user** — 90 strip / 60 MB (`QUOTA_STRIPS`, `QUOTA_MB`), dicek sebelum file ditulis (lembar + thumbnail + shot), sisa kuota tampil di profil.
- **Kuota booth (global)** — 700 MB untuk semua akun (`QUOTA_TOTAL_MB`), supaya disk hosting tidak penuh; kalau penuh, penyimpanan baru ditolak dengan pesan jelas dan profil menampilkan pemakaian global.
- **Foto mentah tidak publik** — `public/images/photos/.htaccess` menutup akses `shot_*` (403) dan memasang `X-Robots-Tag: noindex`; `robots.txt` menyembunyikan halaman privat.
- Command `php artisan photos:prune` (ada `--dry-run`) untuk membuang file yatim di folder foto.
- Tema pastel, halaman error custom 404/419/500, favicon sendiri, layout mobile dengan bottom sheet.
- **PWA ringan** — `manifest.webmanifest` + ikon 192/512 (maskable) + `theme-color`: bisa "Add to Home Screen" dan kebuka fullscreen tanpa address bar. Tanpa service worker (booth butuh kamera + server, cache offline cuma bikin bug).
- **Shortcut keyboard** — `Spasi` = jepret/lanjut, `R` = ulangi semua; diabaikan saat fokus di input caption.

## Kebutuhan

- PHP 8.2+ (ekstensi `fileinfo`, `pdo_mysql`, `mbstring`)
- MySQL / MariaDB
- Composer
- Browser yang mendukung kamera (Chrome/Edge/Firefox di `localhost` atau HTTPS)

Tidak perlu Node/npm untuk menjalankan aplikasi — semua aset statis di `public/`.
Node hanya dipakai kalau mau **membangun ulang bundle animasi** (opsional, hasil build sudah ikut di repo):

```bash
npm install
npm run build:anim     # resources/js/animations/* -> public/js/animations.js
```
GD/Imagick **tidak** dipakai: komposisi strip dilakukan di browser (canvas), server hanya menyimpan file jadi.

## Instalasi

```bash
git clone <repo> amphibooth-laravel
cd amphibooth-laravel
composer install
cp .env.example .env
php artisan key:generate
```

Buat database lalu sesuaikan `.env`:

```sql
CREATE DATABASE amphibooth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```env
DB_DATABASE=amphibooth
DB_USERNAME=root
DB_PASSWORD=
```

Migrasi + isi data:

```bash
php artisan migrate --force
php artisan db:seed --force   # impor 4 user + 6 foto dari dump lama (LegacyDataSeeder)
```

Atau jalankan semuanya sekaligus: `composer setup`.

## Deploy

Panduan lengkap (alwaysdata gratis, 25–35 menit, termasuk Brevo & checklist verifikasi):
**[docs/DEPLOY-ALWAYSDATA.md](docs/DEPLOY-ALWAYSDATA.md)**

Ringkasnya:

```bash
bash deploy/buat-paket.sh      # -> deploy/amphibooth-alwaysdata.zip (tanpa vendor & foto user)
# upload zip, composer install --no-dev, isi .env, migrate, cache
```

Checklist produksi yang paling sering lupa:

| Setelan | Nilai | Kenapa |
|---|---|---|
| `APP_ENV` / `APP_DEBUG` | `production` / `false` | Jangan bocorin stack trace |
| `APP_URL` | `https://domain-kamu` | Link reset password dibangun dari sini |
| HTTPS | wajib | Browser memblokir kamera di HTTP |
| `SESSION_SECURE_COOKIE` | `true` | Cookie sesi cuma lewat HTTPS |
| `MAIL_*` | Brevo SMTP | Tanpa ini reset password cuma masuk log |
| permission | `chmod -R u+rwX storage bootstrap/cache public/images/photos` | Kalau tidak, simpan strip gagal |

## Tes dari HP (kamera butuh HTTPS)

Browser cuma mengizinkan kamera di **HTTPS** atau `localhost` — jadi membuka `http://172.20.x.x/...`
dari HP akan menampilkan booth tapi kameranya diblokir. Dua cara yang benar:

**1. Tunnel HTTPS (tanpa deploy, paling cepat)**

```bash
# sekali unduh (Windows): cloudflared-windows-amd64.exe dari GitHub Cloudflare
./cloudflared.exe tunnel --url http://localhost:80
# -> https://<nama-acak>.trycloudflare.com
```

Buka `https://<nama-acak>.trycloudflare.com/amphibooth-laravel/public/` di HP. URL-nya hidup
selama proses jalan dan **siapa pun yang punya link itu bisa membukanya** — jangan disebar.
`bootstrap/app.php` sudah memakai `trustProxies(at: '*')`, jadi aset otomatis jadi `https://`
(tanpa itu CSS/JS diblok sebagai mixed content).

**2. Deploy ke hosting HTTPS** (permanen) — lihat [docs/DEPLOY-ALWAYSDATA.md](docs/DEPLOY-ALWAYSDATA.md).

Checklist tes di HP: landing → Coba Demo → izinkan kamera → 3 pose → pilih frame → unduh →
daftar akun → gallery → profil (kuota) → hapus data. Filter wajah perlu internet (MediaPipe dari CDN).

## Menjalankan

**Cara 1 — XAMPP/Apache (subfolder):**

Buka `http://localhost/amphibooth-laravel/public` — `public/.htaccess` sudah disiapkan, jadi route Laravel jalan tanpa `index.php` di URL.

> Document root idealnya mengarah ke folder `public/`. Dibuka dari dalam `htdocs` seperti di atas juga jalan, asal URL-nya menyertakan `/public`.

**Cara 2 — server bawaan:**

```bash
php artisan serve
```

Lalu buka `http://127.0.0.1:8000`.

## Testing

```bash
php artisan test
```

33 test (auth, sesi strip, validasi, love, hapus, download, halaman share, prune, reset password) jalan di SQLite in-memory — database MySQL tidak disentuh.

Smoke test HTTP end-to-end (login → simpan strip 3 foto → love → download → share → hapus → logout) lewat Apache:

```bash
bash storage/smoke-test.sh
```

## Struktur Singkat

```
app/Http/Controllers/   AuthController, PageController (landing/booth/demo/gallery/share/privacy),
                        CollageController, ProfileController, PasswordResetController
app/Models/             User (+kuota), Collage (lembar), Photo (shot mentah)
app/Mail/               ResetPasswordMail, TestMail (template di resources/views/emails)
app/Console/Commands/   PruneOrphanPhotos (photos:prune), SendTestMail (mail:test)
app/Providers/          AppServiceProvider (rate limiter profil: profile-password, profile-wipe)
config/amphibooth.php   path foto, batas ukuran, kuota per user, kontak privasi
database/migrations/    users (+reset token, sessions), cache, jobs, photos, collages
database/seeders/       LegacyDataSeeder (data lama), DatabaseSeeder
deploy/                 buat-paket.sh (zip deploy tanpa vendor/foto)
docs/                   DEPLOY-ALWAYSDATA.md (panduan deploy + troubleshooting)
public/css|js           booth.css/booth.js, strip.js (renderer frame), gallery.css/gallery.js,
                        profile.css, landing.css/landing.js, legal.css, login.css, face-filter.js,
                        animations.css + animations.js (bundle animasi, hasil npm run build:anim)
resources/js/animations core.js + index.js (sumber bundle animasi, dibangun esbuild)
public/images/photos    file hasil: strip_*.jpg + shot_*.jpg (tanpa storage:link)
                        .htaccess menutup shot_* & memasang noindex
public/images/filters   stiker PNG 1280x720
resources/views/        layouts, partials, auth, booth, gallery, profile, landing, privacy,
                        emails, share, errors
```

## Animasi UI

Semua gerakan pakai **vanilla `motion`** — satu bundle `public/js/animations.js` hasil `npm run build:anim` (esbuild). Server/hosting tidak butuh Node; hasil build ikut di repo.

Progressive enhancement: Blade merender HTML seperti biasa, JS hanya menambah gerak. `<html class="js-anim">` dipasang sebelum paint, lalu ada failsafe 2,5 detik — kalau bundle gagal dimuat, atribut animasi dicabut dan konten tetap tampil utuh.

| Bagian | Gerakan |
|---|---|
| Semua halaman | **Tirai bilik** — 5 kolom pink menyapu naik saat pindah halaman (penanda `sessionStorage` `amph:curtain`); kalau JS mati, link biasa jalan seperti normal |
| Landing | Hero pakai CSS keyframes (mulai sejak paint pertama, tidak menunggu bundle), blob gradasi, strip ngambang, badge berdenyut, petunjuk scroll 📸, bar progres scroll, reveal saat digulir |
| Booth | Panel fase fade-up, slot muncul, strip reveal, cincin hitungan mundur, film maju, titik "kamera siap", konfeti saat sesi selesai, bar di overlay "mencetak" |
| Gallery | Skeleton shimmer saat memuat, stagger kartu, tilt 3D + kilau (desktop saja), lightbox strip, hati saat di-love, kartu mengecil saat dihapus |
| Profil | Panel reveal, bar kuota tumbuh, titik peringatan kalau kuota ≥80%, form error bergoyang |

Aturan yang dipegang:

- Cuma `transform` + `opacity` (komposit → 60fps di HP kelas bawah). Denyut pakai scale/opacity, **bukan** `box-shadow` yang memaksa repaint tiap frame.
- `prefers-reduced-motion: reduce` mematikan semua gerak (tirai bahkan tidak dibuat).
- `@media print` menyembunyikan tirai, lightbox, konfeti, dan petunjuk scroll.
- Hook dari Markup: `data-anim`, `data-anim-group`, `data-anim-fade`, `data-page`. Hook dari JS: `window.AmphiboothAnim` (`panel`, `strip`, `advance`, `countTick`, `ready`, `confetti`, `showSkeletons`, `clearSkeletons`).
- `public/js/animations.js` hasil build — jangan diedit manual; ubah `resources/js/animations/*` lalu `npm run build:anim`.

## Alur Data

1. Browser: 3× capture (video + stiker AI) → canvas per slot.
2. `strip.js` menggambar lembar (frame + caption + tanggal + efek) → JPEG.
3. `POST /collages` mengirim **3 shot + 1 lembar** (base64). Server memvalidasi lalu menyimpan 4 file + 1 baris `collages` + 3 baris `photos`.
4. Gallery membaca `collages`; `GET /collages/{id}/download` mengirim file dengan nama `amphibooth-strip3-YYYY-MM-DD.jpg`.

## Catatan

- Foto disimpan langsung di `public/images/photos` supaya tidak butuh `php artisan storage:link` (ramah hosting gratis). Folder ini di-`.gitignore` — jangan commit foto user.
- File yatim (sisa sesi yang gagal / data lama) bisa dibersihkan:
  ```bash
  php artisan photos:prune --dry-run   # lihat dulu
  php artisan photos:prune             # hapus
  ```
- Batas ukuran: lembar `PHOTO_MAX_KB` (default 8192 KB), satu shot `SHOT_MAX_KB` (default 2048 KB), jumlah kartu per halaman `PHOTOS_PER_PAGE` (default 12).
- Timezone aplikasi `Asia/Jakarta` (`APP_TIMEZONE`).
- Mail driver default `log` — link reset password muncul di `storage/logs/laravel.log`.
- User hasil impor data lama login pakai email + password lamanya (hash bcrypt dipakai apa adanya). Foto lama otomatis dibungkus jadi lembar `layout=single, frame=plain`.
- Link share bersifat *public by link* (siapa pun yang punya token bisa melihat); token 32 karakter acak, dibuat saat strip disimpan.
- Ukuran lembar hasil: lebar 696–752 px di layar, file unduhan 1.5×-nya → sekitar 2.4–3.6 × 5.4–8.2 inci pada 300 dpi (angka aslinya ditampilkan di layar hasil). Kalau nanti dipakai vendor dengan ukuran cetak tetap (mis. strip 2×6 inci), yang perlu ditambah adalah **layout baru** (strip 4 foto / grid 3×3), bukan cuma mengubah DPI.
- Throttle: `throttle:6,1` bawaan Laravel itu kuncinya cuma domain + user, jadi semua route ber-limit sama akan saling menghabiskan kuota. Untuk aksi berbeda (ganti password vs hapus data) pakai named limiter terpisah di `AppServiceProvider`.