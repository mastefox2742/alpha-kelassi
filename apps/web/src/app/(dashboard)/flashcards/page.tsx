'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Flashcard {
  id: string
  front: string
  back: string
  ease_factor: number
  interval: number
  reps: number
  next_review: string
  documents: { title: string; subjects: { name: string } | null } | null
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const QUALITY_LABELS = [
  { q: 0, label: 'Oublié', color: 'bg-red-500 hover:bg-red-600' },
  { q: 2, label: 'Difficile', color: 'bg-orange-500 hover:bg-orange-600' },
  { q: 3, label: 'Correct', color: 'bg-yellow-500 hover:bg-yellow-600' },
  { q: 5, label: 'Parfait', color: 'bg-green-500 hover:bg-green-600' },
]

export default function FlashcardsPage() {
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 })
  const supabase = createClient()

  useEffect(() => {
    loadDueCards()
  }, [])

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function loadDueCards() {
    setLoading(true)
    const token = await getToken()
    const res = await fetch(`${API_URL}/api/flashcards/due?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    setDueCards(json.data ?? [])
    setCurrentIndex(0)
    setFlipped(false)
    setSessionDone((json.data ?? []).length === 0)
    setLoading(false)
  }

  const currentCard = dueCards[currentIndex]

  const handleReview = useCallback(async (quality: number) => {
    if (!currentCard || reviewing) return
    setReviewing(true)

    const token = await getToken()
    await fetch(`${API_URL}/api/flashcards/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ flashcard_id: currentCard.id, quality }),
    })

    setStats((s) => ({ reviewed: s.reviewed + 1, correct: s.correct + (quality >= 3 ? 1 : 0) }))

    const next = currentIndex + 1
    if (next >= dueCards.length) {
      setSessionDone(true)
    } else {
      setCurrentIndex(next)
      setFlipped(false)
    }
    setReviewing(false)
  }, [currentCard, currentIndex, dueCards.length, reviewing])

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="text-4xl mb-4 animate-spin">🃏</div>
        <p className="text-gray-500">Chargement des cartes...</p>
      </div>
    )
  }

  if (sessionDone) {
    const pct = stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="text-5xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</p>
        <h2 className="text-xl font-bold mb-2">Session terminée !</h2>
        {stats.reviewed > 0 ? (
          <>
            <p className="text-gray-500 mb-2">{stats.reviewed} carte{stats.reviewed > 1 ? 's' : ''} révisée{stats.reviewed > 1 ? 's' : ''}</p>
            <p className="text-2xl font-bold text-green-600 mb-6">{pct}% de réussite</p>
          </>
        ) : (
          <p className="text-gray-500 mb-6">Aucune carte à réviser aujourd'hui. 🎯</p>
        )}
        <button
          onClick={() => { setStats({ reviewed: 0, correct: 0 }); loadDueCards() }}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
        >
          Recommencer
        </button>
      </div>
    )
  }

  const progress = Math.round((currentIndex / dueCards.length) * 100)

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Flashcards</h1>
          <p className="text-sm text-gray-500">{dueCards.length - currentIndex} carte{dueCards.length - currentIndex > 1 ? 's' : ''} restante{dueCards.length - currentIndex > 1 ? 's' : ''}</p>
        </div>
        <span className="text-sm text-gray-400">{currentIndex + 1} / {dueCards.length}</span>
      </div>

      {/* Barre de progression */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-8">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Contexte */}
      {currentCard.documents && (
        <p className="text-xs text-gray-400 text-center mb-3">
          📚 {currentCard.documents.subjects?.name ?? ''} · {currentCard.documents.title}
        </p>
      )}

      {/* Carte flip */}
      <div className="perspective-1000 mb-8" style={{ perspective: '1000px' }}>
        <div
          className="relative w-full cursor-pointer"
          style={{
            height: '240px',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
          onClick={() => setFlipped((f) => !f)}
        >
          {/* Recto */}
          <div
            className="absolute inset-0 bg-white border-2 border-blue-100 rounded-2xl shadow-lg flex flex-col items-center justify-center p-6"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-4">Question</p>
            <p className="text-lg font-medium text-gray-800 text-center">{currentCard.front}</p>
            <p className="text-xs text-gray-300 mt-6">Clique pour révéler la réponse</p>
          </div>

          {/* Verso */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-lg flex flex-col items-center justify-center p-6"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-4">Réponse</p>
            <p className="text-base text-gray-800 text-center leading-relaxed">{currentCard.back}</p>
          </div>
        </div>
      </div>

      {/* Boutons qualité — visibles seulement après flip */}
      {flipped ? (
        <div>
          <p className="text-sm text-gray-500 text-center mb-3">Comment tu as répondu ?</p>
          <div className="grid grid-cols-4 gap-2">
            {QUALITY_LABELS.map(({ q, label, color }) => (
              <button
                key={q}
                onClick={() => handleReview(q)}
                disabled={reviewing}
                className={`${color} text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">
            Intervalle actuel : {currentCard.interval} jour{currentCard.interval > 1 ? 's' : ''} · EF {currentCard.ease_factor.toFixed(2)}
          </p>
        </div>
      ) : (
        <button
          onClick={() => setFlipped(true)}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
        >
          Voir la réponse
        </button>
      )}
    </div>
  )
}
