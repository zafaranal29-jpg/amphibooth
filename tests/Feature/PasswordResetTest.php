<?php

namespace Tests\Feature;

use App\Mail\ResetPasswordMail;
use App\Mail\TestMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_form_lupa_password_bisa_dibuka(): void
    {
        $this->get('/forgot-password')->assertOk()->assertSee('Kirim link reset');
    }

    public function test_kirim_link_reset_untuk_email_terdaftar(): void
    {
        User::factory()->create(['email' => 'lupa@example.com']);

        $this->from('/forgot-password')
            ->post('/forgot-password', ['email' => 'lupa@example.com'])
            ->assertRedirect('/forgot-password')
            ->assertSessionHas('status');

        $this->assertDatabaseHas('password_reset_tokens', ['email' => 'lupa@example.com']);
    }

    public function test_email_tidak_terdaftar_dapat_pesan_yang_sama(): void
    {
        // Anti-enumeration: pesan untuk email terdaftar dan tidak harus sama,
        // biar orang luar nggak bisa nebak siapa yang punya akun.
        $this->from('/forgot-password')
            ->post('/forgot-password', ['email' => 'gak-ada@example.com'])
            ->assertRedirect('/forgot-password')
            ->assertSessionHas('status')
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'gak-ada@example.com']);
    }

    public function test_email_reset_pakai_template_amphibooth(): void
    {
        Mail::fake();

        User::factory()->create(['email' => 'reset@example.com', 'name' => 'Zafaran']);

        $this->from('/forgot-password')
            ->post('/forgot-password', ['email' => 'reset@example.com'])
            ->assertRedirect('/forgot-password');

        Mail::assertSent(ResetPasswordMail::class, function (ResetPasswordMail $mail) {
            $html = $mail->render();

            return $mail->hasTo('reset@example.com')
                && str_contains($html, 'Bikin password baru')
                && str_contains($html, 'Zafaran')
                && str_contains($html, '/reset-password/'.$mail->token);
        });
    }

    public function test_command_mail_test_mengirim_email(): void
    {
        Mail::fake();

        $this->artisan('mail:test', ['email' => 'cek@example.com'])->assertSuccessful();

        Mail::assertSent(TestMail::class, fn (TestMail $mail) => $mail->hasTo('cek@example.com'));
    }

    public function test_command_mail_test_menolak_alamat_ngawur(): void
    {
        Mail::fake();

        $this->artisan('mail:test', ['email' => 'bukan-email'])->assertFailed();

        Mail::assertNothingSent();
    }

    public function test_reset_password_dengan_token_valid(): void
    {
        $user = User::factory()->create([
            'email' => 'reset@example.com',
            'password' => 'password-lama',
        ]);

        $token = Password::createToken($user);

        $this->post('/reset-password', [
            'token' => $token,
            'email' => 'reset@example.com',
            'password' => 'password-baru-123',
            'password_confirmation' => 'password-baru-123',
        ])->assertRedirect(route('login'));

        $this->assertTrue(Hash::check('password-baru-123', $user->fresh()->password));
    }

    public function test_reset_password_menolak_token_palsu(): void
    {
        $user = User::factory()->create(['email' => 'reset@example.com']);

        $this->from('/reset-password/token-palsu')
            ->post('/reset-password', [
                'token' => 'token-palsu',
                'email' => 'reset@example.com',
                'password' => 'password-baru-123',
                'password_confirmation' => 'password-baru-123',
            ])->assertSessionHasErrors('email');

        $this->assertFalse(Hash::check('password-baru-123', $user->fresh()->password));
    }
}
