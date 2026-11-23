@extends('layouts.auth')

@section('title', 'Amphibooth - Sesi kedaluwarsa')
@section('subtitle', 'Sesi kamu udah expired ⏰')

@section('content')
    <p class="form-note" style="text-align:center; font-size:1.05rem;">
        Halaman ini kebuka terlalu lama. Coba balik dulu, terus ulangi aksinya ya.
    </p>

    <div class="auth-links" style="text-align:center;">
        <a href="{{ url('/') }}" class="forgot-link">← Balik ke Amphibooth</a>
    </div>
@endsection
