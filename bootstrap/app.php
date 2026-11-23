<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Tamu yang membuka halaman terkunci diarahkan ke login,
        // user yang sudah login tidak perlu lihat halaman login lagi.
        $middleware->redirectGuestsTo(fn () => route('login'));
        $middleware->redirectUsersTo('/booth');

        /*
        | Percaya header X-Forwarded-* dari reverse proxy (Cloudflare Tunnel,
        | ngrok, load balancer hosting). Tanpa ini Laravel mengira request-nya
        | HTTP walau user buka HTTPS, jadi CSS/JS di-generate sebagai http://
        | dan browser memblokirnya sebagai mixed content.
        */
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
