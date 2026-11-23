<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('collages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // 'strip3' = sesi photobooth 3 foto vertikal, 'single' = foto tunggal lama.
            $table->string('layout', 20)->default('strip3');

            // Id preset frame (polaroid, film, scallop, minimal, solid-*, plain).
            $table->string('frame', 20)->default('polaroid');
            $table->string('frame_color', 7)->nullable();

            $table->string('caption', 80)->nullable();
            $table->boolean('date_stamp')->default(true);

            // Lembar jadi (satu file) + token share publik.
            $table->string('file_name');
            $table->string('share_token', 40)->unique();

            $table->boolean('is_loved')->default(false);
            $table->timestamp('taken_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });

        Schema::table('photos', function (Blueprint $table) {
            // Shot mentah milik sebuah lembar. Foto lama dibiarkan NULL.
            $table->foreignId('collage_id')->nullable()->after('user_id')
                ->constrained('collages')->cascadeOnDelete();
            $table->unsignedTinyInteger('position')->nullable()->after('collage_id');
        });

        // Foto lama (layout single) dipindah jadi lembar supaya gallery tetap
        // menampilkan semuanya tanpa kehilangan satu baris pun.
        $legacyPhotos = DB::table('photos')->whereNull('collage_id')->orderBy('id')->get();

        foreach ($legacyPhotos as $photo) {
            $collageId = DB::table('collages')->insertGetId([
                'user_id' => $photo->user_id,
                'layout' => 'single',
                'frame' => 'plain',
                'frame_color' => null,
                'caption' => null,
                'date_stamp' => false,
                'file_name' => $photo->file_name,
                'share_token' => Str::random(32),
                'is_loved' => $photo->is_loved,
                'taken_at' => $photo->created_at,
                'created_at' => $photo->created_at,
                'updated_at' => $photo->updated_at,
            ]);

            DB::table('photos')->where('id', $photo->id)->update([
                'collage_id' => $collageId,
                'position' => 1,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Lembar hasil backfill tidak dihapus (file-nya foto asli user),
        // cukup lepas relasi lalu buang kolomnya.
        Schema::table('photos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('collage_id');
            $table->dropColumn('position');
        });

        Schema::dropIfExists('collages');
    }
};