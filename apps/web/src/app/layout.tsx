import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { WebVitals } from '@/components/web-vitals'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Kelassi — Révisions BEPC & BAC Congo Brazzaville',
    template: '%s | Kelassi',
  },
  description: 'Cours résumés, examens d\'État officiels avec corrigés et tuteur IA pour les élèves congolais. Prépare ton BEPC et ton BAC avec Kelassi.',
  keywords: ['BEPC Congo', 'BAC Congo Brazzaville', 'cours révision', 'examens état corrigés', 'tuteur IA', 'révision scolaire Congo'],
  authors: [{ name: 'Kelassi' }],
  creator: 'Kelassi',
  openGraph: {
    title: 'Kelassi — Révisions BEPC & BAC Congo',
    description: 'L\'app de révision IA pour les élèves congolais',
    locale: 'fr_CG',
    type: 'website',
    siteName: 'Kelassi',
  },
  twitter: {
    card: 'summary',
    title: 'Kelassi — Révisions BEPC & BAC Congo',
    description: 'Cours, examens officiels et tuteur IA pour les élèves congolais',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://kelassi.app',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" style={{ colorScheme: 'light' }}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        <WebVitals />
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`,
        }} />
      </body>
    </html>
  )
}
