<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_halaman_booth_dan_gallery_tertutup_untuk_tamu(): void
    {
        $this->get('/booth')->assertRedirect(route('login'));
        $this->get('/gallery')->assertRedirect(route('login'));
        $this->get('/collages')->assertRedirect(route('login'));
    }

    public function test_user_login_bisa_buka_booth_dan_gallery(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/booth')->assertOk()->assertSee('Strike a Pose');
        $this->actingAs($user)->get('/gallery')->assertOk()->assertSee($user->name);
    }

    public function test_register_membuat_user_dan_langsung_login(): void
    {
        $response = $this->post('/register', [
            'name' => 'Cutie Baru',
            'email' => 'cutie@example.com',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ]);

        $response->assertRedirect(route('booth'));
        $this->assertAuthenticated();

        $this->assertDatabaseHas('users', [
            'name' => 'Cutie Baru',
            'email' => 'cutie@example.com',
        ]);
    }

    public function test_register_menolak_email_dobel_dan_password_pendek(): void
    {
        User::factory()->create(['email' => 'dipakai@example.com']);

        $this->from('/register')->post('/register', [
            'name' => 'Lain Lagi',
            'email' => 'dipakai@example.com',
            'password' => '123',
            'password_confirmation' => '123',
        ])->assertRedirect('/register')
            ->assertSessionHasErrors(['email', 'password']);

        $this->assertGuest();
    }

    public function test_register_menolak_konfirmasi_password_beda(): void
    {
        $this->from('/register')->post('/register', [
            'name' => 'Cutie',
            'email' => 'cutie@example.com',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia321',
        ])->assertSessionHasErrors('password');

        $this->assertGuest();
    }

    public function test_login_berhasil_dengan_kredensial_benar(): void
    {
        $user = User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'rahasia123',
        ]);

        $this->post('/login', [
            'email' => 'login@example.com',
            'password' => 'rahasia123',
        ])->assertRedirect(route('booth'));

        $this->assertAuthenticatedAs($user);
    }

    public function test_login_gagal_dengan_password_salah(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'rahasia123',
        ]);

        $this->from('/login')->post('/login', [
            'email' => 'login@example.com',
            'password' => 'password-salah',
        ])->assertRedirect('/login')
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_user_login_diarahkan_ke_booth_dari_halaman_login(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/login')->assertRedirect('/booth');
    }

    public function test_logout_memakai_post_dan_menghapus_session_login(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/logout')->assertRedirect(route('login'));

        $this->assertGuest();
    }

    public function test_logout_lewat_get_tidak_diizinkan(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/logout')->assertStatus(405);

        $this->assertAuthenticatedAs($user);
    }
}
