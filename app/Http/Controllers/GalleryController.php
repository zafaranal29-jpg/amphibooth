<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;

class GalleryController extends Controller
{
    public function get_photos()
    {
        // 1. Cek user udah login atau belum
        if (!Session::has('user_id')) {
            return response()->json([
                'status' => 'error', 
                'pesan' => 'Kamu belum login!'
            ]);
        }

        $userId = Session::get('user_id');

        // 2. Ambil data dari tabel photos berdasarkan id_user yang lagi login
        // Diurutkan dari yang paling baru (descending)
        $photos = DB::table('photos')
                    ->where('id_user', $userId)
                    ->orderBy('created_at', 'desc')
                    ->get();

        // 3. Kirim datanya dalam bentuk JSON ke JavaScript
        return response()->json([
            'status' => 'sukses',
            'data' => $photos
        ]);
    }
}