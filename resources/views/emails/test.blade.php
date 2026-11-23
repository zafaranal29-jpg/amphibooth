<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Tes email Amphibooth</title>
</head>
<body style="margin:0;padding:24px;background-color:#FFFDF9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border:3px solid #795548;border-radius:20px;">
        <tr>
            <td style="padding:24px 26px;">
                <h1 style="margin:0 0 12px;font-size:20px;color:#5d4438;">✅ Email Amphibooth nyambung</h1>
                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#6b5347;">
                    Kalau email ini nyampe ke inbox kamu, berarti konfigurasi pengiriman sudah bener.
                    Link reset password bakal dikirim lewat jalur yang sama.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#6b5347;">
                    <tr>
                        <td style="padding:6px 0;border-bottom:1px dashed #F0DCD9;">Mailer</td>
                        <td style="padding:6px 0;border-bottom:1px dashed #F0DCD9;text-align:right;font-weight:700;">{{ $mailer }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;border-bottom:1px dashed #F0DCD9;">Host:port</td>
                        <td style="padding:6px 0;border-bottom:1px dashed #F0DCD9;text-align:right;font-weight:700;">{{ $host }}:{{ $port }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;border-bottom:1px dashed #F0DCD9;">Pengirim</td>
                        <td style="padding:6px 0;border-bottom:1px dashed #F0DCD9;text-align:right;font-weight:700;">{{ $from }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;">Dikirim</td>
                        <td style="padding:6px 0;text-align:right;font-weight:700;">{{ $waktu }}</td>
                    </tr>
                </table>

                <p style="margin:18px 0 0;font-size:12px;color:#A9968A;">
                    Kalau email ini masuk folder spam, tandai "bukan spam" biar email berikutnya masuk inbox.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
