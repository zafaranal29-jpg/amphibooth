// ==========================================================================
// AMPHIBOOTH - GALLERY JAVASCRIPT (VERSI LARAVEL)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    
    // Fungsi cek_sesi dan logout dihapus dari sini karena di Laravel 
    // semuanya udah otomatis diatur dari sisi Blade dan Controller!
    loadGallery();

    function loadGallery() {
        const galleryGrid = document.getElementById("gallery-grid");
        const loadingMsg = document.getElementById("loading-msg");
        const emptyState = document.getElementById("empty-state");

        // ✅ REVISI 1: Ubah jalur fetch ke Route Laravel yang udah kita bikin
        fetch("/get-photos")
            .then(response => response.json())
            .then(res => {
                loadingMsg.style.display = "none";
                if (res.status === "sukses" && res.data.length > 0) {
                    res.data.forEach(photo => {
                        const card = document.createElement("div");
                        card.className = "photo-card";
                        
                        const isLoved = photo.is_loved == 1 ? "active" : "";

                        // ✅ REVISI 2: Arahkan gambar ke folder public/images/photos/
                        card.innerHTML = `
                            <img src="/images/photos/${photo.nama_file}" alt="Foto Imutku">
                            <div class="card-actions">
                                <button class="btn-action btn-love ${isLoved}" onclick="toggleLove(this, ${photo.id})">
                                    <i class="fa-solid fa-heart"></i>
                                </button>
                                <button class="btn-action btn-trash" onclick="deletePhoto(${photo.id}, this)">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        `;
                        galleryGrid.appendChild(card);
                    });
                } else {
                    emptyState.classList.remove("hidden");
                }
            })
            .catch(error => {
                loadingMsg.innerText = "Duh, gagal memuat foto nih 🥺";
                console.error(error);
            });
    }
});

// ✅ REVISI 3: Siapkan fungsi Love dengan Token CSRF
window.toggleLove = (btn, photoId) => {
    btn.classList.toggle("active");
    const isLoved = btn.classList.contains("active") ? 1 : 0;
    
    // Ambil token keamanan CSRF
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    
    fetch("/update-love", { 
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrfToken // WAJIB ADA DI LARAVEL
        },
        body: JSON.stringify({ id: photoId, loved: isLoved })
    }).catch(err => console.error("Gagal update love:", err));
};

window.deletePhoto = (id, btn) => {
    if (confirm("Yakin mau hapus foto imut ini? 🥺")) {
        btn.closest(".photo-card").remove();
        // Nanti kita bisa buatin fungsi hapus beneran ke database juga!
    }
};

window.filterGallery = (filterType) => {
    const cards = document.querySelectorAll('.photo-card');
    cards.forEach(card => {
        const isLoved = card.querySelector('.btn-love').classList.contains('active');
        card.style.display = (filterType === 'loved' && !isLoved) ? 'none' : 'block';
    });
};