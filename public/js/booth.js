// ======================================================
// AMPHIBOOTH - BOOTH CORE ENGINE FINAL
// CAMERA + TIMER + FLASH + CAPTURE (LARAVEL VERSION)
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
    
    // ===============================
    // Cek Session & Logout udah dihapus dari JS
    // (Karena udah di-handle langsung sama Blade/Controller Laravel)
    // ===============================

    // ===============================
    // CAMERA SETUP
    // ===============================
    const video = document.getElementById("video-feed");
    const loading = document.querySelector(".loading-text");

    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    })
    .then(stream => {
        video.srcObject = stream;
        video.style.display = "block";
        loading.style.display = "none";
    })
    .catch(err => {
        console.log(err);
        loading.innerText = "Kamera tidak bisa digunakan 🥺";
    });

    // ===============================
    // ELEMENT SELECTORS
    // ===============================
    const shutter = document.getElementById("shutter-button");
    const canvas = document.getElementById("canvas-overlay");
    const ctx = canvas.getContext("2d");
    const countdown = document.getElementById("countdown");
    const flash = document.getElementById("camera-flash");
    const filtersPanel = document.getElementById("filters-panel");
    const postPanel = document.getElementById("post-capture-panel");

    let originalImage = null;
    let capturing = false;

    // ===============================
    // TIMER SENSOR & SNAP
    // ===============================
    shutter.addEventListener("click", () => {
        if (capturing) return;

        capturing = true;
        shutter.disabled = true;
        let number = 3;

        countdown.innerText = number;
        countdown.style.display = "block";

        let timer = setInterval(() => {
            number--;
            if (number > 0) {
                countdown.innerText = number;
            } else {
                clearInterval(timer);
                countdown.style.display = "none";
                takePhoto();
            }
        }, 1000);
    });

    // ===============================
    // TAKE PHOTO (PROSES CAPTURE)
    // ===============================
    function takePhoto() {
        // FLASH EFFECT
        flash.classList.add("active");
        setTimeout(() => {
            flash.classList.remove("active");
        }, 300);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // MIRROR EFFECT & GAMBAR VIDEO + CANVAS STIKER
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const faceCanvas = document.getElementById("face-canvas");
        ctx.drawImage(faceCanvas, 0, 0, canvas.width, canvas.height);
        
        ctx.restore();

        // SIMPAN GAMBAR ASLI UNTUK EFEK
        originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // UBAH TAMPILAN UI
        video.style.display = "none";
        canvas.style.display = "block";
        shutter.style.display = "none";
        filtersPanel.classList.add("hidden");
        postPanel.classList.remove("hidden");

        capturing = false;
        shutter.disabled = false;
    }

    // ===============================
    // EFFECT FILTERS (GRAYSCALE, SEPIA, DLL)
    // ===============================
    function applyEffect(effect) {
        if (!originalImage) return;

        ctx.putImageData(originalImage, 0, 0);
        if (effect === "none") return;

        let img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = img.data;

        if (effect === "grayscale") {
            for (let i = 0; i < data.length; i += 4) {
                let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg; data[i + 1] = avg; data[i + 2] = avg;
            }
        }

        if (effect === "invert") {
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i + 1] = 255 - data[i + 1];
                data[i + 2] = 255 - data[i + 2];
            }
        }

        if (effect === "sepia") {
            for (let i = 0; i < data.length; i += 4) {
                let r = data[i], g = data[i + 1], b = data[i + 2];
                data[i] = r * .393 + g * .769 + b * .189;
                data[i + 1] = r * .349 + g * .686 + b * .168;
                data[i + 2] = r * .272 + g * .534 + b * .131;
            }
        }

        ctx.putImageData(img, 0, 0);
    }

    document.querySelectorAll("[data-effect]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("[data-effect]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            applyEffect(btn.dataset.effect);
        });
    });

    // ===============================
    // DELETE FOTO (RETAKE)
    // ===============================
    document.getElementById("delete-button").addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = "none";
        video.style.display = "block";
        shutter.style.display = "block";
        postPanel.classList.add("hidden");
        filtersPanel.classList.remove("hidden");
        originalImage = null;
    });

    // ===============================
    // SAVE FOTO (KIRIM KE LARAVEL)
    // ===============================
    document.getElementById("save-button").addEventListener("click", () => {
        
        let image = canvas.toDataURL("image/png");
        
        // Ambil token keamanan CSRF dari file blade
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

        fetch('/simpan-foto', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": csrfToken // WAJIB ADA
            },
            body: JSON.stringify({
                image: image
            })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                // Redirect otomatis ke gallery setelah berhasil disimpan
                window.location.href = '/gallery'; 
            } else {
                alert("Gagal menyimpan foto: " + data.message);
            }
        })
        .catch(err => {
            console.log(err);
            alert("Error terjadi saat menyimpan foto ke server.");
        });
    });

    // ==========================================
    // PILIH FILTER AI (FROG, CAT, DLL)
    // ==========================================
    document.querySelectorAll("[data-filter]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            window.aiFilter = btn.dataset.filter;
            console.log("Filter:", window.aiFilter);
        });
    });

});