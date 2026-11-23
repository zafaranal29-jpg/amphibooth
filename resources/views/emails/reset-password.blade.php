<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset password Amphibooth</title>
</head>
<body style="margin:0;padding:0;background-color:#FFFDF9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">

    {{-- Preheader: teks yang muncul di preview inbox --}}
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
        Link buat bikin password baru di Amphibooth, berlaku {{ $menit }} menit.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFDF9;padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border:3px solid #795548;border-radius:22px;overflow:hidden;">

                    <tr>
                        <td style="padding:26px 28px 8px;text-align:center;">
                            <div style="font-size:26px;line-height:1;">📸</div>
                            <h1 style="margin:10px 0 0;font-size:22px;color:#5d4438;font-family:'Trebuchet MS',Arial,sans-serif;">
                                Amphibooth
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:14px 28px 0;">
                            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#6b5347;">
                                Hai <strong>{{ $nama }}</strong> 👋
                            </p>
                            <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#6b5347;">
                                Ada yang minta ganti password akun Amphibooth kamu. Kalau itu kamu,
                                klik tombol di bawah buat bikin password baru.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding:14px 28px 6px;">
                            <a href="{{ $url }}"
                               style="display:inline-block;padding:15px 28px;background-color:#FFC0CB;color:#3f2a28;text-decoration:none;font-weight:700;font-size:15px;border:3px solid #795548;border-radius:999px;">
                                Bikin password baru
                            </a>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:14px 28px 0;">
                            <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#A9968A;">
                                Tombol nggak bisa diklik? Salin link ini ke browser:
                            </p>
                            <p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#795548;word-break:break-all;">
                                {{ $url }}
                            </p>
                            <p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:#8a6f5f;">
                                Link ini cuma berlaku <strong>{{ $menit }} menit</strong>. Kalau kamu nggak
                                minta reset password, abaikan saja email ini — password kamu nggak berubah.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:16px 28px 24px;border-top:1px dashed #F0DCD9;">
                            <p style="margin:0;font-size:12px;line-height:1.6;color:#A9968A;text-align:center;">
                                Email otomatis dari Amphibooth · jangan balas email ini.<br>
                                Butuh bantuan? Hubungi {{ config('amphibooth.contact_email') }}
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
