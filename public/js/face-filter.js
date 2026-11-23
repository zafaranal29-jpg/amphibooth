// ======================================================
// AMPHIBOOTH - FACE FILTER ENGINE V4 (HEAD TRACKING)
// ------------------------------------------------------
// - Stiker mengikuti wajah (MediaPipe FaceMesh).
// - PNG stiker berukuran 1280x720 dengan ruang kosong,
//   jadi tiap stiker di-crop sesuai "rect" area gambarnya.
//   Tanpa crop, stiker ikut mengecil ~4x dan posisinya geser.
// - KEPALA DILACAK: stiker ikut miring saat kepala ditoleh
//   (roll), ikut geser saat kepala menoleh kiri/kanan (yaw),
//   dan ikut membesar/mengecil mengikuti jarak wajah ke kamera.
// - Semua digambar di "ruang hasil" (sudah dicermin seperti
//   video selfie), jadi tampilan overlay == foto yang disimpan
//   dan lastDraws bisa dipakai langsung oleh booth.js.
// ======================================================
(function () {
    'use strict';

    const appConfig = (function () {
        try {
            return JSON.parse(document.getElementById('app-config').textContent);
        } catch (error) {
            return { filtersBase: '/images/filters' };
        }
    })();

    // rect = [x, y, lebar, tinggi] area gambar asli di dalam PNG 1280x720
    const STICKERS = {
        frog:    { file: 'frog.png',    rect: [483, 64, 316, 221],  anchor: 'hat',    scale: 2.0 },
        cat:     { file: 'cat.png',     rect: [420, 30, 440, 298],  anchor: 'hat',    scale: 2.1 },
        devil:   { file: 'devil.png',   rect: [511, 85, 263, 165],  anchor: 'hat',    scale: 1.7 },
        blush:   { file: 'blush.png',   rect: [454, 306, 356, 105], anchor: 'cheek',  scale: 1.9 },
        heart:   { file: 'heart.png',   rect: [462, 54, 369, 143],  anchor: 'above',  scale: 2.0 },
        sparkle: { file: 'sparkle.png', rect: [287, 0, 702, 357],   anchor: 'around', scale: 2.3 }
    };

    // Seberapa jauh stiker ikut geser saat kepala menoleh (0 = tidak ikut geser).
    const YAW_FOLLOW = 0.28;

    const images = {};
    const content = {};   // area gambar asli di dalam rect (PNG-nya punya ruang kosong)
    const state = {
        filter: 'none',
        landmarks: null,
        lastDraws: [],
        pose: { roll: 0, yaw: 0 }
    };

    let videoFeed = null;
    let faceCanvas = null;
    let faceCtx = null;
    let faceMesh = null;
    let lastStatus = '';

    // --------------------------------------------------
    // STATUS KECIL DI PANEL FILTER (biar kelihatan kalau
    // model AI gagal dimuat, bukan diam-diam saja)
    // --------------------------------------------------
    function setStatus(text, isError) {
        if (text === lastStatus) {
            return;
        }

        lastStatus = text;
        const el = document.getElementById('filter-status');

        if (!el) {
            return;
        }

        el.textContent = text;
        el.classList.toggle('error', Boolean(isError));
    }

    // --------------------------------------------------
    // AREA GAMBAR ASLI DI DALAM STIKER
    // --------------------------------------------------
    // Beberapa PNG (cat, sparkle) punya ruang kosong di bawah/samping
    // area gambarnya. Kalau patokannya sudut rect, topi jadi melayang
    // di atas kepala. Jadi ukur dulu bagian yang benar-benar ada isinya.
    function measureContent(image, rect) {
        const w = rect[2];
        const h = rect[3];
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, rect[0], rect[1], rect[2], rect[3], 0, 0, w, h);

        const data = ctx.getImageData(0, 0, w, h).data;
        let top = h;
        let bottom = -1;
        let left = w;
        let right = -1;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > 200) {
                    if (y < top) top = y;
                    if (y > bottom) bottom = y;
                    if (x < left) left = x;
                    if (x > right) right = x;
                }
            }
        }

        if (bottom < 0) {
            return { top: 0, bottom: 1, left: 0, right: 1, midX: 0.5, midY: 0.5 };
        }

        return {
            top: top / h,
            bottom: (bottom + 1) / h,
            left: left / w,
            right: (right + 1) / w,
            midX: ((left + right + 1) / 2) / w,
            midY: ((top + bottom + 1) / 2) / h
        };
    }

    // --------------------------------------------------
    // LOAD GAMBAR STIKER
    // --------------------------------------------------
    function loadImages() {
        return Promise.all(Object.keys(STICKERS).map(function (key) {
            return new Promise(function (resolve) {
                const image = new Image();
                image.onload = function () {
                    images[key] = image;
                    content[key] = measureContent(image, STICKERS[key].rect);
                    resolve();
                };
                image.onerror = function () {
                    console.warn('[amphibooth] stiker gagal dimuat:', STICKERS[key].file);
                    resolve();
                };
                image.src = appConfig.filtersBase + '/' + STICKERS[key].file;
            });
        }));
    }

    // --------------------------------------------------
    // UKURAN + ORIENTASI KEPALA DARI LANDMARK
    // --------------------------------------------------
    function measure(landmarks) {
        const width = faceCanvas.width;
        const height = faceCanvas.height;

        const leftSide = landmarks[234];    // sisi kiri wajah
        const rightSide = landmarks[454];   // sisi kanan wajah
        const forehead = landmarks[10];     // titik dahi
        const nose = landmarks[1] || { x: 0.5, y: 0.5 };
        const leftCheek = landmarks[205];
        const rightCheek = landmarks[425];

        const faceWidth = Math.max(10, Math.abs(rightSide.x - leftSide.x) * width);
        const centerX = ((leftSide.x + rightSide.x) / 2) * width;

        // Roll (kepala miring ke kiri/kanan): sudut garis sisi kiri -> sisi kanan.
        const roll = Math.atan2(
            (rightSide.y - leftSide.y) * height,
            (rightSide.x - leftSide.x) * width
        );

        // Yaw (kepala menoleh): hidung bergeser dari tengah wajah,
        // sekitar -0.5 (menoleh ke kiri) sampai 0.5 (ke kanan).
        const yaw = (nose.x * width - centerX) / faceWidth;

        // Video selfie tampil dicermin (CSS scaleX(-1)), jadi semua digambar
        // di ruang cermin: x dibalik dan arah putaran ikut dibalik.
        return {
            faceWidth: faceWidth,
            foreheadY: forehead.y * height,
            cheekY: ((leftCheek.y + rightCheek.y) / 2) * height,
            mirrorX: width - centerX,
            rotation: -roll,
            yawShift: -yaw * faceWidth * YAW_FOLLOW,
            roll: roll,
            yaw: yaw
        };
    }

    // --------------------------------------------------
    // GAMBAR STIKER DI CANVAS (posisi + putaran kepala)
    // --------------------------------------------------
    function drawSticker(key) {
        const config = STICKERS[key];
        const image = images[key];
        const landmarks = state.landmarks;

        if (!config || !image || !landmarks) {
            return;
        }

        const m = measure(landmarks);
        const source = config.rect;
        const destWidth = m.faceWidth * config.scale;
        const destHeight = destWidth * (source[3] / source[2]);

        // Patokan pakai area gambarnya yang asli, bukan tepi rect PNG,
        // supaya topi nempel di kepala walau PNG-nya punya ruang kosong.
        const box = content[key] || { top: 0, bottom: 1, left: 0, right: 1, midX: 0.5, midY: 0.5 };
        const contentBottom = box.bottom * destHeight;
        const contentMidX = box.midX * destWidth;
        const contentMidY = box.midY * destHeight;

        let targetY;

        switch (config.anchor) {
            case 'hat':
                targetY = m.foreheadY + m.faceWidth * 0.02;      // garis rambut
                break;
            case 'above':
                targetY = m.foreheadY - m.faceWidth * 0.12;      // agak di atas kepala
                break;
            case 'cheek':
                targetY = m.cheekY;                              // tengah pipi
                break;
            default: // 'around'
                targetY = m.foreheadY + m.faceWidth * 0.05;
                break;
        }

        // Topi/hati: bagian BAWAH gambar ditempel ke target.
        // Pipi/sparkle: titik TENGAH gambar ditempatkan di target.
        const centerY = (config.anchor === 'cheek' || config.anchor === 'around')
            ? targetY + (destHeight / 2 - contentMidY)
            : targetY + (destHeight / 2 - contentBottom);

        // Stiker di atas wajah (hati, sparkle) ikut geser setengahnya saja
        // biar tidak melayang terlalu jauh saat kepala menoleh.
        const follow = (config.anchor === 'around' || config.anchor === 'above') ? 0.5 : 1;
        const centerX = m.mirrorX + m.yawShift * follow - (contentMidX - destWidth / 2);

        faceCtx.save();
        faceCtx.translate(centerX, centerY);
        faceCtx.rotate(m.rotation);
        faceCtx.drawImage(
            image,
            source[0], source[1], source[2], source[3],
            -destWidth / 2, -destHeight / 2, destWidth, destHeight
        );
        faceCtx.restore();

        state.lastDraws.push({
            img: image,
            sx: source[0], sy: source[1], sw: source[2], sh: source[3],
            cx: centerX, cy: centerY, dw: destWidth, dh: destHeight,
            rot: m.rotation
        });
    }

    function render() {
        if (!faceCtx) {
            return;
        }

        faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
        state.lastDraws = [];

        if (state.filter !== 'none' && state.landmarks) {
            const m = measure(state.landmarks);
            state.pose = { roll: m.roll, yaw: m.yaw };
            drawSticker(state.filter);
        }
    }

    // --------------------------------------------------
    // MEDIAPIPE FACE MESH
    // --------------------------------------------------
    function startFaceMesh() {
        if (typeof FaceMesh === 'undefined') {
            console.warn('[amphibooth] MediaPipe FaceMesh tidak termuat (offline?). Filter dimatikan.');
            setStatus('Filter AI gagal dimuat — cek koneksi internet lalu refresh halaman', true);
            return;
        }

        setStatus('Menyiapkan filter AI…');

        try {
            faceMesh = new FaceMesh({
                locateFile: function (file) {
                    return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + file;
                }
            });
        } catch (error) {
            console.warn('[amphibooth] gagal membuat FaceMesh:', error);
            setStatus('Filter AI gagal dimulai — coba refresh halaman', true);
            return;
        }

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(function (results) {
            if (!videoFeed.videoWidth) {
                return;
            }

            if (faceCanvas.width !== videoFeed.videoWidth) {
                faceCanvas.width = videoFeed.videoWidth;
                faceCanvas.height = videoFeed.videoHeight;
            }

            const faces = results.multiFaceLandmarks || [];
            state.landmarks = faces.length > 0 ? faces[0] : null;

            setStatus(state.landmarks
                ? 'Filter AI aktif — wajah terdeteksi ✔'
                : 'Filter AI siap — wajah belum kelihatan');

            render();
        });

        pump();

        // Kalau 6 detik belum ada frame sama sekali, biasanya kamera belum
        // diizinkan / belum siap — kasih tahu di panel filter.
        setTimeout(function () {
            if (!state.landmarks && lastStatus === 'Menyiapkan filter AI...') {
                setStatus('Menunggu kamera… izinkan akses kamera ya', true);
            }
        }, 6000);
    }

    // Kirim frame ke MediaPipe SATU PER SATU (tunggu hasil sebelum
    // frame berikutnya). Kalau dikirim 60x/detik lewat rAF, antreannya
    // numpuk dan hasil deteksinya bisa tidak pernah keluar.
    async function pump() {
        if (!faceMesh || !videoFeed) {
            return;
        }

        if (videoFeed.readyState >= 2 && videoFeed.videoWidth) {
            try {
                await faceMesh.send({ image: videoFeed });
            } catch (error) {
                console.warn('[amphibooth] face mesh error:', error);
            }
        }

        requestAnimationFrame(pump);
    }

    // --------------------------------------------------
    // INIT
    // --------------------------------------------------
    document.addEventListener('DOMContentLoaded', async function () {
        videoFeed = document.getElementById('video-feed');
        faceCanvas = document.getElementById('face-canvas');

        if (!videoFeed || !faceCanvas) {
            return;
        }

        faceCtx = faceCanvas.getContext('2d');
        await loadImages();
        startFaceMesh();
    });

    // --------------------------------------------------
    // API PUBLIK (dipakai booth.js + buat debug)
    // --------------------------------------------------
    window.aiFilter = 'none';

    window.faceFilter = {
        setFilter: function (name) {
            state.filter = name;
            window.aiFilter = name;
            render();
        },
        getFilter: function () {
            return state.filter;
        },
        getLastDraws: function () {
            return state.lastDraws;
        },
        getLandmarks: function () {
            return state.landmarks;
        },
        // Orientasi kepala terakhir: roll (miring, radian) & yaw (menoleh, -0.5..0.5)
        getHeadPose: function () {
            return state.pose;
        },
        // Dipakai buat testing tanpa kamera: render dengan landmark buatan.
        _renderWith: function (landmarks) {
            state.landmarks = landmarks;
            render();
        },
        // Info area gambar asli tiap stiker (rasio 0..1 di dalam rect).
        _content: function () {
            return content;
        }
    };
})();
