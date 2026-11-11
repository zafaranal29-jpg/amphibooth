<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController; // ✅ INI WAJIB DITAMBAHIN BIAR CONTROLLER KEBACA
use App\Http\Controllers\BoothController;
use App\Http\Controllers\GalleryController;

// ==========================================
// ROUTE HALAMAN (GET) - Buat Nampilin UI
// ==========================================

// Biar kalau lu buka localhost:8000 langsung dilempar ke halaman login
Route::get('/', function () {
    return redirect('/login');
});

Route::get('/login', function () {
    return view('login'); 
});

Route::get('/register', function () {
    return view('register'); 
});

Route::get('/forgot-password', function () {
    return view('forgot'); 
});

Route::get('/booth', function () {
    return view('booth'); 
});

Route::get('/gallery', function () {
    return view('gallery'); 
});


// ==========================================
// ROUTE PROSES (POST) - Buat Nangkep Data Form
// ==========================================

// Route buat memproses data dari form register
Route::post('/register', [AuthController::class, 'proses_register']);

// Sekalian gua siapin buat proses login (Nanti kita pakai)
Route::post('/login', [AuthController::class, 'proses_login']);

// Route untuk nerima gambar dari JavaScript
Route::post('/simpan-foto', [BoothController::class, 'simpan_foto']);

// Route untuk ngambil data foto buat di-load di halaman Gallery
Route::get('/get-photos', [GalleryController::class, 'get_photos']);

// Route untuk memproses Logout
Route::get('/logout', [AuthController::class, 'logout']);