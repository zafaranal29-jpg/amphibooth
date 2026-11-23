@extends('layouts.auth')

@section('title', 'Amphibooth - Lupa Password')
@section('subtitle', 'Lupa password? 🔑')

@section('content')
    <form action="{{ route('password.email') }}" method="POST">
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

        <button type="submit" class="btn-auth">Kirim link reset 💌</button>
    </form>

    @if (config('mail.default') === 'log')
        <p class="form-note">
            Di mode lokal, email cuma ditulis ke <code>storage/logs/laravel.log</code>.
        </p>
    @endif

    <div class="auth-links">
        <a href="{{ route('login') }}" class="forgot-link">← Balik ke halaman masuk</a>
    </div>
@endsection
