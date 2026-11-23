<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Folder penyimpanan foto
    |--------------------------------------------------------------------------
    | Foto booth disimpan langsung di dalam public/ supaya tidak butuh
    | `php artisan storage:link` (symlink sering diblokir hosting gratis).
    */
    'photos_path' => env('PHOTOS_PATH', public_path('images/photos')),

    /*
    |--------------------------------------------------------------------------
    | Batas ukuran foto (KB)
    |--------------------------------------------------------------------------
    | Data URL base64 yang dikirim browser dibatasi sebesar ini sebelum
    | disimpan. 8192 KB = 8 MB.
    */
    'max_upload_kb' => (int) env('PHOTO_MAX_KB', 8192),

    /*
    |--------------------------------------------------------------------------
    | Batas ukuran satu shot mentah (KB)
    |--------------------------------------------------------------------------
    | Shot disimpan sebagai JPEG dari canvas, jadi normalnya 40-200 KB.
    */
    'max_shot_kb' => (int) env('SHOT_MAX_KB', 2048),

    /*
    |--------------------------------------------------------------------------
    | Jumlah foto per halaman di gallery
    |--------------------------------------------------------------------------
    */
    'photos_per_page' => (int) env('PHOTOS_PER_PAGE', 12),

    /*
    |--------------------------------------------------------------------------
    | Kuota per user
    |--------------------------------------------------------------------------
    | Batas biar satu akun tidak menghabiskan disk hosting gratis (alwaysdata
    | free cuma 1 GB). Dihitung dari jumlah strip + total byte lembar dan
    | shot mentahnya.
    */
    'quota_strips' => (int) env('QUOTA_STRIPS', 100),
    'quota_mb' => (int) env('QUOTA_MB', 200),

    /*
    |--------------------------------------------------------------------------
    | Kuota per user
    |--------------------------------------------------------------------------
    | Batas biar satu akun tidak menghabiskan disk hosting gratis (alwaysdata
    | free cuma 1 GB). Dihitung dari jumlah strip + total byte lembar, shot
    | mentah, dan thumbnail-nya.
    |
    | 60 MB itu kira-kira 120-150 strip, karena satu sesi sekarang disimpan
    | sebagai: lembar JPEG ~150-200 KB + 3 shot ~75 KB + thumbnail ~30 KB.
    */
    'quota_strips' => (int) env('QUOTA_STRIPS', 90),
    'quota_mb' => (int) env('QUOTA_MB', 60),

    /*
    |--------------------------------------------------------------------------
    | Kuota total booth (semua user)
    |--------------------------------------------------------------------------
    | Pagar terakhir supaya disk hosting tidak penuh gara-gara banyak akun.
    | Kalau folder foto sudah melewati batas ini, siapa pun tidak bisa
    | menyimpan strip baru sampai ada yang dihapus. Sisain ruang buat
    | database, log, dan sistem.
    */
    'quota_total_mb' => (int) env('QUOTA_TOTAL_MB', 700),

    /*
    |--------------------------------------------------------------------------
    | Ukuran thumbnail gallery
    |--------------------------------------------------------------------------
    | Thumbnail dibuat di browser (canvas) waktu menyimpan strip, jadi server
    | tidak butuh ekstensi GD. Lebar 360 px cukup buat kartu gallery.
    */
    'thumb_width' => (int) env('THUMB_WIDTH', 360),
    'max_thumb_kb' => (int) env('THUMB_MAX_KB', 512),

    /*
    |--------------------------------------------------------------------------
    | Kontak
    |--------------------------------------------------------------------------
    | Ditampilkan di halaman catatan privasi.
    */
    'contact_email' => env('CONTACT_EMAIL', 'zafaranal29@gmail.com'),
];
