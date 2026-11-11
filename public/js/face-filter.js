// ======================================================
// AMPHIBOOTH - FACE FILTER ENGINE V2
// FACE TRACKING + FROG HAT
// ======================================================

let faceCanvas;
let faceCtx;
let videoFeed;

// Gambar stiker
const stickers = {
    frog: new Image(),
    cat: new Image(),
    devil: new Image(),
    blush: new Image()
};

// ✅ REVISI PENTING: Tambahkan /images/ (atau sesuai letak folder lu di dalam folder public)
// Asumsinya, lu udah mindahin folder 'filters' ke dalam 'public/images/'
stickers.frog.src = "/images/filters/frog.png";
stickers.cat.src = "/images/filters/cat.png";
stickers.devil.src = "/images/filters/devil.png";
stickers.blush.src = "/images/filters/blush.png";

// Filter aktif
window.aiFilter = "none";

console.log("FILE FACE-FILTER TERLOAD");

// ======================================================
// START ENGINE
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    videoFeed = document.getElementById("video-feed");
    faceCanvas = document.getElementById("face-canvas");
    faceCtx = faceCanvas.getContext("2d");
    console.log("DOM SIAP");

    startFaceMesh();
});

// ======================================================
// MEDIAPIPE FACE MESH
// ======================================================

function startFaceMesh() {
    console.log("MASUK startFaceMesh()");

    const faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
        // Ukuran canvas sama dengan video
        faceCanvas.width = videoFeed.videoWidth;
        faceCanvas.height = videoFeed.videoHeight;

        // Bersihkan frame sebelumnya
        faceCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);

        // Kalau wajah ditemukan
        if (results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];

            switch (window.aiFilter) {
                case "frog":
                    drawSticker(landmarks, stickers.frog);
                    break;
                case "cat":
                    drawSticker(landmarks, stickers.cat);
                    break;
                case "devil":
                    drawSticker(landmarks, stickers.devil);
                    break;
                case "blush": // ✅ REVISI: Tambahan untuk blush karena di atas udah didefinisikan
                    drawSticker(landmarks, stickers.blush);
                    break;
            }
        }
    });

    // Mulai membaca kamera
    detectFace(faceMesh);
    console.log("FaceMesh aktif 🐸");
}

// ======================================================
// LOOP VIDEO
// ======================================================

async function detectFace(faceMesh) {
    if (videoFeed.readyState === 4) {
        await faceMesh.send({
            image: videoFeed
        });
    }

    requestAnimationFrame(() => {
        detectFace(faceMesh);
    });
}

// ======================================================
// GAMBAR STIKER (FROG HAT DLL)
// ======================================================

function drawSticker(landmarks, sticker) {
    if (!sticker.complete) return;

    // Titik dahi
    const forehead = landmarks[10];

    // Sisi wajah
    const leftFace = landmarks[234];
    const rightFace = landmarks[454];

    // Hitung ukuran kepala
    const faceWidth = Math.abs(rightFace.x - leftFace.x) * faceCanvas.width;
    const width = faceWidth * 2.0;
    const height = width * 0.9;

    // Posisi topi
    const x = forehead.x * faceCanvas.width - width / 2;
    const y = forehead.y * faceCanvas.height - height * 0.75;

    faceCtx.drawImage(
        sticker,
        x,
        y,
        width,
        height
    );
}