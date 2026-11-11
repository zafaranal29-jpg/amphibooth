<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amphibooth - Welcome back, cutie!</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Quicksand:wght@600;700&display=swap" rel="stylesheet">
    
    <link rel="stylesheet" href="{{ asset('css/login.css') }}">
</head>
<body>

    <div class="auth-container">
        <div class="auth-box">
            <h1 class="brand-title">Amphibooth</h1>
            <p class="brand-subtitle">Welcome back, cutie! 🤓</p>
            
            @if (session('status'))
                <div style="background-color: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin-bottom: 15px; text-align: center; border: 1px solid #c3e6cb; font-family: 'Quicksand', sans-serif;">
                    {{ session('status') }}
                </div>
            @endif

            @if ($errors->has('login_error'))
                <div style="background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-bottom: 15px; text-align: center; border: 1px solid #f5c6cb; font-family: 'Quicksand', sans-serif;">
                    {{ $errors->first('login_error') }}
                </div>
            @endif
            
            <form action="{{ url('/login') }}" method="POST">
                
                @csrf
                
                <input type="hidden" name="aksi" value="login">
                
                <div class="input-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" placeholder="your.email@cute.com" required>
                </div>
                
                <div class="input-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="••••••••" required>
                </div>
                
                <button type="submit" class="btn-auth">Let's Go! 💖</button>
            </form>
            
            <div class="auth-links">
                <p>Don't have an account? <a href="{{ url('/register') }}">Sign up! 🌸</a></p>
                <a href="{{ url('/forgot-password') }}" class="forgot-link">Forgot password? 🤔</a>
            </div>
        </div>
    </div>

    <div class="floating-assets">
        <span class="asset frog-1">🐸</span>
        <span class="asset star-1">⭐</span>
        <span class="asset heart-1">💖</span>
        <span class="asset sparkle-1">✨</span>
        <span class="asset bubble-1">🫧</span>
        <span class="asset cat-1">🐱</span>
        <span class="asset bunny-1">🐰</span>
        <span class="asset flower-1">🌸</span>
        <span class="asset ribbon-1">🎀</span>
        <span class="asset bear-1">🧸</span>
        <span class="asset text-cute">Cute! 💕</span>
        <span class="asset text-boop">Boop! 🐾</span>
    </div>

</body>
</html>