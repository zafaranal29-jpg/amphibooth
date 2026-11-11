<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;

class AuthController extends Controller
{
    // ==========================================
    // 1. FUNGSI UNTUK REGISTER (Yang udah berhasil)
    // ==========================================
    public function proses_register(Request $request)
    {
        $request->validate([
            'username' => 'required',
            'email' => 'required|email',
            'password' => 'required'
        ]);

        DB::table('users')->insert([
            'username' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password), 
            'created_at' => now() 
        ]);

        return redirect('/login')->with('status', 'Akun berhasil dibuat, Cutie! 💕 Silahkan login.');
    }

    // ==========================================
    // 2. FUNGSI UNTUK LOGIN (Ini yang barusan dicari Laravel)
    // ==========================================
    public function proses_login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        // Cari user di database berdasarkan email
        $user = DB::table('users')->where('email', $request->email)->first();

        // Cek apakah email ketemu DAN password yang diketik cocok sama yang di database
        if ($user && Hash::check($request->password, $user->password)) {
            
            // Bikin session buat nandain kalau user ini lagi login
            Session::put('user_id', $user->id);
            Session::put('username', $user->username);

            // Langsung lempar ke halaman Booth! 📸
            return redirect('/booth');
        }

        // Kalau email atau password salah, balikin ke halaman login bawa pesan error
        return back()->withErrors(['login_error' => 'Email atau password salah, Cutie! 🥺']);
    }

    // ==========================================
    // 3. FUNGSI UNTUK LOGOUT
    // ==========================================
    public function logout()
    {
        // Hapus semua ingatan/session
        Session::flush();

        // Balikin ke login
        return redirect('/login');
    }
}