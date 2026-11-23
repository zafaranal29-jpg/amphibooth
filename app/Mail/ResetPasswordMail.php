<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Email "lupa password" versi Amphibooth.
 *
 * Dipakai lewat User::sendPasswordResetNotification(), jadi tampilannya
 * bukan template bawaan Laravel (yang bahasanya Inggris dan polos).
 */
class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $token,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset password Amphibooth 🔑',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reset-password',
            text: 'emails.reset-password-text',
            with: [
                'nama' => $this->user->name,
                'url' => $this->resetUrl(),
                'menit' => $this->expiresInMinutes(),
            ],
        );
    }

    /**
     * Link reset yang dibuka user dari email.
     */
    public function resetUrl(): string
    {
        return url(route('password.reset', [
            'token' => $this->token,
            'email' => $this->user->email,
        ], false));
    }

    /**
     * Masa berlaku token (menit), diambil dari config auth.
     */
    public function expiresInMinutes(): int
    {
        $broker = config('auth.defaults.passwords', 'users');

        return (int) config('auth.passwords.'.$broker.'.expire', 60);
    }
}
