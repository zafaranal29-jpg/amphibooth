{{-- Animasi UI — bundle (dibangun lewat `npm run build:anim`). --}}
<script defer src="{{ asset('js/animations.js') }}?v={{ filemtime(public_path('js/animations.js')) }}"></script>
