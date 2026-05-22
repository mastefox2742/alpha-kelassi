'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const TYPE_STYLE = {
  annonce: { bg: 'bg-blue-600',   text: 'text-white',      btn: 'bg-white/20 hover:bg-white/30 text-white' },
  promo:   { bg: 'bg-amber-500',  text: 'text-white',      btn: 'bg-white/20 hover:bg-white/30 text-white' },
  pub:     { bg: 'bg-violet-600', text: 'text-white',      btn: 'bg-white/20 hover:bg-white/30 text-white' },
  alerte:  { bg: 'bg-red-600',    text: 'text-white',      btn: 'bg-white/20 hover:bg-white/30 text-white' },
}

interface Notif {
  id: string; type: keyof typeof TYPE_STYLE; title: string
  message: string; cta_label: string | null; cta_url: string | null
}

const DISMISSED_KEY = 'kl_dismissed_notifs'

export function NotificationBanner({ plan }: { plan: string }) {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]') as string[]
    setDismissed(saved)

    fetch(`${API_URL}/api/notifications?plan=${plan}`)
      .then((r) => r.json())
      .then(({ data }) => setNotifs(data ?? []))
      .catch(() => null)
  }, [plan])

  function dismiss(id: string) {
    const next = [...dismissed, id]
    setDismissed(next)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
  }

  const visible = notifs.filter((n) => !dismissed.includes(n.id))
  if (visible.length === 0) return null

  const n = visible[0]
  const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.annonce

  return (
    <div className={`${style.bg} px-4 py-3`}>
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <div className={`flex-1 min-w-0 ${style.text}`}>
          <span className="font-bold text-sm">{n.title}</span>
          <span className="text-sm opacity-90 ml-2">{n.message}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {n.cta_label && n.cta_url && (
            <Link
              href={n.cta_url}
              className={`${style.btn} px-3 py-1.5 rounded-lg text-xs font-bold transition-colors`}
            >
              {n.cta_label}
            </Link>
          )}
          <button
            onClick={() => dismiss(n.id)}
            className="opacity-70 hover:opacity-100 text-white transition-opacity p-1 rounded"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
