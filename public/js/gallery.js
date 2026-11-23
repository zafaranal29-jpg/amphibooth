// ======================================================
// AMPHIBOOTH - GALLERY (STRIP) 
// ------------------------------------------------------
// - Satu kartu = satu lembar strip (bukan per foto).
// - Aksi: love, download, copy link share, hapus.
// - Semua URL dari #app-config (aman untuk subfolder).
// ======================================================
(function () {
    'use strict';

    const appConfig = JSON.parse(document.getElementById('app-config').textContent);
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

    document.addEventListener('DOMContentLoaded', function () {
        const grid = document.getElementById('gallery-grid');
        const loadingMsg = document.getElementById('loading-msg');
        const emptyState = document.getElementById('empty-state');
        const emptyMsg = document.getElementById('empty-msg');
        const loadMoreWrap = document.getElementById('load-more-wrap');
        const loadMoreBtn = document.getElementById('load-more');
        const countEl = document.getElementById('gallery-count');
        const toastEl = document.getElementById('toast');
        const filterButtons = document.querySelectorAll('[data-gallery-filter]');

        let filter = 'all';
        let page = 1;
        let lastPage = 1;
        let loading = false;
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
        // TAMPIL / SEMBUNYI (tahan walau CSS gagal dimuat)
        // ----------------------------------------------
        function show(el) {
            if (!el) {
                return;
            }

            el.classList.remove('hidden');
            el.hidden = false;
            el.style.display = '';
        }

        function hide(el) {
            if (!el) {
                return;
            }

            el.classList.add('hidden');
            el.hidden = true;
            el.style.display = 'none';
        }

        // ----------------------------------------------
        // URL DINAMIS
        // ----------------------------------------------
        function urlFor(template, id) {
            return template.replace('__ID__', String(id));
        }

        function collagesUrl(targetPage) {
            const url = new URL(appConfig.collagesIndex, window.location.origin);
            url.searchParams.set('page', targetPage);

            if (filter === 'loved') {
                url.searchParams.set('filter', 'loved');
            }

            return url.toString();
        }

        // ----------------------------------------------
        // KARTU STRIP
        // ----------------------------------------------
        function buildCard(collage) {
            const card = document.createElement('article');
            card.className = 'strip-card';
            card.dataset.collageId = collage.id;

            const thumbLink = document.createElement('a');
            thumbLink.className = 'strip-thumb';
            thumbLink.href = collage.url;
            thumbLink.target = '_blank';
            thumbLink.rel = 'noopener';

            if (collage.missing) {
                // Filenya udah nggak ada di disk: jangan bikin <img> rusak,
                // ganti notepad kecil biar kartunya tetap masuk akal.
                card.classList.add('is-missing');
                const note = document.createElement('p');
                note.className = 'missing-thumb';
                note.innerHTML = '😢<br><span>filenya nggak ada</span>';
                thumbLink.appendChild(note);
            } else {
                const image = document.createElement('img');
                // thumb_url = versi kecil (~30 KB) buat kartu; klik tetap buka lembar penuh.
                image.src = collage.thumb_url || collage.url;
                image.alt = 'Strip Amphibooth ' + collage.layout_label;
                image.loading = 'lazy';
                thumbLink.appendChild(image);
            }

            const badge = document.createElement('span');
            badge.className = 'layout-badge';
            badge.textContent = collage.layout_label;
            thumbLink.appendChild(badge);

            card.appendChild(thumbLink);

            const body = document.createElement('div');
            body.className = 'card-body';

            const meta = document.createElement('div');
            meta.className = 'card-meta';

            const date = document.createElement('span');
            date.textContent = collage.date_label || '';
            meta.appendChild(date);

            const count = document.createElement('span');
            count.textContent = collage.shots > 1 ? collage.shots + ' foto' : '1 foto';
            meta.appendChild(count);

            body.appendChild(meta);

            if (collage.caption) {
                const caption = document.createElement('p');
                caption.className = 'card-caption';
                caption.textContent = collage.caption;
                body.appendChild(caption);
            }

            card.appendChild(body);

            const actions = document.createElement('div');
            actions.className = 'card-actions';

            // Love
            const loveButton = document.createElement('button');
            loveButton.type = 'button';
            loveButton.className = 'btn-action btn-love' + (collage.is_loved ? ' active' : '');
            loveButton.dataset.collageId = collage.id;
            loveButton.setAttribute('aria-label', 'Suka strip ini');
            loveButton.setAttribute('aria-pressed', collage.is_loved ? 'true' : 'false');
            loveButton.innerHTML = '<i class="' + (collage.is_loved ? 'fa-solid' : 'fa-regular') + ' fa-heart"></i>';
            actions.appendChild(loveButton);

            // Download
            const downloadLink = document.createElement('a');
            downloadLink.className = 'btn-action btn-download';
            downloadLink.href = collage.download_url;
            downloadLink.setAttribute('download', collage.download_name || 'amphibooth-strip.jpg');
            downloadLink.setAttribute('aria-label', 'Unduh strip ini');
            downloadLink.title = 'Download';
            downloadLink.innerHTML = '<i class="fa-solid fa-download"></i>';

            if (collage.missing) {
                // File-nya udah nggak ada, jadi unduh/bagikan dimatiin —
                // kalau dibiarkan cuma ngasih 404.
                downloadLink.classList.add('is-disabled');
                downloadLink.removeAttribute('href');
                downloadLink.title = 'Filenya udah nggak ada di server';
                downloadLink.setAttribute('aria-disabled', 'true');
            }

            actions.appendChild(downloadLink);

            // Share
            if (!collage.missing) {
                const shareButton = document.createElement('button');
                shareButton.type = 'button';
                shareButton.className = 'btn-action btn-share';
                shareButton.dataset.shareUrl = collage.share_url;
                shareButton.setAttribute('aria-label', 'Salin link share');
                shareButton.title = 'Bagikan';
                shareButton.innerHTML = '<i class="fa-solid fa-link"></i>';
                actions.appendChild(shareButton);
            }

            // Hapus
            const trashButton = document.createElement('button');
            trashButton.type = 'button';
            trashButton.className = 'btn-action btn-trash';
            trashButton.dataset.collageId = collage.id;
            trashButton.setAttribute('aria-label', 'Hapus strip ini');
            trashButton.title = 'Hapus';
            trashButton.innerHTML = '<i class="fa-solid fa-trash"></i>';
            actions.appendChild(trashButton);

            card.appendChild(actions);

            return card;
        }

        // ----------------------------------------------
        // LOVE
        // ----------------------------------------------
        async function toggleLove(button) {
            const id = button.dataset.collageId;
            button.disabled = true;

            try {
                const response = await fetch(urlFor(appConfig.collagesLove, id), {
                    method: 'PATCH',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken
                    }
                });

                const data = await response.json().catch(function () {
                    return {};
                });

                if (!response.ok || !data.success) {
                    toast(data.message || 'Gagal menyimpan love 🥺', true);
                    return;
                }

                button.classList.toggle('active', data.is_loved);
                button.setAttribute('aria-pressed', data.is_loved ? 'true' : 'false');
                button.innerHTML = '<i class="' + (data.is_loved ? 'fa-solid' : 'fa-regular') + ' fa-heart"></i>';

                if (window.AmphiboothAnim) {
                    window.AmphiboothAnim.heart(button);
                }

                toast(data.is_loved ? 'Ditandai sayang 💖' : 'Love-nya dilepas 🥺');

                if (filter === 'loved' && !data.is_loved) {
                    const card = button.closest('.strip-card');
                    if (card) {
                        if (window.AmphiboothAnim) {
                            await window.AmphiboothAnim.collapse(card);
                        }
                        card.remove();
                        updateCount();
                        showEmptyIfNeeded();
                    }
                }
            } catch (error) {
                console.log(error);
                toast('Koneksi ke server gagal, coba lagi ya 🥺', true);
            } finally {
                button.disabled = false;
            }
        }

        // ----------------------------------------------
        // SHARE (copy link)
        // ----------------------------------------------
        async function shareStrip(button) {
            const url = button.dataset.shareUrl;

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                    toast('Link share disalin! Tempel di chat 💌');
                    return;
                }

                window.prompt('Salin link ini buat dibagikan:', url);
            } catch (error) {
                console.log(error);
                window.prompt('Salin link ini buat dibagikan:', url);
            }
        }

        // ----------------------------------------------
        // HAPUS
        // ----------------------------------------------
        async function deleteCollage(button) {
            const id = button.dataset.collageId;

            if (!window.confirm('Hapus strip ini? Gak bisa dibalikin lho 🥺')) {
                return;
            }

            button.disabled = true;

            try {
                const response = await fetch(urlFor(appConfig.collagesDestroy, id), {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken
                    }
                });

                const data = await response.json().catch(function () {
                    return {};
                });

                if (!response.ok || !data.success) {
                    toast(data.message || 'Gagal menghapus strip 🥺', true);
                    button.disabled = false;
                    return;
                }

                const card = button.closest('.strip-card');
                if (card) {
                    if (window.AmphiboothAnim) {
                        await window.AmphiboothAnim.collapse(card);
                    }
                    card.remove();
                }

                toast(data.message || 'Strip-nya sudah dihapus 🥺');
                updateCount();
                showEmptyIfNeeded();
            } catch (error) {
                console.log(error);
                toast('Koneksi ke server gagal, coba lagi ya 🥺', true);
                button.disabled = false;
            }
        }

        // Satu listener untuk semua tombol di grid.
        grid.addEventListener('click', function (event) {
            const loveButton = event.target.closest('.btn-love');
            if (loveButton) {
                toggleLove(loveButton);
                return;
            }

            const shareButton = event.target.closest('.btn-share');
            if (shareButton) {
                shareStrip(shareButton);
                return;
            }

            const trashButton = event.target.closest('.btn-trash');
            if (trashButton) {
                deleteCollage(trashButton);
            }
        });

        // ----------------------------------------------
        // HITUNG & EMPTY STATE
        // ----------------------------------------------
        function updateCount() {
            const shown = grid.querySelectorAll('.strip-card').length;

            if (countEl) {
                countEl.textContent = shown > 0 ? 'Menampilkan ' + shown + ' strip' : '';
            }
        }

        function showEmptyIfNeeded() {
            if (grid.querySelectorAll('.strip-card').length > 0) {
                hide(emptyState);
                return;
            }

            show(emptyState);
            hide(loadMoreWrap);

            if (emptyMsg) {
                emptyMsg.textContent = filter === 'loved'
                    ? 'Belum ada strip yang kamu love nih 🥺'
                    : 'Yhaaa, belum ada strip nih 🥺';
            }
        }

        // ----------------------------------------------
        // MUAT DATA
        // ----------------------------------------------
        async function loadCollages(reset) {
            if (loading) {
                return;
            }

            loading = true;

            if (reset) {
                page = 1;
                grid.innerHTML = '';
                hide(emptyState);
                hide(loadMoreWrap);
                show(loadingMsg);
                loadingMsg.textContent = 'Mencari strip-strip lucumu... 🔍';

                // Skeleton berkilau biar nggak kosong melompong pas memuat.
                if (window.AmphiboothAnim) {
                    window.AmphiboothAnim.showSkeletons(grid, 6);
                }
            }

            if (loadMoreBtn) {
                loadMoreBtn.disabled = true;
                loadMoreBtn.textContent = 'Memuat... 💫';
            }

            try {
                const response = await fetch(collagesUrl(page), {
                    headers: { 'Accept': 'application/json' }
                });

                if (response.status === 401) {
                    window.location.href = appConfig.loginUrl || window.location.href;
                    return;
                }

                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }

                const payload = await response.json();
                const collages = payload.data || [];

                if (window.AmphiboothAnim) {
                    window.AmphiboothAnim.clearSkeletons(grid);
                }

                const newCards = [];

                collages.forEach(function (collage) {
                    const card = buildCard(collage);

                    if (window.AmphiboothAnim) {
                        window.AmphiboothAnim.prepareCard(card);
                    }

                    grid.appendChild(card);
                    newCards.push(card);
                });

                if (window.AmphiboothAnim) {
                    window.AmphiboothAnim.enterCards(newCards);
                }

                lastPage = (payload.meta && payload.meta.last_page) || 1;

                updateCount();
                showEmptyIfNeeded();

                if (page < lastPage) {
                    show(loadMoreWrap);
                } else {
                    hide(loadMoreWrap);
                }
            } catch (error) {
                console.log(error);
                toast('Gagal memuat strip, coba refresh ya 🥺', true);

                if (reset) {
                    loadingMsg.textContent = 'Gagal memuat strip 😢 coba refresh halaman ini.';
                }
            } finally {
                hide(loadingMsg);
                loading = false;

                if (loadMoreBtn) {
                    loadMoreBtn.disabled = false;
                    loadMoreBtn.textContent = 'Muat strip lainnya 💫';
                }
            }
        }

        // ----------------------------------------------
        // FILTER ALL / LOVED
        // ----------------------------------------------
        filterButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                if (loading) {
                    return;
                }

                filterButtons.forEach(function (other) {
                    other.classList.remove('is-active');
                });
                button.classList.add('is-active');

                filter = button.dataset.galleryFilter === 'loved' ? 'loved' : 'all';
                loadCollages(true);
            });
        });

        // ----------------------------------------------
        // LOAD MORE
        // ----------------------------------------------
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', function () {
                if (loading || page >= lastPage) {
                    return;
                }

                page += 1;
                loadCollages(false);
            });
        }

        loadCollages(true);
    });
})();