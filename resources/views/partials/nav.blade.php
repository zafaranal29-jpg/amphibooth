<nav class="top-nav">
    @if ($demo ?? false)
        <a href="{{ route('login') }}" class="nav-btn">Masuk</a>
        <a href="{{ route('register') }}" class="nav-btn active">Daftar Gratis</a>
    @else
        <a href="{{ route('booth') }}" class="nav-btn {{ ($active ?? '') === 'booth' ? 'active' : '' }}">
            <i class="fa-solid fa-camera"></i> Booth
        </a>

        <a href="{{ route('gallery') }}" class="nav-btn {{ ($active ?? '') === 'gallery' ? 'active' : '' }}">
            <i class="fa-solid fa-images"></i> Gallery
        </a>

        <a href="{{ route('profile.edit') }}" class="nav-btn {{ ($active ?? '') === 'profile' ? 'active' : '' }}">
            <i class="fa-solid fa-user"></i> Profil
        </a>

        <div class="nav-divider"></div>

        <form method="POST" action="{{ route('logout') }}" class="logout-form">
            @csrf
            <button type="submit" class="nav-btn logout">
                <i class="fa-solid fa-arrow-right-from-bracket"></i> Keluar
            </button>
        </form>
    @endif
</nav>