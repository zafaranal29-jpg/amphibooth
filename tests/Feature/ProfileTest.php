<?php

namespace Tests\Feature;

use App\Models\Collage;
use App\Models\Photo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private string $photoDirectory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->photoDirectory = storage_path('framework/testing/profile-photos');
        File::ensureDirectoryExists($this->photoDirectory);
        config(['amphibooth.photos_path' => $this->photoDirectory]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->photoDirectory);

        parent::tearDown();
    }

    /**
     * Bikin satu lembar + 3 shot mentah lengkap dengan file di disk.
     * Nama file unik per lembar (seperti produksi) supaya tidak saling timpa.
     */
    private function makeCollage(User $user): Collage
    {
        $key = Str::lower(Str::random(10));

        $collage = Collage::create([
            'user_id' => $user->id,
            'layout' => 'strip3',
            'frame' => 'polaroid',
            'caption' => 'Uji profil',
            'file_name' => 'strip_'.$key.'.jpg',
            'share_token' => Str::random(32),
            'taken_at' => now(),
        ]);

        File::put($collage->path(), 'sheet');

        for ($i = 1; $i <= 3; $i++) {
            $photo = Photo::create([
                'user_id' => $user->id,
                'collage_id' => $collage->id,
                'position' => $i,
                'file_name' => 'shot_'.$key.'_'.$i.'.jpg',
            ]);

            File::put($photo->path(), 'shot');
        }

        return $collage;
    }

    public function test_tamu_diarahkan_ke_login(): void
    {
        $this->get('/profile')->assertRedirect('/login');
    }

    public function test_halaman_profil_menampilkan_ringkasan_data(): void
    {
        $user = User::factory()->create(['name' => 'Zafaran Uji']);
        $collage = $this->makeCollage($user);
        $collage->update(['is_loved' => true]);

        $response = $this->actingAs($user)->get('/profile');

        $response->assertOk()
            ->assertSee('Profil kamu')
            ->assertSee('Zafaran Uji')
            ->assertSee('Ubah nama')
            ->assertSee('Ganti password')
            ->assertSee('Hapus semua data');
    }

    public function test_user_bisa_mengganti_nama(): void
    {
        $user = User::factory()->create(['name' => 'Nama Lama']);

        $response = $this->actingAs($user)->patch('/profile', ['name' => 'Nama Baru']);

        $response->assertRedirect('/profile');
        $this->assertSame('Nama Baru', $user->fresh()->name);
    }

    public function test_ganti_nama_menolak_nama_kosong_dan_duplikat(): void
    {
        $user = User::factory()->create(['name' => 'Punya A']);
        User::factory()->create(['name' => 'Sudah Dipakai']);

        $this->actingAs($user)->patch('/profile', ['name' => ''])
            ->assertSessionHasErrors('name');

        $this->actingAs($user)->patch('/profile', ['name' => 'Sudah Dipakai'])
            ->assertSessionHasErrors('name');

        $this->assertSame('Punya A', $user->fresh()->name);
    }

    public function test_ganti_nama_ke_nama_sendiri_tetap_boleh(): void
    {
        $user = User::factory()->create(['name' => 'Tetap Sama']);

        $this->actingAs($user)->patch('/profile', ['name' => 'Tetap Sama'])
            ->assertSessionHasNoErrors();

        $this->assertSame('Tetap Sama', $user->fresh()->name);
    }

    public function test_user_bisa_mengganti_password(): void
    {
        $user = User::factory()->create(['password' => 'password-lama']);

        $response = $this->actingAs($user)->put('/profile/password', [
            'current_password' => 'password-lama',
            'password' => 'password-baru-8',
            'password_confirmation' => 'password-baru-8',
        ]);

        $response->assertRedirect('/profile');
        $this->assertTrue(Hash::check('password-baru-8', $user->fresh()->password));
    }

    public function test_ganti_password_menolak_password_lama_salah(): void
    {
        $user = User::factory()->create(['password' => 'password-lama']);

        $this->actingAs($user)->put('/profile/password', [
            'current_password' => 'password-ngawur',
            'password' => 'password-baru-8',
            'password_confirmation' => 'password-baru-8',
        ])->assertSessionHasErrors('current_password');

        $this->assertTrue(Hash::check('password-lama', $user->fresh()->password));
    }

    public function test_ganti_password_menolak_konfirmasi_beda(): void
    {
        $user = User::factory()->create(['password' => 'password-lama']);

        $this->actingAs($user)->put('/profile/password', [
            'current_password' => 'password-lama',
            'password' => 'password-baru-8',
            'password_confirmation' => 'lain-lagi',
        ])->assertSessionHasErrors('password');

        $this->assertTrue(Hash::check('password-lama', $user->fresh()->password));
    }

    public function test_hapus_data_butuh_password_benar(): void
    {
        $user = User::factory()->create(['password' => 'password-lama']);
        $this->makeCollage($user);

        $this->actingAs($user)->delete('/profile/data', ['confirm_password' => 'salah-banget'])
            ->assertSessionHasErrors('confirm_password');

        $this->assertSame(1, $user->collages()->count());
        $this->assertSame(4, count(File::files($this->photoDirectory)));
    }

    public function test_hapus_data_membersihkan_strip_foto_dan_file(): void
    {
        $user = User::factory()->create(['password' => 'password-lama']);
        $this->makeCollage($user);
        $this->makeCollage($user);

        $other = User::factory()->create();
        $this->makeCollage($other);

        $response = $this->actingAs($user)->delete('/profile/data', [
            'confirm_password' => 'password-lama',
        ]);

        $response->assertRedirect('/gallery');

        // Punya user sendiri hilang...
        $this->assertSame(0, $user->collages()->count());
        $this->assertSame(0, Photo::where('user_id', $user->id)->count());

        // ...tapi punya user lain tidak tersentuh.
        $this->assertSame(1, $other->collages()->count());
        $this->assertSame(4, count(File::files($this->photoDirectory)));

        // Akun tetap ada.
        $this->assertNotNull($user->fresh());
    }
}
