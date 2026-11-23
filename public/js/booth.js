// ======================================================
// AMPHIBOOTH - BOOTH CORE (SESI STRIP 3 FOTO)
// ------------------------------------------------------
// Alur:
//   setup  -> pilih filter + kamera
//   sesi   -> 3x (jeda -> hitungan -> jepret -> flash)
//   finish -> retake per slot, pilih frame/caption/efek (preview live)
//   result -> simpan / download / print / share
//
// Catatan teknis:
// - Stiker AI digambar di "ruang cermin" oleh face-filter.js. Kalau mirror
//   dimatikan, koordinat stiker dicerminkan balik (x' = width - x) supaya
//   tetap nempel di kepala.
// - Hasil akhir selalu JPEG (bukan PNG) supaya ringan: 1 strip < 1 MB.
// ======================================================
(function () {
    'use strict';

    const appConfig = JSON.parse(document.getElementById('app-config').textContent);
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

    const DEFAULT_SHOTS = 3;
    const MAX_SHOTS = 4;
    // Layout dikirim ke server; jumlahnya ikut pilihan "jumlah pose".
    const PAUSE_BETWEEN_SHOTS = 850;

    /*
     * Batas ukuran yang DIKIRIM ke server (bukan yang tampil di layar).
     * Kamera menangkap di 1280 px dan lembar dirender 1.5x (1140 px),
     * tapi penyimpanan cukup versi ringkas: unduhan tetap dirender ulang
     * 1.5x dari shot yang masih ada di memori.
     */
    const SHOT_MAX_WIDTH = 960;
    const SHEET_MAX_WIDTH = 760;

    document.addEventListener('DOMContentLoaded', function () {
        // ---------- ELEMEN ----------
        const video = document.getElementById('video-feed');
        const loadingText = document.getElementById('loading-text');
        const viewport = document.getElementById('camera-viewport');
        const faceCanvas = document.getElementById('face-canvas');
        const buffer = document.getElementById('canvas-overlay');
        const countdownEl = document.getElementById('countdown');
        const flashEl = document.getElementById('camera-flash');
        const progressEl = document.getElementById('shot-progress');
        const statusEl = document.getElementById('filter-status');

        const shutter = document.getElementById('shutter-button');
        const shutterLabel = document.getElementById('shutter-label');
        const restartButton = document.getElementById('restart-button');

        const slotEls = Array.prototype.slice.call(document.querySelectorAll('.slot'));
        const slotStrip = document.getElementById('slot-strip');
        const stage = document.getElementById('strip-stage');
        const stripCanvas = document.getElementById('strip-canvas');
        const printingOverlay = document.getElementById('printing-overlay');

        const setupPanel = document.getElementById('setup-panel');
        const finishPanel = document.getElementById('finish-panel');
        const resultPanel = document.getElementById('result-panel');
        const resultSize = document.getElementById('result-size');
        const sidePanel = document.getElementById('side-panel');
        const sheetToggle = document.getElementById('sheet-toggle');
        const sheetToggleText = document.getElementById('sheet-toggle-text');

        const cameraSelect = document.getElementById('camera-select');
        const qualitySelect = document.getElementById('quality-select');
        const timerSelect = document.getElementById('timer-select');
        const mirrorToggle = document.getElementById('mirror-toggle');
        const soundToggle = document.getElementById('sound-toggle');
        const flipButton = document.getElementById('flip-button');
        const cameraPower = document.getElementById('camera-power');
        const cameraPowerIcon = document.getElementById('camera-power-icon');
        const cameraState = document.getElementById('camera-state');
        const cameraStateText = document.getElementById('camera-state-text');
        const cameraRetry = document.getElementById('camera-retry');
        const uploadButton = document.getElementById('upload-button');
        const uploadInput = document.getElementById('upload-input');

        const frameList = document.getElementById('frame-list');
        const frameColorRow = document.getElementById('frame-color-row');
        const frameColorInput = document.getElementById('frame-color');
        const captionInput = document.getElementById('caption-input');
        const dateToggle = document.getElementById('date-toggle');
        const saveButton = document.getElementById('save-button');
        const finishReset = document.getElementById('finish-reset');

        const downloadButton = document.getElementById('download-button');
        const printButton = document.getElementById('print-button');
        const shareButton = document.getElementById('share-button');
        const galleryLink = document.getElementById('gallery-link');
        const againButton = document.getElementById('again-button');
        const resultHint = document.getElementById('result-hint');

        const toastEl = document.getElementById('toast');

        // ---------- STATE ----------
        const state = {
            phase: 'setup',       // setup | capturing | finish | result
            shots: new Array(DEFAULT_SHOTS).fill(null),
            poses: DEFAULT_SHOTS, // jumlah pose per strip (1-4)
            filter: 'none',
            frame: 'polaroid',
            frameColor: '#ffb3c7',
            effect: 'none',
            caption: '',
            dateStamp: true,
            mirror: true,
            sound: true,
            saving: false,
            stream: null,
            cameraOff: false,
            savedCollage: null,
            audio: null,
            busy: false
        };

        let toastTimer = null;

        // ----------------------------------------------
        // TOAST
        // ----------------------------------------------
        function toast(message, isError) {
            if (!toastEl) {
                return;
            }

            toastEl.textContent = message;
            toastEl.classList.toggle('error', Boolean(isError));
            toastEl.classList.add('show');

            clearTimeout(toastTimer);
            toastTimer = setTimeout(function () {
                toastEl.classList.remove('show');
            }, 3200);
        }

        // ----------------------------------------------
        // SUARA (WebAudio, tanpa file)
        // ----------------------------------------------
        function audioCtx() {
            if (!state.sound) {
                return null;
            }

            if (!state.audio) {
                const Ctx = window.AudioContext || window.webkitAudioContext;

                if (!Ctx) {
                    return null;
                }

                state.audio = new Ctx();
            }

            if (state.audio.state === 'suspended') {
                state.audio.resume();
            }

            return state.audio;
        }

        function beep(frequency, duration, type, volume) {
            const ctx = audioCtx();

            if (!ctx) {
                return;
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type || 'sine';
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(volume || 0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        }

        function shutterSound() {
            const ctx = audioCtx();

            if (!ctx) {
                return;
            }

            // Klik shutter: noise pendek + blip.
            const duration = 0.12;
            const frames = Math.floor(ctx.sampleRate * duration);
            const noise = ctx.createBuffer(1, frames, ctx.sampleRate);
            const data = noise.getChannelData(0);

            for (let i = 0; i < frames; i += 1) {
                data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
            }

            const source = ctx.createBufferSource();
            const gain = ctx.createGain();

            source.buffer = noise;
            gain.gain.value = 0.16;
            source.connect(gain);
            gain.connect(ctx.destination);
            source.start();

            beep(880, 0.06, 'square', 0.05);
        }

        // ----------------------------------------------
        // KAMERA
        // ----------------------------------------------
        function stopStream() {
            if (state.stream) {
                state.stream.getTracks().forEach(function (track) {
                    track.stop();
                });
                state.stream = null;
            }
        }

        /**
         * Overlay keadaan kamera (mati manual atau izin ditolak) + satu tombol
         * buat nyalain lagi — jadi user tidak perlu refresh halaman.
         */
        function showCameraState(message, buttonLabel) {
            cameraStateText.textContent = message;
            cameraRetry.innerHTML = '<i class="fa-solid fa-rotate-right"></i> ' + buttonLabel;
            cameraState.classList.remove('hidden');
        }

        function hideCameraState() {
            cameraState.classList.add('hidden');
        }

        /** Sinkronkan ikon/status tombol power kamera. */
        function setPowerState(on) {
            state.cameraOff = !on;
            cameraPower.setAttribute('aria-pressed', on ? 'true' : 'false');
            cameraPower.setAttribute('title', on ? 'Matikan kamera' : 'Nyalakan kamera');
            cameraPower.setAttribute('aria-label', on ? 'Matikan kamera' : 'Nyalakan kamera');
            cameraPower.classList.toggle('is-off', !on);
            cameraPowerIcon.className = on ? 'fa-solid fa-video' : 'fa-solid fa-video-slash';
        }

        /** Matikan kamera manual: hemat baterai & sopan secara privasi. */
        function turnCameraOff() {
            if (state.phase === 'capturing') {
                toast('Tunggu sesi jepretnya kelar dulu ya ⏳', true);
                return;
            }

            stopStream();
            video.style.display = 'none';
            loadingText.style.display = 'none';
            setPowerState(false);
            showCameraState('Kamera dimatikan 😴 Nyalakan lagi kalau siap foto.', 'Nyalakan kamera');

            shutter.disabled = true;

            if (state.phase === 'setup') {
                shutterLabel.textContent = 'Kamera mati 😴';
            }
        }

        function turnCameraOn() {
            setPowerState(true);
            hideCameraState();
            startCamera();
        }

        /** Putar kamera: muter daftar kamera yang terdeteksi browser. */
        function flipCamera() {
            if (state.phase === 'capturing') {
                toast('Tunggu sesi jepretnya kelar dulu ya ⏳', true);
                return;
            }

            const options = Array.prototype.slice.call(cameraSelect.options);

            // Nilai (deviceId) bisa kosong lebih dari sekali — mis. "Kamera utama"
            // dan satu device yang belum punya label. Yang dihitung hanya kamera
            // yang benar-benar berbeda, biar tombol flip tidak "ganti" ke kamera
            // yang sama sambil ngasih pesan palsu.
            const distinct = options.filter(function (option, index) {
                return options.findIndex(function (other) {
                    return other.value === option.value;
                }) === index;
            });

            if (distinct.length < 2) {
                toast('Cuma ada satu kamera di perangkat ini 🙈', true);
                return;
            }

            const current = Math.max(0, distinct.findIndex(function (option) {
                return option.value === cameraSelect.value;
            }));

            const next = distinct[(current + 1) % distinct.length];
            cameraSelect.value = next.value;

            setPowerState(true);
            hideCameraState();
            startCamera();

            toast('Kamera: ' + next.textContent.trim() + ' 🔄');
        }

        async function listCameras() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                return;
            }

            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const cameras = devices.filter(function (device) {
                    return device.kind === 'videoinput';
                });

                const current = cameraSelect.value;

                cameraSelect.innerHTML = '<option value="">Kamera utama</option>';

                cameras.forEach(function (camera, index) {
                    const option = document.createElement('option');
                    option.value = camera.deviceId;
                    option.textContent = camera.label || 'Kamera ' + (index + 1);
                    cameraSelect.appendChild(option);
                });

                cameraSelect.value = current || '';
            } catch (error) {
                console.log(error);
            }
        }

        async function startCamera() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                loadingText.style.display = 'none';
                showCameraState(
                    'Browser ini belum bisa akses kamera 😢 Buka lewat localhost atau HTTPS ya.',
                    'Coba lagi'
                );
                return;
            }

            loadingText.style.display = 'block';
            loadingText.textContent = 'Menyalakan kamera... 👀';
            video.style.display = 'none';

            const quality = parseInt(qualitySelect.value, 10) || 1280;
            const deviceId = cameraSelect.value;

            const constraints = {
                audio: false,
                video: {
                    width: { ideal: quality },
                    height: { ideal: Math.round(quality * 0.75) },
                    facingMode: 'user'
                }
            };

            if (deviceId) {
                constraints.video.deviceId = { exact: deviceId };
                delete constraints.video.facingMode;
            }

            stopStream();

            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                state.stream = stream;
                video.srcObject = stream;

                await video.play().catch(function () {});
                video.style.display = 'block';
                loadingText.style.display = 'none';

                // Kamera hidup: tutup overlay keadaan & sinkronkan tombol power.
                hideCameraState();
                setPowerState(true);

                // Titik hijau berdenyut: kamera benar-benar siap.
                if (window.AmphiboothAnim) {
                    window.AmphiboothAnim.ready(viewport);
                }

                // Kamera siap: tombol jepret baru boleh dipakai.
                if (state.phase === 'setup') {
                    shutter.disabled = false;
                    shutterLabel.textContent = state.shots.some(Boolean)
                        ? 'Lanjut Jepret 📸'
                        : 'Mulai Sesi (3 foto)';
                }

                await listCameras();
            } catch (error) {
                console.log(error);
                loadingText.style.display = 'none';

                let message = 'Kamera tidak bisa dipakai 🥺 (' + (error.name || 'error') + ')';

                if (error.name === 'NotAllowedError') {
                    message = 'Izin kamera ditolak. Buka izin kamera di pengaturan browser, lalu coba lagi 🥺';
                } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
                    message = 'Kamera-nya tidak ketemu 🙈 Coba pilih kamera lain di panel pengaturan.';
                }

                // Tanpa kamera, jangan biarkan tombol jepret seolah siap.
                shutter.disabled = true;
                shutterLabel.textContent = 'Kamera belum siap 🥺';

                showCameraState(message, 'Coba lagi');
                toast(message, true);
            }
        }

        // ----------------------------------------------
        // KOMPOSIT 1 FRAME (VIDEO + STIKER AI)
        // ----------------------------------------------
        function compositeFrame() {
            const width = video.videoWidth;
            const height = video.videoHeight;

            if (!width || !height) {
                return null;
            }

            buffer.width = width;
            buffer.height = height;

            const ctx = buffer.getContext('2d');
            ctx.clearRect(0, 0, width, height);

            // 1) Video (tercermin atau tidak).
            ctx.save();

            if (state.mirror) {
                ctx.translate(width, 0);
                ctx.scale(-1, 1);
            }

            ctx.drawImage(video, 0, 0, width, height);
            ctx.restore();

            // 2) Stiker AI: face-filter.js menggambar di ruang cermin,
            //    jadi kalau mirror mati koordinatnya dicerminkan balik.
            const draws = (window.faceFilter && window.faceFilter.getLastDraws)
                ? window.faceFilter.getLastDraws()
                : [];

            draws.forEach(function (item) {
                if (typeof item.cx === 'undefined') {
                    return;
                }

                const cx = state.mirror ? item.cx : width - item.cx;
                const rotation = state.mirror ? (item.rot || 0) : -(item.rot || 0);

                ctx.save();
                ctx.translate(cx, item.cy);
                ctx.rotate(rotation);
                ctx.drawImage(
                    item.img,
                    item.sx, item.sy, item.sw, item.sh,
                    -item.dw / 2, -item.dh / 2, item.dw, item.dh
                );
                ctx.restore();
            });

            return buffer;
        }

        // Potong tengah (cover) ke rasio sel strip 4:3.
        function coverCanvas(source, width, height) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            const sw = source.width;
            const sh = source.height;
            const scale = Math.max(width / sw, height / sh);
            const dw = sw * scale;
            const dh = sh * scale;

            ctx.drawImage(source, (width - dw) / 2, (height - dh) / 2, dw, dh);

            return canvas;
        }

        // ----------------------------------------------
        // HITUNGAN 3-2-1
        // ----------------------------------------------
        function wait(ms) {
            return new Promise(function (resolve) {
                setTimeout(resolve, ms);
            });
        }

        async function runCountdown(seconds) {
            if (seconds <= 0) {
                return;
            }

            countdownEl.style.display = 'block';

            for (let n = seconds; n > 0; n -= 1) {
                countdownEl.textContent = String(n);
                // restart animasi zoom
                countdownEl.style.animation = 'none';
                void countdownEl.offsetWidth;
                countdownEl.style.animation = '';

                // cincin yang menyebar tiap angka
                if (window.AmphiboothAnim) {
                    window.AmphiboothAnim.countTick(countdownEl);
                }

                beep(440 + (seconds - n) * 60, 0.09, 'sine', 0.07);

                await wait(1000);
            }

            countdownEl.style.display = 'none';
        }

        // ----------------------------------------------
        // UI PER FASE
        // ----------------------------------------------
        function setPanels(active) {
            [setupPanel, finishPanel, resultPanel].forEach(function (panel) {
                if (panel) {
                    panel.classList.toggle('hidden', panel !== active);
                }
            });

            // Animasi masuk panel (opsional, kalau bundle animasi termuat).
            if (active && window.AmphiboothAnim) {
                window.AmphiboothAnim.panel(active);
            }
        }

        function setProgress(text) {
            progressEl.textContent = text;
        }

        /** Jumlah pose aktif untuk sesi ini (1-4). */
        function shotCount() {
            return state.poses;
        }

        function updateShutterLabel() {
            const filled = state.shots.filter(Boolean).length;

            if (state.phase === 'setup' && filled === 0) {
                shutterLabel.textContent = 'Mulai Sesi (' + shotCount() + ' foto)';
                return;
            }

            if (state.phase === 'capturing') {
                shutterLabel.textContent = 'Jepret... 📸';
                return;
            }

            shutterLabel.textContent = 'Sesi Selesai ✨';
        }

        function lockSetup(locked) {
            document.querySelectorAll('[data-filter]').forEach(function (button) {
                button.disabled = locked;
            });

            document.querySelectorAll('[data-poses]').forEach(function (button) {
                button.disabled = locked;
            });

            [cameraSelect, qualitySelect, timerSelect, mirrorToggle].forEach(function (el) {
                el.disabled = locked;
            });
        }

        function renderSlots() {
            const total = shotCount();

            slotEls.forEach(function (slot, index) {
                const aktif = index < total;
                const shot = aktif ? state.shots[index] : null;
                const img = slot.querySelector('img');

                // Slot di luar jumlah pose disembunyikan (bukan dihapus, biar
                // markup-nya tetap satu sumber dan animasinya tidak bikin ulang).
                slot.hidden = !aktif;
                slot.classList.toggle('hidden', !aktif);
                slot.classList.toggle('filled', Boolean(shot));
                slot.classList.remove('capturing');

                if (shot) {
                    if (!img.dataset.url) {
                        img.src = shot.thumbUrl;
                        img.dataset.url = '1';
                    }
                    img.hidden = false;

                    if (!slot.dataset.filled) {
                        slot.dataset.filled = '1';
                        if (window.AmphiboothAnim) {
                            window.AmphiboothAnim.pop(img);
                        }
                    }
                } else {
                    img.hidden = true;
                    img.removeAttribute('src');
                    delete img.dataset.url;
                    delete slot.dataset.filled;
                }
            });

            const filled = state.shots.filter(Boolean).length;
            setProgress('Foto ' + Math.min(filled + (state.phase === 'capturing' ? 1 : 0), total) + '/' + total);
        }

        /** Ganti jumlah pose (1-4). Foto yang sudah ada ikut direset. */
        function setPoses(poses) {
            const total = Math.max(1, Math.min(MAX_SHOTS, parseInt(poses, 10) || DEFAULT_SHOTS));

            if (state.phase !== 'setup') {
                toast('Jumlah pose cuma bisa diganti di langkah awal ya 💗', true);
                return;
            }

            if (total === state.poses) {
                return;
            }

            if (state.shots.some(Boolean)) {
                const lanjut = window.confirm(
                    'Ganti jadi ' + total + ' pose? Foto yang sudah dijepret akan dihapus.'
                );

                if (!lanjut) {
                    return;
                }
            }

            state.poses = total;
            state.shots = new Array(total).fill(null);

            slotStrip.dataset.poses = String(total);

            document.querySelectorAll('[data-poses]').forEach(function (button) {
                const active = parseInt(button.dataset.poses, 10) === total;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', active ? 'true' : 'false');
            });

            renderSlots();

            if (state.phase === 'setup' && !state.cameraOff) {
                shutterLabel.textContent = 'Mulai Sesi (' + total + ' foto)';
            }

            toast('Siap! ' + total + ' pose per strip 💗');
        }

        // ----------------------------------------------
        // JEPRET SATU SLOT
        // ----------------------------------------------
        async function captureSlot(index) {
            if (state.busy) {
                return;
            }

            const frame = compositeFrame();

            if (!frame) {
                toast('Kamera belum siap, tunggu sebentar ya 👀', true);
                return;
            }

            state.busy = true;
            state.phase = 'capturing';
            lockSetup(true);
            shutter.disabled = true;
            restartButton.hidden = true;

            slotEls.forEach(function (slot, i) {
                slot.classList.toggle('capturing', i === index);
            });

            setProgress('Bersiap foto ' + (index + 1) + '/' + shotCount());
            shutterLabel.textContent = 'Pose ' + (index + 1) + '... 📸';

            await wait(index === 0 ? 450 : PAUSE_BETWEEN_SHOTS);

            // Kalau retake, slot ini dikosongkan dulu.
            state.shots[index] = null;
            renderSlots();

            await runCountdown(parseInt(timerSelect.value, 10));

            // Ambil frame terbaru tepat setelah hitungan selesai.
            const fresh = compositeFrame() || frame;

            flashEl.classList.add('active');
            shutterSound();
            setTimeout(function () {
                flashEl.classList.remove('active');
            }, 320);

            const full = document.createElement('canvas');
            full.width = fresh.width;
            full.height = fresh.height;
            full.getContext('2d').drawImage(fresh, 0, 0);

            const thumb = coverCanvas(full, 320, 240);

            state.shots[index] = {
                canvas: full,
                thumbUrl: thumb.toDataURL('image/jpeg', 0.8)
            };

            slotEls[index].classList.remove('capturing');
            renderSlots();

            // Film maju: strip slot terdorong turun-naik.
            if (window.AmphiboothAnim) {
                window.AmphiboothAnim.advance(slotStrip);
            }

            state.busy = false;

            const filled = state.shots.filter(Boolean).length;

            if (filled >= shotCount()) {
                await wait(520);
                enterFinish();
                return;
            }

            // Lanjut otomatis ke slot berikutnya yang kosong.
            const next = state.shots.findIndex(function (shot) {
                return !shot;
            });

            shutter.disabled = false;

            if (next !== -1) {
                captureSlot(next);
            }
        }

        // ----------------------------------------------
        // UPLOAD FOTO DARI GALERI ("your upload")
        // ----------------------------------------------
        function loadImageFile(file) {
            // createImageBitmap menghormati EXIF orientation, jadi foto HP
            // yang ketiduran tidak tampil miring.
            if (window.createImageBitmap) {
                return createImageBitmap(file, { imageOrientation: 'from-image' })
                    .catch(function () {
                        return createImageBitmap(file);
                    });
            }

            return new Promise(function (resolve, reject) {
                const url = URL.createObjectURL(file);
                const img = new Image();

                img.onload = function () {
                    URL.revokeObjectURL(url);
                    resolve(img);
                };

                img.onerror = function () {
                    URL.revokeObjectURL(url);
                    reject(new Error('foto tidak bisa dibaca'));
                };

                img.src = url;
            });
        }

        /** Ubah file jadi "jepretan": dipotong penuh ke rasio frame kamera. */
        function shotFromImage(source) {
            const width = video.videoWidth || 960;
            const height = video.videoHeight || 720;

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            const scale = Math.max(width / source.width, height / source.height);
            const drawW = source.width * scale;
            const drawH = source.height * scale;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(source, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);

            return {
                canvas: canvas,
                thumbUrl: coverCanvas(canvas, 320, 240).toDataURL('image/jpeg', 0.8)
            };
        }

        async function handleUpload(files) {
            if (state.phase !== 'setup' || state.busy) {
                toast('Upload cuma bisa sebelum masuk ke hias frame ya 💗', true);
                return;
            }

            const list = Array.prototype.slice.call(files).filter(function (file) {
                return /^image\//.test(file.type);
            });

            if (!list.length) {
                toast('File-nya bukan gambar 🙈', true);
                return;
            }

            if (list.length > shotCount()) {
                toast('Kebanyakan! Dipakai ' + shotCount() + ' foto pertama aja ya 💗');
            }

            // Slot kosong diisi dulu; kalau sudah penuh, yang lama tertimpa.
            const empty = [];
            const taken = [];

            state.shots.forEach(function (shot, index) {
                (shot ? taken : empty).push(index);
            });

            const order = empty.concat(taken);

            state.busy = true;
            let ok = 0;

            for (let i = 0; i < Math.min(list.length, shotCount()); i++) {
                try {
                    const source = await loadImageFile(list[i]);
                    state.shots[order[i]] = shotFromImage(source);
                    ok++;
                    renderSlots();
                } catch (error) {
                    console.log(error);
                }
            }

            state.busy = false;

            if (!ok) {
                toast('Fotonya gagal dibaca 🥺 Coba file lain ya.', true);
                return;
            }

            toast(ok + ' foto masuk dari galeri 🖼️');

            if (window.AmphiboothAnim) {
                window.AmphiboothAnim.advance(slotStrip);
            }

            const filled = state.shots.filter(Boolean).length;

            if (filled >= shotCount()) {
                await wait(420);
                enterFinish();
            }
        }

        // ----------------------------------------------
        // MASUK FASE FRAME
        // ----------------------------------------------
        function enterFinish() {
            state.phase = 'finish';
            state.shots.forEach(function (shot, index) {
                if (shot && !shot.canvas) {
                    // jaga-jaga
                    state.shots[index] = null;
                }
            });

            viewport.classList.add('hidden');
            stage.classList.remove('hidden');
            stripCanvas.classList.remove('hidden');

            setPanels(finishPanel);
            lockSetup(true);
            shutter.disabled = true;
            shutterLabel.textContent = 'Sesi Selesai ✨';
            restartButton.hidden = false;
            setProgress('Strip siap dihias 🎀');

            updateFrameColorRow();
            renderStrip();
            buildFramePicker();

            if (window.AmphiboothAnim) {
                window.AmphiboothAnim.strip(stage);
                window.AmphiboothAnim.confetti(stripCanvas, 22);
            }

            // Panel kanan otomatis kebuka di mobile.
            openSheet(true);
        }

        // ----------------------------------------------
        // RENDER PREVIEW STRIP
        // ----------------------------------------------
        function currentShots() {
            return state.shots.filter(Boolean).map(function (shot) {
                return shot.canvas;
            });
        }

        function renderStrip(hiRes) {
            if (!window.Strip || currentShots().length === 0) {
                return null;
            }

            const rendered = window.Strip.render({
                shots: currentShots(),
                frame: state.frame,
                frameColor: state.frameColor,
                caption: state.caption,
                dateStamp: state.dateStamp,
                effect: state.effect,
                hiRes: Boolean(hiRes),
                // Mode demo: hasil selalu pakai watermark biar jelas ini versi coba-coba.
                watermark: appConfig.demo
            });

            // Gambar ke canvas yang sudah ada di DOM (supaya print CSS tetap kena).
            stripCanvas.width = rendered.width;
            stripCanvas.height = rendered.height;
            stripCanvas.getContext('2d').drawImage(rendered, 0, 0);

            return rendered;
        }

        function updateFrameColorRow() {
            frameColorRow.classList.toggle('hidden', state.frame !== 'solid');
        }

        // ----------------------------------------------
        // PEMILIH FRAME (kartu + thumbnail visual)
        // ----------------------------------------------
        // User tidak perlu nebak-nebak dari nama: tiap opsi dirender
        // langsung pakai 3 foto sesi ini, ukuran kecil (scale 0.16).
        function frameThumbnail(frameId) {
            const shots = currentShots();

            if (!shots.length) {
                return null;
            }

            return window.Strip.render({
                shots: shots,
                frame: frameId,
                frameColor: state.frameColor,
                caption: state.caption,
                dateStamp: state.dateStamp,
                effect: 'none',
                scale: 0.22
            });
        }

        function buildFramePicker() {
            if (!window.Strip || !window.Strip.picker) {
                return;
            }

            if (!currentShots().length) {
                return;
            }

            const fragment = document.createDocumentFragment();

            window.Strip.picker.forEach(function (frameId) {
                const preset = window.Strip.presets[frameId] || { label: frameId };

                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'frame-card' + (frameId === state.frame ? ' active' : '');
                card.dataset.frame = frameId;
                card.setAttribute('aria-label', 'Pakai frame ' + preset.label);
                card.setAttribute('aria-pressed', frameId === state.frame ? 'true' : 'false');

                const holder = document.createElement('span');
                holder.className = 'frame-thumb';

                const thumb = frameThumbnail(frameId);

                if (thumb) {
                    holder.appendChild(thumb);
                }

                const name = document.createElement('span');
                name.className = 'frame-name';
                name.textContent = preset.label;

                card.appendChild(holder);
                card.appendChild(name);
                fragment.appendChild(card);
            });

            frameList.innerHTML = '';
            frameList.appendChild(fragment);
        }

        // Thumbnail frame "solid" ikut warna yang dipilih.
        function refreshSolidThumbnail() {
            const holder = frameList.querySelector('[data-frame="solid"] .frame-thumb');

            if (!holder) {
                return;
            }

            const thumb = frameThumbnail('solid');

            if (thumb) {
                holder.innerHTML = '';
                holder.appendChild(thumb);
            }
        }

        // ----------------------------------------------
        // EVENT: FILTER (AI)
        // ----------------------------------------------
        document.querySelectorAll('[data-filter]').forEach(function (button) {
            button.addEventListener('click', function () {
                if (state.phase !== 'setup') {
                    return;
                }

                document.querySelectorAll('[data-filter]').forEach(function (other) {
                    other.classList.remove('active');
                });

                button.classList.add('active');
                state.filter = button.dataset.filter;

                if (window.faceFilter) {
                    window.faceFilter.setFilter(state.filter);
                }
            });
        });

        // ----------------------------------------------
        // EVENT: FRAME / CAPTION / EFEK
        // ----------------------------------------------
        frameList.addEventListener('click', function (event) {
            const button = event.target.closest('[data-frame]');

            if (!button) {
                return;
            }

            frameList.querySelectorAll('.frame-card').forEach(function (other) {
                other.classList.remove('active');
                other.setAttribute('aria-pressed', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');

            state.frame = button.dataset.frame;
            updateFrameColorRow();
            renderStrip();
        });

        frameColorInput.addEventListener('input', function () {
            state.frameColor = frameColorInput.value;

            if (state.frame === 'solid') {
                renderStrip();
                refreshSolidThumbnail();
            }
        });

        captionInput.addEventListener('input', function () {
            state.caption = captionInput.value.slice(0, 80);
            renderStrip();
        });

        dateToggle.addEventListener('change', function () {
            state.dateStamp = dateToggle.checked;
            renderStrip();
        });

        const effectList = document.getElementById('effect-list');

        /*
         * Daftar efek mengikuti strip.js (satu sumber kebenaran): kalau ada
         * tombol yang id-nya tidak dikenal di sana, tombolnya disembunyikan,
         * dan counter di judul menunjukkan jumlah efek yang benar-benar ada.
         */
        (function initEffectList() {
            const ids = (window.Strip && window.Strip.effects) || [];
            const counter = document.getElementById('effect-count');

            if (counter && ids.length) {
                counter.textContent = ids.length + ' efek';
            }

            if (!ids.length) {
                return;
            }

            effectList.querySelectorAll('[data-effect]').forEach(function (button) {
                if (ids.indexOf(button.dataset.effect) === -1) {
                    button.hidden = true;
                }
            });
        })();

        effectList.addEventListener('click', function (event) {
            const button = event.target.closest('[data-effect]');

            if (!button) {
                return;
            }

            effectList.querySelectorAll('[data-effect]').forEach(function (other) {
                other.classList.remove('active');
            });
            button.classList.add('active');

            state.effect = button.dataset.effect;
            renderStrip();
        });

        // ----------------------------------------------
        // EVENT: KAMERA & SETTING
        // ----------------------------------------------
        mirrorToggle.addEventListener('change', function () {
            state.mirror = mirrorToggle.checked;
            video.classList.toggle('no-mirror', !state.mirror);
            faceCanvas.classList.toggle('force-flip', !state.mirror);
        });

        soundToggle.addEventListener('change', function () {
            state.sound = soundToggle.checked;
        });

        // Jumlah pose per strip (1-4). Default 3, dan penanda di markup
        // disinkronkan di sini biar tidak ada dua sumber kebenaran.
        document.querySelectorAll('[data-poses]').forEach(function (button) {
            button.addEventListener('click', function () {
                setPoses(button.dataset.poses);
            });
        });

        slotStrip.dataset.poses = String(state.poses);

        document.querySelectorAll('[data-poses]').forEach(function (button) {
            const active = parseInt(button.dataset.poses, 10) === state.poses;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        cameraSelect.addEventListener('change', startCamera);
        qualitySelect.addEventListener('change', startCamera);

        // Upload foto dari galeri HP.
        uploadButton.addEventListener('click', function () {
            if (state.phase !== 'setup') {
                toast('Upload cuma bisa di langkah awal ya 💗', true);
                return;
            }

            // Reset dulu supaya file yang sama bisa dipilih dua kali.
            uploadInput.value = '';
            uploadInput.click();
        });

        uploadInput.addEventListener('change', function () {
            if (uploadInput.files && uploadInput.files.length) {
                handleUpload(uploadInput.files);
            }
        });

        // Tombol cepat kamera: putar kamera & matikan/nyalakan.
        flipButton.addEventListener('click', flipCamera);

        cameraPower.addEventListener('click', function () {
            if (state.cameraOff) {
                turnCameraOn();
            } else {
                turnCameraOff();
            }
        });

        cameraRetry.addEventListener('click', function () {
            if (state.cameraOff) {
                turnCameraOn();
            } else {
                setPowerState(true);
                hideCameraState();
                startCamera();
            }
        });

        // ----------------------------------------------
        // EVENT: SHUTTER / RETAKE
        // ----------------------------------------------
        shutter.addEventListener('click', function () {
            if (state.phase !== 'setup') {
                return;
            }

            audioCtx();

            const firstEmpty = state.shots.findIndex(function (shot) {
                return !shot;
            });

            if (firstEmpty === -1) {
                return;
            }

            captureSlot(firstEmpty);
        });

        slotEls.forEach(function (slot, index) {
            slot.addEventListener('click', function () {
                if (state.phase !== 'finish' || !state.shots[index]) {
                    return;
                }

                // Retake cuma slot ini.
                state.busy = false;
                stage.classList.add('hidden');
                viewport.classList.remove('hidden');
                stripCanvas.classList.add('hidden');
                setPanels(setupPanel);
                state.phase = 'setup';
                shutter.disabled = false;

                captureSlot(index);
            });
        });

        function resetSession() {
            state.phase = 'setup';
            state.shots = new Array(shotCount()).fill(null);
            state.busy = false;
            state.savedCollage = null;

            renderSlots();
            setPanels(setupPanel);
            viewport.classList.remove('hidden');
            stage.classList.add('hidden');
            lockSetup(false);
            shutter.disabled = false;
            restartButton.hidden = true;
            shutterLabel.textContent = 'Mulai Sesi (' + shotCount() + ' foto)';
            setProgress('Foto 1/' + shotCount());

            if (window.faceFilter && window.faceFilter.setFilter) {
                window.faceFilter.setFilter(state.filter);
            }
        }

        restartButton.addEventListener('click', resetSession);
        finishReset.addEventListener('click', resetSession);
        againButton.addEventListener('click', resetSession);

        // ----------------------------------------------
        // MOBILE SHEET
        // ----------------------------------------------
        function openSheet(open) {
            sidePanel.classList.toggle('sheet-open', open);
            sheetToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        sheetToggle.addEventListener('click', function () {
            openSheet(!sidePanel.classList.contains('sheet-open'));
        });

        // ----------------------------------------------
        // SHORTCUT KEYBOARD (desktop)
        // ----------------------------------------------
        // Spasi = jepret / lanjut, R = ulangi semua. Diabaikan kalau fokus
        // di input/select (biar ngetik caption tetap normal) atau kalau
        // tombol lain lagi fokus — supaya spasi tetap "mencet" tombol itu.
        document.addEventListener('keydown', function (event) {
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            const target = event.target;
            const tag = (target.tagName || '').toLowerCase();

            if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
                return;
            }

            if (event.key === ' ' || event.code === 'Space') {
                if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
                    return;
                }

                if (!shutterButton.disabled) {
                    event.preventDefault();
                    shutterButton.click();
                }

                return;
            }

            if (event.key === 'r' || event.key === 'R') {
                if (!restartButton.hidden && !restartButton.disabled) {
                    event.preventDefault();
                    restartButton.click();
                }
            }
        });

        // ----------------------------------------------
        // SIMPAN
        // ----------------------------------------------
        function dataUrlOf(canvas, quality) {
            return canvas.toDataURL('image/jpeg', quality || 0.88);
        }

        /**
         * JPEG dengan lebar maksimum tertentu.
         *
         * Kamera menangkap di HD (1280 px) dan lembar dirender 1.5x buat
         * layar/print, tapi yang dikirim ke server cukup versi ringkas:
         * unduhan tetap dirender ulang 1.5x dari shot asli di memori.
         * Ini yang bikin satu sesi turun dari ~880 KB ke ~350-450 KB.
         */
        function jpegOf(canvas, maxWidth, quality) {
            if (!canvas) {
                return null;
            }

            if (!maxWidth || canvas.width <= maxWidth) {
                return dataUrlOf(canvas, quality);
            }

            const small = document.createElement('canvas');
            small.width = maxWidth;
            small.height = Math.max(1, Math.round(canvas.height * (maxWidth / canvas.width)));

            const ctx = small.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(canvas, 0, 0, small.width, small.height);

            return dataUrlOf(small, quality);
        }

        /**
         * Thumbnail buat kartu gallery: lebar ~360 px, JPEG ringan.
         * Dibuat di browser karena server tidak punya GD/Imagick.
         */
        function thumbOf(canvas) {
            return jpegOf(canvas, appConfig.thumbWidth || 360, 0.72);
        }

        saveButton.addEventListener('click', async function () {
            if (state.saving || state.phase !== 'finish') {
                return;
            }

            if (appConfig.demo) {
                // Mode coba-coba: tidak ada yang dikirim ke server, tapi
                // user tetap bisa lanjut ke layar hasil buat unduh strip-nya.
                state.phase = 'result';
                showResult();
                toast('Mode coba-coba: strip bisa diunduh, tapi belum kesimpan 💾');
                return;
            }

            state.saving = true;
            saveButton.disabled = true;
            saveButton.textContent = 'Menyimpan... 💫';

            // Animasi "mencetak" 1 detik.
            printingOverlay.hidden = false;
            openSheet(false);

            const sheet = renderStrip(true);
            await wait(1000);

            try {
                const response = await fetch(appConfig.collagesStore, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken
                    },
                    body: JSON.stringify({
                        layout: 'strip' + shotCount(),
                        frame: state.frame,
                        frame_color: state.frameColor,
                        caption: state.caption,
                        date_stamp: state.dateStamp,
                        shots: currentShots().map(function (canvas) {
                            return jpegOf(canvas, SHOT_MAX_WIDTH, 0.8);
                        }),
                        sheet: jpegOf(sheet, SHEET_MAX_WIDTH, 0.9),
                        thumb: thumbOf(sheet)
                    })
                });

                const data = await response.json().catch(function () {
                    return {};
                });

                if (response.status === 401) {
                    window.location.href = appConfig.loginUrl;
                    return;
                }

                if (!response.ok || !data.success) {
                    const message = data.message
                        || (data.errors && data.errors.sheet && data.errors.sheet[0])
                        || (data.errors && data.errors.shots && data.errors.shots[0])
                        || 'Gagal menyimpan strip 🥺';
                    toast(message, true);
                    return;
                }

                state.savedCollage = data.collage;
                state.phase = 'result';

                showResult();
                toast(data.message || 'Strip tersimpan 💖');
            } catch (error) {
                console.log(error);
                toast('Koneksi ke server gagal, coba lagi ya 🥺', true);
            } finally {
                printingOverlay.hidden = true;
                state.saving = false;
                saveButton.disabled = false;
                saveButton.textContent = 'Simpan ke Gallery 💖';
            }
        });

        // ----------------------------------------------
        // FASE HASIL
        // ----------------------------------------------
        function showResult() {
            setPanels(resultPanel);

            if (state.savedCollage && state.savedCollage.share_url) {
                resultHint.textContent = 'Tersimpan di gallery — link share-nya juga siap dibagikan.';
                galleryLink.href = appConfig.galleryUrl;
                galleryLink.textContent = 'Ke Gallery 📚';
                shareButton.disabled = false;
            } else if (appConfig.demo) {
                resultHint.textContent = 'Mode coba-coba: strip-nya ada watermark demo. Daftar biar kesimpan di gallery & tanpa watermark.';
                galleryLink.href = appConfig.registerUrl;
                galleryLink.textContent = 'Daftar biar kesimpan 💖';
                shareButton.disabled = true;
            }

            updateResultSize();
            openSheet(false);
        }

        // Info ukuran cetak: yang diunduh = canvas layar x 1.5, dan
        // 300 dpi dianggap aman buat cetak foto.
        function updateResultSize() {
            if (!resultSize) {
                return;
            }

            const scale = (window.Strip && window.Strip.exportScale) || 1.5;
            const fileW = Math.round(stripCanvas.width * scale);
            const fileH = Math.round(stripCanvas.height * scale);

            const inch = function (px) {
                return Math.round((px / 300) * 10) / 10;
            };

            resultSize.textContent = 'File yang diunduh ' + fileW + ' × ' + fileH
                + ' px — aman dicetak sampai ' + inch(fileW) + ' × ' + inch(fileH) + ' inci (300 dpi).';
        }

        // ----------------------------------------------
        // DOWNLOAD
        // ----------------------------------------------
        downloadButton.addEventListener('click', function () {
            if (state.savedCollage && state.savedCollage.download_url) {
                triggerDownload(state.savedCollage.download_url, state.savedCollage.download_name);
                toast('Strip-nya lagi diunduh 💾');
                return;
            }

            const sheet = renderStrip(true);

            if (!sheet) {
                toast('Belum ada strip buat diunduh 🥺', true);
                return;
            }

            const name = 'amphibooth-strip' + shotCount() + '-' + new Date().toISOString().slice(0, 10) + '.jpg';

            sheet.toBlob(function (blob) {
                if (!blob) {
                    toast('Gagal menyiapkan file 🥺', true);
                    return;
                }

                const url = URL.createObjectURL(blob);
                triggerDownload(url, name);
                setTimeout(function () {
                    URL.revokeObjectURL(url);
                }, 4000);
                toast('Strip-nya lagi diunduh 💾');
            }, 'image/jpeg', 0.92);
        });

        function triggerDownload(url, filename) {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || 'amphibooth-strip.jpg';
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            link.remove();
        }

        // ----------------------------------------------
        // PRINT
        // ----------------------------------------------
        printButton.addEventListener('click', function () {
            openSheet(false);

            // Pastikan canvas sudah ter-render sebelum print dialog terbuka.
            renderStrip();
            setTimeout(function () {
                window.print();
            }, 120);
        });

        // ----------------------------------------------
        // SHARE
        // ----------------------------------------------
        shareButton.addEventListener('click', async function () {
            const url = state.savedCollage && state.savedCollage.share_url;

            if (!url) {
                toast('Simpan strip dulu, baru bisa dibagikan 🔗', true);
                return;
            }

            try {
                if (navigator.share) {
                    await navigator.share({
                        title: 'Strip Amphibooth',
                        text: 'Lihat strip photobooth aku! 📸',
                        url: url
                    });
                    return;
                }

                await navigator.clipboard.writeText(url);
                toast('Link share disalin! Tempel di chat 💌');
            } catch (error) {
                console.log(error);
                // Fallback kalau clipboard diblokir browser.
                window.prompt('Salin link ini buat dibagikan:', url);
            }
        });

        // ----------------------------------------------
        // START
        // ----------------------------------------------
        if (window.faceFilter && window.faceFilter.setFilter) {
            window.faceFilter.setFilter('none');
        }

        setPanels(setupPanel);
        renderSlots();

        if (appConfig.demo) {
            saveButton.textContent = 'Selesai & Unduh 💾';
        }

        startCamera();

        // Kalau frame kamera baru muncul belakangan (izin terlambat diberikan,
        // atau stream lambat), tombol jepret otomatis aktif.
        setInterval(function () {
            // Kamera dimatikan manual / belum ada stream hidup: jangan diusik.
            if (state.phase !== 'setup' || !shutter.disabled || state.cameraOff) {
                return;
            }

            const hidups = state.stream && state.stream.active;

            if (hidups && video.videoWidth && video.videoHeight) {
                shutter.disabled = false;
                shutterLabel.textContent = state.shots.some(Boolean)
                    ? 'Lanjut Jepret 📸'
                    : 'Mulai Sesi (' + shotCount() + ' foto)';
                loadingText.style.display = 'none';
                video.style.display = 'block';
            }
        }, 400);

        // Font caption butuh sedikit waktu; render ulang setelah siap.
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function () {
                if (state.phase === 'finish') {
                    renderStrip();
                }
            });
        }

        // Biar bisa dites tanpa kamera (dipakai juga sama tes otomatis).
        window.boothApp = {
            state: state,
            compositeFrame: compositeFrame,
            captureSlot: captureSlot,
            enterFinish: enterFinish,
            renderStrip: renderStrip,
            resetSession: resetSession,
            setPoses: setPoses,
            setShot: function (index, canvas) {
                const thumb = coverCanvas(canvas, 320, 240);
                state.shots[index] = { canvas: canvas, thumbUrl: thumb.toDataURL('image/jpeg', 0.8) };
                renderSlots();
            }
        };
    });
})();