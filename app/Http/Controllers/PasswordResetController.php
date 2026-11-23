<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\View\View;

class PasswordResetController extends Controller
{
    /**
     * Tampilkan form "lupa password".
     */
    public function showRequest(): View
    {
        return view('auth.forgot');
    }

    /**
     * Kirim link reset ke email.
     */
    public function sendLink(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'Email wajib diisi ya 🥺',
            'email.email' => 'Format email-nya belum bener nih 🥺',
        ]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return back()->with('status', $this->sentMessage());
        }

        // Jangan bilang "email nggak terdaftar" — itu bocorin daftar akun.
        // Pesannya sama saja, cuma beda di balik layar.
        if ($status === Password::INVALID_USER) {
            return back()->with('status', $this->sentMessage());
        }

        return back()
            ->withInput($request->only('email'))
            ->withErrors(['email' => 'Gagal kirim email reset, coba lagi beberapa saat 🥺']);
    }

    /**
     * Pesan yang sama untuk email terdaftar maupun tidak (anti-enumeration).
     * Di mode lokal link-nya cuma masuk log, jadi kasih tahu jujur.
     */
    private function sentMessage(): string
    {
        if (config('mail.default') === 'log') {
            return 'Kalau email itu terdaftar, link reset sudah dibuat 💌 Di mode lokal, link-nya cuma ditulis ke storage/logs/laravel.log.';
        }

        return 'Kalau email itu terdaftar, link reset sudah dikirim 💌 Cek inbox atau folder spam ya.';
    }

    /**
     * Tampilkan form password baru (dibuka dari link di email).
     */
    public function showReset(Request $request, string $token): View
    {
        return view('auth.reset', [
            'token' => $token,
            'email' => $request->query('email'),
        ]);
    }

    /**
     * Simpan password baru.
     */
    public function reset(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'email.required' => 'Email wajib diisi ya 🥺',
            'email.email' => 'Format email-nya belum bener nih 🥺',
            'password.required' => 'Password baru wajib diisi!',
            'password.min' => 'Password minimal 8 karakter biar aman 🔒',
            'password.confirmed' => 'Konfirmasi password-nya belum sama 🥺',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return redirect()->route('login')
                ->with('status', 'Password berhasil diganti, silakan login 💕');
        }

        return back()
            ->withInput($request->only('email'))
            ->withErrors(['email' => 'Link reset tidak valid atau sudah kedaluwarsa 🥺']);
    }
}
