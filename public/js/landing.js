/* ============================================================
   LANDING PAGE — contoh strip
   Digambar ulang tiap load pakai Strip.render + ilustrasi dummy
   (gradasi + wajah kartun), jadi nggak pakai foto orang sama sekali.
   ============================================================ */

(function () {
    'use strict';

    if (!window.Strip || typeof window.Strip.render !== 'function') {
        return;
    }

    var PALETTES = [
        { bg1: '#FFE3D3', bg2: '#FFC7D9', skin: '#FFD9C0', hair: '#7A4A3A', shirt: '#FFB3C6' },
        { bg1: '#E7F7EF', bg2: '#CFE9FF', skin: '#F7D2B8', hair: '#4A3B36', shirt: '#A8D5BA' },
        { bg1: '#EDE7FF', bg2: '#FFE9F1', skin: '#FFD3B6', hair: '#3F3350', shirt: '#C4B5FD' }
    ];

    var CAPTIONS = ['Hai dari Amphibooth!', 'Coba dulu yaa', '3 pose, 1 strip'];

    function makeShot(index) {
        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;

        var ctx = canvas.getContext('2d');
        var palette = PALETTES[index % PALETTES.length];

        // Latar gradasi pastel
        var gradient = ctx.createLinearGradient(0, 0, 640, 480);
        gradient.addColorStop(0, palette.bg1);
        gradient.addColorStop(1, palette.bg2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 640, 480);

        // Bintik-bintik kayak latar website
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (var k = 0; k < 26; k += 1) {
            ctx.beginPath();
            ctx.arc((k * 97) % 640, (k * 61) % 480, 3 + (k % 4), 0, Math.PI * 2);
            ctx.fill();
        }

        // Badan
        ctx.fillStyle = palette.shirt;
        ctx.beginPath();
        ctx.ellipse(320, 520, 210, 170, 0, 0, Math.PI * 2);
        ctx.fill();

        // Kepala
        ctx.fillStyle = palette.skin;
        ctx.beginPath();
        ctx.arc(320, 250, 128, 0, Math.PI * 2);
        ctx.fill();

        // Rambut
        ctx.fillStyle = palette.hair;
        ctx.beginPath();
        ctx.arc(320, 236, 130, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(320, 176, 96, 46, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mata
        ctx.fillStyle = '#3B2A24';
        ctx.beginPath();
        ctx.arc(275, 262, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(365, 262, 11, 0, Math.PI * 2);
        ctx.fill();

        // Blush
        ctx.fillStyle = 'rgba(255,120,140,0.35)';
        ctx.beginPath();
        ctx.arc(248, 296, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(392, 296, 20, 0, Math.PI * 2);
        ctx.fill();

        // Senyum
        ctx.strokeStyle = '#3B2A24';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(320, 292, 44, 0.25 * Math.PI, 0.75 * Math.PI);
        ctx.stroke();

        return canvas;
    }

    function renderStrips() {
        var slots = document.querySelectorAll('.strip-slot');

        if (!slots.length) {
            return;
        }

        var shots = [makeShot(0), makeShot(1), makeShot(2)];

        slots.forEach(function (slot, index) {
            var frame = slot.getAttribute('data-frame') || 'polaroid';

            try {
                var canvas = window.Strip.render({
                    shots: shots,
                    frame: frame,
                    caption: CAPTIONS[index % CAPTIONS.length],
                    dateStamp: true,
                    scale: 0.34
                });

                slot.innerHTML = '';
                slot.appendChild(canvas);
            } catch (error) {
                // Kalau satu frame gagal, sembunyikan slotnya — halaman tetap rapi.
                slot.style.display = 'none';
            }
        });
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(renderStrips).catch(renderStrips);
        // Jangan nunggu selamanya kalau font lambat: tetap gambar pakai font fallback.
        window.setTimeout(renderStrips, 1200);
    } else {
        renderStrips();
    }
})();
