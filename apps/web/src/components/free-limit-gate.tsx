'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Props {
  type: 'cours' | 'exam'
  plan: string
  children: React.ReactNode
}

// Free tier: 2 cours (1 chapter + 1 exercise), 1 exam
const LIMITS = { cours: 2, exam: 1 }
const KEYS   = { cours: 'kl_cours_views', exam: 'kl_exam_views' }

const PAYWALL_CONFIG = {
  cours: {
    icon: '📚',
    title: 'Tu as lu tes cours gratuits',
    desc: 'Accède à l\'intégralité des cours BEPC & BAC — résumés, chapitres et exercices corrigés.',
    features: ['Tous les cours par matière', 'Exercices corrigés détaillés', 'Téléchargement hors-ligne'],
  },
  exam: {
    icon: '📝',
    title: 'Tu as consulté ton examen gratuit',
    desc: 'Accède aux sujets d\'État 2010–2024 avec leurs corrigés complets.',
    features: ['Tous les examens d\'État', 'Corrigés étape par étape', 'Sessions normale & rattrapage'],
  },
}

export function FreeLimitGate({ type, plan, children }: Props) {
  const [blocked, setBlocked] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Premium users always pass
    if (plan === 'premium') { setReady(true); return }

    const key = KEYS[type]
    const limit = LIMITS[type]
    const viewed = parseInt(localStorage.getItem(key) ?? '0', 10)

    if (viewed >= limit) {
      setBlocked(true)
    } else {
      localStorage.setItem(key, String(viewed + 1))
    }
    setReady(true)
  }, [type, plan])

  if (!ready) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!blocked) return <>{children}</>

  const cfg = PAYWALL_CONFIG[type]

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-sm w-full">
        {/* Lock icon */}
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center text-4xl">
            {cfg.icon}
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">
            🔒
          </div>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-2">{cfg.title}</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">{cfg.desc}</p>

        {/* Features */}
        <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-5 mb-6 text-left">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-3">✨ Avec Premium</p>
          <div className="space-y-2">
            {cfg.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-white">
                <span className="text-blue-300">✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/billing"
          className="w-full inline-block py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md mb-3"
        >
          Passer Premium — 2 000 FCFA/mois →
        </Link>
        <Link
          href={type === 'exam' ? '/examens' : '/cours'}
          className="block text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Retour à la liste
        </Link>
      </div>
    </div>
  )
}
