@extends('layouts.auth')

@section('title', 'Amphibooth - Ada yang error')
@section('subtitle', 'Ups, ada yang rusak 🥺')

@section('content')
    <p class="form-note" style="text-align:center; font-size:1.05rem;">
        Server-nya lagi bingung. Coba lagi beberapa saat lagi ya.
    </p>

    <div class="auth-links" style="text-align:center;">
        <a href="{{ url('/') }}" class="forgot-link">← Balik ke Amphibooth</a>
    </div>
@endsection
