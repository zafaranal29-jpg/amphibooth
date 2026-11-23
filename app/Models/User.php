<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Mail\ResetPasswordMail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Semua foto milik user ini.
     */
    public function photos(): HasMany
    {
        return $this->hasMany(Photo::class);
    }

    /**
     * Semua lembar (strip) milik user ini.
     */
    public function collages(): HasMany
    {
        return $this->hasMany(Collage::class);
    }

    /**
     * Total byte file milik user: lembar + shot mentah yang masih ada di disk.
     */
    public function usedBytes(): int
    {
        $bytes = 0;

        foreach ($this->collages()->with('photos')->get() as $collage) {
            if ($collage->exists()) {
                $bytes += File::size($collage->path());
            }

            foreach ($collage->photos as $photo) {
                if (File::exists($photo->path())) {
                    $bytes += File::size($photo->path());
                }
            }
        }

        return $bytes;
    }

    /**
     * Batas jumlah strip per akun.
     */
    public function quotaStrips(): int
    {
        return max(1, (int) config('amphibooth.quota_strips', 100));
    }

    /**
     * Batas total penyimpanan per akun (byte).
     */
    public function quotaBytes(): int
    {
        return max(1, (int) config('amphibooth.quota_mb', 200)) * 1048576;
    }

    /**
     * Cek apakah masih ada jatah untuk sesi baru. Balikin pesan penolakan
     * (siap ditampilkan ke user) atau null kalau masih muat.
     */
    public function quotaBlocker(int $extraBytes = 0): ?string
    {
        if ($this->collages()->count() >= $this->quotaStrips()) {
            return 'Kuota strip kamu sudah penuh ('.$this->quotaStrips()
                .' strip). Hapus beberapa strip di gallery dulu ya 🧹';
        }

        if ($this->usedBytes() + $extraBytes > $this->quotaBytes()) {
            return 'Penyimpanan kamu hampir penuh (batas '.config('amphibooth.quota_mb')
                .' MB). Hapus beberapa strip lama dulu ya 🧹';
        }

        return null;
    }

    /**
     * Ringkasan pemakaian kuota buat halaman profil.
     *
     * @return array{strips:int, strips_quota:int, strips_percent:int, bytes:int, bytes_quota:int, bytes_percent:int}
     */
    public function quotaUsage(): array
    {
        $strips = $this->collages()->count();
        $stripsQuota = $this->quotaStrips();
        $bytes = $this->usedBytes();
        $bytesQuota = $this->quotaBytes();

        return [
            'strips' => $strips,
            'strips_quota' => $stripsQuota,
            'strips_percent' => (int) min(100, round($strips / $stripsQuota * 100)),
            'bytes' => $bytes,
            'bytes_quota' => $bytesQuota,
            'bytes_percent' => (int) min(100, round($bytes / $bytesQuota * 100)),
        ];
    }

    /**
     * Kirim email reset password pakai template Amphibooth (bukan bawaan
     * Laravel yang bahasa Inggris dan polos).
     */
    public function sendPasswordResetNotification($token): void
    {
        Mail::to($this->email)->send(new ResetPasswordMail($this, (string) $token));
    }
}
