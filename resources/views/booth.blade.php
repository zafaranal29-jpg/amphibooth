<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ ($demo ?? false) ? 'Coba Amphibooth - Tanpa Daftar' : 'Amphibooth - Strike a Pose!' }}</title>

    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}">

    {{-- Caveat dipakai buat caption gaya tulisan tangan di frame polaroid --}}
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Quicksand:wght@500;700&family=Caveat:wght@600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <link rel="stylesheet" href="{{ asset('css/booth.css') }}?v={{ filemtime(public_path('css/booth.css')) }}">

    @include('partials.app-config', ['demo' => $demo ?? false])

    @include('partials.animations-head')
    @include('partials.pwa')
</head>

<body class="{{ ($demo ?? false) ? 'is-demo' : '' }}" data-page="booth">

    @include('partials.nav', ['active' => 'booth', 'demo' => $demo ?? false])

    <main class="main-content">
        @if (session('status'))
            <div class="flash-status">{{ session('status') }}</div>
        @endif

        @if ($demo ?? false)
            <div class="demo-banner">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                Mode coba-coba: strip bisa dijepret &amp; diunduh, tapi ada watermark dan nggak kesimpan.
                <a href="{{ route('register') }}">Daftar gratis</a> biar bersih + masuk gallery 💖
            </div>
        @endif

        <header class="header-title" data-anim-group>
            <h1>Strike a Pose! 📸</h1>
            <p>
                Tiga pose, satu strip imut.
                @if (! ($demo ?? false))
                    Siap, <span id="nama-user">{{ auth()->user()->name }}</span>?
                @else
                    Ayo coba dulu, <span id="nama-user">kamu</span>!
                @endif
            </p>
        </header>

        <div class="booth-layout">
            {{-- ============ KAMERA / HASIL ============ --}}
            <section class="camera-section" data-anim>
                <div class="stage">
                    <div class="camera-viewport" id="camera-viewport">
                        <p class="loading-text" id="loading-text">Menyalakan kamera... 👀</p>

                        <video id="video-feed" autoplay playsinline muted></video>

                        {{-- overlay stiker AI (ikut gerak kepala) --}}
                        <canvas id="face-canvas"></canvas>

                        {{-- buffer capture, disembunyikan --}}
                        <canvas id="canvas-overlay" class="capture-buffer"></canvas>

                        <div class="viewport-hud">
                            <span class="hud-chip" id="shot-progress">Foto 1/3</span>
                            <span class="hud-chip hud-ai" id="filter-status">Menyiapkan filter AI...</span>
                        </div>

                        <div id="countdown">3</div>
                        <div id="camera-flash"></div>
                    </div>

                    {{-- preview strip (juga target print) --}}
                    <div class="strip-stage hidden" id="strip-stage">
                        <div class="strip-frame">
                            <canvas id="strip-canvas"></canvas>
                        </div>

                        <div class="printing-overlay" id="printing-overlay" hidden>
                            <div class="printer">🖨️</div>
                            <p>Mencetak strip kamu...</p>
                            <div class="print-bar" aria-hidden="true"><span></span></div>
                        </div>
                    </div>
                </div>

                {{-- slot 3 foto + retake per slot --}}
                <div class="slot-strip" id="slot-strip">
                    <button class="slot" type="button" data-anim-fade data-slot="0" aria-label="Foto 1">
                        <span class="slot-num">1</span>
                        <img alt="" hidden>
                        <span class="slot-retake"><i class="fa-solid fa-rotate-left"></i> Ulangi</span>
                    </button>
                    <button class="slot" type="button" data-anim-fade data-slot="1" aria-label="Foto 2">
                        <span class="slot-num">2</span>
                        <img alt="" hidden>
                        <span class="slot-retake"><i class="fa-solid fa-rotate-left"></i> Ulangi</span>
                    </button>
                    <button class="slot" type="button" data-anim-fade data-slot="2" aria-label="Foto 3">
                        <span class="slot-num">3</span>
                        <img alt="" hidden>
                        <span class="slot-retake"><i class="fa-solid fa-rotate-left"></i> Ulangi</span>
                    </button>
                </div>

                <div class="shutter-row">
                    <button class="btn-shutter" id="shutter-button" type="button">
                        <i class="fa-solid fa-camera"></i>
                        <span id="shutter-label">Mulai Sesi (3 foto)</span>
                    </button>
                    <button class="btn-ghost" id="restart-button" type="button" hidden>
                        <i class="fa-solid fa-rotate-left"></i> Ulangi Semua
                    </button>
                </div>
            </section>

            {{-- ============ PANEL LANGKAH ============ --}}
            <aside class="side-panel" id="side-panel" data-anim-fade>
                <button class="sheet-toggle" id="sheet-toggle" type="button" aria-expanded="false">
                    <i class="fa-solid fa-sliders"></i> <span id="sheet-toggle-text">Pengaturan</span>
                </button>

                {{-- LANGKAH 1: setup --}}
                <section class="panel-box" id="setup-panel">
                    <h3>Filter Wajah ✨</h3>

                    <div class="filter-list">
                        <button class="btn-filter active" data-filter="none">😊 No Filter</button>
                        <button class="btn-filter" data-filter="frog">🐸 Frog Hat</button>
                        <button class="btn-filter" data-filter="cat">🐱 Cat Ears</button>
                        <button class="btn-filter" data-filter="devil">😈 Devil Horns</button>
                        <button class="btn-filter" data-filter="blush">😳 Blushing</button>
                        <button class="btn-filter" data-filter="heart">💖 Hearts</button>
                        <button class="btn-filter" data-filter="sparkle">✨ Sparkles</button>
                    </div>

                    <h3 class="panel-subtitle">Kamera</h3>

                    <div class="setting-row">
                        <label for="camera-select">Sumber</label>
                        <select id="camera-select">
                            <option value="">Kamera utama</option>
                        </select>
                    </div>

                    <div class="setting-row">
                        <label for="quality-select">Kualitas</label>
                        <select id="quality-select">
                            <option value="640">Standar</option>
                            <option value="1280" selected>HD</option>
                        </select>
                    </div>

                    <div class="setting-row">
                        <label for="timer-select">Hitungan</label>
                        <select id="timer-select">
                            <option value="3" selected>3 detik</option>
                            <option value="5">5 detik</option>
                            <option value="0">Tanpa hitungan</option>
                        </select>
                    </div>

                    <label class="switch">
                        <input type="checkbox" id="mirror-toggle" checked>
                        <span>Cermin (mirror)</span>
                    </label>

                    <label class="switch">
                        <input type="checkbox" id="sound-toggle" checked>
                        <span>Suara shutter &amp; beep</span>
                    </label>

                    <p class="panel-hint">Filter &amp; kamera dikunci selama sesi jalan, biar 3 fotonya konsisten.</p>
                </section>

                {{-- LANGKAH 2: frame + caption --}}
                <section class="panel-box hidden" id="finish-panel">
                    <h3>Frame 💌</h3>

                    {{-- Kartu frame + thumbnail visual diisi booth.js dari Strip.picker --}}
                    <div class="frame-grid" id="frame-list"></div>

                    <div class="setting-row hidden" id="frame-color-row">
                        <label for="frame-color">Warna</label>
                        <input type="color" id="frame-color" value="#ffb3c7">
                    </div>

                    <h3 class="panel-subtitle">Caption</h3>

                    <input class="text-input" id="caption-input" type="text" maxlength="80"
                           placeholder="Tulis ucapan manis di sini... (opsional)">

                    <label class="switch">
                        <input type="checkbox" id="date-toggle" checked>
                        <span>Tampilkan tanggal</span>
                    </label>

                    <h3 class="panel-subtitle">Efek Foto <span class="chip-count" id="effect-count"></span></h3>

                    <div class="filter-list filter-list-inline effect-scroll" id="effect-list">
                        <button class="btn-filter active" data-effect="none">Original</button>
                        <button class="btn-filter" data-effect="warm">Hangat</button>
                        <button class="btn-filter" data-effect="grayscale">B&amp;W</button>
                        <button class="btn-filter" data-effect="sepia">Vintage</button>
                        <button class="btn-filter" data-effect="blur">Blur Lembut</button>
                        <button class="btn-filter" data-effect="invert">Alien</button>

                        <button class="btn-filter" data-effect="mono">Mono</button>
                        <button class="btn-filter" data-effect="noir">Noir</button>
                        <button class="btn-filter" data-effect="silver">Silver</button>
                        <button class="btn-filter" data-effect="fade">Fade</button>
                        <button class="btn-filter" data-effect="vintage70">70s</button>
                        <button class="btn-filter" data-effect="lomo">Lomo</button>
                        <button class="btn-filter" data-effect="vhs">VHS</button>

                        <button class="btn-filter" data-effect="sunset">Sunset</button>
                        <button class="btn-filter" data-effect="honey">Honey</button>
                        <button class="btn-filter" data-effect="peach">Peach</button>
                        <button class="btn-filter" data-effect="amber">Amber</button>

                        <button class="btn-filter" data-effect="arctic">Arctic</button>
                        <button class="btn-filter" data-effect="ocean">Ocean</button>
                        <button class="btn-filter" data-effect="mint">Mint</button>

                        <button class="btn-filter" data-effect="polaroid">Polaroid</button>
                        <button class="btn-filter" data-effect="kodak">Kodak</button>
                        <button class="btn-filter" data-effect="fujifilm">Fujifilm</button>

                        <button class="btn-filter" data-effect="dreamy">Dreamy</button>
                        <button class="btn-filter" data-effect="bloom">Bloom</button>
                        <button class="btn-filter" data-effect="pastel">Pastel</button>
                        <button class="btn-filter" data-effect="matte">Matte</button>
                        <button class="btn-filter" data-effect="cinematic">Cinematic</button>
                        <button class="btn-filter" data-effect="hdr">HDR</button>
                        <button class="btn-filter" data-effect="y2k">Y2K</button>
                        <button class="btn-filter" data-effect="cyberpunk">Cyberpunk</button>
                        <button class="btn-filter" data-effect="comic">Comic</button>
                        <button class="btn-filter" data-effect="sketch">Sketch</button>
                        <button class="btn-filter" data-effect="duotone">Duotone</button>
                        <button class="btn-filter" data-effect="riso">Riso</button>
                    </div>

                    <p class="panel-hint hint-tight">Geser daftarnya buat lihat efek lain ⤓</p>

                    <div class="action-buttons">
                        <button class="btn-save" id="save-button" type="button">Simpan ke Gallery 💖</button>
                        <button class="btn-delete" id="finish-reset" type="button">Ulangi Semua</button>
                    </div>
                </section>

                {{-- LANGKAH 3: hasil --}}
                <section class="panel-box hidden" id="result-panel">
                    <h3>Strip kamu jadi! 🎉</h3>
                    <p class="panel-hint" id="result-hint">Mau diapain selanjutnya?</p>
                    <p class="panel-hint" id="result-size"></p>

                    <div class="result-actions">
                        <button class="btn-save" id="download-button" type="button">Download 💾</button>
                        <button class="btn-ghost" id="print-button" type="button">Print 🖨️</button>
                        <button class="btn-ghost" id="share-button" type="button">Bagikan 🔗</button>
                        <a class="btn-ghost" id="gallery-link"
                           href="{{ ($demo ?? false) ? route('register') : route('gallery') }}">
                            {{ ($demo ?? false) ? 'Daftar biar kesimpan 💖' : 'Ke Gallery 📚' }}
                        </a>
                        <button class="btn-ghost" id="again-button" type="button">Foto Lagi 📸</button>
                    </div>
                </section>
            </aside>
        </div>
    </main>

    @include('partials.floating-assets')

    <div id="toast" role="status" aria-live="polite"></div>

    {{--
        Semua script pakai `defer` supaya parsing HTML tidak nunggu CDN.
        Kalau jsdelivr lambat/diblokir, halaman tetap tampil dan kamera
        masih bisa jalan — filternya saja yang jatuh ke status error
        (face-filter.js sudah jaga `typeof FaceMesh === 'undefined'`).
        Urutan defer dipertahankan browser, jadi booth.js tetap jalan terakhir.
    --}}
    <script defer src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>

    <script defer src="{{ asset('js/face-filter.js') }}?v={{ filemtime(public_path('js/face-filter.js')) }}"></script>
    <script defer src="{{ asset('js/strip.js') }}?v={{ filemtime(public_path('js/strip.js')) }}"></script>
    <script defer src="{{ asset('js/booth.js') }}?v={{ filemtime(public_path('js/booth.js')) }}"></script>

    @include('partials.animations-scripts')
</body>
</html>