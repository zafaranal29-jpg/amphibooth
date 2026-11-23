{{--
    URL & data yang dipakai JS. Semua lewat route()/asset() supaya
    tetap benar walau app dibuka dari subfolder (bukan hardcode "/simpan").
    Mode demo: endpoint simpan tetap dikirim tapi `demo: true`, jadi booth.js
    tahu harus menyembunyikan tombol simpan.
--}}
@php($isDemo = $demo ?? false)

<script type="application/json" id="app-config">
{!! json_encode([
    'collagesIndex' => route('collages.index'),
    'collagesStore' => route('collages.store'),
    'collagesLove' => route('collages.love', ['collage' => '__ID__']),
    'collagesDestroy' => route('collages.destroy', ['collage' => '__ID__']),
    'collagesDownload' => route('collages.download', ['collage' => '__ID__']),
    'galleryUrl' => route('gallery'),
    'loginUrl' => route('login'),
    'registerUrl' => route('register'),
    'shareBase' => url('/p'),
    'filtersBase' => asset('images/filters'),
    'userName' => auth()->user()?->name,
    'demo' => $isDemo,
    // Lebar thumbnail yang dibuat browser sebelum dikirim (sama dengan
    // config('amphibooth.thumb_width')).
    'thumbWidth' => (int) config('amphibooth.thumb_width', 360),
    // Service worker + manifest: dipakai pwa-install.js (pasang di HP & offline).
    'swUrl' => asset('sw.js'),
    'manifestUrl' => asset('manifest.webmanifest'),
], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!}
</script>