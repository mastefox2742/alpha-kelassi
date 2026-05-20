'use client'

import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export function PDFViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)

  return (
    <div className="bg-gray-100 rounded-xl overflow-hidden">
      {/* Contrôles */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="px-3 py-1.5 rounded-lg text-sm border hover:bg-gray-50 disabled:opacity-40"
        >
          ← Précédent
        </button>
        <span className="text-sm text-gray-600">
          Page {pageNumber} / {numPages}
        </span>
        <button
          onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          disabled={pageNumber >= numPages}
          className="px-3 py-1.5 rounded-lg text-sm border hover:bg-gray-50 disabled:opacity-40"
        >
          Suivant →
        </button>
      </div>

      {/* PDF */}
      <div className="flex justify-center p-4 min-h-[600px]">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="py-20 text-gray-400">Chargement du PDF...</div>}
          error={<div className="py-20 text-red-400">Impossible de charger le PDF.</div>}
        >
          <Page
            pageNumber={pageNumber}
            width={Math.min(window?.innerWidth - 80, 800)}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  )
}
