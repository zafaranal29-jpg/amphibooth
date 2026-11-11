<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;

class BoothController extends Controller
{
    public function simpan_foto(Request $request)
    {
        // 1. Pastikan user udah login
        if (!Session::has('user_id')) {
            return response()->json(['success' => false, 'message' => 'Oops, kamu belum login!']);
        }

        // 2. Ambil data gambar Base64 dari JavaScript
        $imageData = $request->image; 
        
        // Bersihkan string Base64-nya
        $image_parts = explode(";base64,", $imageData);
        $image_base64 = base64_decode($image_parts[1]);

        // 3. Buat nama file unik (Contoh: cutie_1_1701234567.png)
        $userId = Session::get('user_id');
        $fileName = 'cutie_' . $userId . '_' . time() . '.png';

        // 4. Siapkan jalur folder penyimpanan (public/images/photos/)
        $folderPath = public_path('images/photos/');
        
        // Cek apakah foldernya udah ada? Kalau belum, Laravel bakal bikinin otomatis
        if (!file_exists($folderPath)) {
            mkdir($folderPath, 0777, true);
        }

        // Simpan file gambar fisik ke folder tersebut
        $destinationPath = $folderPath . $fileName;
        file_put_contents($destinationPath, $image_base64);

        // 5. Simpan nama file ke database (✅ SESUAI DENGAN SCREENSHOT LU)
        DB::table('photos')->insert([
            'id_user' => $userId,       // Diubah dari user_id jadi id_user
            'nama_file' => $fileName,   // Diubah dari photo_url jadi nama_file
            'created_at' => now()
        ]);

        return response()->json(['success' => true, 'message' => 'Yess! Foto berhasil disimpan 💖']);
    }
}