'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { PDFViewerLazy as PDFViewer } from '../../cours/[id]/pdf-viewer-lazy'
import { saveExamHistorique } from '../examens-historique'

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
  level: string
  year: number | null
  enonceUrl: string
  corrigeUrl: string | null
  corrigeIsPremium: boolean
  exercises: ExerciseChunk[]
}

type Panel = 'enonce' | 'corrige'

export function ExamenViewer({ docId, title, level, year, enonceUrl, corrigeUrl, corrigeIsPremium, exercises }: Props) {
  const [activePanel, setActivePanel] = useState<Panel>('enonce')
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Enregistre la visite dans l'historique local
  useEffect(() => {
    saveExamHistorique({ id: docId, title, level, year })
  }, [docId, title, level, year])

  // Auto-scroll vers l'exercice si ancre dans l'URL
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#ex-')) {
      const exId = hash.slice(4)
      setExpandedExercise(exId)
      setTimeout(() => {
        document.getElementById(`ex-${exId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 400)
    }
  }, [])

  function buildTuteurUrl(exercise: ExerciseChunk) {
    const preview = exercise.content.slice(0, 200).replace(/\s+/g, ' ').trim()
    const q = encodeURIComponent(`Explique-moi cet exercice :\n\n${preview}…`)
    return `/tuteur?document=${docId}&exercise=${exercise.id}&q=${q}`
  }

  const copyExerciseLink = useCallback(async (exId: string) => {
    const url = `${window.location.origin}/examens/${docId}#ex-${exId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(exId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopiedId(exId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }, [docId])

  return (
    <div className="flex flex-col gap-4">

      {/* Toggle mobile */}
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
            {corrigeIsPremium ? '⭐' : '✅'} Corrigé
          </button>
        </div>
      )}

      {/* Visionneuse côte-à-côte */}
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
              <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${
                corrigeIsPremium
                  ? 'text-amber-700 bg-amber-50'
                  : 'text-green-700 bg-green-50'
              }`}>
                {corrigeIsPremium ? '⭐ Corrigé Premium' : '✅ Corrigé'}
              </span>
            </div>
            <PDFViewer url={corrigeUrl} />
          </div>
        )}
      </div>

      {/* ─── Exercices indexés ─── */}
      {exercises.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="text-base">📋</span>
              {exercises.length} exercice{exercises.length > 1 ? 's' : ''} détecté{exercises.length > 1 ? 's' : ''}
            </h3>
            <span className="text-xs text-gray-400">— Demande une explication ciblée à Kelassi</span>
          </div>

          <div className="space-y-2">
            {exercises.map((ex, idx) => {
              const isOpen = expandedExercise === ex.id
              const preview = ex.content.slice(0, 120).replace(/\s+/g, ' ').trim()
              const isCopied = copiedId === ex.id

              return (
                <div key={ex.id} id={`ex-${ex.id}`} className="border rounded-xl overflow-hidden bg-white scroll-mt-20">
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
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {/* Bouton partager */}
                      <button
                        onClick={(e) => { e.stopPropagation(); copyExerciseLink(ex.id) }}
                        title="Copier le lien de cet exercice"
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-colors ${
                          isCopied
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400 hover:bg-violet-100 hover:text-violet-600'
                        }`}
                      >
                        {isCopied ? '✓' : '🔗'}
                      </button>
                      <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t bg-gray-50">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-3 mb-4 max-h-48 overflow-y-auto font-mono text-xs bg-white rounded-lg p-3 border border-gray-100">
                        {ex.content}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {ex.page_number && (
                          <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-100">
                            📄 p. {ex.page_number}
                          </span>
                        )}
                        <Link
                          href={buildTuteurUrl(ex)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors shadow-sm"
                        >
                          🤖 Expliquer avec Kelassi
                        </Link>
                        <button
                          onClick={() => copyExerciseLink(ex.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            isCopied
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-violet-200 hover:text-violet-600'
                          }`}
                        >
                          {isCopied ? '✓ Lien copié !' : '🔗 Partager'}
                        </button>
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
            <p className="text-xs text-green-600 mt-0.5">
              Le tuteur IA connaît ce document et peut t'expliquer n'importe quel exercice.
            </p>
          </div>
          <Link
            href={`/tuteur?document=${docId}`}
            className="flex-shrink-0 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
          >
            Demander →
          </Link>
        </div>
      )}
    </div>
  )
}
