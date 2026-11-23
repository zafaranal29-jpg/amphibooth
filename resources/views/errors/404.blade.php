@extends('layouts.auth')

@section('title', 'Amphibooth - Halaman tidak ditemukan')
@section('subtitle', 'Halaman ini hilang 🐸')

@section('content')
    <p class="form-note" style="text-align:center; font-size:1.05rem;">
        Yang kamu cari gak ada di sini. Mungkin sudah pindah, atau salah ketik link-nya.
    </p>

    <div class="auth-links" style="text-align:center;">
        <a href="{{ url('/') }}" class="forgot-link">← Balik ke Amphibooth</a>
    </div>
@endsection
