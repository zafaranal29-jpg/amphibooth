/**
 * Amphibooth — inti animasi UI.
 *
 * Prinsip:
 *  - HTML tetap dirender server (Blade). Modul ini hanya MENAMBAH gerak.
 *  - Kalau JS gagal jalan, `partials/animations-head` mencabut class `js-anim`
 *    setelah 2.5s sehingga semua konten kembali tampil normal.
 *  - Semua gerak dihormati prefers-reduced-motion.
 */

import { animate, inView, scroll } from 'motion';

const EASE_OUT = [0.22, 1, 0.36, 1];
const DUR = { fast: 0.18, base: 0.5, slow: 0.65 };

// Intensitas reveal (level 2: lebih terasa, tapi tetap hemat frame).
const REVEAL = { y: 26, duration: 0.7, step: 0.1 };

/** Elemen yang menunggu dianimasikan (dipakai jaring pengaman scroll). */
const pending = new Set();

/** Apakah animasi boleh jalan? */
export function motionOK() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function hasFinePointer() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** Bersihkan inline style sisa animasi supaya CSS asli (hover, rotate) balik lagi. */
function clearInline(el) {
    if (!el || !el.style) return;
    el.style.opacity = '';
    el.style.transform = '';
    el.style.translate = '';
    el.style.scale = '';
    el.style.rotate = '';
    el.style.willChange = '';
}

function finish(el) {
    clearInline(el);
}

/**
 * Bersihkan inline SETELAH animasi benar-benar selesai.
 * Motion menulis nilai akhirnya (transform: none / opacity: 1) sedikit
 * setelah promise resolve; kalau inline itu dibiarkan, dia mengalahkan
 * transform dari CSS — bottom sheet berhenti bisa dilipat, kartu berhenti
 * miring. Jadi bersihkan sekarang, lalu sekali lagi di frame berikutnya.
 */
function settle(el) {
    finish(el);
    window.requestAnimationFrame(() => finish(el));
}

/**
 * Reveal satu elemen. Elemen ditandai `data-anim` (fade + geser) atau
 * `data-anim-fade` (fade saja, buat elemen yang punya transform di CSS).
 */
function revealSingle(el, index, opts) {
    const fadeOnly = el.hasAttribute('data-anim-fade');
    const y = fadeOnly ? 0 : (opts.y ?? REVEAL.y);

    const done = () => {
        pending.delete(el);
        el.removeAttribute('data-anim');
        el.removeAttribute('data-anim-fade');

        // Motion menulis nilai akhir ke style SETELAH promise-nya resolve
        // (transform: none / opacity: 1). Kalau inline itu dibiarkan, dia
        // mengalahkan transform dari CSS — bottom sheet berhenti bisa
        // dilipat, kartu berhenti miring. Jadi bersihkan dua kali:
        // langsung, lalu sekali lagi di frame berikutnya.
        settle(el);
    };

    if (!motionOK()) {
        done();
        return;
    }

    let fired = false;

    const run = () => {
        if (fired) return;
        fired = true;

        el.style.willChange = 'opacity, transform';

        // Cuma opacity + translate: keduanya composited, nggak memaksa re-raster teks.
        const keys = fadeOnly ? { opacity: [0, 1] } : { opacity: [0, 1], y: [y, 0] };

        animate(
            el,
            keys,
            { duration: opts.duration ?? REVEAL.duration, delay: (opts.step ?? 0) * index, ease: EASE_OUT }
        ).finished.then(done, done);
    };

    pending.add({ el, run });
    inView(el, run, { amount: opts.amount ?? 0.15, margin: '0px 0px -6% 0px' });
}

/** Reveal berurutan untuk anak-anak container `[data-anim-group]`. */
function revealGroup(container, opts) {
    const kids = Array.from(container.children);
    if (!kids.length) {
        container.removeAttribute('data-anim-group');
        return;
    }

    const done = () => {
        pending.delete(container);
        container.removeAttribute('data-anim-group');
        kids.forEach(finish);
    };

    if (!motionOK()) {
        done();
        return;
    }

    let fired = false;

    const run = () => {
        if (fired) return;
        fired = true;

        const step = opts.step ?? REVEAL.step;
        const duration = opts.duration ?? REVEAL.duration;

        kids.forEach((kid, i) => {
            kid.style.willChange = 'opacity, transform';
            animate(
                kid,
                { opacity: [0, 1], y: [opts.y ?? REVEAL.y, 0] },
                { duration, delay: i * step, ease: EASE_OUT }
            );
        });

        // Setelah semua selesai: cabut atribut + bersihkan inline style sekaligus,
        // supaya nggak ada kedip (CSS berhenti menyembunyikan tepat saat inline dibuang).
        window.setTimeout(done, (kids.length * step + duration) * 1000 + 80);
    };

    pending.add({ el: container, run });
    inView(container, run, { amount: opts.amount ?? 0.12, margin: '0px 0px -6% 0px' });
}

/**
 * Jaring pengaman: IntersectionObserver bisa "melewatkan" elemen kalau user
 * scroll sangat cepat (fling) atau lompat ke anchor. Elemen yang sudah masuk
 * / terlewati viewport langsung dijalankan, jadi tidak ada konten yang nyangkut
 * invisible.
 */
function checkPending() {
    if (!pending.size) return;

    const limit = window.innerHeight * 0.98;

    pending.forEach((item) => {
        // Sudah masuk viewport ATAU sudah terlewati (scroll lompat jauh) -> jalankan.
        if (item.el.getBoundingClientRect().top < limit) {
            item.run();
        }
    });
}

let scrollBound = false;

function bindScrollFallback() {
    if (scrollBound) return;
    scrollBound = true;

    let ticking = false;

    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
            ticking = false;
            checkPending();
        });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.setTimeout(checkPending, 1200);
}

export function bindReveals() {
    document.querySelectorAll('[data-anim-group]').forEach((el) => revealGroup(el, { step: REVEAL.step }));
    document.querySelectorAll('[data-anim], [data-anim-fade]').forEach((el, i) => revealSingle(el, i, { step: 0.06 }));
}

/** Tombol: tekan -> mengecil sedikit, lepas -> spring balik. */
export function bindPress() {
    if (!motionOK()) return;

    const SELECTOR = 'button:not([data-no-anim]), .btn-main, .btn-nav, .btn-ghost, .btn-to-booth, .btn-love, .btn-trash, .btn-share, .btn-save, .btn-delete, .btn-load-more, .btn-shutter';
    const down = new Set();

    // Delegasi, bukan query sekali jalan: tombol yang dibuat belakangan
    // (kartu gallery, pemilih frame) ikut dapat efek tekan.
    const pick = (event) => {
        const el = event.target.closest ? event.target.closest(SELECTOR) : null;
        if (!el || el.disabled) return null;
        if (el.closest('[data-no-anim]')) return null;
        return el;
    };

    document.addEventListener('pointerdown', (event) => {
        const el = pick(event);
        if (!el || down.has(el)) return;
        down.add(el);
        animate(el, { scale: 0.96 }, { duration: 0.1, ease: EASE_OUT });
    }, { passive: true });

    const release = () => {
        if (!down.size) return;
        down.forEach((el) => {
            animate(el, { scale: 1 }, { type: 'spring', stiffness: 420, damping: 24 });
        });
        down.clear();
    };

    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
    window.addEventListener('blur', release);
}

/** Tombol utama: sedikit "ketarik" ke arah kursor (desktop saja). */
export function bindMagnetic() {
    if (!motionOK() || !hasFinePointer()) return;

    document.querySelectorAll('.btn-main, .btn-nav').forEach((el) => {
        if (el.dataset.animMag) return;
        el.dataset.animMag = '1';

        el.addEventListener('pointermove', (event) => {
            const rect = el.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
            const y = ((event.clientY - rect.top) / rect.height - 0.5) * 6;
            animate(el, { x, y }, { duration: 0.3, ease: EASE_OUT });
        });

        el.addEventListener('pointerleave', () => {
            animate(el, { x: 0, y: 0 }, { type: 'spring', stiffness: 300, damping: 22 });
        });
    });
}

/**
 * Stiker dekoratif (.asset) sudah punya animasi CSS `floatyAnimation`.
 * Di sini cuma diberi ritme berbeda-beda biar nggak gerak serempak.
 */
export function bindFloatAssets() {
    const assets = document.querySelectorAll('.floating-assets .asset');
    if (!assets.length) return;

    assets.forEach((el, i) => {
        const duration = 3.6 + (i % 5) * 0.6;
        const delay = (i % 6) * 0.4;
        el.style.animationDuration = duration.toFixed(1) + 's';
        el.style.animationDelay = delay.toFixed(1) + 's';
    });
}

/* ------------------------------------------------------------------
   Gerakan ambient: bikin halaman nggak pernah "diam total"
   ------------------------------------------------------------------ */

/** Sudut rotasi yang sekarang dipakai CSS (dibaca dari matrix). */
function cssRotation(el) {
    const transform = window.getComputedStyle(el).transform;

    if (!transform || transform === 'none') return 0;

    const match = transform.match(/matrix\(([^)]+)\)/);
    if (!match) return 0;

    const [a, b] = match[1].split(',').map((n) => parseFloat(n));
    return Math.round(Math.atan2(b, a) * (180 / Math.PI) * 10) / 10;
}

/** Strip contoh di hero: ngambang pelan, tiap strip beda irama. */
export function bindAmbient() {
    if (!motionOK()) return;

    document.querySelectorAll('#hero-strips .strip-slot').forEach((el, i) => {
        const base = cssRotation(el);
        const wobble = i % 2 === 0 ? 1.4 : -1.4;

        animate(
            el,
            { y: [0, -7, 0], rotate: [base, base + wobble, base] },
            { duration: 5.5 + i * 0.9, delay: i * 0.45, repeat: Infinity, ease: 'easeInOut' }
        );
    });
}

/** Garis progres scroll di paling atas. */
export function bindProgress() {
    if (!motionOK()) return;

    const bar = document.createElement('div');
    bar.className = 'anim-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    scroll(animate(bar, { scaleX: [0, 1] }, { ease: 'linear' }));
}

/* ------------------------------------------------------------------
   TIRAI BILIK — transisi antar halaman
   Lima panel pink menyapu naik waktu keluar, lalu menyapu habis waktu
   halaman baru muncul. Kuncinya di sessionStorage: halaman berikutnya tahu
   harus membuka tirai. Tanpa JS: tidak ada tirai sama sekali (aman).
   ------------------------------------------------------------------ */

const CURTAIN_KEY = 'amph:curtain';
const CURTAIN_PANELS = 5;

function curtainPanels() {
    return Array.from(document.querySelectorAll('.curtain > i'));
}

function curtainNode(covering) {
    const wrap = document.createElement('div');
    wrap.className = 'curtain' + (covering ? ' is-covering' : '');
    wrap.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < CURTAIN_PANELS; i += 1) {
        wrap.appendChild(document.createElement('i'));
    }

    const label = document.createElement('span');
    label.className = 'curtain-label';
    label.textContent = '📸 Amphibooth';
    wrap.appendChild(label);

    document.body.appendChild(wrap);
    return wrap;
}

function curtainFlag(action, value) {
    try {
        if (action === 'set') window.sessionStorage.setItem(CURTAIN_KEY, value);
        else window.sessionStorage.removeItem(CURTAIN_KEY);
    } catch (error) {
        /* mode privat: tirai tetap jalan, cuma nggak ada fase masuk */
    }
}

export function bindCurtain() {
    if (!motionOK()) return;

    // ---- Fase masuk: halaman sebelumnya sudah menutup tirai ----
    let entering = false;
    try {
        entering = window.sessionStorage.getItem(CURTAIN_KEY) === '1';
    } catch (error) {
        entering = false;
    }
    curtainFlag('clear');

    if (entering) {
        const wrap = curtainNode(true);
        const label = wrap.querySelector('.curtain-label');
        const panels = curtainPanels();

        animate(label, { opacity: [1, 0] }, { duration: 0.22, ease: 'easeOut' });

        panels.forEach((panel, i) => {
            animate(
                panel,
                { y: ['0%', '-101%'] },
                { duration: 0.55, delay: 0.06 + i * 0.07, ease: EASE_OUT }
            ).finished.then(
                () => { if (i === panels.length - 1) wrap.remove(); },
                () => wrap.remove()
            );
        });
    }

    // ---- Fase keluar: klik link internal ----
    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const link = event.target.closest('a[href]');
        if (!link) return;
        if (link.target && link.target !== '_self') return;
        if (link.hasAttribute('download') || link.dataset.noAnim !== undefined) return;
        if (/\.(jpe?g|png|webp|gif|avif)$/i.test(link.getAttribute('href') || '')) return;

        let url;
        try {
            url = new URL(link.href, window.location.href);
        } catch (error) {
            return;
        }

        if (url.origin !== window.location.origin) return;
        if (link.getAttribute('href') === '#') return;
        if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;

        event.preventDefault();

        const wrap = curtainNode(false);
        const panels = curtainPanels();
        const label = wrap.querySelector('.curtain-label');

        panels.forEach((panel, i) => {
            animate(
                panel,
                { y: ['101%', '0%'] },
                { duration: 0.44, delay: i * 0.07, ease: EASE_OUT }
            );
        });

        animate(label, { opacity: [0, 1] }, { duration: 0.3, delay: 0.2, ease: 'easeOut' });

        let navigated = false;
        const go = () => {
            if (navigated) return;
            navigated = true;
            curtainFlag('set', '1');
            window.location.href = link.href;
        };

        window.setTimeout(go, 540);
        window.setTimeout(go, 1400); // jaga-jaga kalau timer pertama kacau
    });
}

/* ------------------------------------------------------------------
   TILT 3D + KILAU — kartu gallery & pemilih frame (desktop saja)
   ------------------------------------------------------------------ */

const TILT_SELECTOR = '.strip-card, .frame-card';
const TILT_MAX = 6;

function glareOf(card) {
    let glare = card.querySelector(':scope > .tilt-glare');

    if (!glare) {
        glare = document.createElement('span');
        glare.className = 'tilt-glare';
        glare.setAttribute('aria-hidden', 'true');
        card.appendChild(glare);
    }

    return glare;
}

export function bindTilt() {
    if (!motionOK() || !hasFinePointer()) return;

    let ticking = false;
    let last = null;
    let active = null;

    function untilt(card) {
        if (!card) return;
        card.classList.remove('tilt-on');
        animate(card, { rotateX: 0, rotateY: 0, y: 0 }, { duration: 0.35, ease: EASE_OUT });
    }

    document.addEventListener('pointermove', (event) => {
        const card = event.target.closest && event.target.closest(TILT_SELECTOR);

        // Keluar dari kartu: kembalikan datar. Dicek di sini (bukan di
        // pointerout) supaya elemen yang diganti/di-render ulang di tengah
        // hover nggak bikin kartu balik datar padahal kursor masih di atas.
        if (!card) {
            if (active) { untilt(active); active = null; }
            return;
        }

        if (active && active !== card) { untilt(active); }
        active = card;

        last = { card, x: event.clientX, y: event.clientY };

        if (ticking) return;
        ticking = true;

        window.requestAnimationFrame(() => {
            ticking = false;
            if (!last) return;

            const target = last.card;
            const rect = target.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            const px = (last.x - rect.left) / rect.width;
            const py = (last.y - rect.top) / rect.height;

            glareOf(target);
            target.classList.add('tilt-on');
            target.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
            target.style.setProperty('--gy', (py * 100).toFixed(1) + '%');

            animate(
                target,
                {
                    rotateX: (0.5 - py) * TILT_MAX * 2,
                    rotateY: (px - 0.5) * TILT_MAX * 2,
                    y: -4,
                    transformPerspective: 900,
                },
                { duration: 0.25, ease: 'easeOut' }
            );
        });
    }, { passive: true });

    // Kursor keluar jendela / pindah tab: pastikan kartu balik datar.
    document.addEventListener('pointerleave', () => {
        if (active) { untilt(active); active = null; }
    });

    window.addEventListener('blur', () => {
        if (active) { untilt(active); active = null; }
    });
}

/* ------------------------------------------------------------------
   LIGHTBOX STRIP — klik thumbnail di gallery
   ------------------------------------------------------------------ */

function closeLightbox(box, onDone) {
    const img = box.querySelector('img');

    animate(box, { opacity: [1, 0] }, { duration: 0.2, ease: 'easeIn' }).finished.then(
        () => { box.remove(); if (onDone) onDone(); },
        () => { box.remove(); if (onDone) onDone(); }
    );

    if (img) {
        animate(img, { scale: [1, 0.9] }, { duration: 0.2, ease: 'easeIn' });
    }
}

function openLightbox(thumbImg, sourceLink) {
    const thumbRect = thumbImg.getBoundingClientRect();

    const box = document.createElement('div');
    box.className = 'amph-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Pratinjau strip');

    const big = document.createElement('img');
    big.src = sourceLink.getAttribute('href');
    big.alt = thumbImg.alt || 'Strip Amphibooth';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'lb-close';
    close.setAttribute('aria-label', 'Tutup');
    close.innerHTML = '✕';

    box.appendChild(big);
    box.appendChild(close);
    document.body.appendChild(box);

    const scrollLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const finish = () => { document.body.style.overflow = scrollLock; };

    const dismiss = () => closeLightbox(box, finish);

    box.addEventListener('click', (event) => {
        if (event.target === box) dismiss();
    });
    close.addEventListener('click', dismiss);
    document.addEventListener('keydown', function onKey(event) {
        if (event.key === 'Escape') {
            dismiss();
            document.removeEventListener('keydown', onKey);
        }
    });

    animate(box, { opacity: [0, 1] }, { duration: 0.22, ease: 'easeOut' });

    // Terbang dari posisi thumbnail-nya (efek FLIP sederhana).
    const start = () => {
        const rect = big.getBoundingClientRect();
        if (!rect.width) return;

        const scale = Math.max(0.25, thumbRect.width / rect.width);
        const dx = (thumbRect.left + thumbRect.width / 2) - (rect.left + rect.width / 2);
        const dy = (thumbRect.top + thumbRect.height / 2) - (rect.top + rect.height / 2);

        animate(
            big,
            { opacity: [0.6, 1], x: [dx, 0], y: [dy, 0], scale: [scale, 1] },
            { duration: 0.5, ease: EASE_OUT }
        );
    };

    if (big.complete) window.requestAnimationFrame(start);
    else big.addEventListener('load', () => window.requestAnimationFrame(start), { once: true });
}

export function bindLightbox() {
    if (!motionOK()) return;

    // capture:true — harus jalan SEBELUM tirai, biar tirai lihat
    // event.defaultPrevented dan nggak ikut menavigasi.
    document.addEventListener('click', (event) => {
        const link = event.target.closest && event.target.closest('a.strip-thumb');

        if (!link) return;
        if (link.classList.contains('is-missing') || link.querySelector('.missing-thumb')) return;

        const img = link.querySelector('img');
        if (!img) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;

        event.preventDefault();
        openLightbox(img, link);
    }, { capture: true });
}

/* ------------------------------------------------------------------
   PENGINGAT KUOTA — titik peringatan kalau pemakaian sudah mepet
   ------------------------------------------------------------------ */

export function bindQuotaWarn() {
    const box = document.querySelector('.quota-box');
    if (!box) return;

    const bars = Array.from(box.querySelectorAll('.quota-bar[aria-valuenow]'));
    if (!bars.length) return;

    const highest = Math.max(...bars.map((bar) => parseInt(bar.getAttribute('aria-valuenow'), 10) || 0));

    if (highest >= 80) box.classList.add('is-high');
}

/* ------------------------------------------------------------------
   API untuk script halaman (booth.js, gallery.js)
   ------------------------------------------------------------------ */

export const api = {
    /** Panel booth ganti fase: fade + geser naik. */
    panel(el) {
        if (!el) return;
        if (!motionOK()) return;
        animate(el, { opacity: [0, 1], y: [10, 0] }, { duration: 0.4, ease: EASE_OUT })
            .finished.then(() => settle(el), () => settle(el));
    },

    /** Elemen kecil "pop" (slot foto terisi, tombol love). */
    pop(el, scale = 0.72) {
        if (!el) return;
        if (!motionOK()) return;
        animate(el, { scale: [scale, 1] }, { type: 'spring', stiffness: 520, damping: 20 })
            .finished.then(() => settle(el), () => settle(el));
    },

    /** Strip hasil: muncul dari bawah + scale. */
    strip(el) {
        if (!el) return;
        if (!motionOK()) return;
        animate(el, { opacity: [0, 1], y: [26, 0], scale: [0.94, 1] }, { duration: DUR.slow, ease: EASE_OUT })
            .finished.then(() => settle(el), () => settle(el));
    },

    /** Kartu gallery baru: siapkan state awal sebelum masuk DOM. */
    prepareCard(el) {
        if (!el || !motionOK()) return;
        el.style.opacity = '0';
        el.style.transform = 'translateY(18px)';
    },

    /** Kartu gallery: masuk berurutan. */
    enterCards(cards) {
        if (!cards || !cards.length) return;

        if (!motionOK()) {
            cards.forEach((el) => { el.style.opacity = ''; el.style.transform = ''; });
            return;
        }

        cards.forEach((el, i) => {
            el.style.willChange = 'opacity, transform';
            animate(
                el,
                { opacity: [0, 1], y: [18, 0] },
                { duration: 0.45, delay: Math.min(i, 9) * 0.05, ease: EASE_OUT }
            ).finished.then(() => settle(el), () => settle(el));
        });

        // jaring pengaman: kalau ada yang gagal, jangan biarkan kartu invisible
        setTimeout(() => cards.forEach(finish), 1400);
    },

    /** Kartu gallery: mengecil lalu hilang. Mengembalikan Promise. */
    collapse(el) {
        if (!el || !motionOK()) return Promise.resolve();
        return animate(el, { opacity: [1, 0], scale: [1, 0.92], y: [0, 10] }, { duration: 0.26, ease: 'easeIn' })
            .finished.then(() => {}, () => {});
    },

    /** Love: pop tombol + hati kecil terbang. */
    heart(button) {
        if (!button) return;
        if (!motionOK()) return;

        animate(button, { scale: [1, 1.35, 1] }, { duration: 0.4, ease: 'easeOut' });

        const rect = button.getBoundingClientRect();
        const heart = document.createElement('span');
        heart.className = 'anim-heart';
        heart.textContent = '💖';
        heart.style.left = (rect.left + rect.width / 2 - 9) + 'px';
        heart.style.top = (rect.top - 4) + 'px';
        document.body.appendChild(heart);

        animate(
            heart,
            { opacity: [1, 0], y: [0, -34], scale: [0.8, 1.15] },
            { duration: 0.7, ease: 'easeOut' }
        ).finished.then(() => heart.remove(), () => heart.remove());
    },

    /** Bar kuota: tumbuh dari 0 ke lebar aslinya. */
    bars() {
        document.querySelectorAll('.quota-bar > span').forEach((bar) => {
            const target = bar.style.width;
            if (!target || !motionOK()) return;

            // Elemen 0px nggak pernah "intersecting", jadi amati wadahnya.
            const track = bar.parentElement;

            bar.style.width = '0%';

            const run = () => {
                animate(bar, { width: ['0%', target] }, { duration: 0.9, ease: EASE_OUT })
                    .finished.then(() => { bar.style.width = target; }, () => { bar.style.width = target; });
            };

            inView(track, run, { amount: 0.4 });
            pending.add({ el: track, run });
        });
    },

    /** Tiap angka hitungan mundur: cincin menyebar. */
    countTick(el) {
        if (!el || !motionOK()) return;
        el.classList.remove('tick');
        void el.offsetWidth;
        el.classList.add('tick');
    },

    /** Kamera siap: titik hijau berdenyut di viewport. */
    ready(el) {
        if (el && el.classList) el.classList.add('anim-ready');
    },

    /** Film maju: strip slot terdorong turun-naik. */
    advance(el) {
        if (!el || !motionOK()) return;
        el.classList.remove('advance');
        void el.offsetWidth;
        el.classList.add('advance');
        window.setTimeout(() => el.classList.remove('advance'), 700);
    },

    /** Konfeti kecil (selesai sesi / strip tersimpan). */
    confetti(fromEl, count = 18) {
        if (!motionOK()) return;

        const rect = (fromEl || document.body).getBoundingClientRect();
        const emojis = ['💖', '🌸', '⭐', '✨', '🎉', '🐸', '🎀'];
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height * 0.32;

        for (let i = 0; i < count; i += 1) {
            const bit = document.createElement('span');
            bit.className = 'amph-confetti';
            bit.textContent = emojis[i % emojis.length];
            bit.style.left = (cx + (Math.random() - 0.5) * rect.width * 0.7) + 'px';
            bit.style.top = cy + 'px';
            document.body.appendChild(bit);

            animate(
                bit,
                {
                    opacity: [1, 0],
                    y: [0, 130 + Math.random() * 240],
                    x: [0, (Math.random() - 0.5) * 280],
                    rotate: [0, (Math.random() - 0.5) * 260],
                    scale: [0.8, 1.1],
                },
                { duration: 1.3 + Math.random() * 0.6, ease: 'easeOut' }
            ).finished.then(() => bit.remove(), () => bit.remove());
        }
    },

    /** Kartu bayangan yang berkilau selama data dimuat. */
    showSkeletons(container, count = 6) {
        if (!container || container.querySelector('.skel-card')) return;

        for (let i = 0; i < count; i += 1) {
            const skel = document.createElement('div');
            skel.className = 'skel-card';
            skel.setAttribute('aria-hidden', 'true');
            container.appendChild(skel);
        }
    },

    clearSkeletons(container) {
        if (!container) return;
        container.querySelectorAll('.skel-card').forEach((el) => el.remove());
    },

    /** Error form: goyang halus. */
    shake(selector = '.flash-error') {
        if (!motionOK()) return;
        document.querySelectorAll(selector).forEach((el) => {
            animate(el, { x: [0, -7, 7, -4, 4, 0] }, { duration: 0.45, ease: 'easeInOut' });
        });
    },
};

/* ------------------------------------------------------------------
   Boot
   ------------------------------------------------------------------ */

export function bootPage() {
    window.__amphiboothAnim = true;

    // Satu bagian gagal jangan sampai mematikan sisanya.
    const safe = (fn, label) => {
        try {
            fn();
        } catch (error) {
            window.console && console.warn('[animations] ' + label + ' dilewati:', error);
        }
    };

    safe(bindFloatAssets, 'float-assets');
    safe(bindAmbient, 'ambient');
    safe(bindProgress, 'progress');
    safe(bindPress, 'press');
    safe(bindMagnetic, 'magnetic');
    safe(bindCurtain, 'curtain');
    safe(bindTilt, 'tilt');
    safe(bindLightbox, 'lightbox');
    safe(bindReveals, 'reveals');
    safe(bindScrollFallback, 'scroll-fallback');
    safe(bindQuotaWarn, 'quota-warn');
    safe(api.bars, 'quota-bars');
    safe(api.shake, 'shake');
}
