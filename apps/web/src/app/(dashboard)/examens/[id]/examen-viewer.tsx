'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PDFViewer } from '../../cours/[id]/pdf-viewer'

interface ExerciseChunk {
  id: string
  content: string
  chunk_index: number
  page_number: number | null
  metadata: Record<string, unknown>
}

interface Props {
  docId: string
  title: string
  enonceUrl: string
  corrigeUrl: string | null
  exercises: ExerciseChunk[]
}

type Panel = 'enonce' | 'corrige'

export function ExamenViewer({ docId, title, enonceUrl, corrigeUrl, exercises }: Props) {
  const [activePanel, setActivePanel] = useState<Panel>('enonce')
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)

  function buildTuteurUrl(exercise: ExerciseChunk) {
    const preview = exercise.content.slice(0, 180).replace(/\s+/g, ' ').trim()
    const q = encodeURIComponent(`Explique-moi cet exercice :\n\n${preview}…`)
    return `/tuteur?document=${docId}&exercise=${exercise.id}&q=${q}`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle mobile (masqué sur ≥ lg) */}
      {corrigeUrl && (
        <div className="flex lg:hidden rounded-xl border overflow-hidden self-start">
          <button
            onClick={() => setActivePanel('enonce')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activePanel === 'enonce'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            📄 Énoncé
          </button>
          <button
            onClick={() => setActivePanel('corrige')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activePanel === 'corrige'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            ✅ Corrigé
          </button>
        </div>
      )}

      <div className={`flex gap-4 ${corrigeUrl ? 'lg:grid lg:grid-cols-2' : ''}`}>
        {/* Énoncé */}
        <div className={`flex-1 min-w-0 ${corrigeUrl && activePanel !== 'enonce' ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
              📄 Énoncé
            </span>
          </div>
          <PDFViewer url={enonceUrl} />
        </div>

        {/* Corrigé */}
        {corrigeUrl && (
          <div className={`flex-1 min-w-0 ${activePanel !== 'corrige' ? 'hidden lg:block' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-50 px-2 py-1 rounded-full">
                ✅ Corrigé
              </span>
            </div>
            <PDFViewer url={corrigeUrl} />
          </div>
        )}
      </div>

      {/* Exercices — contextualisation Kelassi */}
      {exercises.length > 0 && (
        <div className="mt-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-base">📋</span>
            Exercices détectés
            <span className="text-xs text-gray-400 font-normal">— Demande une explication ciblée à Kelassi</span>
          </h3>

          <div className="space-y-2">
            {exercises.map((ex, idx) => {
              const isOpen = expandedExercise === ex.id
              const preview = ex.content.slice(0, 120).replace(/\s+/g, ' ').trim()

              return (
                <div key={ex.id} className="border rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => setExpandedExercise(isOpen ? null : ex.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-gray-600 truncate">{preview}…</span>
                    </div>
                    <span className="flex-shrink-0 text-gray-400 ml-2">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t bg-gray-50">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-3 mb-4 max-h-40 overflow-y-auto font-mono text-xs">
                        {ex.content}
                      </p>
                      <div className="flex items-center gap-2">
                        {ex.page_number && (
                          <span className="text-xs text-gray-400">p. {ex.page_number}</span>
                        )}
                        <Link
                          href={buildTuteurUrl(ex)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                        >
                          🤖 Expliquer avec Kelassi
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA si pas d'exercices indexés */}
      {exercises.length === 0 && (
        <div className="mt-2 flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
          <span className="text-2xl">🤖</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Poser une question à Kelassi</p>
            <p className="text-xs text-green-600 mt-0.5">Le tuteur IA connaît ce document et peut t'expliquer n'importe quel exercice.</p>
          </div>
          <Link
            href={`/tuteur?document=${docId}`}
            className="flex-shrink-0 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            Demander →
          </Link>
        </div>
      )}
    </div>
  )
}
