<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class Collage extends Model
{
    use HasFactory;

    /**
     * Preset frame yang dikenal aplikasi. Harus sama dengan daftar di
     * public/js/strip.js (dipakai juga buat validasi request).
     *
     * @var list<string>
     */
    public const FRAMES = [
        'polaroid', 'film', 'scallop', 'minimal', 'solid', 'plain',
        'wedding', 'maroon', 'hollywood', 'retro', 'airline', 'news',
        'candy', 'halloween', 'popart', 'paradise',
    ];

    /**
     * Layout yang tersedia. 'single' hanya dipakai data lama.
     *
     * @var array<string, array{shots: int, label: string}>
     */
    public const LAYOUTS = [
        'strip3' => ['shots' => 3, 'label' => 'Strip 3'],
        'single' => ['shots' => 1, 'label' => 'Foto Tunggal'],
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'layout',
        'frame',
        'frame_color',
        'caption',
        'date_stamp',
        'file_name',
        'share_token',
        'is_loved',
        'taken_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_loved' => 'boolean',
            'date_stamp' => 'boolean',
            'taken_at' => 'datetime',
        ];
    }

    /**
     * Pemilik lembar.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Shot mentah (1..3) yang membentuk lembar ini.
     */
    public function photos(): HasMany
    {
        return $this->hasMany(Photo::class)->orderBy('position');
    }

    /**
     * Scope: hanya yang ditandai love.
     */
    public function scopeLoved(Builder $query): Builder
    {
        return $query->where('is_loved', true);
    }

    /**
     * Jumlah shot sesuai layout.
     */
    public function shotCount(): int
    {
        return self::LAYOUTS[$this->layout]['shots'] ?? 1;
    }

    /**
     * Label layout buat badge di kartu gallery.
     */
    public function layoutLabel(): string
    {
        return self::LAYOUTS[$this->layout]['label'] ?? Str::title($this->layout);
    }

    /**
     * URL publik lembar jadi (tanpa storage:link).
     */
    public function url(): string
    {
        return asset('images/photos/'.$this->file_name);
    }

    /**
     * Path lengkap file lembar di disk.
     */
    public function path(): string
    {
        return rtrim(config('amphibooth.photos_path'), '/\\').DIRECTORY_SEPARATOR.$this->file_name;
    }

    /**
     * Filenya masih ada di disk? Dipakai biar gallery/share nggak nampilin
     * gambar rusak kalau file-nya keburu hilang (pernah kejadian).
     */
    public function exists(): bool
    {
        return File::exists($this->path());
    }

    /**
     * Nama file saat diunduh user.
     */
    public function downloadName(): string
    {
        $date = ($this->taken_at ?? $this->created_at)?->format('Y-m-d') ?? date('Y-m-d');

        return 'amphibooth-'.$this->layout.'-'.$date.'.'.pathinfo($this->file_name, PATHINFO_EXTENSION);
    }

    /**
     * Link share publik.
     */
    public function shareUrl(): string
    {
        return route('share.show', ['collage' => $this->share_token]);
    }

    /**
     * Hapus lembar beserta seluruh file shot-nya.
     */
    public function deleteWithFiles(): void
    {
        foreach ($this->photos as $photo) {
            if (File::exists($photo->path())) {
                File::delete($photo->path());
            }
        }

        if (File::exists($this->path())) {
            File::delete($this->path());
        }

        $this->photos()->delete();
        $this->delete();
    }
}