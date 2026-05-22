'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export function BetaFeedbackButton() {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit() {
    if (rating === 0) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          page: window.location.pathname,
        }),
      })
      setSubmitted(true)
      setTimeout(() => { setOpen(false); setSubmitted(false); setRating(0); setComment('') }, 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-50 md:bottom-6 flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-blue-700 transition-all text-sm font-medium"
        suppressHydrationWarning
        title="Donner un avis"
      >
        💬 Feedback
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            {submitted ? (
              <div className="text-center py-4">
                <p className="text-3xl mb-2">🙏</p>
                <p className="font-semibold">Merci pour ton retour !</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Ton avis sur Kelassi</h3>
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                </div>

                {/* Étoiles */}
                <p className="text-sm text-gray-500 mb-2">Note globale</p>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRating(s)}
                      className={`text-2xl transition-transform hover:scale-110 ${s <= rating ? 'grayscale-0' : 'grayscale opacity-30'}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>

                {/* Commentaire */}
                <textarea
                  className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  placeholder="Qu'est-ce qui pourrait être amélioré ? (optionnel)"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                />

                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || loading}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
                >
                  {loading ? 'Envoi…' : 'Envoyer mon avis'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
