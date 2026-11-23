@extends('layouts.auth')

@section('title', 'Amphibooth - Daftar')
@section('subtitle', 'Gabung yuk! 🎉')

@section('content')
    <form action="{{ route('register.store') }}" method="POST">
        @csrf

        <div class="input-group">
            <label for="name">Nama panggilan</label>
            <input type="text" id="name" name="name" value="{{ old('name') }}"
                   placeholder="Nama imut kamu ✨" required autofocus
                   class="@error('name') has-error @enderror">
            @error('name')
                <span class="field-error">{{ $message }}</span>
            @enderror
        </div>

        <div class="input-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" value="{{ old('email') }}"
                   placeholder="your.email@cute.com" required
                   class="@error('email') has-error @enderror">
            @error('email')
                <span class="field-error">{{ $message }}</span>
            @enderror
        </div>

        <div class="input-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Minimal 8 karakter" required
                   class="@error('password') has-error @enderror">
            @error('password')
                <span class="field-error">{{ $message }}</span>
            @enderror
        </div>

        <div class="input-group">
            <label for="password_confirmation">Ulangi Password</label>
            <input type="password" id="password_confirmation" name="password_confirmation"
                   placeholder="••••••••" required>
        </div>

        <button type="submit" class="btn-auth">Buat akun ✨</button>
    </form>

    <div class="auth-links">
        <a href="{{ route('login') }}" class="forgot-link">← Balik ke halaman masuk</a>
    </div>
@endsection
