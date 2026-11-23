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
     * Total byte file milik user: lembar + shot mentah + thumbnail yang masih ada di disk.
     */
    public function usedBytes(): int
    {
        $bytes = 0;

        foreach ($this->collages()->with('photos')->get() as $collage) {
            if ($collage->exists()) {
                $bytes += File::size($collage->path());
            }

            if ($collage->hasThumb()) {
                $bytes += File::size($collage->thumbPath());
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
     * Total byte seluruh folder foto (semua user) — dipakai buat kuota booth.
     */
    public function globalUsedBytes(): int
    {
        $directory = rtrim((string) config('amphibooth.photos_path'), '/\\');

        if (! File::isDirectory($directory)) {
            return 0;
        }

        $bytes = 0;

        foreach (File::files($directory) as $file) {
            $bytes += $file->getSize();
        }

        return $bytes;
    }

    /**
     * Batas jumlah strip per akun.
     */
    public function quotaStrips(): int
    {
        return max(1, (int) config('amphibooth.quota_strips', 90));
    }

    /**
     * Batas total penyimpanan per akun (byte).
     */
    public function quotaBytes(): int
    {
        return max(1, (int) config('amphibooth.quota_mb', 60)) * 1048576;
    }

    /**
     * Batas penyimpanan seluruh booth (byte).
     */
    public function globalQuotaBytes(): int
    {
        return max(1, (int) config('amphibooth.quota_total_mb', 700)) * 1048576;
    }

    /**
     * Cek apakah masih ada jatah untuk sesi baru. Balikin pesan penolakan
     * (siap ditampilkan ke user) atau null kalau masih muat.
     *
     * Urutan: kuota booth dulu (yang menyelamatkan disk hosting), baru
     * kuota akun.
     */
    public function quotaBlocker(int $extraBytes = 0): ?string
    {
        $globalUsed = $this->globalUsedBytes();

        if ($globalUsed + $extraBytes > $this->globalQuotaBytes()) {
            return 'Storage booth sudah penuh ('.config('amphibooth.quota_total_mb')
                .' MB terpakai semua akun). Coba hapus beberapa strip lama dulu ya 🧹';
        }

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
     * @return array{strips:int, strips_quota:int, strips_percent:int, bytes:int, bytes_quota:int, bytes_percent:int, global_bytes:int, global_quota:int, global_percent:int}
     */
    public function quotaUsage(): array
    {
        $strips = $this->collages()->count();
        $stripsQuota = $this->quotaStrips();
        $bytes = $this->usedBytes();
        $bytesQuota = $this->quotaBytes();
        $globalBytes = $this->globalUsedBytes();
        $globalQuota = $this->globalQuotaBytes();

        return [
            'strips' => $strips,
            'strips_quota' => $stripsQuota,
            'strips_percent' => (int) min(100, round($strips / $stripsQuota * 100)),
            'bytes' => $bytes,
            'bytes_quota' => $bytesQuota,
            'bytes_percent' => (int) min(100, round($bytes / $bytesQuota * 100)),
            'global_bytes' => $globalBytes,
            'global_quota' => $globalQuota,
            'global_percent' => (int) min(100, round($globalBytes / $globalQuota * 100)),
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
