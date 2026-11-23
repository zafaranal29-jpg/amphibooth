# Deploy Amphibooth ke alwaysdata (gratis)

Panduan ini disesuaikan dengan proyek ini: **Laravel 12 + PHP 8.2 + MySQL**, foto disimpan
langsung di `public/images/photos` (tanpa `storage:link`), dan **tanpa build step di server**
(CSS/JS polos di `public/`; satu-satunya bundle yang dibangun — animasi UI — sudah ikut jadi
file statis `public/js/animations.js`, jadi `npm` tidak dibutuhkan sama sekali di hosting).

Perkiraan waktu: **25–35 menit**. Semua langkah dijalankan lewat SSH (alwaysdata menyediakannya
di paket gratis).

---

## 0. Yang sudah disiapkan di paket zip

| Sudah beres | Keterangan |
|---|---|
| `public/css`, `public/js` | Semua aset termasuk `animations.js` (sudah di-bundle, tanpa build step) |
| `public/images/filters/` | 6 stiker PNG 1280×720 |
| `public/images/photos/.htaccess` | Menutup akses `shot_*` + `X-Robots-Tag: noindex` |
| `public/robots.txt` | Halaman privat tidak diindeks |
| `config/amphibooth.php` | Path foto, batas ukuran, kuota (100 strip / 200 MB) |
| `.env.example` | Template konfigurasi (MySQL, Brevo, kuota) |
| `composer.lock` | Versi dependency terkunci |

Yang **tidak** ikut ke zip (memang harus begini): `vendor/`, `tests/`, `.env`, dan foto user
(`public/images/photos/*` — hanya `.gitkeep` + `.htaccess` yang ikut).

---

## 1. Bikin paket & akun

Di komputer, dari root proyek:

```bash
bash deploy/buat-paket.sh
# hasil: deploy/amphibooth-alwaysdata.zip
```

Di **https://www.alwaysdata.com** → daftar paket **Free** (1 GB disk, 256 MB RAM).
Kekurangan disk 1 GB itu alasan kuota per user dibatasi 100 strip / 200 MB.

## 2. Bikin site

Panel → **Web → Sites → Add a site**:

- **Type**: `PHP`
- **PHP version**: `8.2` (atau 8.3)
- **Addresses**: subdomain gratis, mis. `amphibooth.<akun>.alwaysdata.net`
- **Root directory**: `/home/<akun>/www/amphibooth/public` ← **harus berakhir di `/public`**
  (folder ini belum ada; buat dulu lewat SSH: `mkdir -p ~/www/amphibooth/public`)

Catat alamat SSH: `ssh <akun>@ssh-<akun>.alwaysdata.net` (panel → **Remote access → SSH**).

> Kamera browser **wajib HTTPS**. Subdomain `*.alwaysdata.net` sudah otomatis HTTPS, jadi
> tidak perlu beli sertifikat.

## 3. Bikin database MySQL

Panel → **Databases → MySQL → Add a database**:

- Name: `db_amphibooth`
- User: `amphibooth` + password kuat (simpan)

Catat **Host** yang ditampilkan panel — formatnya **`mysql-<akun>.alwaysdata.net`**, bukan
`localhost`. Database & user otomatis diberi prefix akun: `<akun>_db_amphibooth`, `<akun>_amphibooth`.

## 4. Upload kode

```bash
scp deploy/amphibooth-alwaysdata.zip <akun>@ssh-<akun>.alwaysdata.net:~/amphibooth.zip
```

Di server:

```bash
ssh <akun>@ssh-<akun>.alwaysdata.net
mkdir -p ~/www && cd ~/www
unzip -q ~/amphibooth.zip -d amphibooth && cd amphibooth
ls    # harus ada: app  artisan  composer.json  public  resources  routes  vendor belum ada
```

## 5. Pasang dependency

```bash
cd ~/www/amphibooth
composer install --no-dev --optimize-autoloader
```

Kalau memory limit menolak:

```bash
COMPOSER_MEMORY_LIMIT=-1 composer install --no-dev --optimize-autoloader
```

Kalau `composer` tidak ada: `php -r "copy('https://getcomposer.org/installer','cs.php');" && php cs.php && rm cs.php && php composer.phar install --no-dev --optimize-autoloader`

## 6. Isi `.env`

```bash
cp .env.example .env
nano .env
```

Minimal yang **wajib** diubah:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://amphibooth.<akun>.alwaysdata.net

DB_CONNECTION=mysql
DB_HOST=mysql-<akun>.alwaysdata.net
DB_DATABASE=<akun>_db_amphibooth
DB_USERNAME=<akun>_amphibooth
DB_PASSWORD=<password database>

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true

# Email reset password (Brevo)
MAIL_MAILER=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=<email login Brevo>
MAIL_PASSWORD=<SMTP key dari panel Brevo>
MAIL_FROM_ADDRESS=<alamat yang diverifikasi di Brevo>
MAIL_FROM_NAME="Amphibooth"

QUOTA_STRIPS=100
QUOTA_MB=200
CONTACT_EMAIL=<email kontak kamu>
```

Lalu:

```bash
php artisan key:generate
```

> `APP_URL` harus **persis** alamat HTTPS-nya. Link reset password di email dibangun dari
> request/`APP_URL` — kalau salah, link-nya nyasar ke `localhost`.

## 7. Migrasi database

```bash
php artisan migrate --force
```

Database baru = tabel kosong, **tanpa** user. Daftar akun pertama lewat `/register`.

Kalau mau memindahkan data lama dari laptop:

```bash
# di laptop
mysqldump -uroot amphibooth > amphibooth.sql
# di server
mysql -u <akun>_amphibooth -p <akun>_db_amphibooth < amphibooth.sql
```

Jangan lupa ikut memindahkan file di `public/images/photos` (pakai `scp -r`), kalau tidak,
strip-nya tercatat di database tapi gambarnya hilang — gallery akan menandainya
"filenya nggak ada".

## 8. Permission & cache

```bash
chmod -R u+rwX storage bootstrap/cache
chmod -R u+rwX public/images/photos
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Kalau nanti mengubah `.env` di server, **selalu** jalankan `php artisan config:cache` lagi.

## 9. Tes email (jangan dilewati)

```bash
php artisan mail:test email-kamu@gmail.com
```

Harus muncul `Terkirim ke ... lewat smtp`. Kalau gagal, cek:

- `MAIL_USERNAME` = email login Brevo, `MAIL_PASSWORD` = **SMTP key** (bukan password akun)
- Alamat `MAIL_FROM_ADDRESS` sudah diverifikasi di Brevo (Senders → verify)
- Kalau `Connection timed out`: hosting memblokir port 587 → coba `MAIL_PORT=2525`

Setelah itu tes alur nyata: `/forgot-password` → cek inbox → klik link → password baru → login.

## 10. Verifikasi di browser (jangan dilewati)

| URL | Harapan |
|---|---|
| `/` | Landing page tampil: hero + 3 contoh strip + tombol "Coba Demo Gratis" |
| `/demo` | Booth jalan, minta izin kamera, bisa jepret 3 pose & unduh (ada watermark) |
| `/register` | Daftar akun baru berhasil → masuk ke booth |
| `/booth` | Kamera tampil (HTTPS), filter muncul, jepret 3 pose → layar hasil |
| `/gallery` | Strip tersimpan, thumbnail utuh (bukan terpotong) |
| `/profile` | Ringkasan data + kuota (`0 / 100 strip`) + form nama/password |
| `/privasi` | Halaman catatan privasi terbuka |
| `/p/<token>` | Halaman share tampil + `og:image` mengarah ke strip |
| `/images/photos/shot_apa_saja.jpg` | **403** (foto mentah diblokir) |
| `/halaman-ngawur` | Halaman 404 bertema, bukan putih polos |

Cek juga dari HP: buka `/booth`, izinkan kamera, jepret sekali. Kalau kamera tidak muncul di HP,
berarti situs diakses lewat HTTP (bukan HTTPS).

## 11. Update versi berikutnya

```bash
cd ~/www/amphibooth
unzip -o ~/amphibooth.zip
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
```

Foto user di `public/images/photos` **tidak hilang** saat update, karena zip tidak berisi foto
(hanya `.htaccess` + `.gitkeep`).

## 12. Perawatan

```bash
# lihat file yatim (sisa sesi gagal / strip yang barisnya sudah dihapus)
php artisan photos:prune --dry-run

# hapus kalau laporannya sudah dicek
php artisan photos:prune
```

Kalau mau otomatis tiap minggu, tambahkan di panel **Advanced → Scheduled tasks**:

```
0 3 * * 1   cd ~/www/amphibooth && php artisan photos:prune
```

## 13. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| **500 Internal Server Error** | Baca `storage/logs/laravel.log`. Paling sering `APP_KEY` kosong → `php artisan key:generate` |
| Halaman putih / "Whoops" | `APP_DEBUG=false` menyembunyikan detail; sementara set `true`, lalu balikin `false` |
| **Kamera tidak muncul** | Situs dibuka lewat HTTP, atau browser memblokir izin. Wajib HTTPS + klik "Izinkan" |
| Login berhasil tapi balik ke login | `SESSION_SECURE_COOKIE=true` tapi situs diakses HTTP. Pakai HTTPS |
| `SQLSTATE[HY000] [2002]` | `DB_HOST` salah — salin persis dari panel Databases (bukan `localhost`) |
| Strip tersimpan tapi gambar 404 | Folder `public/images/photos` tidak writable → `chmod -R u+rwX` |
| Foto mentah masih bisa dibuka | `AllowOverride` di site dimatikan → aktifkan, atau pastikan `.htaccess` ikut ter-upload |
| Email reset tidak nyampe | Jalankan `php artisan mail:test`; cek spam; pastikan sender diverifikasi di Brevo |
| Email masuk spam | Wajar di awal. Tandai "bukan spam"; kalau serius, pakai domain sendiri di Brevo |
| Ubah `.env` tapi tidak berefek | `php artisan config:clear && php artisan config:cache` |
| Disk penuh padahal kuota per user 200 MB | Total akun × 200 MB bisa lewat 1 GB. Turunkan `QUOTA_MB`, atau batasi jumlah akun |
| `photos:prune` menghapus foto yang masih dipakai | Jangan jalankan tanpa `--dry-run` dulu; perintah ini hanya menghapus file yang **tidak** punya baris di database |
