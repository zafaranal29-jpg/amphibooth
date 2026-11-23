#!/usr/bin/env bash
# Smoke test end-to-end Amphibooth (sesi strip) lewat Apache + curl.
# Bikin user sementara, login, simpan strip 3 foto, love, download,
# buka halaman share, hapus, uji halaman profil (ganti nama, ganti
# password, hapus semua data), lalu bersih-bersih.
set -u

BASE="http://localhost/amphibooth-laravel/public"
# curl di sini = curl.exe (native Windows), jadi path cookie jar harus path Windows.
SCRATCH="C:/Users/user/AppData/Local/hermes/cache/scratch"
mkdir -p "$SCRATCH"
JAR="$SCRATCH/smoke_cookies.txt"
rm -f "$JAR"

PASS=0
FAIL=0
check() { # check <label> <actual> <expected-substring>
    if [[ "$2" == *"$3"* ]]; then
        echo "OK   $1 => ${2:0:120}"
        PASS=$((PASS + 1))
    else
        echo "FAIL $1 => ${2:0:200} (harap ada: $3)"
        FAIL=$((FAIL + 1))
    fi
}

EMAIL="smoketest@example.com"
# Password akun uji — bisa ditimpa lewat env SMOKE_PASSWORD kalau mau.
PASSWORD="${SMOKE_PASSWORD:-rahasia123}"
NEW_PASSWORD="${SMOKE_PASSWORD_NEW:-rahasia456}"
PHOTO_DIR="C:/xampp/htdocs/amphibooth-laravel/public/images/photos"

php artisan tinker --execute="
\$u = \App\Models\User::where('email', '$EMAIL')->first();
if (\$u) { foreach (\$u->collages as \$c) { \$c->deleteWithFiles(); } \$u->photos()->delete(); }
\$u = \App\Models\User::updateOrCreate(['email' => '$EMAIL'], ['name' => 'Smoke Tester', 'password' => '$PASSWORD']);
echo 'user_id='.\$u->id;
" 2>&1 | tail -1

FILES_BEFORE=$(ls "$PHOTO_DIR" | wc -l)

# --- 1. halaman publik ---
check "GET / (tamu) landing" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")" "200"
check "landing ada CTA demo" "$(curl -s "$BASE/")" "Coba Demo Gratis"
check "landing memuat landing.js" "$(curl -s "$BASE/" | grep -c 'landing.js')" "1"
check "GET /privasi" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/privasi")" "200"
check "privasi bahas foto mentah" "$(curl -s "$BASE/privasi")" "tidak bisa diakses dari browser"
check "robots.txt ada" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/robots.txt")" "200"
check "robots.txt sembunyikan gallery" "$(curl -s "$BASE/robots.txt")" "Disallow: /gallery"
check "GET /login" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/login")" "200"
check "GET /booth (tamu)" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/booth")" "302"
check "GET /demo (tamu, tanpa daftar)" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/demo")" "200"
check "GET /demo konten" "$(curl -s "$BASE/demo")" "Mode coba-coba"

# foto mentah (shot_*) harus diblokir .htaccess
PROBE="$PHOTO_DIR/shot_smoke_probe.jpg"
printf 'probe' > "$PROBE"
check "shot_* diblokir (403)" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/images/photos/shot_smoke_probe.jpg")" "403"
rm -f "$PROBE"

# --- 2. login ---
TOKEN=$(curl -s -c "$JAR" "$BASE/login" | grep -o 'name="csrf-token" content="[^"]*"' | head -1 | sed 's/.*content="//; s/"$//')
check "csrf token login" "${TOKEN:0:12}" "$(printf '%.12s' "$TOKEN")"

LOGIN_LOCATION=$(curl -s -b "$JAR" -c "$JAR" -o /dev/null -D - \
    -X POST "$BASE/login" \
    --data-urlencode "_token=$TOKEN" \
    --data-urlencode "email=$EMAIL" \
    --data-urlencode "password=$PASSWORD" | grep -i '^location:' | tr -d '\r')
check "POST /login (302 -> booth)" "$LOGIN_LOCATION" "/booth"

# --- 3. halaman terkunci setelah login ---
BOOTH_HTML=$(curl -s -b "$JAR" "$BASE/booth")
check "GET /booth memuat strip.js" "$(printf '%s' "$BOOTH_HTML" | grep -c 'strip.js')" "1"
check "booth punya slot 3 foto" "$(printf '%s' "$BOOTH_HTML" | grep -c 'data-slot="2"')" "1"
GALLERY_HTML=$(curl -s -b "$JAR" "$BASE/gallery")
check "GET /gallery memuat nama user" "$GALLERY_HTML" "Smoke Tester"
check "GET /gallery punya app-config collages" "$GALLERY_HTML" "collagesStore"

API_TOKEN=$(echo "$GALLERY_HTML" | grep -o 'name="csrf-token" content="[^"]*"' | head -1 | sed 's/.*content="//; s/"$//')

# --- 4. index strip (kosong dulu) ---
IDX=$(curl -s -b "$JAR" -H "Accept: application/json" "$BASE/collages")
check "GET /collages (JSON)" "$IDX" '"status":"sukses"'
check "GET /collages kosong" "$IDX" '"total":0'

# --- 5. simpan strip 3 foto ---
PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg=='
DATAURL="data:image/png;base64,$PNG"
# thumb = versi kecil yang dibuat browser; ikut dikirim supaya jalur
# thumbnail (kartu gallery) ikut teruji.
PAYLOAD=$(printf '{"layout":"strip3","frame":"polaroid","frame_color":"#ffb3c7","caption":"Smoke strip","date_stamp":true,"shots":["%s","%s","%s"],"sheet":"%s","thumb":"%s"}' "$DATAURL" "$DATAURL" "$DATAURL" "$DATAURL" "$DATAURL")

STORE=$(curl -s -b "$JAR" -H "Accept: application/json" -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $API_TOKEN" \
    -X POST "$BASE/collages" --data-raw "$PAYLOAD")
check "POST /collages (strip3)" "$STORE" '"success":true'
check "POST /collages badge layout" "$STORE" 'Strip 3'

COLLAGE_ID=$(echo "$STORE" | grep -o '"id":[0-9]*' | head -1 | sed 's/.*://')
SHARE_URL=$(echo "$STORE" | grep -o '"share_url":"[^"]*"' | head -1 | sed 's/.*:"//; s/"$//')
SHARE_TOKEN=$(basename "$SHARE_URL")
check "collage dapat id" "$COLLAGE_ID" "$COLLAGE_ID"
check "share token dibuat" "$SHARE_TOKEN" "$SHARE_TOKEN"

FILES_AFTER=$(ls "$PHOTO_DIR" | wc -l)
check "5 file tersimpan (1 lembar + 1 thumb + 3 shot)" "$((FILES_AFTER - FILES_BEFORE))" "5"
check "thumbnail berupa file kecil (< 120 KB)"     "$(ls -l "$PHOTO_DIR"/thumb_*.jpg 2>/dev/null | awk '{ if ($5 < 122880) print "kecil"; else print "besar" }' | head -1)" "kecil"

# --- 6. love + filter ---
LOVE=$(curl -s -b "$JAR" -H "Accept: application/json" -H "X-CSRF-TOKEN: $API_TOKEN" \
    -X PATCH "$BASE/collages/$COLLAGE_ID/love")
check "PATCH love" "$LOVE" '"is_loved":true'

LOVED=$(curl -s -b "$JAR" -H "Accept: application/json" "$BASE/collages?filter=loved")
check "filter loved berisi strip" "$LOVED" '"total":1'

# --- 7. validasi ---
BAD_COUNT=$(curl -s -b "$JAR" -H "Accept: application/json" -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $API_TOKEN" -X POST "$BASE/collages" \
    --data-raw "{\"layout\":\"strip3\",\"frame\":\"polaroid\",\"shots\":[\"$DATAURL\",\"$DATAURL\"],\"sheet\":\"$DATAURL\"}" \
    -o /dev/null -w '%{http_code}')
check "tolak jumlah shot kurang (422)" "$BAD_COUNT" "422"

BAD_IMAGE=$(curl -s -b "$JAR" -H "Accept: application/json" -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $API_TOKEN" -X POST "$BASE/collages" \
    --data-raw "{\"layout\":\"strip3\",\"frame\":\"polaroid\",\"shots\":[\"bukan-gambar\",\"bukan-gambar\",\"bukan-gambar\"],\"sheet\":\"bukan-gambar\"}" \
    -o /dev/null -w '%{http_code}')
check "tolak gambar rusak (422)" "$BAD_IMAGE" "422"

BAD_FRAME=$(curl -s -b "$JAR" -H "Accept: application/json" -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $API_TOKEN" -X POST "$BASE/collages" \
    --data-raw "{\"layout\":\"strip3\",\"frame\":\"frame-ngawur\",\"shots\":[\"$DATAURL\",\"$DATAURL\",\"$DATAURL\"],\"sheet\":\"$DATAURL\"}" \
    -o /dev/null -w '%{http_code}')
check "tolak frame tak dikenal (422)" "$BAD_FRAME" "422"

# --- 8. download ---
DOWNLOAD_HEAD=$(curl -s -b "$JAR" -o /dev/null -D - "$BASE/collages/$COLLAGE_ID/download" | tr 'A-Z' 'a-z')
check "GET download + attachment" "$DOWNLOAD_HEAD" "content-disposition: attachment"
check "nama file download" "$DOWNLOAD_HEAD" "amphibooth-strip3-"

# --- 9. halaman share publik ---
SHARE_HTML=$(curl -s "$BASE/p/$SHARE_TOKEN")
check "GET /p/{token} publik" "$(printf '%s' "$SHARE_HTML" | grep -c 'og:image"')" "1"
check "halaman share ada caption" "$SHARE_HTML" "Smoke strip"
check "halaman share ada tombol download" "$SHARE_HTML" "Download strip"
check "token ngawur 404" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/p/token-palsu-123")" "404"

# --- 10. hapus ---
DEL=$(curl -s -b "$JAR" -H "Accept: application/json" -H "X-CSRF-TOKEN: $API_TOKEN" \
    -X DELETE "$BASE/collages/$COLLAGE_ID")
check "DELETE /collages/{id}" "$DEL" '"success":true'

FILES_END=$(ls "$PHOTO_DIR" | wc -l)
check "file ikut terhapus dari disk" "$FILES_END" "$FILES_BEFORE"

# --- 10b. profil: ubah nama, ganti password, hapus semua data ---
PROFILE_HTML=$(curl -s -b "$JAR" "$BASE/profile")
check "GET /profile 200" "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE/profile")" "200"
check "profil punya zona bahaya" "$PROFILE_HTML" "Hapus semua data"
check "profil nampilin kuota" "$PROFILE_HTML" "Kuota kamu"
QUOTA_STRIPS_EXPECTED=$(php artisan tinker --execute="echo config('amphibooth.quota_strips');" 2>/dev/null | tr -d '[:space:]')
check "kuota strip default $QUOTA_STRIPS_EXPECTED" "$PROFILE_HTML" "/ $QUOTA_STRIPS_EXPECTED"

RENAME=$(curl -s -b "$JAR" -o /dev/null -D - -X POST "$BASE/profile" \
    --data-urlencode "_token=$API_TOKEN" --data-urlencode "_method=PATCH" \
    --data-urlencode "name=Smoke Tester Baru" | grep -i '^location:' | tr -d '\r')
check "PATCH /profile (302 -> profile)" "$RENAME" "/profile"
check "nama baru kepakai" "$(curl -s -b "$JAR" "$BASE/profile" | grep -o 'Smoke Tester Baru' | head -1)" "Smoke Tester Baru"

BAD_PW=$(curl -s -b "$JAR" -H "Accept: application/json" -X POST "$BASE/profile/password" \
    --data-urlencode "_token=$API_TOKEN" --data-urlencode "_method=PUT" \
    --data-urlencode "current_password=salah-banget" \
    --data-urlencode "password=$NEW_PASSWORD" --data-urlencode "password_confirmation=$NEW_PASSWORD" \
    -o /dev/null -w '%{http_code}')
check "ganti password tolak password lama salah (422)" "$BAD_PW" "422"

OK_PW=$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$BASE/profile/password" \
    --data-urlencode "_token=$API_TOKEN" --data-urlencode "_method=PUT" \
    --data-urlencode "current_password=$PASSWORD" \
    --data-urlencode "password=$NEW_PASSWORD" --data-urlencode "password_confirmation=$NEW_PASSWORD")
check "ganti password sukses (302)" "$OK_PW" "302"
PASSWORD="$NEW_PASSWORD"

# simpan strip baru buat uji hapus-semua-data
STORE2=$(curl -s -b "$JAR" -H "Accept: application/json" -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $API_TOKEN" -X POST "$BASE/collages" --data-raw "$PAYLOAD")
check "simpan strip lagi buat uji hapus data" "$STORE2" '"success":true'
check "index berisi 1 strip" "$(curl -s -b "$JAR" -H 'Accept: application/json' "$BASE/collages")" '"total":1'

WIPE_BAD=$(curl -s -b "$JAR" -H "Accept: application/json" -X POST "$BASE/profile/data" \
    --data-urlencode "_token=$API_TOKEN" --data-urlencode "_method=DELETE" \
    --data-urlencode "confirm_password=salah-banget" -o /dev/null -w '%{http_code}')
check "hapus data tolak password salah (422)" "$WIPE_BAD" "422"

WIPE=$(curl -s -b "$JAR" -o /dev/null -D - -X POST "$BASE/profile/data" \
    --data-urlencode "_token=$API_TOKEN" --data-urlencode "_method=DELETE" \
    --data-urlencode "confirm_password=$PASSWORD" | grep -i '^location:' | tr -d '\r')
check "DELETE /profile/data (302 -> gallery)" "$WIPE" "/gallery"
check "semua strip user hilang" "$(curl -s -b "$JAR" -H 'Accept: application/json' "$BASE/collages")" '"total":0'
check "file mentah ikut bersih dari disk" "$(ls "$PHOTO_DIR" | wc -l)" "$FILES_BEFORE"

# --- 11. halaman error custom ---
check "404 custom" "$(curl -s -b "$JAR" "$BASE/halaman-ngawur" | grep -c 'hilang')" "1"
check "GET /logout ditolak" "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE/logout")" "405"

# --- 12. logout ---
LOGOUT=$(curl -s -b "$JAR" -c "$JAR" -o /dev/null -w '%{http_code}' \
    -X POST "$BASE/logout" --data-urlencode "_token=$API_TOKEN")
check "POST /logout" "$LOGOUT" "302"
check "setelah logout /gallery dikunci" "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' "$BASE/gallery")" "302"

# --- bersih-bersih ---
php artisan tinker --execute="
\$u = \App\Models\User::where('email', '$EMAIL')->first();
if (\$u) { foreach (\$u->collages as \$c) { \$c->deleteWithFiles(); } \$u->photos()->delete(); \$u->delete(); echo 'cleanup ok'; }
" 2>&1 | tail -1

echo "-----------------------------------------"
echo "PASS: $PASS  FAIL: $FAIL"
rm -f "$JAR"