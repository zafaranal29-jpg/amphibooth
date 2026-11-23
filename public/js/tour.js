/**
 * Amphibooth — panduan singkat (onboarding).
 *
 * Muncul otomatis sekali di kunjungan pertama, terus bisa diputar ulang dari
 * tombol "?" di kanan bawah area kamera. Semua teksnya bahasa Indonesia dan
 * sengaja singkat: satu ide per langkah.
 *
 * Tidak menyentuh alur jepret sama sekali — cuma menandai elemen dengan
 * outline dan menampilkan kartu di bawah layar.
 */
(function () {
    'use strict';

    const KEY = 'amphibooth-tour-v1';

    const STEPS = [
        {
            target: '#camera-viewport',
            title: 'Kenalan dulu, yuk! 👋',
            text: 'Ini area kameranya. Kalau izin kamera ditolak atau kameranya nggak ada, kamu tetap bisa upload foto dari galeri.'
        },
        {
            target: '#pose-row',
            title: 'Mau berapa pose? 💗',
            text: 'Pilih 1 sampai 4 pose per strip. Di panel yang sama ada filter wajah lucu, lama hitungan, dan pilihan kamera.'
        },
        {
            target: '#shutter-button',
            title: 'Jepret! 📸',
            text: 'Tekan tombol ini buat mulai. Hitungan jalan sendiri, lalu lanjut ke pose berikutnya. Salah pose? Ulangi slot itu aja.'
        },
        {
            target: '#upload-button',
            title: 'Nggak ada kamera? 🖼️',
            text: 'Upload foto dari galeri HP. Semua foto tetap kena frame, efek, caption, dan tanggal yang sama.'
        },
        {
            target: null,
            title: 'Terakhir: hias & simpan 🎀',
            text: 'Setelah semua pose kekumpul, pilih frame, efek foto, caption, dan tanggal. Habis itu simpan ke gallery, unduh, print, atau bagikan link publiknya.'
        }
    ];

    let root = null;
    let card = null;
    let titleEl = null;
    let textEl = null;
    let counterEl = null;
    let dotsEl = null;
    let nextButton = null;
    let index = 0;
    let ringed = null;

    function reducedMotion() {
        return window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function pernahLihat() {
        try {
            return window.localStorage.getItem(KEY) === '1';
        } catch (error) {
            // Mode privat / storage diblokir: jangan munculin terus-terusan.
            return true;
        }
    }

    function tandaiSelesai() {
        try {
            window.localStorage.setItem(KEY, '1');
        } catch (error) {
            /* diamkan saja */
        }
    }

    function build() {
        if (root) {
            return;
        }

        root = document.createElement('div');
        root.className = 'tour-layer hidden';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-labelledby', 'tour-title');

        card = document.createElement('div');
        card.className = 'tour-card';
        card.tabIndex = -1;

        const head = document.createElement('div');
        head.className = 'tour-head';

        counterEl = document.createElement('span');
        counterEl.className = 'tour-step';

        dotsEl = document.createElement('span');
        dotsEl.className = 'tour-dots';

        STEPS.forEach(function () {
            const dot = document.createElement('i');
            dotsEl.appendChild(dot);
        });

        head.appendChild(counterEl);
        head.appendChild(dotsEl);

        titleEl = document.createElement('h3');
        titleEl.id = 'tour-title';
        textEl = document.createElement('p');

        const actions = document.createElement('div');
        actions.className = 'tour-actions';

        const skip = document.createElement('button');
        skip.type = 'button';
        skip.className = 'btn-ghost btn-small';
        skip.textContent = 'Lewati';
        skip.addEventListener('click', function () {
            close(true);
        });

        nextButton = document.createElement('button');
        nextButton.type = 'button';
        nextButton.className = 'btn-ghost btn-small tour-next';
        nextButton.addEventListener('click', next);

        actions.appendChild(skip);
        actions.appendChild(nextButton);

        card.appendChild(head);
        card.appendChild(titleEl);
        card.appendChild(textEl);
        card.appendChild(actions);

        root.appendChild(card);
        document.body.appendChild(root);

        // Esc buat nutup: kebiasaan dialog pada umumnya.
        root.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                close(true);
            }
        });
    }

    function clearRing() {
        if (ringed) {
            ringed.classList.remove('tour-spot');
            ringed = null;
        }
    }

    function showStep(i) {
        index = i;

        const step = STEPS[index];

        clearRing();

        if (step.target) {
            const target = document.querySelector(step.target);

            if (target) {
                ringed = target;
                target.classList.add('tour-spot');
                target.scrollIntoView({
                    block: 'center',
                    behavior: reducedMotion() ? 'auto' : 'smooth'
                });
            }
        }

        counterEl.textContent = 'Langkah ' + (index + 1) + ' dari ' + STEPS.length;
        titleEl.textContent = step.title;
        textEl.textContent = step.text;
        nextButton.textContent = index === STEPS.length - 1 ? 'Oke, mulai! 🎀' : 'Lanjut →';

        Array.prototype.forEach.call(dotsEl.children, function (dot, dotIndex) {
            dot.classList.toggle('on', dotIndex === index);
        });
    }

    function next() {
        if (index >= STEPS.length - 1) {
            close(true);
            return;
        }

        showStep(index + 1);
    }

    /**
     * Tempel tinggi overlay ke viewport yang benar-benar kelihatan.
     * Di HP, `innerHeight` bisa lebih besar dari area yang kelihatan (address
     * bar), jadi kartu panduan bisa ketutup tepi bawah kalau pakai fixed biasa.
     */
    function fitToViewport() {
        if (!root) {
            return;
        }

        const viewport = window.visualViewport;
        const height = viewport ? Math.round(viewport.height) : window.innerHeight;

        root.style.height = height + 'px';
        root.style.top = (viewport ? Math.round(viewport.offsetTop) : 0) + 'px';
    }

    function onResize() {
        fitToViewport();
    }

    function open() {
        build();
        root.classList.remove('hidden');
        fitToViewport();
        showStep(0);
        card.focus();

        window.addEventListener('resize', onResize);

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', onResize);
        }

        // Toast (mis. "izin kamera ditolak") suka muncul barengan di kunjungan
        // pertama; pesannya sudah ada di dalam viewport, jadi sembunyikan biar
        // tidak menumpuk di atas kartu panduan.
        const toast = document.getElementById('toast');

        if (toast) {
            toast.classList.remove('show');
        }
    }

    function close(save) {
        if (save) {
            tandaiSelesai();
        }

        clearRing();

        window.removeEventListener('resize', onResize);

        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', onResize);
        }

        if (root) {
            root.classList.add('hidden');
        }
    }

    function init() {
        // Tombol "?" buat muter ulang panduan.
        const trigger = document.getElementById('tour-button');

        if (trigger) {
            trigger.addEventListener('click', open);
        }

        if (pernahLihat()) {
            return;
        }

        // Kasih napas dulu: halaman, font, dan kamera mendingan sudah jalan.
        window.setTimeout(function () {
            if (!document.querySelector('#camera-viewport')) {
                return;
            }

            open();
        }, 900);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.AmphiboothTour = {
        open: open,
        close: close,
        reset: function () {
            try {
                window.localStorage.removeItem(KEY);
            } catch (error) {
                /* diamkan saja */
            }
        }
    };
})();
