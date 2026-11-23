<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class AuthController extends Controller
{
    /**
     * Tampilkan form login.
     */
    public function showLogin(): View
    {
        return view('auth.login');
    }

    /**
     * Proses login memakai guard bawaan Laravel.
     */
    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'Email wajib diisi, Cutie! 🥺',
            'email.email' => 'Format email-nya belum bener nih 🥺',
            'password.required' => 'Password jangan kosong ya! 🥺',
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => 'Email atau password salah, Cutie! 🥺',
            ]);
        }

        $request->session()->regenerate();

        return redirect()->intended(route('booth'))
            ->with('status', 'Selamat datang lagi, '.Auth::user()->name.'! 💕');
    }

    /**
     * Tampilkan form registrasi.
     */
    public function showRegister(): View
    {
        return view('auth.register');
    }

    /**
     * Simpan user baru lalu langsung login.
     */
    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:50', 'unique:users,name'],
            'email' => ['required', 'email', 'max:100', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'name.required' => 'Username wajib diisi! ✨',
            'name.min' => 'Username minimal 3 huruf ya.',
            'name.max' => 'Username maksimal 50 huruf.',
            'name.unique' => 'Username itu sudah dipakai, coba yang lain 🌸',
            'email.required' => 'Email wajib diisi!',
            'email.email' => 'Format email-nya belum bener nih 🥺',
            'email.unique' => 'Email ini sudah terdaftar, langsung login aja 💕',
            'password.required' => 'Password wajib diisi!',
            'password.min' => 'Password minimal 8 karakter biar aman 🔒',
            'password.confirmed' => 'Konfirmasi password-nya belum sama 🥺',
        ]);

        $user = User::create($data);

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('booth')
            ->with('status', 'Akun berhasil dibuat, '.$user->name.'! Yuk foto 📸');
    }

    /**
     * Logout (POST + CSRF, bukan link GET lagi).
     */
    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('status', 'Sampai jumpa lagi! 👋');
    }
}
