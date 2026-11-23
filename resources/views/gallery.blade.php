<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>Amphibooth - My Cuteness Collection</title>

    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}">

    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <link rel="stylesheet" href="{{ asset('css/gallery.css') }}?v={{ filemtime(public_path('css/gallery.css')) }}">

    @include('partials.app-config', ['demo' => false])

    @include('partials.animations-head')
</head>
<body data-page="gallery">

    @include('partials.nav', ['active' => 'gallery', 'demo' => false])

    <main class="main-content">
        <header class="header-title" data-anim-group>
            <h1>Halo, <span id="nama-user">{{ auth()->user()->name }}</span>! ✨</h1>
            <p>Semua strip imut {{ auth()->user()->name }} tersimpan di sini!</p>
        </header>

        @if (session('status'))
            <div class="flash-status">✨ {{ session('status') }}</div>
        @endif

        <div class="filter-controls" data-anim-group>
            <button class="btn-to-booth is-active" type="button" data-gallery-filter="all">All Strips</button>
            <button class="btn-to-booth" type="button" data-gallery-filter="loved">Loved Only ❤️</button>
            <a class="btn-to-booth btn-take-photo" href="{{ route('booth') }}">+ Jepret Lagi 📸</a>
        </div>

        <div class="gallery-container">
            <p class="loading-text" id="loading-msg">Mencari strip-strip lucumu... 🔍</p>

            <div id="empty-state" class="hidden" hidden style="display:none">
                <p id="empty-msg" class="empty-text">Yhaaa, belum ada strip nih 🥺</p>
                <a href="{{ route('booth') }}" class="btn-to-booth">Yuk foto sekarang! 📸</a>
            </div>

            <div class="gallery-grid" id="gallery-grid"></div>

            <div class="load-more-wrap hidden" id="load-more-wrap" hidden style="display:none">
                <button type="button" class="btn-load-more" id="load-more">Muat strip lainnya 💫</button>
                <p class="gallery-count" id="gallery-count"></p>
            </div>
        </div>
    </main>

    @include('partials.floating-assets')

    <div id="toast" role="status" aria-live="polite"></div>

    <script src="{{ asset('js/gallery.js') }}?v={{ filemtime(public_path('js/gallery.js')) }}"></script>

    @include('partials.animations-scripts')
</body>
</html>