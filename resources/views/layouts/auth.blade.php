<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>@yield('title', 'Amphibooth')</title>

    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('apple-touch-icon.png') }}">

    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Quicksand:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/login.css') }}?v={{ filemtime(public_path('css/login.css')) }}">

    @include('partials.animations-head')
    @include('partials.pwa')
</head>
<body data-page="auth">

    <div class="auth-container">
        <div class="auth-box" data-anim-group>
            <h1 class="brand-title">Amphibooth</h1>
            <p class="brand-subtitle">@yield('subtitle')</p>

            @if (session('status'))
                <div class="status-box">{{ session('status') }}</div>
            @endif

            @yield('content')
        </div>
    </div>

    @include('partials.floating-assets')

    @include('partials.animations-scripts')

</body>
</html>
