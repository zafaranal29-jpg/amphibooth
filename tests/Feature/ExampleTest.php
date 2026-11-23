<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Halaman depan itu landing page publik: tamu lihat jualannya,
     * user yang sudah login langsung dilempar ke booth.
     */
    public function test_landing_page_tampil_untuk_tamu(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('Photo booth imut')
            ->assertSee('Coba Demo Gratis')
            ->assertSee(route('demo'));
    }

    public function test_user_login_langsung_ke_booth(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/')->assertRedirect(route('booth'));
    }

    public function test_halaman_privasi_bisa_dibuka_tanpa_login(): void
    {
        $this->get('/privasi')
            ->assertOk()
            ->assertSee('Catatan privasi')
            ->assertSee('tidak bisa diakses dari browser');
    }
}
