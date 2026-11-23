<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>Amphibooth - Profil</title>

    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}">

    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    {{-- gallery.css dipakai bareng buat nav, background, dan komponen dasar --}}
    <link rel="stylesheet" href="{{ asset('css/gallery.css') }}?v={{ filemtime(public_path('css/gallery.css')) }}">
    <link rel="stylesheet" href="{{ asset('css/profile.css') }}?v={{ filemtime(public_path('css/profile.css')) }}">

    @include('partials.animations-head')
</head>
<body data-page="profile">

    @include('partials.nav', ['active' => 'profile', 'demo' => false])

    <main class="main-content profile-main">
        <header class="header-title" data-anim-group>
            <h1>Profil kamu, <span>{{ $user->name }}</span>! 👤</h1>
            <p>Atur nama panggilan, ganti password, atau bersihkan semua strip dari sini.</p>
        </header>

        @if (session('status'))
            <div class="flash-status">✨ {{ session('status') }}</div>
        @endif

        @if ($errors->any())
            <div class="flash-error">
                @foreach ($errors->all() as $error)
                    <p>🥺 {{ $error }}</p>
                @endforeach
            </div>
        @endif

        {{-- RINGKASAN DATA --}}
        <section class="profile-stats" data-anim-group>
            <div class="stat-card">
                <span class="stat-value">{{ $stats['collages'] }}</span>
                <span class="stat-label">Strip</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">{{ $stats['loved'] }}</span>
                <span class="stat-label">Disukai ❤️</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">{{ $stats['photos'] }}</span>
                <span class="stat-label">Foto mentah</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">{{ number_format($stats['bytes'] / 1048576, 1) }}</span>
                <span class="stat-label">MB dipakai</span>
            </div>
        </section>

        {{-- KUOTA PENYIMPANAN --}}
        <section class="quota-box" data-anim>
            <div class="quota-head">
                <h3>Kuota kamu 📦</h3>
                <span class="quota-note"></span>
            </div>

            <div class="quota-row">
                <div class="quota-label">
                    <span>Strip</span>
                    <strong>{{ $stats['quota']['strips'] }} / {{ $stats['quota']['strips_quota'] }}</strong>
                </div>
                <div class="quota-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"
                     aria-valuenow="{{ $stats['quota']['strips_percent'] }}">
                    <span style="width: {{ $stats['quota']['strips_percent'] }}%"></span>
                </div>
            </div>

            <div class="quota-row">
                <div class="quota-label">
                    <span>Penyimpanan</span>
                    <strong>{{ number_format($stats['quota']['bytes'] / 1048576, 1) }} MB / {{ number_format($stats['quota']['bytes_quota'] / 1048576, 0) }} MB</strong>
                </div>
                <div class="quota-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"
                     aria-valuenow="{{ $stats['quota']['bytes_percent'] }}">
                    <span style="width: {{ $stats['quota']['bytes_percent'] }}%"></span>
                </div>
            </div>
        </section>

        <div class="profile-grid">
            {{-- UBAH NAMA --}}
            <section class="panel-box" data-anim>
                <h3>Ubah nama ✏️</h3>
                <p class="panel-hint">Nama ini muncul di sapaan booth &amp; halaman gallery.</p>

                <form method="POST" action="{{ route('profile.update') }}" class="profile-form">
                    @csrf
                    @method('patch')

                    <label for="name">Nama panggilan</label>
                    <input type="text" id="name" name="name" class="text-input"
                           value="{{ old('name', $user->name) }}" minlength="3" maxlength="50" required>

                    <label>Email (buat login)</label>
                    <input type="email" class="text-input" value="{{ $user->email }}" disabled>

                    <button type="submit" class="btn-primary">Simpan nama 💾</button>
                </form>
            </section>

            {{-- GANTI PASSWORD --}}
            <section class="panel-box" data-anim>
                <h3>Ganti password 🔒</h3>
                <p class="panel-hint">Wajib isi password lama dulu, minimal 8 karakter buat yang baru.</p>

                <form method="POST" action="{{ route('profile.password') }}" class="profile-form">
                    @csrf
                    @method('put')

                    <label for="current_password">Password lama</label>
                    <input type="password" id="current_password" name="current_password"
                           class="text-input" autocomplete="current-password" required>

                    <label for="password">Password baru</label>
                    <input type="password" id="password" name="password"
                           class="text-input" minlength="8" autocomplete="new-password" required>

                    <label for="password_confirmation">Ulangi password baru</label>
                    <input type="password" id="password_confirmation" name="password_confirmation"
                           class="text-input" minlength="8" autocomplete="new-password" required>

                    <button type="submit" class="btn-primary">Ganti password 🔐</button>
                </form>
            </section>

            {{-- ZONA BAHAYA --}}
            <section class="panel-box danger-box" data-anim>
                <h3>Hapus semua data 🧹</h3>
                <p class="panel-hint">
                    Semua strip ({{ $stats['collages'] }} lembar) dan {{ $stats['photos'] }} foto mentahnya
                    dihapus permanen dari server, termasuk link share-nya. Akun kamu tetap ada.
                </p>

                <form method="POST" action="{{ route('profile.data.destroy') }}" class="profile-form"
                      onsubmit="return confirm('Yakin hapus SEMUA strip kamu? Ini nggak bisa dibatalin.');">
                    @csrf
                    @method('delete')

                    <label for="confirm_password">Ketik password kamu buat konfirmasi</label>
                    <input type="password" id="confirm_password" name="confirm_password"
                           class="text-input" autocomplete="current-password" required>

                    <button type="submit" class="btn-danger">Hapus semua data 🗑️</button>
                </form>
            </section>
        </div>
    </main>

    <p class="profile-legal">
        <a href="{{ route('privacy') }}">Catatan privasi</a>
    </p>

    @include('partials.floating-assets')

    @include('partials.animations-scripts')
</body>
</html>
