<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
    <title>Amphibooth - My Cuteness Collection</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <link rel="stylesheet" href="{{ asset('css/gallery.css') }}">
</head>
<body>

    <nav class="top-nav">
        <a href="{{ url('/booth') }}" class="nav-btn"><i class="fa-solid fa-camera"></i> Booth</a>
        <a href="{{ url('/gallery') }}" class="nav-btn active"><i class="fa-solid fa-images"></i> Gallery</a>
        
        <div class="nav-divider"></div>
        
        <a href="{{ url('/logout') }}" id="btn-logout" class="nav-btn logout"><i class="fa-solid fa-arrow-right-from-bracket"></i> Bye-bye! 👋</a>
    </nav>

    <main class="main-content">
        <header class="header-title">
            <h1>Halo, <span id="nama-user">{{ Session::get('username', 'Cutie') }}</span>! ✨</h1>
            <p>Semua momen imut {{ Session::get('username', 'Cutie') }} tersimpan di sini!</p>
        </header>

        <div class="filter-controls" style="text-align: center; margin-bottom: 20px;">
            <button class="btn-to-booth" onclick="filterGallery('all')">All Photos</button>
            <button class="btn-to-booth" onclick="filterGallery('loved')">Loved Only ❤️</button>
        </div>

        <div class="gallery-container">
            <p class="loading-text" id="loading-msg">Mencari foto-foto lucumu... 🔍</p>
            
            <div id="empty-state" class="hidden">
                <p id="empty-msg" class="empty-text">Yhaaa, belum ada foto nih 🥺</p>
                <a href="{{ url('/booth') }}" class="btn-to-booth">Yuk foto sekarang! 📸</a>
            </div>

            <div class="gallery-grid" id="gallery-grid"></div>
        </div>
    </main>

    <div class="floating-assets">
        <span class="asset frog-1">🐸</span>
        <span class="asset star-1">⭐</span>
        <span class="asset heart-1">💖</span>
        <span class="asset sparkle-1">✨</span>
        <span class="asset bubble-1">🫧</span>
        <span class="asset cat-1">🐱</span>
        <span class="asset bunny-1">🐰</span>
        <span class="asset flower-1">🌸</span>
        <span class="asset ribbon-1">🎀</span>
        <span class="asset bear-1">🧸</span>
        <span class="asset text-cute">Cute! 💕</span>
        <span class="asset text-boop">Boop! 🐾</span>
    </div>

    <script src="{{ asset('js/gallery.js') }}"></script>
</body>
</html>