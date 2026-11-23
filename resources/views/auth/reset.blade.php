@extends('layouts.auth')

@section('title', 'Amphibooth - Password Baru')
@section('subtitle', 'Bikin password baru 🔐')

@section('content')
    <form action="{{ route('password.update') }}" method="POST">
        @csrf
        <input type="hidden" name="token" value="{{ $token }}">

        <div class="input-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" value="{{ old('email', $email) }}"
                   placeholder="your.email@cute.com" required
                   class="@error('email') has-error @enderror">
            @error('email')
                <span class="field-error">{{ $message }}</span>
            @enderror
        </div>

        <div class="input-group">
            <label for="password">Password Baru</label>
            <input type="password" id="password" name="password" placeholder="Minimal 8 karakter" required autofocus
                   class="@error('password') has-error @enderror">
            @error('password')
                <span class="field-error">{{ $message }}</span>
            @enderror
        </div>

        <div class="input-group">
            <label for="password_confirmation">Ulangi Password Baru</label>
            <input type="password" id="password_confirmation" name="password_confirmation"
                   placeholder="••••••••" required>
        </div>

        <button type="submit" class="btn-auth">Simpan Password 💕</button>
    </form>

    <div class="auth-links">
        <a href="{{ route('login') }}" class="forgot-link">← Balik ke halaman masuk</a>
    </div>
@endsection
