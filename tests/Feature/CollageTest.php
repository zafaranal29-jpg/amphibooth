<?php

namespace Tests\Feature;

use App\Models\Collage;
use App\Models\Photo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class CollageTest extends TestCase
{
    use RefreshDatabase;

    /**
     * PNG 1x1 valid (tanpa GD, jadi pakai base64 siap pakai).
     */
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

    private string $photoDirectory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->photoDirectory = storage_path('framework/testing/photos');
        File::ensureDirectoryExists($this->photoDirectory);
        config(['amphibooth.photos_path' => $this->photoDirectory]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->photoDirectory);

        parent::tearDown();
    }

    private function dataUrl(): string
    {
        return 'data:image/png;base64,'.self::PNG;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'layout' => 'strip3',
            'frame' => 'polaroid',
            'frame_color' => '#ffb3c7',
            'caption' => 'Hari yang imut',
            'date_stamp' => true,
            'shots' => [$this->dataUrl(), $this->dataUrl(), $this->dataUrl()],
            'sheet' => $this->dataUrl(),
        ], $overrides);
    }

    public function test_tamu_tidak_bisa_menyimpan_strip(): void
    {
        $this->postJson('/collages', $this->payload())->assertUnauthorized();
    }

    public function test_user_bisa_menyimpan_strip_3_foto(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/collages', $this->payload());

        $response->assertCreated()->assertJsonPath('success', true);

        $collage = Collage::firstOrFail();

        $this->assertSame($user->id, $collage->user_id);
        $this->assertSame('strip3', $collage->layout);
        $this->assertSame('Strip 3 pose', $collage->layoutLabel());
        $this->assertSame('Hari yang imut', $collage->caption);
        $this->assertFalse($collage->is_loved);
        $this->assertSame(32, strlen($collage->share_token));

        // Lembar + 3 shot tersimpan di DB dan di disk.
        $this->assertSame(3, $collage->photos()->count());
        $this->assertTrue(File::exists($collage->path()));

        foreach ($collage->photos as $photo) {
            $this->assertTrue(File::exists($photo->path()));
            $this->assertNotNull($photo->position);
        }
    }

    public function test_jumlah_shot_harus_sesuai_layout(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/collages', $this->payload(['shots' => [$this->dataUrl(), $this->dataUrl()]]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('shots');

        $this->assertSame(0, Collage::count());
    }

    public function test_layout_1_2_dan_4_pose_bisa_disimpan(): void
    {
        $user = User::factory()->create();

        foreach ([1, 2, 4] as $poses) {
            $response = $this->actingAs($user)->postJson('/collages', $this->payload([
                'layout' => 'strip'.$poses,
                'shots' => array_fill(0, $poses, $this->dataUrl()),
            ]));

            $response->assertCreated()->assertJsonPath('success', true);

            $collage = Collage::latest('id')->firstOrFail();

            $this->assertSame('strip'.$poses, $collage->layout);
            $this->assertSame($poses, $collage->shotCount());
            $this->assertSame($poses, $collage->photos()->count());
        }

        $this->assertSame(3, Collage::count());
    }

    public function test_layout_4_pose_menolak_kalau_fotonya_cuma_2(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/collages', $this->payload([
                'layout' => 'strip4',
                'shots' => [$this->dataUrl(), $this->dataUrl()],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('shots');

        $this->assertSame(0, Collage::count());
    }

    public function test_layout_lama_single_masih_tampil_di_gallery(): void
    {
        $user = User::factory()->create();

        // Data lama (layout "single") tetap kebaca walau sudah tidak bisa dipilih.
        $collage = Collage::create([
            'user_id' => $user->id,
            'layout' => 'single',
            'frame' => 'polaroid',
            'frame_color' => '#ffb3c7',
            'caption' => null,
            'date_stamp' => true,
            'file_name' => 'lama.png',
            'share_token' => str_repeat('a', 32),
            'taken_at' => now(),
        ]);

        $this->assertSame(1, $collage->shotCount());
        $this->assertSame('Foto Tunggal', $collage->layoutLabel());

        $this->actingAs($user)
            ->getJson('/collages')
            ->assertOk()
            ->assertJsonPath('data.0.layout', 'single')
            ->assertJsonPath('data.0.layout_label', 'Foto Tunggal')
            ->assertJsonPath('data.0.shots', 1);
    }

    public function test_gambar_rusak_ditolak(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/collages', $this->payload(['sheet' => 'bukan-gambar']))
            ->assertStatus(422);

        $this->assertSame(0, Collage::count());
    }

    public function test_payload_bukan_base64_ditolak(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/collages', $this->payload(['shots' => [
                'data:image/png;base64,!!!bukan-base64!!!',
                $this->dataUrl(),
                $this->dataUrl(),
            ]]))
            ->assertStatus(422);
    }

    public function test_frame_tak_dikenal_ditolak(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/collages', $this->payload(['frame' => 'frame-ngawur']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('frame');
    }

    public function test_caption_kepanjangan_ditolak(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/collages', $this->payload(['caption' => str_repeat('a', 81)]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('caption');
    }

    public function test_love_bisa_ditoggle_dan_ditolak_untuk_bukan_pemilik(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($owner)->postJson('/collages', $this->payload())->assertCreated();
        $collage = Collage::firstOrFail();

        $this->actingAs($owner)
            ->patchJson(route('collages.love', $collage))
            ->assertOk()
            ->assertJsonPath('is_loved', true);

        $this->assertTrue($collage->fresh()->is_loved);

        $this->actingAs($other)
            ->patchJson(route('collages.love', $collage))
            ->assertForbidden();
    }

    public function test_index_hanya_menampilkan_strip_milik_sendiri(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($owner)->postJson('/collages', $this->payload(['caption' => 'punyaku']))->assertCreated();
        $this->actingAs($other)->postJson('/collages', $this->payload(['caption' => 'punya orang']))->assertCreated();

        $response = $this->actingAs($owner)->getJson('/collages')->assertOk();

        $response->assertJsonPath('meta.total', 1);
        $this->assertSame('punyaku', $response->json('data.0.caption'));
        $this->assertArrayHasKey('download_url', $response->json('data.0'));
        $this->assertArrayHasKey('share_url', $response->json('data.0'));

        // Filter loved.
        Collage::where('caption', 'punyaku')->update(['is_loved' => true]);

        $this->actingAs($owner)->getJson('/collages?filter=loved')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }

    public function test_hapus_strip_ikut_menghapus_file_dan_shot(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/collages', $this->payload())->assertCreated();

        $collage = Collage::firstOrFail();
        $paths = $collage->photos->map(fn (Photo $photo) => $photo->path())->all();
        $paths[] = $collage->path();

        $this->actingAs($user)
            ->deleteJson(route('collages.destroy', $collage))
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame(0, Collage::count());
        $this->assertSame(0, Photo::count());

        foreach ($paths as $path) {
            $this->assertFalse(File::exists($path));
        }
    }

    public function test_bukan_pemilik_tidak_bisa_hapus_atau_download(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($owner)->postJson('/collages', $this->payload())->assertCreated();
        $collage = Collage::firstOrFail();

        $this->actingAs($other)->deleteJson(route('collages.destroy', $collage))->assertForbidden();
        $this->actingAs($other)->get(route('collages.download', $collage))->assertForbidden();

        $this->assertSame(1, Collage::count());
    }

    public function test_download_mengirim_file_attachment(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/collages', $this->payload())->assertCreated();
        $collage = Collage::firstOrFail();

        $response = $this->actingAs($user)->get(route('collages.download', $collage));

        $response->assertOk();
        $this->assertStringContainsString(
            'attachment',
            $response->headers->get('content-disposition') ?? ''
        );
        $this->assertStringContainsString('amphibooth-strip3-', $response->headers->get('content-disposition') ?? '');
    }

    public function test_halaman_share_publik_tampil_dengan_og_image(): void
    {
        $user = User::factory()->create(['name' => 'Zafaran']);
        $this->actingAs($user)->postJson('/collages', $this->payload())->assertCreated();

        $collage = Collage::firstOrFail();

        $this->get(route('share.show', ['collage' => $collage->share_token]))
            ->assertOk()
            ->assertSee('og:image', false)
            ->assertSee('Hari yang imut')
            ->assertSee('Zafaran');

        // Token ngawur harus 404, bukan error 500.
        $this->get('/p/token-palsu-12345')->assertNotFound();
    }

    public function test_halaman_booth_dan_demo_bisa_dibuka(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/booth')
            ->assertOk()
            ->assertSee('strip.js', false)
            ->assertSee('data-slot="2"', false);

        $this->get('/demo')->assertOk()->assertSee('Mode coba-coba');
    }

    public function test_command_prune_menghapus_file_nyasar_saja(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/collages', $this->payload())->assertCreated();

        $collage = Collage::firstOrFail();

        $orphan = $this->photoDirectory.DIRECTORY_SEPARATOR.'orphan_lama.png';
        File::put($orphan, base64_decode(self::PNG));

        // dry-run: tidak menghapus apa pun
        $this->artisan('photos:prune', ['--dry-run' => true])->assertSuccessful();
        $this->assertTrue(File::exists($orphan));

        // hapus beneran: file nyasar hilang, file dipakai tetap ada
        $this->artisan('photos:prune')->assertSuccessful();
        $this->assertFalse(File::exists($orphan));
        $this->assertTrue(File::exists($collage->path()));
    }

    public function test_prune_tidak_menghapus_thumbnail_strip_yang_masih_ada(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/collages', $this->payload())->assertCreated();

        $collage = Collage::firstOrFail();

        // Thumbnail bukan baris DB, jadi harus dikenali dari nama turunannya.
        $thumb = $this->photoDirectory.DIRECTORY_SEPARATOR.$collage->thumbName();
        File::put($thumb, base64_decode(self::PNG));

        $thumbNyasar = $this->photoDirectory.DIRECTORY_SEPARATOR.'thumb_strip_hantu_tidak_ada.jpg';
        File::put($thumbNyasar, base64_decode(self::PNG));

        $this->artisan('photos:prune')->assertSuccessful();

        $this->assertTrue(File::exists($thumb), 'thumbnail strip hidup jangan ikut kehapus');
        $this->assertFalse(File::exists($thumbNyasar), 'thumbnail yatim tetap dibersihkan');
    }

    public function test_unggahan_tidak_boleh_berupa_file_biasa(): void
    {
        // Pastikan validasi benar-benar memeriksa isi, bukan cuma nama.
        $user = User::factory()->create();

        $fake = UploadedFile::fake()->create('foto.png', 10, 'image/png');

        $this->assertNotNull($fake);

        $this->actingAs($user)
            ->postJson('/collages', $this->payload(['shots' => ['data:image/png;base64,'.base64_encode('<?php echo 1;')]]))
            ->assertStatus(422);
    }

    public function test_strip_yang_filenya_hilang_ditandai_dan_nggak_download(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/collages', $this->payload())->assertCreated();

        $collage = Collage::firstOrFail();

        // normal: filenya ada
        $this->actingAs($user)->getJson('/collages')->assertOk()->assertJsonPath('data.0.missing', false);

        File::delete($collage->path());

        // filenya hilang: gallery nandai, bukan nampilin gambar rusak
        $this->actingAs($user)->getJson('/collages')->assertOk()->assertJsonPath('data.0.missing', true);

        // halaman share tetap kebuka, minus gambar + tombol download
        $this->get('/p/'.$collage->share_token)
            ->assertOk()
            ->assertSee('Filenya udah nggak ada', false)
            ->assertDontSee('Download strip');

        // unduh balikin 404 (bukan error 500)
        $this->actingAs($user)->get('/collages/'.$collage->id.'/download')->assertNotFound();
    }

    public function test_kuota_jumlah_strip_ditolak_dengan_pesan_jelas(): void
    {
        config(['amphibooth.quota_strips' => 1]);

        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/collages', $this->payload())->assertCreated();

        $this->actingAs($user)
            ->postJson('/collages', $this->payload())
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', fn ($message) => str_contains($message, 'Kuota strip'));

        $this->assertSame(1, $user->collages()->count());
    }

    public function test_kuota_penyimpanan_ditolak_sebelum_file_ditulis(): void
    {
        config(['amphibooth.quota_mb' => 1]);

        $user = User::factory()->create();

        // Strip lama yang filenya 2 MB (lebih besar dari kuota 1 MB).
        $bigName = 'strip_'.$user->id.'_big.jpg';
        File::put($this->photoDirectory.DIRECTORY_SEPARATOR.$bigName, str_repeat('x', 2 * 1048576));

        $user->collages()->create([
            'layout' => 'single',
            'frame' => 'plain',
            'file_name' => $bigName,
            'share_token' => 'token-uji-kuota',
            'is_loved' => false,
            'taken_at' => now(),
        ]);

        $this->actingAs($user)
            ->postJson('/collages', $this->payload())
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($message) => str_contains($message, 'Penyimpanan'));

        // Nggak ada baris baru & nggak ada file nyasar.
        $this->assertSame(1, $user->collages()->count());
        $this->assertCount(1, File::files($this->photoDirectory));
    }

    public function test_kuota_booth_global_menolak_simpan_walau_kuota_user_masih_legas(): void
    {
        // Booth penuh: 1 MB total, dan sudah ada 2 MB file (milik siapa saja,
        // termasuk file nyasar tanpa baris DB).
        config(['amphibooth.quota_total_mb' => 1, 'amphibooth.quota_mb' => 200]);

        File::put(
            $this->photoDirectory.DIRECTORY_SEPARATOR.'strip_999_legacy.jpg',
            str_repeat('x', 2 * 1048576)
        );

        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/collages', $this->payload())
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', fn ($message) => str_contains($message, 'Storage booth'));

        $this->assertSame(0, $user->collages()->count());
    }

    public function test_thumbnail_disimpan_dan_ikut_dihapus(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/collages', $this->payload(['thumb' => $this->dataUrl()]))
            ->assertCreated();

        $collage = Collage::firstOrFail();

        $this->assertFileExists($collage->thumbPath());
        $this->assertStringContainsString('thumb_', $collage->thumbName());
        $this->assertStringContainsString('thumb_', $response->json('collage.thumb_url'));

        // Gallery memakai thumbnail, bukan lembar penuh.
        $this->actingAs($user)
            ->getJson('/collages')
            ->assertOk()
            ->assertJsonPath('data.0.thumb_url', $collage->thumbUrl());

        // Hapus strip: file thumbnail ikut hilang.
        $this->actingAs($user)->deleteJson('/collages/'.$collage->id)->assertOk();

        $this->assertFileDoesNotExist($this->photoDirectory.DIRECTORY_SEPARATOR.$collage->thumbName());
    }

    public function test_strip_tanpa_thumbnail_tetap_jalan(): void
    {
        $user = User::factory()->create();

        // Browser lama / klien lain boleh tidak mengirim thumb: gallery
        // jatuh ke lembar penuh, bukan error.
        $this->actingAs($user)->postJson('/collages', $this->payload())->assertCreated();

        $collage = Collage::firstOrFail();

        $this->assertFalse($collage->hasThumb());
        $this->assertSame($collage->url(), $collage->thumbUrl());
    }
}