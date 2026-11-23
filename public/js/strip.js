// ======================================================
// AMPHIBOOTH - STRIP RENDERER v2 (15 PRESET FRAME)
// ------------------------------------------------------
// Semua penggambaran lembar hasil (strip 3 foto) ada di sini:
// geometri, ornamen vektor, tipografi, dan efek foto.
//
// Tiap preset punya hook sendiri:
//   drawBg      -> latar + border (dipanggil paling awal)
//   drawHeader  -> teks/art di area atas
//   drawOrn     -> ornamen kecil di antara sel & footer
//   drawFooter  -> art + teks footer (kalau ada, teks generik dilewati)
//
// Semua koordinat pakai satuan "logis": 1 sel = 640x480. Opsi `scale`
// (dipakai hiRes & thumbnail) cuma mengalikan lewat ctx.scale, jadi
// semua gambar tetap proporsional tanpa ubah satu pun angka.
// ======================================================
(function () {
    'use strict';

    const CELL = { w: 640, h: 480 };

    // Skala export: 1.5x dari ukuran layar → cukup buat cetak 300 dpi.
    const EXPORT_SCALE = 1.5;

    const FONT = {
        sans: 'Fredoka, Quicksand, sans-serif',
        script: 'Caveat, "Comic Sans MS", cursive',
        serif: 'Georgia, "Times New Roman", serif',
        mono: 'Consolas, "Courier New", monospace'
    };

    const EFFECTS = {
        none: 'none',
        grayscale: 'grayscale(1)',
        sepia: 'sepia(0.85)',
        invert: 'invert(1)',
        blur: 'blur(5px)',
        warm: 'saturate(1.2) contrast(1.05) brightness(1.03)'
    };

    // ----------------------------------------------
    // UTIL DASAR
    // ----------------------------------------------
    function roundRect(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    // Cover-crop: gambar menutup seluruh sel tanpa gepeng.
    function drawCover(ctx, source, x, y, w, h) {
        const sw = source.width || 0;
        const sh = source.height || 0;

        if (!sw || !sh) {
            return;
        }

        const scale = Math.max(w / sw, h / sh);

        ctx.drawImage(
            source,
            x + (w - sw * scale) / 2,
            y + (h - sh * scale) / 2,
            sw * scale,
            sh * scale
        );
    }

    function seeded(seed) {
        let value = seed || 7;

        return function () {
            value = (value * 1103515245 + 12345) % 2147483648;
            return value / 2147483648;
        };
    }

    function gradient(ctx, x0, y0, x1, y1, stops) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        stops.forEach(function (stop) {
            g.addColorStop(stop[0], stop[1]);
        });
        return g;
    }

    // ----------------------------------------------
    // ORNAMEN VEKTOR
    // ----------------------------------------------
    function heart(ctx, x, y, size, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.3);
        ctx.bezierCurveTo(x, y - size * 0.1, x - size * 0.5, y - size * 0.1, x - size * 0.5, y + size * 0.3);
        ctx.bezierCurveTo(x - size * 0.5, y + size * 0.65, x, y + size * 0.85, x, y + size);
        ctx.bezierCurveTo(x, y + size * 0.85, x + size * 0.5, y + size * 0.65, x + size * 0.5, y + size * 0.3);
        ctx.bezierCurveTo(x + size * 0.5, y - size * 0.1, x, y - size * 0.1, x, y + size * 0.3);
        ctx.fill();
        ctx.restore();
    }

    function star(ctx, x, y, size, color, points) {
        const spikes = points || 5;
        const inner = size * 0.45;

        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();

        for (let i = 0; i < spikes * 2; i += 1) {
            const radius = i % 2 === 0 ? size : inner;
            const angle = (Math.PI / spikes) * i - Math.PI / 2;

            if (i === 0) {
                ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
            } else {
                ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
            }
        }

        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function sparkle4(ctx, x, y, r, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y);
        ctx.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
        ctx.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y);
        ctx.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r);
        ctx.fill();
        ctx.restore();
    }

    function barcode(ctx, x, y, w, h, color, seed) {
        const rand = seeded(seed || 11);
        let cursor = x;

        ctx.save();
        ctx.fillStyle = color;

        while (cursor < x + w) {
            const bar = 1 + Math.floor(rand() * 3);
            const gap = 1 + Math.floor(rand() * 3);
            ctx.fillRect(cursor, y, bar, h);
            cursor += bar + gap;
        }

        ctx.restore();
    }

    function dashedLine(ctx, x1, y1, x2, y2, color, dash, gap, width) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width || 2;
        ctx.setLineDash([dash || 10, gap || 8]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    }

    function sunburst(ctx, cx, cy, radius, rays, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha === undefined ? 0.18 : alpha;
        ctx.fillStyle = color;

        for (let i = 0; i < rays; i += 1) {
            const from = (Math.PI * 2 / rays) * i;
            const to = from + Math.PI / rays;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, from, to);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    function sprockets(ctx, x, fromY, toY, color, w, h, step) {
        const width = w || 22;
        const height = h || 26;

        ctx.save();
        ctx.fillStyle = color;

        for (let y = fromY; y < toY - height; y += step || 44) {
            roundRect(ctx, x, y, width, height, 6);
            ctx.fill();
        }

        ctx.restore();
    }

    function checkerBorder(ctx, geo, thickness, box, dark) {
        ctx.save();
        ctx.fillStyle = dark;

        for (let y = 0; y < geo.height; y += box) {
            for (let x = 0; x < geo.width; x += box) {
                const onEdge = x < thickness
                    || x + box > geo.width - thickness
                    || y < thickness
                    || y + box > geo.height - thickness;

                if (!onEdge) {
                    continue;
                }

                const even = (Math.floor(x / box) + Math.floor(y / box)) % 2 === 0;

                if (even) {
                    ctx.fillRect(x, y, box, box);
                }
            }
        }

        ctx.restore();
    }

    function stripes(ctx, x, y, w, h, colorA, colorB, step) {
        ctx.save();
        ctx.fillStyle = colorB;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = colorA;

        for (let cursor = x; cursor < x + w; cursor += step * 2) {
            ctx.fillRect(cursor, y, step, h);
        }

        ctx.restore();
    }

    function gingham(ctx, x, y, w, h, color, step, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha === undefined ? 0.28 : alpha;
        ctx.fillStyle = color;

        for (let cursor = x; cursor < x + w; cursor += step) {
            ctx.fillRect(cursor, y, step / 2, h);
        }

        ctx.fillStyle = color;

        for (let cursor = y; cursor < y + h; cursor += step) {
            ctx.fillRect(x, cursor, w, step / 2);
        }

        ctx.restore();
    }

    function scallopEdge(ctx, geo, inset, radius, color) {
        ctx.save();
        ctx.fillStyle = color;

        for (let x = inset + radius; x < geo.width - inset - radius; x += radius * 1.55) {
            ctx.beginPath();
            ctx.arc(x, inset, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, geo.height - inset, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let y = inset + radius; y < geo.height - inset - radius; y += radius * 1.55) {
            ctx.beginPath();
            ctx.arc(inset, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(geo.width - inset, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    function rose(ctx, x, y, size, petal, dark) {
        ctx.save();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = petal;

        for (let i = 0; i < 6; i += 1) {
            const angle = (Math.PI * 2 / 6) * i;
            ctx.beginPath();
            ctx.ellipse(x + Math.cos(angle) * size * 0.42, y + Math.sin(angle) * size * 0.42, size * 0.55, size * 0.42, angle, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function leaf(ctx, x, y, size, angle, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function floralCorner(ctx, x, y, scale, palette) {
        const dir = x > 0 ? 1 : -1;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(dir * scale, scale);

        leaf(ctx, 34, 18, 20, 0.5, palette.leafDark);
        leaf(ctx, 18, 34, 18, 0.9, palette.leaf);
        leaf(ctx, 46, 40, 15, 0.2, palette.leaf);
        rose(ctx, 10, 10, 13, palette.petal, palette.petalDark);
        rose(ctx, 40, 26, 9, palette.petal, palette.petalDark);

        ctx.fillStyle = palette.dot;

        for (let i = 0; i < 10; i += 1) {
            const angle = i * 1.9;
            const dist = 48 + (i % 4) * 9;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 2.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    function bow(ctx, x, y, size, color, dark) {
        ctx.save();
        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x - size, y - size * 0.75, x - size * 1.35, y + size * 0.55, x, y + size * 0.15);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + size, y - size * 0.75, x + size * 1.35, y + size * 0.55, x, y + size * 0.15);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = dark;
        ctx.fillRect(x - size * 0.2, y - size * 0.15, size * 0.4, size * 0.4);
        ctx.restore();
    }

    function ghost(ctx, x, y, size, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, Math.PI, 0);
        ctx.lineTo(x + size * 0.5, y + size * 0.75);
        ctx.quadraticCurveTo(x + size * 0.25, y + size * 0.55, x, y + size * 0.78);
        ctx.quadraticCurveTo(x - size * 0.25, y + size * 1.0, x - size * 0.5, y + size * 0.75);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#2E1A47';
        ctx.beginPath();
        ctx.arc(x - size * 0.17, y - size * 0.05, size * 0.09, 0, Math.PI * 2);
        ctx.arc(x + size * 0.17, y - size * 0.05, size * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function pumpkin(ctx, x, y, size, color, stem) {
        ctx.save();
        ctx.fillStyle = stem || '#4C6B2F';
        ctx.fillRect(x - size * 0.06, y - size * 0.62, size * 0.12, size * 0.26);

        ctx.fillStyle = color;

        for (let i = -1; i <= 1; i += 1) {
            ctx.beginPath();
            ctx.ellipse(x + i * size * 0.22, y, size * 0.42, size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#3A1E14';
        ctx.beginPath();
        ctx.moveTo(x - size * 0.22, y - size * 0.05);
        ctx.lineTo(x - size * 0.08, y - size * 0.05);
        ctx.lineTo(x - size * 0.15, y + size * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + size * 0.22, y - size * 0.05);
        ctx.lineTo(x + size * 0.08, y - size * 0.05);
        ctx.lineTo(x + size * 0.15, y + size * 0.1);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    function bat(ctx, x, y, size, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.25);
        ctx.quadraticCurveTo(x - size * 0.6, y - size * 0.5, x - size, y + size * 0.1);
        ctx.quadraticCurveTo(x - size * 0.55, y + size * 0.05, x - size * 0.35, y + size * 0.45);
        ctx.quadraticCurveTo(x - size * 0.15, y + size * 0.2, x, y + size * 0.6);
        ctx.quadraticCurveTo(x + size * 0.15, y + size * 0.2, x + size * 0.35, y + size * 0.45);
        ctx.quadraticCurveTo(x + size * 0.55, y + size * 0.05, x + size, y + size * 0.1);
        ctx.quadraticCurveTo(x + size * 0.6, y - size * 0.5, x, y + size * 0.25);
        ctx.fill();
        ctx.restore();
    }

    function palm(ctx, x, y, size, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 0.09;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + size * 0.18, y - size * 0.55, x + size * 0.05, y - size);
        ctx.stroke();

        ctx.fillStyle = color;

        for (let i = 0; i < 6; i += 1) {
            const angle = -Math.PI / 2 + (i - 2.5) * 0.5;
            const len = size * (0.55 + (i % 3) * 0.12);
            ctx.save();
            ctx.translate(x + size * 0.05, y - size);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.ellipse(len * 0.55, 0, len * 0.55, size * 0.11, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    function arcText(ctx, text, cx, cy, radius, font, color) {
        ctx.save();
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const chars = text.split('');
        const step = 0.11;

        chars.forEach(function (char, index) {
            const angle = -Math.PI / 2 + (index - (chars.length - 1) / 2) * step;
            ctx.save();
            ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
            ctx.rotate(angle + Math.PI / 2);
            ctx.fillText(char, 0, 0);
            ctx.restore();
        });

        ctx.restore();
    }

    function paperNoise(ctx, geo, color, alpha, seed) {
        const rand = seeded(seed || 3);
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha || 0.06;

        for (let i = 0; i < 900; i += 1) {
            ctx.fillRect(rand() * geo.width, rand() * geo.height, 1.4, 1.4);
        }

        ctx.restore();
    }

    // ----------------------------------------------
    // TEKS
    // ----------------------------------------------
    function wrapLines(ctx, text, maxWidth, maxLines) {
        const words = String(text).split(/\s+/).filter(Boolean);
        const lines = [];
        let current = '';

        words.forEach(function (word) {
            const candidate = current ? current + ' ' + word : word;

            if (ctx.measureText(candidate).width <= maxWidth || !current) {
                current = candidate;
                return;
            }

            lines.push(current);
            current = word;
        });

        if (current) {
            lines.push(current);
        }

        const limited = lines.slice(0, maxLines);

        if (limited.length) {
            const last = limited[limited.length - 1];

            if (ctx.measureText(last).width > maxWidth) {
                let cut = last;

                while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) {
                    cut = cut.slice(0, -1);
                }

                limited[limited.length - 1] = cut.trimEnd() + '…';
            }
        }

        return limited;
    }

    function formatDate(date) {
        try {
            return new Intl.DateTimeFormat('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).format(date || new Date());
        } catch (error) {
            return '';
        }
    }

    // Watermark khusus mode demo: satu label miring di tiap foto + satu baris
    // ajakan di tepi bawah. Ditulis ganda (gelap + terang) supaya tetap kebaca
    // di atas frame terang maupun gelap.
    function drawWatermark(ctx, geo, preset) {
        const label = 'AMPHIBOOTH DEMO';
        const labelSize = Math.round(geo.cellW * 0.072);

        for (let i = 0; i < geo.cells; i += 1) {
            const cx = geo.cellX + geo.cellW / 2;
            const cy = preset.padTop + i * (geo.cellH + preset.gap) + geo.cellH / 2;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-Math.PI / 9);
            ctx.font = '700 ' + labelSize + 'px ' + FONT.sans;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(0,0,0,0.30)';
            ctx.fillText(label, 2, 2);
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillText(label, 0, 0);
            ctx.restore();
        }

        const line = 'dibuat gratis di amphibooth · daftar biar tanpa watermark';

        ctx.save();
        ctx.font = '600 19px ' + FONT.sans;

        // Pita gelap transparan di tepi bawah: jaminan kebaca di frame terang
        // maupun gelap (teks putih di atas latar apa pun gampang tenggelam).
        const textW = ctx.measureText(line).width + 30;
        const bandH = 31;
        const bandY = geo.height - bandH - 5;

        roundRect(ctx, (geo.width - textW) / 2, bandY, textW, bandH, bandH / 2);
        ctx.fillStyle = 'rgba(38,14,26,0.66)';
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(line, geo.width / 2, bandY + bandH / 2 + 1);
        ctx.restore();
    }

    // Shadow tipis di belakang teks, dipakai preset yang latarnya ramai
    // (gradien/tema gelap) supaya caption tetap kebaca.
    function withGlow(ctx, preset, draw) {
        if (!preset.textGlow) {
            draw();
            return;
        }

        ctx.save();
        ctx.shadowColor = preset.textGlow;
        ctx.shadowBlur = 9;
        ctx.shadowOffsetY = 1;
        draw();
        ctx.restore();
    }

    function footerText(ctx, geo, preset, opts) {
        if (!preset.footer) {
            return;
        }

        const caption = (opts.caption || '').trim();
        const stamp = opts.dateStamp ? formatDate(opts.date) + ' · Amphibooth' : '';

        if (!caption && !stamp) {
            return;
        }

        const centerX = geo.width / 2;
        const family = FONT[preset.font || 'sans'];
        const captionSize = preset.captionSize || 30;
        const stampSize = preset.stampSize || 22;
        const maxWidth = geo.width - preset.padX * 2 - 30;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let lines = [];

        if (caption) {
            ctx.font = '600 ' + captionSize + 'px ' + family;
            lines = wrapLines(ctx, caption, maxWidth, 2);
        }

        const lineGap = captionSize * 1.15;
        const captionBlock = lines.length ? (lines.length - 1) * lineGap + captionSize : 0;
        const gapAfter = lines.length && stamp ? captionSize * 0.5 : 0;
        const total = captionBlock + (stamp ? gapAfter + stampSize : 0);

        let cursor = geo.footerTop + Math.max(4, (preset.footer - total) / 2);

        if (lines.length) {
            ctx.fillStyle = preset.ink;
            ctx.font = '600 ' + captionSize + 'px ' + family;

            withGlow(ctx, preset, function () {
                lines.forEach(function (line, index) {
                    ctx.fillText(line, centerX, cursor + captionSize / 2 + index * lineGap);
                });
            });

            cursor += captionBlock + gapAfter;
        }

        if (stamp) {
            ctx.fillStyle = preset.mute;
            ctx.font = '600 ' + stampSize + 'px ' + (preset.font === 'script' ? FONT.script : FONT.sans);

            withGlow(ctx, preset, function () {
                ctx.fillText(stamp, centerX, cursor + stampSize / 2);
            });
        }

        ctx.restore();
    }

    // ----------------------------------------------
    // PRESET
    // ----------------------------------------------
    const PRESETS = {
        // ---------- KLASIK ----------
        polaroid: {
            label: 'Polaroid',
            bg: '#fffdf6',
            ink: '#3d3229',
            mute: '#a2948a',
            padX: 30,
            padTop: 30,
            gap: 14,
            footer: 168,
            radius: 10,
            cellBorder: '#ece3d6',
            font: 'script',
            captionSize: 46,
            stampSize: 26,
            drawBg: function (ctx, geo, p) {
                ctx.save();
                const shade = gradient(ctx, 0, geo.footerTop, 0, geo.height, [
                    [0, 'rgba(0,0,0,0)'],
                    [1, 'rgba(0,0,0,0.045)']
                ]);
                ctx.fillStyle = shade;
                ctx.fillRect(0, geo.footerTop, geo.width, geo.height - geo.footerTop);
                ctx.restore();
            },
            drawOrn: function (ctx, geo, p) {
                const top = geo.footerTop;
                heart(ctx, geo.width - 52, top + 26, 22, '#ffb3c7');
                star(ctx, 46, top + 34, 11, '#ffd6a5', 5);
                star(ctx, 68, top + 20, 7, '#ffd6a5', 5);
            }
        },

        film: {
            label: 'Film Strip',
            bg: '#17130f',
            ink: '#f6efe2',
            mute: '#c9a26b',
            padX: 56,
            padTop: 32,
            gap: 10,
            footer: 96,
            radius: 2,
            cellBorder: '#2f2924',
            font: 'sans',
            captionSize: 28,
            stampSize: 20,
            drawBg: function (ctx, geo, p) {
                sprockets(ctx, 14, p.padTop, geo.height - p.footer, '#f7f1e6', 26, 28, 46);
                sprockets(ctx, geo.width - 40, p.padTop, geo.height - p.footer, '#f7f1e6', 26, 28, 46);
            }
        },

        scallop: {
            label: 'Scallop',
            bg: '#ffe4ef',
            ink: '#7a3f57',
            mute: '#ad7289',
            padX: 38,
            padTop: 40,
            gap: 16,
            footer: 130,
            radius: 12,
            cellBorder: '#ffffff',
            font: 'sans',
            drawBg: function (ctx, geo, p) {
                ctx.fillStyle = '#fffaf8';
                ctx.fillRect(0, 0, geo.width, geo.height);
                ctx.fillStyle = p.bg;
                roundRect(ctx, 16, 16, geo.width - 32, geo.height - 32, 18);
                ctx.fill();
                scallopEdge(ctx, geo, 16, 15, p.bg);
            },
            drawOrn: function (ctx, geo, p) {
                const top = geo.footerTop;
                const colors = ['#ff9ec4', '#ffd166', '#9ad0c2', '#b8a4e3'];
                const rand = seeded(9);

                // Konfeti hanya di pita atas & bawah area teks, biar tidak
                // menimpa caption yang ada di tengah.
                const bands = [
                    [top + 6, top + 24],
                    [top + p.footer - 22, top + p.footer - 6]
                ];

                bands.forEach(function (band) {
                    for (let i = 0; i < 12; i += 1) {
                        ctx.save();
                        ctx.fillStyle = colors[i % colors.length];
                        ctx.beginPath();
                        ctx.arc(40 + rand() * (geo.width - 80), band[0] + rand() * (band[1] - band[0]), 3.4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                });
            }
        },

        minimal: {
            label: 'Minimalis',
            bg: '#ffffff',
            ink: '#1b1b1b',
            mute: '#8a8a8a',
            padX: 26,
            padTop: 26,
            gap: 12,
            footer: 104,
            radius: 4,
            cellBorder: '#e6e6e6',
            font: 'sans',
            drawBg: function (ctx, geo) {
                ctx.save();
                ctx.strokeStyle = '#e9e9e9';
                ctx.lineWidth = 2;
                ctx.strokeRect(12, 12, geo.width - 24, geo.height - 24);
                ctx.restore();
            }
        },

        solid: {
            label: 'Warna Solid',
            bg: '#ffb3c7',
            ink: '#4a2033',
            mute: '#6b3348',
            padX: 28,
            padTop: 28,
            gap: 14,
            footer: 112,
            radius: 10,
            cellBorder: '#ffffff',
            font: 'sans',
            drawOrn: function (ctx, geo, p) {
                const top = geo.footerTop;
                star(ctx, geo.width - 40, top + 22, 8, 'rgba(255,255,255,0.85)', 4);
                star(ctx, 38, top + 34, 6, 'rgba(255,255,255,0.6)', 4);
            }
        },

        // ---------- SOFT ROMANTIC (wedding / special day) ----------
        wedding: {
            label: 'Wedding',
            bg: '#fff9f4',
            ink: '#b08a4f',
            mute: '#a98e86',
            padX: 38,
            padTop: 92,
            gap: 18,
            footer: 176,
            radius: 8,
            cellBorder: '#f0dfcf',
            font: 'script',
            captionSize: 48,
            stampSize: 20,
            textOffset: 0.44,
            drawBg: function (ctx, geo, p) {
                paperNoise(ctx, geo, '#c9a24b', 0.05, 5);
                floralCorner(ctx, 26, 26, 1.2, {
                    petal: '#f7d3d8', petalDark: '#e2a8b2', leaf: '#a8c0a0', leafDark: '#7f9b78', dot: '#e9d5b8'
                });
                floralCorner(ctx, geo.width - 26, 26, 1.2, {
                    petal: '#f7d3d8', petalDark: '#e2a8b2', leaf: '#a8c0a0', leafDark: '#7f9b78', dot: '#e9d5b8'
                });
                floralCorner(ctx, 26, geo.height - 86, 0.8, {
                    petal: '#f7d3d8', petalDark: '#e2a8b2', leaf: '#a8c0a0', leafDark: '#7f9b78', dot: '#e9d5b8'
                });
                ctx.save();
                ctx.strokeStyle = '#e7cdb4';
                ctx.lineWidth = 2;
                roundRect(ctx, 14, 14, geo.width - 28, geo.height - 28, 10);
                ctx.stroke();
                ctx.restore();
            },
            drawHeader: function (ctx, geo, p) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#a98e86';
                ctx.font = '600 17px ' + FONT.sans;
                ctx.fillText('S P E C I A L   D A Y', geo.width / 2, 56);
                ctx.strokeStyle = '#dcc3a4';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(geo.width / 2 - 86, 72);
                ctx.lineTo(geo.width / 2 + 86, 72);
                ctx.stroke();
                ctx.restore();
            },
            drawOrn: function (ctx, geo) {
                heart(ctx, geo.width / 2, geo.height - 26, 16, '#e2a8b2');
            }
        },

        maroon: {
            label: 'Maroon Classy',
            bg: '#5b1e2d',
            ink: '#fdf3e7',
            mute: '#e3c6b0',
            padX: 32,
            padTop: 96,
            gap: 16,
            footer: 170,
            radius: 6,
            cellBorder: '#fff7ec',
            font: 'script',
            captionSize: 46,
            stampSize: 20,
            drawBg: function (ctx, geo, p) {
                ctx.save();
                ctx.strokeStyle = 'rgba(253,243,231,0.35)';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(14, 14, geo.width - 28, geo.height - 28);
                ctx.restore();
                bow(ctx, geo.width / 2, 56, 26, '#f7d3d8', '#c99aa4');
            },
            drawHeader: function (ctx, geo) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#f7d3d8';
                ctx.font = '600 18px ' + FONT.sans;
                ctx.fillText('S P E C I A L   D A Y', geo.width / 2, 80);
                ctx.restore();
            },
            drawOrn: function (ctx, geo, p) {
                const top = geo.footerTop;
                heart(ctx, 44, top + 30, 14, '#e3c6b0');
                heart(ctx, geo.width - 44, top + 30, 14, '#e3c6b0');
            },
            drawFooter: function (ctx, geo, p, opts) {
                footerText(ctx, geo, p, opts);

                // Barcode kecil di dasar strip, gaya kartu ucapan.
                ctx.save();
                ctx.globalAlpha = 0.75;
                barcode(ctx, geo.width / 2 - 70, geo.height - 26, 140, 18, '#fdf3e7', 21);
                ctx.restore();
            }
        },

        // ---------- RETRO / HOLLYWOOD ----------
        hollywood: {
            label: 'Hollywood',
            bg: '#f7f1e3',
            ink: '#17130f',
            mute: '#6b6152',
            padX: 54,
            padTop: 108,
            gap: 16,
            footer: 138,
            radius: 3,
            cellBorder: '#ffffff',
            font: 'sans',
            captionSize: 26,
            stampSize: 19,
            drawBg: function (ctx, geo, p) {
                checkerBorder(ctx, geo, 26, 22, '#17130f');
                sprockets(ctx, 18, p.padTop, geo.height - p.footer, '#17130f', 20, 24, 42);
                sprockets(ctx, geo.width - 38, p.padTop, geo.height - p.footer, '#17130f', 20, 24, 42);
            },
            drawHeader: function (ctx, geo) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#17130f';
                ctx.font = '700 34px ' + FONT.serif;
                ctx.fillText('HOLLYWOOD', geo.width / 2, 56);

                // Lampu marquee di atas & bawah tulisan.
                for (let i = 0; i < 14; i += 1) {
                    ctx.fillStyle = '#d4af37';
                    ctx.beginPath();
                    ctx.arc(geo.width / 2 - 132 + i * 20, 30, 3.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(geo.width / 2 - 132 + i * 20, 82, 3.4, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.fillStyle = '#c0392b';
                ctx.font = '600 15px ' + FONT.mono;
                ctx.fillText('ONE MORE TAKE', geo.width / 2, 96);
                ctx.restore();
            },
            drawFooter: function (ctx, geo, p, opts) {
                const top = geo.footerTop;

                // Tiket "ADMIT ONE" dengan garis perforasi.
                ctx.save();
                ctx.fillStyle = '#c0392b';
                roundRect(ctx, 30, top + 14, geo.width - 60, 46, 8);
                ctx.fill();

                dashedLine(ctx, 30 + 20, top + 60, geo.width - 30 - 20, top + 60, '#17130f', 8, 7, 2);

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#f7f1e3';
                ctx.font = '700 20px ' + FONT.mono;
                ctx.fillText('A D M I T   O N E', geo.width / 2, top + 38);

                ctx.fillStyle = '#17130f';
                ctx.font = '600 ' + (p.captionSize || 28) + 'px ' + FONT.sans;
                ctx.fillText((opts.caption || 'THANK YOU!').slice(0, 42), geo.width / 2, top + 82);

                if (opts.dateStamp) {
                    ctx.fillStyle = '#4d4438';
                    ctx.font = '600 ' + (p.stampSize || 20) + 'px ' + FONT.mono;
                    ctx.fillText(formatDate(opts.date) + ' · AMPHIBOOTH', geo.width / 2, top + 112);
                }

                star(ctx, 36, top + 96, 9, '#d4af37', 5);
                star(ctx, geo.width - 36, top + 96, 9, '#d4af37', 5);
                ctx.restore();
            }
        },

        retro: {
            label: 'Retro 70s',
            bg: '#fbf3e4',
            ink: '#6e2231',
            mute: '#8a6a52',
            padX: 34,
            padTop: 112,
            gap: 16,
            footer: 150,
            radius: 8,
            cellBorder: '#fbf3e4',
            font: 'script',
            captionSize: 44,
            stampSize: 19,
            drawBg: function (ctx, geo) {
                ctx.save();
                sunburst(ctx, geo.width / 2, 34, geo.width * 0.9, 22, '#e3b23c', 0.2);
                ctx.restore();
            },
            drawHeader: function (ctx, geo) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillStyle = '#c96b7f';
                ctx.font = '600 19px ' + FONT.sans;
                ctx.fillText('good old days', geo.width / 2, 26);

                // Blok "RETRO" dengan bayangan keras, gaya cetak 70s.
                ctx.fillStyle = '#6e2231';
                roundRect(ctx, geo.width / 2 - 78, 62, 168, 42, 10);
                ctx.fill();

                ctx.fillStyle = '#e3b23c';
                roundRect(ctx, geo.width / 2 - 86, 54, 168, 42, 10);
                ctx.fill();

                ctx.fillStyle = '#6e2231';
                ctx.font = '700 27px ' + FONT.serif;
                ctx.fillText('R E T R O', geo.width / 2 - 2, 76);
                ctx.restore();
            },
            drawOrn: function (ctx, geo, p) {
                const top = geo.footerTop;
                star(ctx, 40, top + 22, 10, '#e3b23c', 5);
                star(ctx, geo.width - 40, top + 30, 8, '#e3b23c', 5);
                sparkle4(ctx, geo.width - 70, top + 68, 8, '#c96b7f');
            }
        },

        // ---------- PASPOR / NEWSPRINT ----------
        airline: {
            label: 'Boarding Pass',
            bg: '#ffffff',
            ink: '#1b1b1b',
            mute: '#7a7a7a',
            padX: 30,
            padTop: 104,
            gap: 14,
            footer: 150,
            radius: 0,
            cellBorder: '#e8e8e8',
            font: 'mono',
            captionSize: 24,
            stampSize: 18,
            drawHeader: function (ctx, geo) {
                ctx.save();
                ctx.fillStyle = '#d62828';
                ctx.fillRect(0, 0, geo.width, 72);

                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.font = '700 20px ' + FONT.sans;
                ctx.fillText('BOARDING PASS', 28, 30);
                ctx.font = '600 13px ' + FONT.mono;
                ctx.fillText('CGK  ⇄  DPS   ·   AMPHIBOOTH AIR', 28, 52);

                ctx.textAlign = 'right';
                ctx.font = '700 15px ' + FONT.mono;
                ctx.fillText('SEAT 3A', geo.width - 28, 30);
                ctx.font = '600 13px ' + FONT.mono;
                ctx.fillText('GATE 07', geo.width - 28, 52);

                dashedLine(ctx, 20, 86, geo.width - 20, 86, '#c9c9c9', 9, 7, 2);
                ctx.restore();
            },
            drawFooter: function (ctx, geo, p, opts) {
                const top = geo.footerTop;

                dashedLine(ctx, 20, top, geo.width - 20, top, '#c9c9c9', 9, 7, 2);

                ctx.save();
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'left';
                ctx.fillStyle = '#5a5a5a';
                ctx.font = '600 15px ' + FONT.mono;
                ctx.fillText('PASSENGER', 28, top + 26);
                ctx.fillText('CLASS', 28, top + 56);
                ctx.fillText('ETD', 28, top + 86);

                ctx.fillStyle = '#1b1b1b';
                ctx.font = '700 18px ' + FONT.mono;
                const name = (opts.caption || 'CUTE PASSENGER').toUpperCase();
                ctx.fillText(wrapLines(ctx, name, 360, 1)[0] || 'CUTE PASSENGER', 150, top + 26);
                ctx.fillText('CUTE', 150, top + 56);
                ctx.fillText('NOW', 150, top + 86);

                ctx.textAlign = 'right';
                ctx.fillStyle = '#4f4f4f';
                ctx.font = '600 ' + (p.stampSize || 20) + 'px ' + FONT.mono;
                ctx.fillText(formatDate(opts.date), geo.width - 28, top + 26);

                barcode(ctx, geo.width - 168, top + 44, 140, 40, '#1b1b1b', 33);
                ctx.restore();
            }
        },

        news: {
            label: 'Koran',
            bg: '#f2ede1',
            ink: '#1a1a1a',
            mute: '#57534a',
            padX: 28,
            padTop: 116,
            gap: 14,
            footer: 176,
            radius: 0,
            cellBorder: '#1a1a1a',
            font: 'serif',
            captionSize: 30,
            stampSize: 18,
            drawBg: function (ctx, geo) {
                paperNoise(ctx, geo, '#8a7f6a', 0.07, 13);
                ctx.save();
                ctx.strokeStyle = '#1a1a1a';
                ctx.lineWidth = 2;
                ctx.strokeRect(12, 12, geo.width - 24, geo.height - 24);
                ctx.restore();
            },
            drawHeader: function (ctx, geo) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillStyle = '#1a1a1a';
                ctx.font = '700 27px Georgia, serif';
                ctx.fillText('THE AMPHIBOOTH TIMES', geo.width / 2, 44);

                ctx.fillRect(28, 64, geo.width - 56, 4);
                ctx.fillRect(28, 72, geo.width - 56, 1.5);

                ctx.font = '600 15px ' + FONT.mono;
                ctx.fillText('EDISI KHUSUS  ·  3 POSE  ·  1 LEMBAR', geo.width / 2, 90);

                ctx.fillRect(28, 100, geo.width - 56, 1.5);
                ctx.restore();
            },
            drawFooter: function (ctx, geo, p, opts) {
                const top = geo.footerTop;

                ctx.save();
                ctx.fillRect(28, top, geo.width - 56, 3);

                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#1a1a1a';
                ctx.font = '700 40px Georgia, serif';
                ctx.fillText('PHOTOBOX', 28, top + 44);

                ctx.font = '600 ' + (p.stampSize || 20) + 'px ' + FONT.mono;
                ctx.fillStyle = '#3f3b33';
                ctx.fillText('VOL. 01  ·  ' + formatDate(opts.date), 30, top + 74);

                ctx.fillStyle = '#1a1a1a';
                ctx.font = '600 ' + Math.round((p.captionSize || 30) * 0.85) + 'px Georgia, serif';
                const headline = (opts.caption || 'TIGA POSE, SATU LEMBAR').slice(0, 46);
                ctx.fillText(headline, 30, top + 106);

                // Kolom teks kecil (fake body copy).
                ctx.fillStyle = '#57534a';
                const rand = seeded(17);
                for (let col = 0; col < 3; col += 1) {
                    for (let line = 0; line < 5; line += 1) {
                        const w = 60 + rand() * 120;
                        ctx.fillRect(30 + col * ((geo.width - 60) / 3), top + 132 + line * 8, w, 2);
                    }
                }

                barcode(ctx, geo.width - 128, top + 28, 96, 36, '#1a1a1a', 41);
                ctx.restore();
            }
        },

        candy: {
            label: 'Candy Stripe',
            bg: '#fff7f0',
            ink: '#b03a48',
            mute: '#8a6a6a',
            padX: 46,
            padTop: 104,
            gap: 16,
            footer: 158,
            radius: 6,
            cellBorder: '#ffffff',
            font: 'sans',
            captionSize: 28,
            stampSize: 18,
            drawBg: function (ctx, geo) {
                stripes(ctx, 0, 0, 34, geo.height, '#e8556d', '#fff7f0', 14);
                stripes(ctx, geo.width - 34, 0, 34, geo.height, '#e8556d', '#fff7f0', 14);
                gingham(ctx, 34, geo.height - 78, geo.width - 68, 78, '#e8556d', 16, 0.18);
            },
            drawHeader: function (ctx, geo) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#e8556d';
                ctx.font = '700 30px ' + FONT.sans;
                ctx.fillText('PHOTOBOOTH', geo.width / 2, 48);

                ctx.strokeStyle = '#e8556d';
                ctx.lineWidth = 2;
                roundRect(ctx, geo.width / 2 - 118, 66, 236, 26, 13);
                ctx.stroke();

                ctx.fillStyle = '#b03a48';
                ctx.font = '600 14px ' + FONT.mono;
                ctx.fillText('SEND TO YOUR FAVORITE PERSON', geo.width / 2, 80);
                ctx.restore();
            },
            drawOrn: function (ctx, geo, p) {
                // Stempel "APPROVED" miring.
                ctx.save();
                ctx.translate(geo.width - 96, geo.footerTop + 26);
                ctx.rotate(-0.22);
                ctx.strokeStyle = '#e8556d';
                ctx.lineWidth = 2.5;
                roundRect(ctx, -54, -18, 108, 36, 6);
                ctx.stroke();
                ctx.fillStyle = '#e8556d';
                ctx.font = '700 17px ' + FONT.mono;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('APPROVED', 0, 1);
                ctx.restore();
            }
        },

        // ---------- TEMA KUAT ----------
        halloween: {
            label: 'Halloween',
            bg: '#2e1a47',
            ink: '#ffe9c7',
            mute: '#c9b6e4',
            padX: 36,
            padTop: 108,
            gap: 18,
            footer: 152,
            radius: 14,
            cellBorder: '#f5c46b',
            font: 'sans',
            captionSize: 30,
            stampSize: 18,
            drawBg: function (ctx, geo, p) {
                ctx.fillStyle = gradient(ctx, 0, 0, 0, geo.height, [
                    [0, '#2e1a47'],
                    [0.55, '#432560'],
                    [1, '#5b2a6e']
                ]);
                ctx.fillRect(0, 0, geo.width, geo.height);

                bat(ctx, 60, 46, 20, '#170d26');
                bat(ctx, geo.width - 74, 62, 15, '#170d26');
                bat(ctx, geo.width - 140, 34, 11, '#170d26');

                pumpkin(ctx, geo.width - 54, 76, 30, '#f28c28');
                ghost(ctx, 54, 82, 34, 'rgba(255,255,255,0.92)');

                // Jaring laba-laba kecil di sudut kanan atas.
                ctx.save();
                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.lineWidth = 1.4;
                for (let i = 0; i < 5; i += 1) {
                    ctx.beginPath();
                    ctx.moveTo(geo.width - 8, 8);
                    ctx.lineTo(geo.width - 8 - Math.cos(i * 0.4) * 70, 8 + Math.sin(i * 0.4) * 70);
                    ctx.stroke();
                }
                for (let r = 14; r < 60; r += 14) {
                    ctx.beginPath();
                    ctx.arc(geo.width - 8, 8, r, Math.PI * 0.5, Math.PI);
                    ctx.stroke();
                }
                ctx.restore();

                ctx.save();
                ctx.strokeStyle = 'rgba(245,196,107,0.5)';
                ctx.lineWidth = 2;
                ctx.strokeRect(16, 16, geo.width - 32, geo.height - 32);
                ctx.restore();
            },
            drawHeader: function (ctx, geo) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillStyle = '#f28c28';
                roundRect(ctx, 22, 92, geo.width - 44, 1, 0);
                ctx.fill();

                ctx.fillStyle = '#f28c28';
                ctx.font = '700 25px ' + FONT.sans;
                ctx.fillText('HAPPY HALLOWEEN', geo.width / 2, 92);
                ctx.restore();
            },
            drawFooter: function (ctx, geo, p, opts) {
                const top = geo.footerTop;

                ctx.save();
                ctx.fillStyle = '#f28c28';
                roundRect(ctx, 26, top + 16, geo.width - 52, 44, 12);
                ctx.fill();

                ctx.fillStyle = '#2e1a47';
                ctx.font = '700 22px ' + FONT.sans;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('TRICK OR TREAT', geo.width / 2, top + 39);

                ctx.fillStyle = '#ffe9c7';
                ctx.font = '600 ' + (p.captionSize || 30) + 'px ' + FONT.sans;
                withGlow(ctx, p, function () {
                    ctx.fillText((opts.caption || '').slice(0, 40), geo.width / 2, top + 82);
                });

                if (opts.dateStamp) {
                    ctx.fillStyle = '#f0e2ff';
                    ctx.font = '600 ' + (p.stampSize || 20) + 'px ' + FONT.mono;
                    withGlow(ctx, p, function () {
                        ctx.fillText(formatDate(opts.date) + ' · AMPHIBOOTH', geo.width / 2, top + 114);
                    });
                }

                ghost(ctx, 44, top + 96, 24, 'rgba(255,255,255,0.8)');
                pumpkin(ctx, geo.width - 46, top + 104, 20, '#f28c28');
                ctx.restore();
            }
        },

        popart: {
            label: 'Pop Art',
            bg: '#ffd93d',
            ink: '#ffffff',
            mute: '#7a3f57',
            padX: 34,
            padTop: 104,
            gap: 18,
            footer: 150,
            radius: 14,
            cellBorder: '#ffffff',
            font: 'sans',
            captionSize: 34,
            stampSize: 18,
            drawBg: function (ctx, geo) {
                ctx.fillStyle = geo.gradient || '#ffd93d';
                ctx.fillStyle = gradient(ctx, 0, 0, geo.width, geo.height, [
                    [0, '#ffd93d'],
                    [0.5, '#ffb3c7'],
                    [1, '#9ad0ff']
                ]);
                ctx.fillRect(0, 0, geo.width, geo.height);
                sunburst(ctx, geo.width / 2, geo.height * 0.45, Math.max(geo.width, geo.height), 26, '#ffffff', 0.22);
                for (let i = 0; i < 5; i += 1) {
                    sparkle4(ctx, 40 + i * 130, 78 + (i % 2) * 26, 14, 'rgba(255,255,255,0.85)');
                }
            },
            drawHeader: function (ctx, geo) {
                ctx.save();
                ctx.translate(geo.width / 2, 52);

                ctx.fillStyle = '#ff4d6d';
                ctx.beginPath();
                ctx.moveTo(-150, -18);
                ctx.lineTo(150, -18);
                ctx.lineTo(126, 0);
                ctx.lineTo(150, 18);
                ctx.lineTo(-150, 18);
                ctx.lineTo(-126, 0);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.font = '700 24px ' + FONT.sans;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('AMPHIBOOTH POP!', 0, 1);
                ctx.restore();
            },
            drawFooter: function (ctx, geo, p, opts) {
                const top = geo.footerTop;

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.lineWidth = 6;
                ctx.strokeStyle = '#ffffff';
                ctx.font = '700 36px ' + FONT.sans;
                const caption = (opts.caption || 'SO CUTE!').slice(0, 26);
                ctx.strokeText(caption, geo.width / 2, top + 46);
                ctx.fillStyle = '#ff4d6d';
                ctx.fillText(caption, geo.width / 2, top + 46);

                ctx.fillStyle = '#ffffff';
                ctx.font = '600 18px ' + FONT.sans;
                ctx.fillText('★ ' + formatDate(opts.date) + ' ★', geo.width / 2, top + 86);

                star(ctx, 50, top + 60, 12, '#ffffff', 5);
                star(ctx, geo.width - 50, top + 70, 9, '#ffffff', 5);
                heart(ctx, geo.width / 2, top + 110, 14, '#ff4d6d');
                ctx.restore();
            }
        },

        paradise: {
            label: 'Paradise',
            bg: '#e8c9a0',
            ink: '#fff6e9',
            mute: '#ffe0c2',
            padX: 36,
            padTop: 112,
            gap: 18,
            footer: 168,
            radius: 12,
            cellBorder: '#ffffff',
            font: 'sans',
            captionSize: 30,
            stampSize: 18,
            drawBg: function (ctx, geo) {
                ctx.fillStyle = gradient(ctx, 0, 0, 0, geo.height, [
                    [0, '#f4dcb8'],
                    [0.35, '#e8b98a'],
                    [0.7, '#c98a6b'],
                    [1, '#6b4a7a']
                ]);
                ctx.fillRect(0, 0, geo.width, geo.height);

                // Matahari + bukit silhouette.
                ctx.save();
                ctx.fillStyle = 'rgba(255,240,214,0.85)';
                ctx.beginPath();
                ctx.arc(geo.width / 2, 58, 26, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Dua burung kecil di langit.
                ctx.save();
                ctx.strokeStyle = 'rgba(58,40,54,0.55)';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';

                [[76, 44, 9], [102, 58, 7], [geo.width - 84, 40, 8]].forEach(function (bird) {
                    ctx.beginPath();
                    ctx.moveTo(bird[0] - bird[2], bird[1]);
                    ctx.quadraticCurveTo(bird[0] - bird[2] / 2, bird[1] - bird[2] * 0.7, bird[0], bird[1]);
                    ctx.quadraticCurveTo(bird[0] + bird[2] / 2, bird[1] - bird[2] * 0.7, bird[0] + bird[2], bird[1]);
                    ctx.stroke();
                });

                ctx.restore();

                ctx.save();
                ctx.strokeStyle = 'rgba(255,246,233,0.35)';
                ctx.lineWidth = 2;
                ctx.strokeRect(16, 16, geo.width - 32, geo.height - 32);
                ctx.restore();
            },
            drawHeader: function (ctx, geo) {
                arcText(ctx, 'PARADISE', geo.width / 2, 96, 62, '700 22px ' + FONT.sans, '#fff6e9');
            },
            drawFooter: function (ctx, geo, p, opts) {
                const top = geo.footerTop;

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillStyle = '#fff6e9';
                ctx.font = '600 24px ' + FONT.sans;
                ctx.fillText('WATCHING THE SUNSET', geo.width / 2, top + 38);

                ctx.font = '600 ' + (p.captionSize || 30) + 'px ' + FONT.script;
                withGlow(ctx, p, function () {
                    ctx.fillText((opts.caption || 'what a day').slice(0, 34), geo.width / 2, top + 88);
                });

                if (opts.dateStamp) {
                    ctx.fillStyle = '#ffe8d4';
                    ctx.font = '600 ' + (p.stampSize || 20) + 'px ' + FONT.mono;
                    withGlow(ctx, p, function () {
                        ctx.fillText(formatDate(opts.date) + ' · AMPHIBOOTH', geo.width / 2, top + 126);
                    });
                }

                star(ctx, 46, top + 92, 8, '#fff6e9', 4);
                star(ctx, geo.width - 46, top + 104, 6, '#fff6e9', 4);
                ctx.restore();
            }
        },

        // ---------- LEGACY (foto tunggal lama) ----------
        plain: {
            label: 'Tanpa Frame',
            bg: '#ffffff',
            ink: '#3d3229',
            mute: '#a2948a',
            padX: 10,
            padTop: 10,
            gap: 10,
            footer: 0,
            radius: 0,
            cellBorder: 'transparent',
            font: 'sans'
        }
    };

    // ----------------------------------------------
    // PENYESUAIAN HASIL UJI VISUAL
    // ----------------------------------------------
    // Dua keluhan nyata saat dipakai: (1) foto terlalu besar sampai ornamen
    // frame terlihat sempit -> foto dikecilkan sedikit (photoScale) supaya
    // margin frame lebih kelihatan, (2) teks caption/tanggal susah dibaca ->
    // ukuran dinaikkan, warna dipertegas, dan yang duduk di atas latar ramai
    // dikasih shadow tipis (textGlow).
    const TUNING = {
        polaroid: { photoScale: 0.94, stampSize: 24 },
        film: { photoScale: 0.88, captionSize: 30, stampSize: 22 },
        scallop: { photoScale: 0.90, stampSize: 22 },
        minimal: { photoScale: 0.94, stampSize: 22, mute: '#6f6f6f' },
        solid: { photoScale: 0.92, stampSize: 22 },
        wedding: { photoScale: 0.90, ink: '#8f6a2e', mute: '#7d6357', stampSize: 22 },
        maroon: { photoScale: 0.90, stampSize: 22 },
        hollywood: { photoScale: 0.88, captionSize: 28, stampSize: 20 },
        retro: { photoScale: 0.90, stampSize: 21 },
        airline: { photoScale: 0.90, captionSize: 25, stampSize: 20 },
        news: { photoScale: 0.90, stampSize: 20 },
        candy: { photoScale: 0.88, stampSize: 22 },
        halloween: { photoScale: 0.88, stampSize: 20, textGlow: 'rgba(0,0,0,0.45)' },
        popart: { photoScale: 0.90, stampSize: 20 },
        paradise: { photoScale: 0.90, stampSize: 20, textGlow: 'rgba(0,0,0,0.4)' }
    };

    Object.keys(TUNING).forEach(function (key) {
        if (PRESETS[key]) {
            Object.assign(PRESETS[key], TUNING[key]);
        }
    });

    // Padding bawah seragam, kecuali preset yang butuh ruang ekstra.
    Object.keys(PRESETS).forEach(function (key) {
        if (PRESETS[key].padBottom === undefined) {
            PRESETS[key].padBottom = 30;
        }
    });

    // Urutan tampil di pemilih frame (tanpa 'plain').
    const PICKER = [
        'polaroid', 'film', 'wedding', 'maroon', 'hollywood',
        'retro', 'airline', 'news', 'candy', 'scallop',
        'halloween', 'popart', 'paradise', 'minimal', 'solid'
    ];

    // ----------------------------------------------
    // GEOMETRI
    // ----------------------------------------------
    function geometry(preset, shotCount) {
        const cells = Math.max(1, shotCount);
        const bottom = preset.padBottom === undefined ? 30 : preset.padBottom;
        const shrink = preset.photoScale === undefined ? 1 : preset.photoScale;
        const cellW = Math.round(CELL.w * shrink);
        const cellH = Math.round(CELL.h * shrink);
        const width = CELL.w + preset.padX * 2;
        const height = preset.padTop + cells * cellH + (cells - 1) * preset.gap + preset.footer + bottom;

        return {
            width: width,
            height: height,
            cells: cells,
            cellW: cellW,
            cellH: cellH,
            // Foto selalu di tengah, jadi sisa ruangnya kebagi rata kiri-kanan
            // dan ornamen frame dapat napas.
            cellX: Math.round((width - cellW) / 2),
            // Area teks (caption + date) selalu tepat di atas padding bawah,
            // supaya preset ber-header tinggi tidak menyisakan ruang kosong.
            footerTop: height - bottom - preset.footer
        };
    }

    // ----------------------------------------------
    // RENDER
    // ----------------------------------------------
    /**
     * @param {Object} options
     * @param {Array<HTMLCanvasElement|HTMLImageElement>} options.shots
     * @param {string} [options.frame]
     * @param {string} [options.frameColor]
     * @param {string} [options.caption]
     * @param {boolean} [options.dateStamp]
     * @param {string} [options.effect]
     * @param {number} [options.scale]  1 = ukuran simpan, 1.5 = cetak, 0.15 = thumbnail
     * @param {boolean} [options.hiRes]
     */
    function render(options) {
        const frameId = PRESETS[options.frame] ? options.frame : 'polaroid';
        const base = PRESETS[frameId];
        const preset = Object.assign({}, base);
        const shots = (options.shots || []).filter(Boolean);

        if (frameId === 'solid' && options.frameColor) {
            preset.bg = options.frameColor;
        }

        const geo = geometry(preset, shots.length || 1);
        const scale = options.scale || (options.hiRes ? EXPORT_SCALE : 1);

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(geo.width * scale));
        canvas.height = Math.max(1, Math.round(geo.height * scale));

        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.imageSmoothingQuality = 'high';

        // Latar + border.
        ctx.fillStyle = preset.bg;
        ctx.fillRect(0, 0, geo.width, geo.height);

        if (preset.drawBg) {
            preset.drawBg(ctx, geo, preset, options);
        }

        if (preset.drawHeader) {
            preset.drawHeader(ctx, geo, preset, options);
        }

        // Sel foto.
        const effect = EFFECTS[options.effect] || 'none';

        shots.forEach(function (shot, index) {
            const x = geo.cellX;
            const y = preset.padTop + index * (geo.cellH + preset.gap);

            ctx.save();
            roundRect(ctx, x, y, geo.cellW, geo.cellH, preset.radius);
            ctx.clip();

            if (effect !== 'none' && 'filter' in ctx) {
                ctx.filter = effect;
            }

            drawCover(ctx, shot, x, y, geo.cellW, geo.cellH);
            ctx.filter = 'none';
            ctx.restore();

            if (preset.cellBorder && preset.cellBorder !== 'transparent') {
                ctx.save();
                ctx.strokeStyle = preset.cellBorder;
                ctx.lineWidth = frameId === 'film' || frameId === 'hollywood' ? 2 : 3;
                roundRect(ctx, x, y, geo.cellW, geo.cellH, preset.radius);
                ctx.stroke();
                ctx.restore();
            }
        });

        if (preset.drawOrn) {
            preset.drawOrn(ctx, geo, preset, options);
        }

        if (preset.drawFooter) {
            preset.drawFooter(ctx, geo, preset, options);
        } else {
            footerText(ctx, geo, preset, options);
        }

        if (options.watermark) {
            drawWatermark(ctx, geo, preset);
        }

        canvas.dataset.frame = frameId;

        return canvas;
    }

    window.Strip = {
        render: render,
        presets: PRESETS,
        picker: PICKER,
        cell: CELL,
        exportScale: EXPORT_SCALE,
        effects: Object.keys(EFFECTS),
        formatDate: formatDate
    };
})();