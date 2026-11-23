<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        /*
         * Batas percobaan halaman profil.
         *
         * Penting: `throttle:6,1` yang ditulis langsung di route itu
         * kuncinya cuma "domain + user", jadi SEMUA route ber-limit sama
         * ikut menghabiskan kuota yang sama (ganti password lalu hapus
         * data bisa kena 429 padahal baru beberapa klik). Karena itu tiap
         * aksi dikasih limiter sendiri dengan kunci sendiri.
         */
        RateLimiter::for('profile-password', function (Request $request) {
            return Limit::perMinute(6)->by('profile-password|'.($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('profile-wipe', function (Request $request) {
            return Limit::perMinute(4)->by('profile-wipe|'.($request->user()?->id ?? $request->ip()));
        });
    }
}
