<?php

namespace App\Http\Controllers;

use App\Models\Collage;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class PageController extends Controller
{
    /**
     * Halaman depan publik: jualan singkat + contoh strip + CTA demo.
     * User yang sudah login langsung diarahkan ke booth.
     */
    public function landing(): View|RedirectResponse
    {
        if (auth()->check()) {
            return redirect()->route('booth');
        }

        return view('landing');
    }

    /**
     * Catatan privasi: data apa yang disimpan & cara menghapusnya.
     */
    public function privacy(): View
    {
        return view('privacy');
    }

    /**
     * Halaman booth (kamera + filter + sesi strip).
     */
    public function booth(): View
    {
        return view('booth', ['demo' => false]);
    }

    /**
     * Mode coba-coba tanpa akun: booth tetap jalan, tapi hasilnya
     * tidak disimpan ke server (cuma bisa diunduh).
     */
    public function demo(): View
    {
        return view('booth', ['demo' => true]);
    }

    /**
     * Halaman gallery strip milik user.
     */
    public function gallery(): View
    {
        return view('gallery');
    }

    /**
     * Halaman publik satu strip (link share).
     */
    public function share(Collage $collage): View
    {
        $collage->loadMissing('user');

        return view('share', ['collage' => $collage]);
    }
}
