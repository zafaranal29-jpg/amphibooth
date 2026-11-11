@echo off
echo === Setup project amphibooth ===

call composer install
if not exist .env copy .env.example .env
call php artisan key:generate
call php artisan storage:link
call npm install
call npm run build

echo.
echo === Selesai ===
echo Tinggal: buat database di phpMyAdmin, isi DB_DATABASE di .env,
echo lalu jalanin: php artisan migrate
pause