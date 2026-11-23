{{--
    Animasi UI — bagian <head>.
    Class `js-anim` dipasang SEBELUM paint supaya elemen yang akan dianimasikan
    tidak "berkedip" muncul-hilang. Kalau bundle animasi gagal dimuat dalam 2.5s,
    class dicabut lagi sehingga halaman tampil normal (progressive enhancement).
--}}
<script>
    (function () {
        var root = document.documentElement;
        root.classList.add('js-anim');
        window.setTimeout(function () {
            if (!window.__amphiboothAnim) {
                root.classList.remove('js-anim');
            }
        }, 2500);
    })();
</script>
<link rel="stylesheet" href="{{ asset('css/animations.css') }}?v={{ filemtime(public_path('css/animations.css')) }}">
