@echo off

echo === Setup project Amphibooth ===
echo.

call composer install
if not exist .env copy .env.example .env
call php artisan key:generate

echo.
echo === Migrasi database + impor data lama ===
call php artisan migrate --force
call php artisan db:seed --force

echo.
echo === Selesai ===
echo 1. Kalau database "amphibooth" belum ada, buat dulu di phpMyAdmin
echo 2. Cek DB_DATABASE / DB_USERNAME / DB_PASSWORD di .env
echo 3. Jalankan: php artisan serve  (atau buka via Apache: /amphibooth-laravel/public)
pause
