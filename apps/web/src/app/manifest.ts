import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kelassi — Révisions BEPC & BAC',
    short_name: 'Kelassi',
    description: 'Cours résumés, examens d\'État et tuteur IA pour les élèves congolais',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    categories: ['education'],
    lang: 'fr',
    shortcuts: [
      { name: 'Cours', url: '/cours', description: 'Accéder aux cours' },
      { name: 'Kelassi IA', url: '/tuteur', description: 'Tuteur IA' },
      { name: 'Flashcards', url: '/flashcards', description: 'Révision espacée' },
    ],
  }
}
