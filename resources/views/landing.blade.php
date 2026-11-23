<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Amphibooth — Photo booth imut langsung di browser</title>
    <meta name="description" content="Photo booth online gratis: 3 pose jadi 1 strip cantik, 16 pilihan frame, filter yang ngikutin gerak kepala. Coba demo tanpa daftar.">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Amphibooth">
    <meta property="og:title" content="Amphibooth — Photo booth imut langsung di browser">
    <meta property="og:description" content="3 pose, 1 strip cantik. 16 frame, filter yang ngikutin gerak kepala. Coba demo gratis.">
    <meta name="twitter:card" content="summary">

    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Fredoka:wght@400;500;600&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <link rel="stylesheet" href="{{ asset('css/landing.css') }}?v={{ filemtime(public_path('css/landing.css')) }}">

    @include('partials.animations-head')
    @include('partials.pwa')
</head>
<body data-page="landing">

    <header class="landing-nav">
        <a class="landing-brand" href="{{ route('landing') }}">
            <span class="brand-dot">📸</span> Amphibooth
        </a>

        <nav class="nav-actions">
            @auth
                <a class="btn-nav" href="{{ route('booth') }}">Buka Booth</a>
            @else
                <a class="nav-link" href="{{ route('login') }}">Masuk</a>
                <a class="btn-nav" href="{{ route('register') }}">Daftar Gratis</a>
            @endauth
        </nav>
    </header>

    <main>
        {{-- HERO --}}
        <section class="hero">
            <span class="hero-blob hero-blob-a" aria-hidden="true"></span>
            <span class="hero-blob hero-blob-b" aria-hidden="true"></span>
            <div class="hero-copy anim-intro">
                <span class="hero-badge">✨ Gratis · tanpa install</span>

                <h1>Photo booth imut<br><span class="hero-accent">langsung di browser</span></h1>

                <p class="hero-lead">
                    Tiga pose jadi satu strip cantik. Pilih dari <strong>16 frame</strong>,
                    pakai filter yang ngikutin gerak kepala, lalu simpan ke gallery kamu.
                </p>

                <div class="hero-actions">
                    <a class="btn-main" href="{{ route('demo') }}">
                        <i class="fa-solid fa-camera"></i> Coba Demo Gratis
                    </a>
                    <a class="btn-ghost" href="{{ route('register') }}">Bikin akun dulu</a>
                </div>

                <p class="hero-note">
                    Demo bisa langsung diunduh (ada watermark). Daftar biar tersimpan di gallery &amp; tanpa watermark.
                </p>
            </div>

            <div class="hero-strips anim-intro" id="hero-strips" aria-hidden="true">
                <div class="strip-slot" data-frame="polaroid" ></div>
                <div class="strip-slot" data-frame="wedding" ></div>
                <div class="strip-slot" data-frame="film" ></div>
            </div>
        </section>

        {{-- PETUNJUK SCROLL --}}
        <div class="scroll-hint" aria-hidden="true"><span>📸</span></div>

        {{-- 3 LANGKAH --}}
        <section class="steps">
            <h2 class="section-title" data-anim>Cuma 3 langkah</h2>

            <ol class="step-list" data-anim-group>
                <li>
                    <span class="step-num">1</span>
                    <h3>Buka booth</h3>
                    <p>Izinkan kamera sekali aja. Jalan di HP maupun laptop, nggak perlu install apa pun.</p>
                </li>
                <li>
                    <span class="step-num">2</span>
                    <h3>Jepret 3 pose</h3>
                    <p>Pakai filter stiker yang nempel di kepala, hitung mundur otomatis, bisa jepret ulang per slot.</p>
                </li>
                <li>
                    <span class="step-num">3</span>
                    <h3>Pilih frame &amp; simpan</h3>
                    <p>Lihat preview asli dari foto kamu sendiri, kasih caption, lalu simpan atau unduh.</p>
                </li>
            </ol>
        </section>

        {{-- FITUR --}}
        <section class="features">
            <h2 class="section-title" data-anim>Yang bikin beda</h2>

            <div class="feature-grid" data-anim-group>
                <article class="feature-card">
                    <span class="feature-icon">🎀</span>
                    <h3>16 frame siap pakai</h3>
                    <p>Polaroid, wedding, film, koran, boarding pass, sampai pop art — tinggal pilih lewat thumbnail.</p>
                </article>
                <article class="feature-card">
                    <span class="feature-icon">🪄</span>
                    <h3>Filter ngikutin kepala</h3>
                    <p>Stikernya ikut miring, geser, dan menjauh saat kamu gerak — bukan gambar yang nempel diam.</p>
                </article>
                <article class="feature-card">
                    <span class="feature-icon">🖼️</span>
                    <h3>Gallery pribadi</h3>
                    <p>Semua strip tersimpan rapi. Bisa diberi love, diunduh, atau dibagikan lewat link.</p>
                </article>
                <article class="feature-card">
                    <span class="feature-icon">💖</span>
                    <h3>Gratis &amp; tanpa watermark</h3>
                    <p>Daftar sekali, hasilnya bersih tanpa cap apa pun. Kuota 100 strip per akun.</p>
                </article>
            </div>
        </section>

        {{-- CTA PENUTUP --}}
        <section class="cta-band" data-anim-group>
            <h2>Siap jepret sekarang?</h2>
            <p>Nggak perlu bikin akun buat nyoba — demo-nya gratis.</p>
            <a class="btn-main" href="{{ route('demo') }}">
                <i class="fa-solid fa-camera"></i> Mulai Demo
            </a>
        </section>
    </main>

    <footer class="landing-footer" data-anim-group>
        <span>Amphibooth · dibuat buat kamu yang suka foto bareng 💖</span>
        <nav>
            <a href="{{ route('privacy') }}">Catatan privasi</a>
            @guest
                <a href="{{ route('login') }}">Masuk</a>
            @endguest
        </nav>
    </footer>

    <script src="{{ asset('js/strip.js') }}?v={{ filemtime(public_path('js/strip.js')) }}"></script>
    <script src="{{ asset('js/landing.js') }}?v={{ filemtime(public_path('js/landing.js')) }}"></script>

    @include('partials.animations-scripts')
</body>
</html>
