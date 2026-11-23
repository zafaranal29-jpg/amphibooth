<?php

namespace App\Http\Controllers;

use App\Models\Photo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class ProfileController extends Controller
{
    /**
     * Halaman profil: ringkasan data + form ubah nama, ganti password,
     * dan zona bahaya (hapus semua strip).
     */
    public function edit(Request $request): View
    {
        $user = $request->user();

        $stats = [
            'collages' => $user->collages()->count(),
            'loved' => $user->collages()->loved()->count(),
            'photos' => Photo::whereIn('collage_id', $user->collages()->select('id'))->count(),
            'bytes' => $user->usedBytes(),
            'quota' => $user->quotaUsage(),
        ];

        return view('profile', [
            'user' => $user,
            'stats' => $stats,
        ]);
    }

    /**
     * Ganti nama tampilan (email dipakai buat login, jadi tidak diubah di sini).
     */
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'min:3',
                'max:50',
                Rule::unique('users', 'name')->ignore($request->user()->id),
            ],
        ], [
            'name.required' => 'Nama jangan kosong ya! 🥺',
            'name.min' => 'Nama minimal 3 huruf ya.',
            'name.max' => 'Nama maksimal 50 huruf.',
            'name.unique' => 'Nama itu sudah dipakai orang lain, coba yang lain 🌸',
        ]);

        $request->user()->update(['name' => $data['name']]);

        return redirect()->route('profile.edit')
            ->with('status', 'Nama kamu sekarang "'.$data['name'].'" ✨');
    }

    /**
     * Ganti password: wajib tahu password lama.
     */
    public function updatePassword(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'current_password.required' => 'Password lama wajib diisi 🔒',
            'current_password.current_password' => 'Password lama-nya belum bener nih 🥺',
            'password.required' => 'Password baru wajib diisi!',
            'password.min' => 'Password minimal 8 karakter biar aman 🔒',
            'password.confirmed' => 'Konfirmasi password-nya belum sama 🥺',
        ]);

        $request->user()->update(['password' => $data['password']]);

        return redirect()->route('profile.edit')
            ->with('status', 'Password baru sudah tersimpan 🔒');
    }

    /**
     * Zona bahaya: hapus semua strip + file mentahnya. Butuh konfirmasi
     * password supaya tidak kena klik nyasar.
     */
    public function destroyData(Request $request): RedirectResponse
    {
        $request->validate([
            'confirm_password' => ['required', 'current_password'],
        ], [
            'confirm_password.required' => 'Isi password dulu buat konfirmasi 🔒',
            'confirm_password.current_password' => 'Password-nya belum bener, data belum dihapus 🥺',
        ]);

        $user = $request->user();
        $deleted = 0;

        foreach ($user->collages()->get() as $collage) {
            $collage->deleteWithFiles();
            $deleted++;
        }

        // Sisa foto yang tidak terikat lembar (kalau ada) ikut dibersihkan.
        foreach ($user->photos()->get() as $photo) {
            if (File::exists($photo->path())) {
                File::delete($photo->path());
            }

            $photo->delete();
        }

        return redirect()->route('gallery')
            ->with('status', $deleted.' strip dihapus, semua filenya ikut bersih 🧹');
    }
}
