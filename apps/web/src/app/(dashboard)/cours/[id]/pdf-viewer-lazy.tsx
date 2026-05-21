'use client'

import dynamic from 'next/dynamic'

// Charge pdfjs uniquement côté client et seulement quand le composant est monté.
// Réduit le bundle initial de ~2 Mo (pdf.worker + pdfjs-dist).
export const PDFViewerLazy = dynamic(
  () => import('./pdf-viewer').then((m) => ({ default: m.PDFViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-gray-100 rounded-xl flex items-center justify-center min-h-[500px]">
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Chargement du PDF…</p>
        </div>
      </div>
    ),
  }
)
