'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HistoriqueItem {
  id: string
  title: string
  level: string
  year: number | null
  visitedAt: number
}

const STORAGE_KEY = 'kl_exams_history'
const MAX_ITEMS = 5

const LEVEL_COLORS: Record<string, string> = {
  bepc:  'bg-blue-100 text-blue-700',
  bac_a: 'bg-amber-100 text-amber-700',
  bac_c: 'bg-violet-100 text-violet-700',
  bac_d: 'bg-emerald-100 text-emerald-700',
}

export function ExamensHistorique() {
  const [history, setHistory] = useState<HistoriqueItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setHistory(JSON.parse(raw))
    } catch {}
  }, [])

  if (history.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        🕐 Récemment consultés
      </p>
      <div className="flex flex-wrap gap-2">
        {history.map((item) => (
          <Link
            key={item.id}
            href={`/examens/${item.id}`}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50 transition-all group shadow-sm"
          >
            <span className="text-base">📝</span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate max-w-[180px] group-hover:text-violet-700">
                {item.title}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[item.level] ?? 'bg-gray-100 text-gray-600'}`}>
                  {item.level.replace('_', ' ').toUpperCase()}
                </span>
                {item.year && <span className="text-[10px] text-gray-400">{item.year}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/** Utilitaire — appeler depuis la page détail pour enregistrer la visite */
export function saveExamHistorique(item: Omit<HistoriqueItem, 'visitedAt'>) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    let history: HistoriqueItem[] = raw ? JSON.parse(raw) : []
    // Déduplique et place en premier
    history = [
      { ...item, visitedAt: Date.now() },
      ...history.filter((h) => h.id !== item.id),
    ].slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {}
}
