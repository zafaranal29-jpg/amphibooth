#!/usr/bin/env python3
"""
Bikin thumbnail buat strip LAMA yang belum punya.

Kenapa perlu: thumbnail normalnya dibuat browser waktu menyimpan strip
(server tidak punya GD/Imagick), jadi strip yang dibuat sebelum fitur ini
tidak punya thumbnail dan gallery-nya jatuh ke lembar penuh (berat).

Skrip ini cuma buat data lama — jalankan di komputer, sekali. Server
produksi tidak butuh ini: strip baru otomatis punya thumbnail sendiri.

Pakai:
    python storage/backfill-thumbs.py                  # lihat dulu (dry-run)
    python storage/backfill-thumbs.py --apply          # bikin thumbnailnya

Butuh Pillow (`python -m pip install pillow`).
"""
import argparse
import os
import sys

WIDTH = 360
QUALITY = 72


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true', help='benar-benar menulis file')
    parser.add_argument('--photos', default=None, help='folder foto (default: public/images/photos)')
    args = parser.parse_args()

    try:
        from PIL import Image
    except ImportError:
        print('Pillow belum terpasang: python -m pip install pillow')
        return 1

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    folder = args.photos or os.path.join(root, 'public', 'images', 'photos')

    if not os.path.isdir(folder):
        print('Folder tidak ada:', folder)
        return 1

    dibuat = 0
    dilewat = 0

    for name in sorted(os.listdir(folder)):
        if not name.startswith('strip_'):
            continue
        if name.lower().endswith('.png'):
            # Lembar lama formatnya .jpg; kalau ada .png, thumbnail-nya tetap .jpg.
            pass

        base = os.path.splitext(name)[0]
        target = os.path.join(folder, 'thumb_' + base + '.jpg')

        if os.path.exists(target):
            dilewat += 1
            continue

        source = os.path.join(folder, name)
        size_kb = os.path.getsize(source) / 1024

        if not args.apply:
            print('  akan dibuat: %-42s (lembar %.0f KB)' % ('thumb_' + base + '.jpg', size_kb))
            dibuat += 1
            continue

        image = Image.open(source).convert('RGB')
        tinggi = max(1, round(image.height * WIDTH / image.width))
        # Pillow lama: Image.LANCZOS, Pillow baru: Image.Resampling.LANCZOS.
        lanczos = getattr(getattr(Image, 'Resampling', Image), 'LANCZOS')
        image.resize((WIDTH, tinggi), lanczos).save(target, 'JPEG', quality=QUALITY, optimize=True)
        print('  dibuat: %-42s %.1f KB -> %.1f KB' % (
            'thumb_' + base + '.jpg', size_kb, os.path.getsize(target) / 1024))
        dibuat += 1

    mode = 'dibuat' if args.apply else 'siap dibuat'
    print('\n%d thumbnail %s, %d sudah ada%s' % (dibuat, mode, dilewat, '' if args.apply else ' (dry-run)'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
