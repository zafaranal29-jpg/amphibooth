<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CollageController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| Semua route punya nama supaya view & JS cukup memakai route()/asset(),
| jadi app tetap jalan walau dibuka dari subfolder (localhost/amphibooth-laravel/public).
*/

Route::get('/', [PageController::class, 'landing'])->name('landing');
Route::get('/privasi', [PageController::class, 'privacy'])->name('privacy');

/*
|--------------------------------------------------------------------------
| Halaman publik
|--------------------------------------------------------------------------
| /demo      : coba booth tanpa daftar (hasil tidak disimpan ke server)
| /p/{token} : halaman share strip (sekaligus preview WhatsApp)
*/
Route::get('/demo', [PageController::class, 'demo'])->name('demo');
Route::get('/p/{collage:share_token}', [PageController::class, 'share'])->name('share.show');

/*
|--------------------------------------------------------------------------
| Tamu (belum login)
|--------------------------------------------------------------------------
*/
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:6,1')
        ->name('login.store');

    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:6,1')
        ->name('register.store');

    Route::get('/forgot-password', [PasswordResetController::class, 'showRequest'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'sendLink'])
        ->middleware('throttle:3,1')
        ->name('password.email');

    Route::get('/reset-password/{token}', [PasswordResetController::class, 'showReset'])->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'reset'])
        ->middleware('throttle:3,1')
        ->name('password.update');
});

/*
|--------------------------------------------------------------------------
| Harus login
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::get('/booth', [PageController::class, 'booth'])->name('booth');
    Route::get('/gallery', [PageController::class, 'gallery'])->name('gallery');

    Route::get('/collages', [CollageController::class, 'index'])->name('collages.index');
    Route::post('/collages', [CollageController::class, 'store'])
        ->middleware('throttle:20,1')
        ->name('collages.store');
    Route::patch('/collages/{collage}/love', [CollageController::class, 'toggleLove'])->name('collages.love');
    Route::get('/collages/{collage}/download', [CollageController::class, 'download'])->name('collages.download');
    Route::delete('/collages/{collage}', [CollageController::class, 'destroy'])->name('collages.destroy');

    /*
    | Profil: ganti nama & password, plus hapus semua data.
    | Ganti password / hapus data dibatasi 6x per menit biar tidak
    | dipakai buat nebak password lama.
    */
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])
        ->middleware('throttle:profile-password')
        ->name('profile.password');
    Route::delete('/profile/data', [ProfileController::class, 'destroyData'])
        ->middleware('throttle:profile-wipe')
        ->name('profile.data.destroy');
});
