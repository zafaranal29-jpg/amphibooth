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
    | Kontak
    |--------------------------------------------------------------------------
    | Ditampilkan di halaman catatan privasi.
    */
    'contact_email' => env('CONTACT_EMAIL', 'zafaranal29@gmail.com'),
];
