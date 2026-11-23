<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Impor data lama dari dump `amphibooth.sql` (schema versi pertama).
 *
 * Pemetaan:
 *   users.username        -> users.name
 *   photos.id_user        -> photos.user_id
 *   photos.nama_file      -> photos.file_name
 *   loved_photos (tabel)  -> photos.is_loved = true
 *
 * Password lama tetap dipakai apa adanya (hash bcrypt), jadi user lama
 * bisa login dengan password yang sama.
 */
class LegacyDataSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['id' => 1, 'name' => 'nopal', 'email' => 'nopal@gmail.com', 'password' => '$2y$10$YzxsWIB/jyWA6cBLUBAWmeWAZM3jFmDbAU.hTYGYYG2oiaTi8fAD6', 'created_at' => '2026-05-19 10:08:32'],
            ['id' => 2, 'name' => 'nopall', 'email' => 'nopall@gmail.com', 'password' => '$2y$10$3b9BCnLHXRo47JXLf3eqKOVW8B.PKM15Dy39eqCo3zWDgtMWDEjqm', 'created_at' => '2026-05-19 20:51:13'],
            ['id' => 3, 'name' => 'zafaran', 'email' => 'zafaran@gmail.com', 'password' => '$2y$12$8rS6004TyldBHrWuIOMrb.4xyuU54GuH9PV63yckq0W1PHwI.c7b2', 'created_at' => '2026-07-13 21:58:42'],
            ['id' => 4, 'name' => 'ellisa', 'email' => 'ellisa@gmail.com', 'password' => '$2y$12$stDva50Y7dt.8.tuf6hXn.O8BnhW5fko/vtL27l4sCL33UoqLl8yC', 'created_at' => '2026-07-13 22:45:48'],
        ];

        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['id' => $user['id']],
                [
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'password' => $user['password'],
                    'email_verified_at' => $user['created_at'],
                    'created_at' => $user['created_at'],
                    'updated_at' => $user['created_at'],
                ]
            );
        }

        $photos = [
            ['id' => 8, 'user_id' => 1, 'file_name' => 'cutie_1_1779222146.png', 'created_at' => '2026-05-19 20:22:26'],
            ['id' => 9, 'user_id' => 1, 'file_name' => 'cutie_1_1779222448.png', 'created_at' => '2026-05-19 20:27:28'],
            ['id' => 10, 'user_id' => 1, 'file_name' => 'cutie_1_1779222457.png', 'created_at' => '2026-05-19 20:27:37'],
            ['id' => 11, 'user_id' => 1, 'file_name' => 'cutie_1_1779222783.png', 'created_at' => '2026-05-19 20:33:03'],
            ['id' => 12, 'user_id' => 1, 'file_name' => 'cutie_1_1779223615.png', 'created_at' => '2026-05-19 20:46:55'],
            ['id' => 17, 'user_id' => 3, 'file_name' => 'cutie_3_1784008481.png', 'created_at' => '2026-07-13 22:54:41'],
        ];

        $loved = [11, 12];
        $directory = rtrim((string) config('amphibooth.photos_path'), '/\\');

        foreach ($photos as $photo) {
            $exists = File::exists($directory.DIRECTORY_SEPARATOR.$photo['file_name']);

            DB::table('photos')->updateOrInsert(
                ['id' => $photo['id']],
                [
                    'user_id' => $photo['user_id'],
                    'file_name' => $photo['file_name'],
                    'is_loved' => in_array($photo['id'], $loved, true),
                    'created_at' => $photo['created_at'],
                    'updated_at' => $photo['created_at'],
                ]
            );

            if (! $exists) {
                $this->command?->warn('File foto tidak ditemukan: '.$photo['file_name']);
            }
        }

        $this->command?->info('Data lama diimpor: '.count($users).' user, '.count($photos).' foto.');
    }
}
