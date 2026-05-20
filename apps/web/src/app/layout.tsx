import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kelassi — Révisions BEPC & BAC Congo Brazzaville',
  description: 'Cours résumés, examens d\'État officiels avec corrigés et tuteur IA pour les élèves congolais. Prépare ton BEPC et ton BAC avec Kelassi.',
  keywords: ['BEPC Congo', 'BAC Congo Brazzaville', 'cours révision', 'examens état corrigés', 'tuteur IA'],
  openGraph: {
    title: 'Kelassi — Révisions BEPC & BAC Congo',
    description: 'L\'app de révision IA pour les élèves congolais',
    locale: 'fr_CG',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
