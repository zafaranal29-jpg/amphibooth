/**
 * Entry point animasi Amphibooth.
 * Di-bundle oleh esbuild ke public/js/animations.js (lihat package.json).
 */

import { api, bootPage } from './core';

window.AmphiboothAnim = api;

function start() {
    try {
        bootPage();
    } catch (error) {
        // Jangan pernah biarkan halaman "kosong" gara-gara animasi gagal.
        document.documentElement.classList.remove('js-anim');
        console.error('[animations] gagal init:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
    start();
}
