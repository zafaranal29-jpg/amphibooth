<?php

namespace App\Console\Commands;

use App\Mail\TestMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Cek konfigurasi email tanpa harus bikin akun atau nunggu link reset.
 *
 *   php artisan mail:test zafaranal29@gmail.com
 */
class SendTestMail extends Command
{
    protected $signature = 'mail:test {email : Alamat tujuan email uji}';

    protected $description = 'Kirim email uji lewat konfigurasi MAIL_* (cek koneksi SMTP/Brevo)';

    public function handle(): int
    {
        $to = (string) $this->argument('email');
        $mailer = (string) config('mail.default');
        $host = (string) config('mail.mailers.smtp.host');
        $port = (string) config('mail.mailers.smtp.port');
        $from = (string) config('mail.from.address');

        $this->line('Mailer : '.$mailer);
        $this->line('Server : '.$host.':'.$port);
        $this->line('Dari   : '.$from);
        $this->newLine();

        if ($mailer === 'log') {
            $this->warn('MAIL_MAILER=log → email nggak dikirim, cuma ditulis ke storage/logs/laravel.log.');
            $this->line('Isi dulu MAIL_MAILER=smtp + kredensial Brevo di .env kalau mau kirim beneran.');
        }

        if (! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            $this->error('Alamat "'.$to.'" kayaknya bukan email yang valid.');

            return self::FAILURE;
        }

        try {
            Mail::to($to)->send(new TestMail());
        } catch (Throwable $error) {
            $this->error('Gagal kirim: '.$error->getMessage());
            $this->newLine();
            $this->line('Yang paling sering salah:');
            $this->line('  · MAIL_USERNAME = email login Brevo, MAIL_PASSWORD = SMTP key (bukan password akun)');
            $this->line('  · Host smtp-relay.brevo.com, port 587, MAIL_SCHEME=null (STARTTLS otomatis)');
            $this->line('  · Alamat pengirim (MAIL_FROM_ADDRESS) harus sudah diverifikasi di Brevo');
            $this->line('  · Kalau error "Connection timed out", hosting memblokir port 25/587 → pakai 2525 atau API');

            return self::FAILURE;
        }

        if ($mailer === 'log') {
            $this->info('Tertulis ke log (bukan terkirim). Cek storage/logs/laravel.log.');

            return self::SUCCESS;
        }

        $this->info('Terkirim ke '.$to.' lewat '.$mailer.'. Cek inbox & folder spam.');
        $this->line('Kalau masuk spam: tandai "bukan spam" sekali, biasanya email berikutnya masuk inbox.');

        return self::SUCCESS;
    }
}
