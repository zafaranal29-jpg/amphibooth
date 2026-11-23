<?php

namespace App\Http\Controllers;

use App\Models\Collage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CollageController extends Controller
{
    /**
     * Daftar lembar milik user yang login (JSON, dipakai gallery.js).
     */
    public function index(Request $request): JsonResponse
    {
        $filter = $request->query('filter');

        $collages = $request->user()
            ->collages()
            ->when($filter === 'loved', fn ($query) => $query->loved())
            ->latest()
            ->paginate((int) config('amphibooth.photos_per_page', 12))
            ->withQueryString();

        return response()->json([
            'status' => 'sukses',
            'data' => collect($collages->items())->map(fn (Collage $collage) => [
                'id' => $collage->id,
                'url' => $collage->url(),
                'thumb_url' => $collage->thumbUrl(),
                'download_url' => $collage->url(),
                'download_name' => $collage->downloadName(),
                'share_url' => $collage->shareUrl(),
                'layout' => $collage->layout,
                'layout_label' => $collage->layoutLabel(),
                'shots' => $collage->shotCount(),
                'caption' => $collage->caption,
                'is_loved' => $collage->is_loved,
                'missing' => ! $collage->exists(),
                'taken_at' => ($collage->taken_at ?? $collage->created_at)?->toIso8601String(),
                'date_label' => ($collage->taken_at ?? $collage->created_at)?->translatedFormat('d M Y'),
            ])->all(),
            'meta' => [
                'current_page' => $collages->currentPage(),
                'last_page' => $collages->lastPage(),
                'per_page' => $collages->perPage(),
                'total' => $collages->total(),
                'has_more' => $collages->hasMorePages(),
            ],
        ]);
    }

    /**
     * Simpan satu sesi photobooth: lembar jadi + shot mentahnya.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'layout' => ['required', Rule::in(['strip3'])],
            'frame' => ['required', Rule::in(Collage::FRAMES)],
            'frame_color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'caption' => ['nullable', 'string', 'max:80'],
            'date_stamp' => ['nullable', 'boolean'],
            'shots' => ['required', 'array', 'min:1', 'max:3'],
            'shots.*' => ['required', 'string'],
            'sheet' => ['required', 'string'],
            'thumb' => ['nullable', 'string'],
        ], [
            'layout.in' => 'Layout-nya belum didukung.',
            'frame.in' => 'Frame yang dipilih tidak dikenal.',
            'shots.required' => 'Belum ada foto yang dijepret, coba lagi ya 📸',
            'shots.max' => 'Jumlah fotonya kebanyakan untuk layout ini.',
            'caption.max' => 'Caption maksimal 80 karakter ya.',
        ]);

        $expected = Collage::LAYOUTS[$data['layout']]['shots'];

        if (count($data['shots']) !== $expected) {
            throw ValidationException::withMessages([
                'shots' => 'Layout '.$data['layout'].' butuh tepat '.$expected.' foto.',
            ]);
        }

        $maxSheetBytes = (int) config('amphibooth.max_upload_kb', 8192) * 1024;
        $maxShotBytes = (int) config('amphibooth.max_shot_kb', 2048) * 1024;
        $maxThumbBytes = (int) config('amphibooth.max_thumb_kb', 512) * 1024;

        $sheet = $this->decodeImage($data['sheet'], $maxSheetBytes, 'lembar');

        // Thumbnail kecil buat kartu gallery (dibuat di browser, opsional:
        // kalau browser lama tidak bisa, gallery pakai lembar penuh).
        $thumb = null;

        if (! empty($data['thumb'])) {
            $thumb = $this->decodeImage($data['thumb'], $maxThumbBytes, 'thumbnail');
        }

        $shots = [];

        foreach (array_values($data['shots']) as $index => $payload) {
            $shots[] = $this->decodeImage($payload, $maxShotBytes, 'foto ke-'.($index + 1));
        }

        $directory = rtrim((string) config('amphibooth.photos_path'), '/\\');
        File::ensureDirectoryExists($directory);

        $user = $request->user();

        // Kuota dicek SEBELUM file ditulis, biar nggak ada file nyasar.
        $incoming = strlen($sheet['binary']);

        foreach ($shots as $shot) {
            $incoming += strlen($shot['binary']);
        }

        if ($thumb) {
            $incoming += strlen($thumb['binary']);
        }

        if ($blocker = $user->quotaBlocker($incoming)) {
            return response()->json([
                'success' => false,
                'message' => $blocker,
            ], 422);
        }

        $written = [];

        $sheetName = 'strip_'.$user->id.'_'.Str::lower(Str::random(14)).'.'.$sheet['extension'];
        $shotNames = [];

        // Namanya diturunkan dari lembar supaya Collage::thumbName() konsisten.
        $thumbName = $thumb
            ? 'thumb_'.pathinfo($sheetName, PATHINFO_FILENAME).'.jpg'
            : null;

        foreach ($shots as $index => $shot) {
            $shotNames[$index] = 'shot_'.$user->id.'_'.($index + 1).'_'.Str::lower(Str::random(10)).'.'.$shot['extension'];
        }

        try {
            File::put($directory.DIRECTORY_SEPARATOR.$sheetName, $sheet['binary']);
            $written[] = $directory.DIRECTORY_SEPARATOR.$sheetName;

            if ($thumb && $thumbName) {
                File::put($directory.DIRECTORY_SEPARATOR.$thumbName, $thumb['binary']);
                $written[] = $directory.DIRECTORY_SEPARATOR.$thumbName;
            }

            foreach ($shots as $index => $shot) {
                File::put($directory.DIRECTORY_SEPARATOR.$shotNames[$index], $shot['binary']);
                $written[] = $directory.DIRECTORY_SEPARATOR.$shotNames[$index];
            }

            $collage = DB::transaction(function () use ($user, $data, $sheetName, $shotNames) {
                $collage = $user->collages()->create([
                    'layout' => $data['layout'],
                    'frame' => $data['frame'],
                    'frame_color' => $data['frame_color'] ?? null,
                    'caption' => isset($data['caption']) ? trim($data['caption']) : null,
                    'date_stamp' => (bool) ($data['date_stamp'] ?? true),
                    'file_name' => $sheetName,
                    'share_token' => Str::random(32),
                    'is_loved' => false,
                    'taken_at' => now(),
                ]);

                foreach ($shotNames as $index => $name) {
                    $collage->photos()->create([
                        'user_id' => $user->id,
                        'file_name' => $name,
                        'position' => $index + 1,
                        'is_loved' => false,
                    ]);
                }

                return $collage;
            });
        } catch (\Throwable $error) {
            foreach ($written as $path) {
                if (File::exists($path)) {
                    File::delete($path);
                }
            }

            report($error);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan strip, coba lagi ya 🥺',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Strip imut kamu tersimpan 💖',
            'collage' => [
                'id' => $collage->id,
                'url' => $collage->url(),
                'thumb_url' => $collage->thumbUrl(),
                'download_url' => $collage->url(),
                'download_name' => $collage->downloadName(),
                'share_url' => $collage->shareUrl(),
                'layout' => $collage->layout,
                'layout_label' => $collage->layoutLabel(),
                'is_loved' => $collage->is_loved,
            ],
        ], 201);
    }

    /**
     * Toggle tombol love di gallery.
     */
    public function toggleLove(Request $request, Collage $collage): JsonResponse
    {
        abort_unless($collage->user_id === $request->user()->id, 403);

        $collage->update(['is_loved' => ! $collage->is_loved]);

        return response()->json([
            'success' => true,
            'id' => $collage->id,
            'is_loved' => $collage->is_loved,
        ]);
    }

    /**
     * Unduh lembar sebagai file (dipakai tombol download di gallery).
     */
    public function download(Request $request, Collage $collage)
    {
        abort_unless($collage->user_id === $request->user()->id, 403);
        abort_unless(File::exists($collage->path()), 404);

        return response()->download($collage->path(), $collage->downloadName());
    }

    /**
     * Hapus lembar + semua shot + filenya.
     */
    public function destroy(Request $request, Collage $collage): JsonResponse
    {
        abort_unless($collage->user_id === $request->user()->id, 403);

        $collage->deleteWithFiles();

        return response()->json([
            'success' => true,
            'message' => 'Strip-nya sudah dihapus 🥺',
        ]);
    }

    /**
     * Decode data URL base64 jadi binary + validasi isinya benar-benar gambar.
     *
     * @return array{binary: string, extension: string, mime: string}
     */
    private function decodeImage(string $payload, int $maxBytes, string $label): array
    {
        if (! preg_match('#^data:image/(png|jpeg);base64,(.+)$#s', $payload, $matches)) {
            throw ValidationException::withMessages([
                'sheet' => 'Format gambar '.$label.' tidak dikenali.',
            ]);
        }

        $binary = base64_decode($matches[2], true);

        if ($binary === false || $binary === '') {
            throw ValidationException::withMessages([
                'sheet' => 'Data gambar '.$label.' rusak, coba jepret ulang ya 🥺',
            ]);
        }

        if (strlen($binary) > $maxBytes) {
            throw ValidationException::withMessages([
                'sheet' => 'Gambar '.$label.' kebesaran (maks '.round($maxBytes / 1048576, 1).' MB).',
            ]);
        }

        // Tanpa ekstensi GD: cukup cek MIME isi file + header dimensi.
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($binary);

        if (! in_array($mime, ['image/png', 'image/jpeg'], true)) {
            throw ValidationException::withMessages([
                'sheet' => 'Isi file '.$label.' bukan gambar PNG/JPG yang valid.',
            ]);
        }

        $size = @getimagesize('data://'.$mime.';base64,'.base64_encode($binary));

        if ($size === false) {
            throw ValidationException::withMessages([
                'sheet' => 'Gambar '.$label.' tidak bisa dibaca sebagai gambar.',
            ]);
        }

        return [
            'binary' => $binary,
            'extension' => $mime === 'image/png' ? 'png' : 'jpg',
            'mime' => $mime,
        ];
    }
}