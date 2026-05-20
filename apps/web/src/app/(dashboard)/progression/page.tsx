import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const LEVEL_COLORS = ['', 'bg-gray-200', 'bg-blue-200', 'bg-purple-200', 'bg-orange-200', 'bg-yellow-300']

interface DashboardData {
  xp: number
  level: number
  level_label: string
  next_level_xp: number
  streak: number
  badges: { code: string; label: string; icon: string; description: string; earned_at: string }[]
  progress: {
    subject_id: string
    flashcards_reviewed: number
    score_avg: number
    streak_days: number
    last_active: string
    subjects: { name: string; level: string } | null
  }[]
  next_review: { id: string; front: string; next_review: string; documents: { title: string } | null } | null
  stats: { questions_asked: number; documents_viewed: number; flashcards_reviewed: number }
}

export default async function ProgressionPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const res = await fetch(`${API_URL}/api/progress/dashboard`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })
  const json = await res.json()
  const d: DashboardData = json.data

  const xpInLevel = d.next_level_xp === Infinity
    ? 100
    : Math.round(((d.xp - levelFloor(d.level)) / (d.next_level_xp - levelFloor(d.level))) * 100)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ma progression</h1>
        <p className="text-sm text-gray-400 mt-0.5">Tes stats, badges et objectifs du jour</p>
      </div>

      {/* XP + Niveau + Streak */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Niveau */}
        <div className="sm:col-span-2 bg-white rounded-2xl border p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Niveau {d.level}</p>
              <p className="text-lg font-bold">{d.level_label}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-purple-600">{d.xp} XP</p>
              {d.next_level_xp !== Infinity && (
                <p className="text-xs text-gray-400">prochain : {d.next_level_xp} XP</p>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${LEVEL_COLORS[d.level] || 'bg-purple-500'}`}
              style={{ width: `${Math.min(xpInLevel, 100)}%` }}
            />
          </div>
          {d.next_level_xp !== Infinity && (
            <p className="text-xs text-gray-400 mt-1">{xpInLevel}% vers le niveau {d.level + 1}</p>
          )}
        </div>

        {/* Streak */}
        <div className="bg-white rounded-2xl border p-5 flex flex-col items-center justify-center text-center">
          <p className="text-4xl mb-1">{d.streak >= 7 ? '🔥' : d.streak >= 3 ? '⚡' : '📅'}</p>
          <p className="text-3xl font-extrabold">{d.streak}</p>
          <p className="text-sm text-gray-500">jour{d.streak > 1 ? 's' : ''} consécutif{d.streak > 1 ? 's' : ''}</p>
          {d.streak === 0 && (
            <p className="text-xs text-gray-400 mt-1">Révise aujourd'hui !</p>
          )}
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Documents vus', value: d.stats.documents_viewed, icon: '📄' },
          { label: 'Questions à Kelassi', value: d.stats.questions_asked, icon: '🤖' },
          { label: 'Flashcards révisées', value: d.stats.flashcards_reviewed, icon: '🃏' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border p-4 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div>
        <h2 className="text-base font-semibold mb-3">Badges obtenus</h2>
        {d.badges.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun badge encore — continue à réviser !</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {d.badges.map((b) => (
              <div
                key={b.code}
                className="flex items-center gap-2 bg-white border rounded-xl px-4 py-2.5 shadow-sm"
                title={b.description}
              >
                <span className="text-xl">{b.icon}</span>
                <div>
                  <p className="text-sm font-medium">{b.label}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(b.earned_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prochaine révision SM-2 */}
      {d.next_review && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-3xl">⏰</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Flashcard à réviser maintenant</p>
            <p className="text-sm text-amber-700 truncate mt-0.5">{d.next_review.front}</p>
            {d.next_review.documents && (
              <p className="text-xs text-amber-500 mt-0.5">{d.next_review.documents.title}</p>
            )}
          </div>
          <Link
            href="/flashcards"
            className="flex-shrink-0 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600"
          >
            Réviser →
          </Link>
        </div>
      )}

      {/* Progression par matière */}
      {d.progress.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Par matière</h2>
          <div className="space-y-3">
            {d.progress.map((p) => (
              <div key={p.subject_id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{p.subjects?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 uppercase">{p.subjects?.level?.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-xs text-gray-400">Flashcards</p>
                      <p className="text-sm font-semibold">{p.flashcards_reviewed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Score moy.</p>
                      <p className="text-sm font-semibold">{Math.round(p.score_avg * 100)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Streak</p>
                      <p className="text-sm font-semibold">🔥 {p.streak_days}j</p>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${Math.min(Math.round(p.score_avg * 100), 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function levelFloor(level: number): number {
  return [0, 0, 100, 300, 600, 1000][level] ?? 0
}
