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
  { q: 0, label: 'Oublié', emoji: '😰', bg: 'bg-red-500 hover:bg-red-600 active:bg-red-700' },
  { q: 2, label: 'Difficile', emoji: '😅', bg: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700' },
  { q: 3, label: 'Correct', emoji: '🙂', bg: 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700' },
  { q: 5, label: 'Parfait', emoji: '🎯', bg: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700' },
]

export default function FlashcardsPage() {
  const [dueCards, setDueCards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 })
  const [plan, setPlan] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      supabase.from('users').select('plan').eq('id', session.user.id).single().then(({ data }) => {
        const p = data?.plan ?? 'free'
        setPlan(p)
        if (p === 'premium') loadDueCards()
        else setLoading(false)
      })
    })
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
    setStats({ reviewed: 0, correct: 0 })
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
    if (next >= dueCards.length) setSessionDone(true)
    else { setCurrentIndex(next); setFlipped(false) }
    setReviewing(false)
  }, [currentCard, currentIndex, dueCards.length, reviewing])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🃏</div>
          <p className="text-gray-500 font-medium">Chargement des cartes…</p>
        </div>
      </div>
    )
  }

  if (plan !== 'premium') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm w-full">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 bg-violet-100 rounded-3xl flex items-center justify-center text-4xl">🃏</div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">🔒</div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Flashcards Premium</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Les flashcards utilisent l'algorithme SM-2 pour optimiser ta mémorisation. Disponible avec l'abonnement Premium.
          </p>
          <div className="bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl p-5 mb-6 text-left">
            <p className="text-violet-100 text-xs font-bold uppercase tracking-wider mb-3">✨ Avec Premium</p>
            <div className="space-y-2">
              {['Répétition espacée SM-2', 'Cartes générées par IA', 'Statistiques de mémorisation', 'Sessions illimitées'].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-white">
                  <span className="text-violet-300">✓</span>{f}
                </div>
              ))}
            </div>
          </div>
          <a
            href="/billing"
            className="w-full inline-block py-3.5 bg-violet-600 text-white rounded-2xl font-bold text-sm hover:bg-violet-700 transition-colors shadow-md mb-3"
          >
            Passer Premium — 2 000 FCFA/mois →
          </a>
        </div>
      </div>
    )
  }

  if (sessionDone) {
    const pct = stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'
    const color = pct >= 80 ? 'from-emerald-500 to-teal-600' : pct >= 50 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'

    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className={`w-24 h-24 bg-gradient-to-br ${color} rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg`}>
            {emoji}
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Session terminée !</h2>
          {stats.reviewed > 0 ? (
            <>
              <p className="text-gray-500 mb-4">{stats.reviewed} carte{stats.reviewed > 1 ? 's' : ''} révisée{stats.reviewed > 1 ? 's' : ''}</p>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
                <p className="text-5xl font-black text-gray-900 mb-1">{pct}%</p>
                <p className="text-sm text-gray-500">de réussite</p>
                <div className="mt-4 w-full bg-gray-100 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full bg-gradient-to-r ${color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-6">
              <p className="text-emerald-700 font-semibold">Aucune carte à réviser aujourd'hui.</p>
              <p className="text-emerald-600 text-sm mt-1">Reviens demain pour la prochaine session !</p>
            </div>
          )}
          <button
            onClick={() => { setStats({ reviewed: 0, correct: 0 }); loadDueCards() }}
            className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Recommencer la session
          </button>
        </div>
      </div>
    )
  }

  const progress = Math.round((currentIndex / dueCards.length) * 100)

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Flashcards</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {dueCards.length - currentIndex} carte{dueCards.length - currentIndex > 1 ? 's' : ''} restante{dueCards.length - currentIndex > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm">
              {currentIndex + 1} / {dueCards.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Context */}
        {currentCard.documents && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-4">
            <span className="text-blue-500 text-sm">📚</span>
            <p className="text-xs text-blue-700 font-medium truncate">
              {currentCard.documents.subjects?.name && `${currentCard.documents.subjects.name} · `}
              {currentCard.documents.title}
            </p>
          </div>
        )}

        {/* Card */}
        <div className="mb-6" style={{ perspective: '1200px' }}>
          <div
            className="relative w-full cursor-pointer select-none"
            style={{
              height: '280px',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
            onClick={() => setFlipped((f) => !f)}
          >
            {/* Front */}
            <div
              className="absolute inset-0 bg-white rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center justify-center p-8"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-5 bg-blue-50 px-3 py-1 rounded-full">Question</span>
              <p className="text-xl font-bold text-gray-900 text-center leading-relaxed">{currentCard.front}</p>
              <p className="text-xs text-gray-300 mt-6">Appuie pour révéler la réponse</p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-blue-600 to-violet-600 rounded-3xl shadow-lg flex flex-col items-center justify-center p-8"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <span className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-5 bg-white/20 px-3 py-1 rounded-full">Réponse</span>
              <p className="text-lg font-semibold text-white text-center leading-relaxed">{currentCard.back}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {flipped ? (
          <div>
            <p className="text-sm font-medium text-gray-600 text-center mb-4">Comment tu as répondu ?</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {QUALITY_LABELS.map(({ q, label, emoji, bg }) => (
                <button
                  key={q}
                  onClick={() => handleReview(q)}
                  disabled={reviewing}
                  className={`${bg} text-white py-3 rounded-2xl text-xs font-bold transition-all disabled:opacity-50 flex flex-col items-center gap-1 shadow-sm`}
                >
                  <span className="text-lg">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center">
              Intervalle actuel : {currentCard.interval} jour{currentCard.interval > 1 ? 's' : ''} · Facilité {currentCard.ease_factor.toFixed(2)}
            </p>
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-2xl font-bold hover:opacity-90 transition-opacity shadow-md"
          >
            Voir la réponse →
          </button>
        )}
      </div>
    </div>
  )
}
