#!/usr/bin/env bash
# Bikin paket zip buat hosting (alwaysdata / cPanel) TANPA vendor & node_modules.
# Jalankan dari root proyek: bash deploy/buat-paket.sh
set -euo pipefail
cd "$(dirname "$0")/.."
python - <<'PY'
import os
import zipfile

AKAR = os.getcwd()
OUT = os.path.join(AKAR, "deploy", "amphibooth-alwaysdata.zip")

LEWATI_DIR = {".git", "node_modules", "vendor", "tests", ".idea", ".vscode", "deploy"}
LEWATI_FILE = {
    ".env", ".env.local", ".env.production", "phpunit.xml", ".phpunit.result.cache",
    "amphibooth-alwaysdata.zip", "package.json", "package-lock.json",
}

# Foto user JANGAN ikut ke paket (privat & bikin zip bengkak).
# .htaccess wajib ikut: dia yang menutup akses shot_* di server.
FOTO_DIR = os.path.join("public", "images", "photos")
FOTO_IKUT = {".gitkeep", ".htaccess"}

jumlah = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for root, dirs, files in os.walk(AKAR):
        dirs[:] = [d for d in dirs if d not in LEWATI_DIR and not d.startswith(".phpunit")]
        rel_dir = os.path.relpath(root, AKAR)

        for nama in files:
            if nama in LEWATI_FILE:
                continue

            full = os.path.join(root, nama)
            rel = os.path.relpath(full, AKAR).replace(os.sep, "/")

            # storage/ cuma bawa .gitignore (kerangka folder), bukan isi runtime.
            if rel.startswith("storage/") and nama != ".gitignore":
                continue

            # Foto hasil booth: cuma .gitkeep + .htaccess.
            if rel_dir.replace(os.sep, "/").startswith(FOTO_DIR.replace(os.sep, "/")):
                if nama not in FOTO_IKUT:
                    continue

            z.write(full, rel)
            jumlah += 1

print(f"{jumlah} file -> {OUT} ({os.path.getsize(OUT) / 1024 / 1024:.1f} MB)")
PY
