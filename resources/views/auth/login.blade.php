@extends('layouts.auth')

@section('title', 'Amphibooth - Masuk')
@section('subtitle', 'Selamat datang lagi! 🤓')

@section('content')
    <form action="{{ route('login.store') }}" method="POST">
        @csrf

        <div class="input-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" value="{{ old('email') }}"
                   placeholder="your.email@cute.com" required autofocus
                   class="@error('email') has-error @enderror">
            @error('email')
                <span class="field-error">{{ $message }}</span>
            @enderror
        </div>

        <div class="input-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="••••••••" required
                   class="@error('password') has-error @enderror">
            @error('password')
                <span class="field-error">{{ $message }}</span>
            @enderror
        </div>

        <div class="remember-row">
            <input type="checkbox" id="remember" name="remember" value="1" {{ old('remember') ? 'checked' : '' }}>
            <label for="remember">Ingat aku 💭</label>
        </div>

        <button type="submit" class="btn-auth">Masuk 💖</button>
    </form>

    <div class="auth-links">
        <p>Belum punya akun? <a href="{{ route('register') }}">Daftar yuk! 🌸</a></p>
        <a href="{{ route('password.request') }}" class="forgot-link">Lupa password? 🤔</a>
    </div>

    <a href="{{ route('demo') }}" class="demo-cta">
        <i class="fa-solid fa-wand-magic-sparkles"></i> Coba dulu tanpa daftar 🎈
    </a>

    <p class="auth-privacy">
        <a href="{{ route('privacy') }}">Catatan privasi</a>
    </p>
@endsection
