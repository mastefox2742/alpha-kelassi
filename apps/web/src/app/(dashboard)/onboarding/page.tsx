'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const API_URL = ''  // routes Next.js locales

const LEVELS = [
  { value: 'bepc',  label: 'BEPC',  sub: '3ème', color: 'border-blue-500 bg-blue-50 text-blue-700' },
  { value: 'bac_c', label: 'BAC C', sub: 'Maths-Sciences', color: 'border-purple-500 bg-purple-50 text-purple-700' },
  { value: 'bac_d', label: 'BAC D', sub: 'Sciences Naturelles', color: 'border-green-500 bg-green-50 text-green-700' },
  { value: 'bac_a', label: 'BAC A', sub: 'Lettres & Philo', color: 'border-amber-500 bg-amber-50 text-amber-700' },
]

const TIPS = [
  { icon: '🎯', title: 'Sois précis', desc: 'Indique la matière et le sujet. Ex : "Explique la dérivée en Maths BAC C"' },
  { icon: '🔍', title: 'Demande des exemples', desc: '"Donne-moi un exemple" → Kelassi adapte sa réponse à ton niveau.' },
  { icon: '🔄', title: 'Reformule si besoin', desc: '"Je n\'ai pas compris, explique autrement" → Kelassi réessaie.' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [level, setLevel] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  async function handleLevelSelect(lvl: string) {
    setLevel(lvl)
    const { data } = await supabase.from('subjects').select('id, name').eq('level', lvl).order('name')
    setSubjects(data ?? [])
    setStep(1)
  }

  function toggleSubject(id: string) {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleComplete() {
    if (!level || selectedSubjects.length === 0) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${API_URL}/api/onboarding/complete`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ level, subject_ids: selectedSubjects }),
      })
      const json = await res.json()

      if (json.data?.suggested_document) {
        await fetch(`${API_URL}/api/flashcards/generate`, {
          method:      'POST',
          headers:     { 'Content-Type': 'application/json' },
          credentials: 'include',
          body:        JSON.stringify({ document_id: json.data.suggested_document.id, count: 3 }),
        })
      }

      router.replace('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const STEPS = ['Niveau', 'Matières', 'Tutoriel', 'C\'est parti']

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 w-8 transition-colors ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border p-8 shadow-sm">

          {/* Étape 0 — Niveau */}
          {step === 0 && (
            <div>
              <p className="text-4xl text-center mb-4">👋</p>
              <h1 className="text-2xl font-bold text-center mb-2">Bienvenue sur Kelassi !</h1>
              <p className="text-gray-500 text-center text-sm mb-8">Quel est ton niveau scolaire ?</p>
              <div className="grid grid-cols-2 gap-3">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => handleLevelSelect(l.value)}
                    className={`border-2 rounded-xl p-4 text-left transition-all hover:scale-105 ${l.color}`}
                  >
                    <p className="text-xl font-bold">{l.label}</p>
                    <p className="text-xs mt-0.5 opacity-75">{l.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Étape 1 — Matières */}
          {step === 1 && (
            <div>
              <p className="text-4xl text-center mb-4">📚</p>
              <h2 className="text-xl font-bold text-center mb-2">Tes matières prioritaires</h2>
              <p className="text-gray-500 text-center text-sm mb-6">Sélectionne celles que tu veux réviser</p>
              <div className="flex flex-wrap gap-2 mb-6 max-h-52 overflow-y-auto">
                {subjects.map((s) => {
                  const sel = selectedSubjects.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSubject(s.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        sel ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {s.name}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={selectedSubjects.length === 0}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-40"
              >
                Continuer ({selectedSubjects.length} choisie{selectedSubjects.length > 1 ? 's' : ''})
              </button>
            </div>
          )}

          {/* Étape 2 — Tuto Kelassi */}
          {step === 2 && (
            <div>
              <p className="text-4xl text-center mb-4">🤖</p>
              <h2 className="text-xl font-bold text-center mb-2">Comment utiliser Kelassi ?</h2>
              <div className="space-y-3 my-6">
                {TIPS.map((t) => (
                  <div key={t.title} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-xl">{t.icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{t.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(3)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700"
              >
                J'ai compris !
              </button>
            </div>
          )}

          {/* Étape 3 — Lancement */}
          {step === 3 && (
            <div>
              <p className="text-4xl text-center mb-4">🃏</p>
              <h2 className="text-xl font-bold text-center mb-2">Ta première flashcard t'attend !</h2>
              <p className="text-gray-500 text-center text-sm mb-6">
                Kelassi va générer 3 flashcards depuis un de tes cours pour démarrer ta révision.
              </p>
              <div className="space-y-2 mb-6">
                {['Répétition espacée SM-2 automatique', 'Adaptée à ton niveau', '+2 XP par flashcard réussie'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✅</span> {f}
                  </div>
                ))}
              </div>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Préparation...' : 'C\'est parti ! 🚀'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
