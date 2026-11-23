<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Photo extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'collage_id',
        'position',
        'file_name',
        'is_loved',
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
        ];
    }

    /**
     * Pemilik foto.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Lembar (strip) tempat shot ini berada.
     */
    public function collage(): BelongsTo
    {
        return $this->belongsTo(Collage::class);
    }

    /**
     * URL publik file foto (tanpa storage:link).
     */
    public function url(): string
    {
        return asset('images/photos/'.$this->file_name);
    }

    /**
     * Path lengkap file di disk.
     */
    public function path(): string
    {
        return rtrim(config('amphibooth.photos_path'), '/\\').DIRECTORY_SEPARATOR.$this->file_name;
    }
}
