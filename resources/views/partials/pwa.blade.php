{{--
    PWA ringan: cukup manifest + ikon + theme-color, tanpa service worker.
    Tujuannya cuma dua: "Add to Home Screen" di Android dan mode fullscreen
    (tanpa address bar) waktu dibuka dari ikon. Tidak ada caching offline
    karena halaman booth butuh kamera + server; SW cuma bikin bug cache.
--}}
<link rel="manifest" href="{{ asset('manifest.webmanifest') }}">
<meta name="theme-color" content="#FFC0CB">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Amphibooth">
