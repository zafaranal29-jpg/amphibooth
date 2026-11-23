/**
 * Amphibooth — service worker minimalis.
 *
 * Tujuannya dua: supaya halaman booth bisa dibuka saat sinyal jelek (offline
 * ringan), dan supaya browser menganggap situs ini layak "dipasang" ke HP.
 *
 * Aturan mainnya sengaja konservatif:
 * - Semua permintaan tetap network-first. Cache cuma dipakai kalau jaringan
 *   benar-benar gagal, jadi update CSS/JS (yang pakai ?v=filemtime) langsung
 *   kepakai dan tidak ada UI basi.
 * - Foto pribadi, halaman share, dan API strip TIDAK pernah di-cache: itu
 *   data orang, jangan ditinggal di disk setelah logout.
 * - Request non-GET (simpan strip) dilewatkan begitu saja.
 */
const CACHE = 'amphibooth-v2';

/** Path yang tidak boleh disimpan di cache (data pribadi / API). */
const NO_CACHE = [
    '/images/photos',
    '/collages',
    '/p/',
    // Halaman yang isinya data akun (nama user, gallery pribadi) jangan
    // ditinggal di cache: habis logout pun file cache-nya masih ada.
    '/booth',
    '/gallery',
    '/login',
    '/logout',
    '/register',
    '/profile',
    '/password',
    '/email'
];

self.addEventListener('install', function () {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        (async function () {
            const keys = await caches.keys();

            await Promise.all(
                keys.filter(function (key) {
                    return key !== CACHE;
                }).map(function (key) {
                    return caches.delete(key);
                })
            );

            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', function (event) {
    const request = event.request;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    if (NO_CACHE.some(function (path) {
        return url.pathname.indexOf(path) !== -1;
    })) {
        return;
    }

    event.respondWith(
        (async function () {
            try {
                const response = await fetch(request);

                if (response && response.ok) {
                    const cache = await caches.open(CACHE);
                    cache.put(request, response.clone()).catch(function () {
                        /* kuota cache penuh: abaikan saja */
                    });
                }

                return response;
            } catch (error) {
                const cached = await caches.match(request);

                if (cached) {
                    return cached;
                }

                throw error;
            }
        })()
    );
});
