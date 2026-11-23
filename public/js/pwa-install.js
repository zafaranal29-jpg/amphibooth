/**
 * Amphibooth — "pasang di HP" (PWA install prompt).
 *
 * Browser modern (Chrome/Edge/Android) mengirim event `beforeinstallprompt`
 * kalau situs dianggap bisa dipasang. Kita tahan event-nya, tampilkan banner
 * kecil yang sesuai tema, lalu baru panggil prompt() waktu tombolnya diklik —
 * jadi tidak ada popup yang muncul tiba-tiba.
 *
 * Service worker didaftarkan di sini juga (syarat "bisa dipasang" di Chrome).
 * Kalau browser tidak mendukung (iOS Safari, Firefox), banner tidak muncul
 * sama sekali — tidak ada tombol mati.
 */
(function () {
    'use strict';

    const DISMISS_KEY = 'amphibooth-install-nanti';
    const DISMISS_DAYS = 14;

    let deferred = null;
    let banner = null;

    function cfg() {
        const el = document.getElementById('app-config');

        if (!el) {
            return {};
        }

        try {
            return JSON.parse(el.textContent) || {};
        } catch (error) {
            return {};
        }
    }

    function sudahDipasang() {
        return window.matchMedia
            && window.matchMedia('(display-mode: standalone)').matches;
    }

    function ditolakBaruBaru() {
        try {
            const stamp = parseInt(window.localStorage.getItem(DISMISS_KEY) || '0', 10);

            if (!stamp) {
                return false;
            }

            return (Date.now() - stamp) < (DISMISS_DAYS * 24 * 60 * 60 * 1000);
        } catch (error) {
            return false;
        }
    }

    function tandaiNanti(hari) {
        try {
            window.localStorage.setItem(
                DISMISS_KEY,
                String(Date.now() - (DISMISS_DAYS - (hari || DISMISS_DAYS)) * 24 * 60 * 60 * 1000)
            );
        } catch (error) {
            /* mode privat: diamkan */
        }
    }

    function buatBanner() {
        if (banner) {
            return banner;
        }

        banner = document.createElement('div');
        banner.className = 'install-banner';
        banner.id = 'install-banner';

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-mobile-screen-button';

        const text = document.createElement('div');
        text.className = 'install-text';

        const title = document.createElement('b');
        title.textContent = 'Pasang Amphibooth';

        const sub = document.createElement('span');
        sub.textContent = 'Layar penuh, tinggal buka — tanpa browser.';

        text.appendChild(title);
        text.appendChild(sub);

        const yes = document.createElement('button');
        yes.type = 'button';
        yes.className = 'btn-ghost btn-small';
        yes.id = 'install-yes';
        yes.textContent = 'Pasang 📲';
        yes.addEventListener('click', pasang);

        const no = document.createElement('button');
        no.type = 'button';
        no.className = 'install-no';
        no.id = 'install-no';
        no.setAttribute('aria-label', 'Nanti saja');
        no.textContent = 'Nanti';
        no.addEventListener('click', function () {
            tandaiNanti();
            sembunyikan();
        });

        banner.appendChild(icon);
        banner.appendChild(text);
        banner.appendChild(yes);
        banner.appendChild(no);

        return banner;
    }

    function tampilkan() {
        if (sudahDipasang() || ditolakBaruBaru() || !deferred) {
            return;
        }

        const node = buatBanner();
        const header = document.querySelector('.header-title');

        if (!node.parentNode) {
            if (header) {
                header.insertAdjacentElement('afterend', node);
            } else {
                document.body.insertBefore(node, document.body.firstChild);
            }
        }

        node.classList.add('show');
    }

    function sembunyikan() {
        if (banner) {
            banner.classList.remove('show');
        }
    }

    async function pasang() {
        if (!deferred || typeof deferred.prompt !== 'function') {
            return;
        }

        const prompt = deferred;
        deferred = null;

        prompt.prompt();

        let hasil = null;

        try {
            hasil = await prompt.userChoice;
        } catch (error) {
            hasil = null;
        }

        sembunyikan();

        if (hasil && hasil.outcome === 'dismissed') {
            tandaiNanti(7);
        }
    }

    function daftarkanServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        const url = cfg().swUrl;

        if (!url) {
            return;
        }

        window.addEventListener('load', function () {
            navigator.serviceWorker.register(url).catch(function (error) {
                // Gagal daftar SW bukan alasan bikin booth nggak jalan.
                console.log('Service worker gagal didaftarkan:', error);
            });
        });
    }

    function init() {
        daftarkanServiceWorker();

        window.addEventListener('beforeinstallprompt', function (event) {
            event.preventDefault();
            deferred = event;
            tampilkan();
        });

        window.addEventListener('appinstalled', function () {
            deferred = null;
            sembunyikan();

            const toast = document.getElementById('toast');

            if (toast) {
                toast.textContent = 'Amphibooth sudah terpasang 🎉';
                toast.classList.add('show');
                window.setTimeout(function () {
                    toast.classList.remove('show');
                }, 3200);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.AmphiboothInstall = {
        tampilkan: tampilkan,
        sembunyikan: sembunyikan,
        // Buat tes manual: sisipkan event palsu tanpa beneran memasang.
        siapkan: function (event) {
            deferred = event;
        }
    };
})();
