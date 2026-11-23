<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class PruneOrphanPhotos extends Command
{
    /**
     * Nama command.
     *
     * @var string
     */
    protected $signature = 'photos:prune
                            {--dry-run : Hanya tampilkan daftar file nyasar, tidak menghapus apa pun}';

    /**
     * Deskripsi command.
     *
     * @var string
     */
    protected $description = 'Hapus file gambar di folder foto yang sudah tidak punya baris di database';

    /**
     * Eksekusi command.
     */
    public function handle(): int
    {
        $directory = rtrim((string) config('amphibooth.photos_path'), '/\\');

        if (! File::isDirectory($directory)) {
            $this->error('Folder foto tidak ditemukan: '.$directory);

            return self::FAILURE;
        }

        // Semua nama file yang masih dipegang database (lembar + shot mentah).
        $used = DB::table('collages')->pluck('file_name')
            ->merge(DB::table('photos')->pluck('file_name'))
            ->filter()
            ->flip();

        // Nama tanpa ekstensi, buat mengenali thumbnail: Collage::thumbName()
        // selalu menulis .jpg, sedangkan lembar lamanya bisa .png.
        $usedStems = collect($used->keys())
            ->mapWithKeys(fn (string $name) => [pathinfo($name, PATHINFO_FILENAME) => true]);

        $orphans = [];

        foreach (File::files($directory) as $file) {
            $name = $file->getFilename();

            // Jangan pernah sentuh file tersembunyi / .gitkeep / selain gambar.
            if (str_starts_with($name, '.')) {
                continue;
            }

            if (! in_array(strtolower($file->getExtension()), ['jpg', 'jpeg', 'png', 'webp'], true)) {
                continue;
            }

            if ($used->has($name)) {
                continue;
            }

            // Thumbnail bukan baris database: namanya turunan dari lembar
            // (thumb_<nama file lembar tanpa ekstensi>.jpg). Tanpa pengecualian
            // ini, prune bakal menghapus thumbnail strip yang masih hidup.
            if (str_starts_with($name, 'thumb_')
                && $usedStems->has(pathinfo(substr($name, 6), PATHINFO_FILENAME))) {
                continue;
            }

            $orphans[$name] = $file->getSize();
        }

        if ($orphans === []) {
            $this->info('Tidak ada file nyasar. Folder foto sudah bersih ✨');

            return self::SUCCESS;
        }

        $totalBytes = array_sum($orphans);
        $dryRun = (bool) $this->option('dry-run');

        $this->warn(sprintf(
            '%d file tidak punya baris database (%.1f MB)%s',
            count($orphans),
            $totalBytes / 1048576,
            $dryRun ? ' — mode dry-run, tidak ada yang dihapus' : ''
        ));

        foreach ($orphans as $name => $size) {
            if (! $dryRun) {
                File::delete($directory.DIRECTORY_SEPARATOR.$name);
            }

            $this->line(sprintf('  %s %s (%.0f KB)', $dryRun ? '·' : '✗', $name, $size / 1024));
        }

        if (! $dryRun) {
            $this->info(sprintf('Selesai: %d file dihapus, %.1f MB lega.', count($orphans), $totalBytes / 1048576));
        }

        return self::SUCCESS;
    }
}