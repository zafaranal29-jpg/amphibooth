<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>{{ $collage->caption ?: 'Strip dari '.$collage->user->name }} - Amphibooth</title>

    {{-- Open Graph: biar preview WhatsApp/Twitter kelihatan strip-nya --}}
    <meta property="og:type" content="photo">
    <meta property="og:site_name" content="Amphibooth">
    <meta property="og:title" content="{{ $collage->caption ?: 'Strip photobooth '.$collage->user->name }}">
    <meta property="og:description" content="Dibuat dengan Amphibooth — photo booth imut dengan filter yang ngikutin gerak kepala 📸">
    <meta property="og:image" content="{{ $collage->url() }}">
    <meta property="og:image:alt" content="Strip photobooth Amphibooth">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="{{ $collage->url() }}">

    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            min-height: 100vh;
            background-color: #FFFDF9;
            background-image: radial-gradient(#FFC0CB 2px, transparent 2px);
            background-size: 30px 30px;
            font-family: 'Quicksand', sans-serif;
            color: #795548;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 32px 16px 60px;
        }

        .brand {
            font-family: 'Fredoka', sans-serif;
            font-size: 1.8rem;
            color: #FFC0CB;
            text-shadow: 2px 2px 0 #795548;
            text-decoration: none;
            margin-bottom: 22px;
        }

        .share-card {
            background: #fff;
            border: 4px solid #795548;
            border-radius: 28px;
            box-shadow: 0 12px 0 rgba(121, 85, 72, 0.15);
            padding: 18px;
            max-width: 420px;
            width: 100%;
            text-align: center;
        }

        .share-card img {
            max-width: 100%;
            max-height: 56vh;
            width: auto;
            height: auto;
            margin: 0 auto;
            border-radius: 14px;
            display: block;
            object-fit: contain;
        }

        .missing-note {
            padding: 60px 18px;
            font-weight: 700;
            color: #A9968A;
            line-height: 1.6;
        }

        .meta {
            margin-top: 14px;
            font-size: 0.9rem;
            font-weight: 700;
        }

        .caption {
            font-family: 'Fredoka', sans-serif;
            font-size: 1.15rem;
            margin-top: 6px;
        }

        .meta small {
            display: block;
            margin-top: 4px;
            font-size: 0.78rem;
            color: #A9968A;
            font-weight: 700;
        }

        .actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 18px;
        }

        .btn {
            font-family: 'Fredoka', sans-serif;
            font-size: 1rem;
            padding: 13px 18px;
            border-radius: 18px;
            border: 3px solid #795548;
            background: #FFFDF9;
            color: #795548;
            text-decoration: none;
            cursor: pointer;
            box-shadow: 0 5px 0 rgba(121, 85, 72, 0.3);
            transition: all .15s ease;
        }

        .btn:hover { transform: translateY(-2px); }
        .btn:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(121, 85, 72, 0.3); }

        .btn-primary {
            background: #FFC0CB;
            box-shadow: 0 5px 0 #795548;
        }

        .footer {
            margin-top: 24px;
            font-size: 0.8rem;
            font-weight: 700;
            color: #A9968A;
        }
    </style>

    @include('partials.animations-head')
</head>
<body data-page="share">

    <a class="brand" href="{{ route('demo') }}">Amphibooth 📸</a>

    <div class="share-card" data-anim>
        @if ($collage->exists())
            <img src="{{ $collage->url() }}" alt="Strip photobooth {{ $collage->user->name }}">
        @else
            <p class="missing-note">Filenya udah nggak ada di server 😢<br>Tapi datanya masih tercatat.</p>
        @endif

        <div class="meta">
            {{ $collage->layoutLabel() }} · {{ ($collage->taken_at ?? $collage->created_at)?->translatedFormat('d M Y') }}

            @if ($collage->caption)
                <p class="caption">“{{ $collage->caption }}”</p>
            @endif

            <small>oleh {{ $collage->user->name }}</small>
        </div>

        <div class="actions">
            @if ($collage->exists())
                <a class="btn btn-primary" href="{{ $collage->url() }}" download="{{ $collage->downloadName() }}">
                    <i class="fa-solid fa-download"></i> Download strip
                </a>
            @endif
            <a class="btn" href="{{ route('demo') }}">
                <i class="fa-solid fa-camera"></i> Bikin strip kamu sendiri
            </a>
        </div>
    </div>

    <p class="footer" data-anim>Dibuat pakai Amphibooth — 3 pose, 1 strip imut 💖</p>

    @include('partials.animations-scripts')
</body>
</html>