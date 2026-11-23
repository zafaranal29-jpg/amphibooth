<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, follow">

    <title>Catatan privasi — Amphibooth</title>
    <meta name="description" content="Data apa yang disimpan Amphibooth, siapa yang bisa lihat, dan cara menghapusnya.">

    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/legal.css') }}?v={{ filemtime(public_path('css/legal.css')) }}">

    @include('partials.animations-head')
    @include('partials.pwa')
</head>
<body data-page="privacy">

    <header class="legal-nav">
        <a class="legal-brand" href="{{ route('landing') }}">📸 Amphibooth</a>
        <nav>
            @auth
                <a href="{{ route('booth') }}">Buka Booth</a>
            @else
                <a href="{{ route('demo') }}">Coba Demo</a>
                <a href="{{ route('login') }}">Masuk</a>
            @endauth
        </nav>
    </header>

    <main class="legal-main" data-anim-group>
        <h1>Catatan privasi</h1>
        <p class="legal-lead">
            Versi pendeknya: foto kamu cuma buat kamu. Nggak ada iklan, nggak ada jual data,
            dan kamu bisa menghapus semuanya sendiri kapan saja.
        </p>

        <section>
            <h2>Yang disimpan</h2>
            <ul>
                <li><strong>Akun:</strong> nama panggilan, email, dan password (disimpan sebagai hash, bukan teks asli).</li>
                <li><strong>Hasil booth:</strong> satu lembar strip dan tiga foto mentah per sesi, plus caption dan tanggalnya.</li>
                <li><strong>Log teknis:</strong> catatan error server untuk keperluan perbaikan.</li>
            </ul>
        </section>

        <section>
            <h2>Siapa yang bisa lihat</h2>
            <ul>
                <li><strong>Kamu</strong> — semua strip di halaman Gallery setelah login.</li>
                <li><strong>Foto mentah</strong> (tiga foto per strip) <strong>tidak bisa diakses dari browser</strong>; file-nya ditutup di server.</li>
                <li><strong>Orang lain</strong> cuma bisa lihat satu strip kalau kamu sendiri menekan tombol bagikan: link-nya berisi token acak 32 karakter. Siapa pun yang punya link itu bisa melihat — jadi jangan bagikan link strip yang privat.</li>
                <li>Menghapus strip berarti link bagikannya juga mati.</li>
            </ul>
        </section>

        <section>
            <h2>Yang tidak dilakukan</h2>
            <ul>
                <li>Nggak ada iklan, nggak ada penjualan data, nggak ada profil iklan.</li>
                <li>Nggak ada pelacakan antar-situs. Halaman ini cuma memakai cookie sesi untuk login.</li>
                <li>Filter wajah diproses <strong>di browser kamu</strong> (bukan dikirim ke server) — tapi modelnya diambil dari CDN pihak ketiga, jadi browser tetap memuat file dari jsDelivr, Google Fonts, dan Font Awesome.</li>
            </ul>
        </section>

        <section>
            <h2>Berapa lama disimpan</h2>
            <p>
                Sampai kamu hapus. Di halaman <strong>Profil</strong> ada tombol
                <em>Hapus semua data</em> yang menghapus semua strip, foto mentah, dan file-nya dari server.
                Akun dan kuotanya juga bisa kamu kosongkan kapan saja.
            </p>
            <p>
                Kuota per akun: {{ config('amphibooth.quota_strips') }} strip dan
                {{ config('amphibooth.quota_mb') }} MB penyimpanan.
            </p>
        </section>

        <section>
            <h2>Pertanyaan</h2>
            <p>
                Kalau ada yang mau ditanyakan soal data kamu, hubungi
                <a href="mailto:{{ config('amphibooth.contact_email') }}">{{ config('amphibooth.contact_email') }}</a>.
            </p>
        </section>

        <p class="legal-foot">Terakhir diperbarui: {{ now()->translatedFormat('d F Y') }}</p>
    </main>

    <footer class="legal-footer" data-anim-group>
        <a href="{{ route('landing') }}">← Balik ke halaman depan</a>
    </footer>

    @include('partials.animations-scripts')
</body>
</html>
