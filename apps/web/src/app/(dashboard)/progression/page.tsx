import { getServerUser } from '@/lib/supabase/server'
import { adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { computeLevel, BADGES } from '@/lib/xp'

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

function levelFloor(level: number): number {
  return [0, 0, 100, 300, 600, 1000][level] ?? 0
}

const LEVEL_GRADIENTS = ['', 'from-gray-400 to-gray-500', 'from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-orange-500 to-orange-600', 'from-yellow-400 to-yellow-500']

export default async function ProgressionPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const userId = user.uid

  // Sessions pour compter les questions
  const sessionsSnap = await adminDb
    .collection('chat_sessions')
    .where('user_id', '==', userId)
    .get()
  const sessionIds = sessionsSnap.docs.map((d) => d.id)

  const [
    userSnap,
    badgesSnap,
    progressSnap,
    nextCardSnap,
  ] = await Promise.all([
    adminDb.collection('users').doc(userId).get(),
    adminDb.collection('user_badges').where('user_id', '==', userId).orderBy('earned_at').get(),
    adminDb.collection('user_progress').where('user_id', '==', userId).get(),
    adminDb.collection('flashcards')
      .where('user_id', '==', userId)
      .where('next_review', '<=', new Date().toISOString())
      .orderBy('next_review', 'asc')
      .limit(1)
      .get(),
  ])

  const userRow      = userSnap.data()
  const badges       = badgesSnap.docs.map((d) => d.data())
  const progressRows = progressSnap.docs.map((d) => d.data())
  const nextCard     = nextCardSnap.empty ? null : { id: nextCardSnap.docs[0].id, ...nextCardSnap.docs[0].data() }

  // Compte les questions posées
  let questionsCount = 0
  for (let i = 0; i < sessionIds.length; i += 30) {
    const chunk = sessionIds.slice(i, i + 30)
    if (chunk.length === 0) break
    const snap  = await adminDb
      .collection('chat_messages')
      .where('session_id', 'in', chunk)
      .where('role', '==', 'user')
      .get()
    questionsCount += snap.size
  }

  const viewsSnap  = await adminDb.collection('document_views').where('user_id', '==', userId).get()
  const viewsCount = viewsSnap.size

  const xp        = (userRow?.xp as number) ?? 0
  const levelInfo = computeLevel(xp)
  const maxStreak = Math.max(...progressRows.map((p) => (p.streak_days as number) ?? 0), 0)
  const badgesWithMeta = badges.map((b) => ({
    code:      b.badge_code as string,
    earned_at: b.earned_at as string,
    ...(BADGES[b.badge_code as keyof typeof BADGES] ?? { label: b.badge_code as string, icon: '🏅', description: '' }),
  }))

  const d: DashboardData = {
    xp,
    level:         levelInfo.level,
    level_label:   levelInfo.label,
    next_level_xp: levelInfo.nextXp,
    streak:        maxStreak,
    badges:        badgesWithMeta,
    progress:      progressRows as DashboardData['progress'],
    next_review:   nextCard as DashboardData['next_review'],
    stats: {
      questions_asked:     questionsCount,
      documents_viewed:    viewsCount,
      flashcards_reviewed: progressRows.reduce((s, p) => s + ((p.flashcards_reviewed as number) ?? 0), 0),
    },
  }

  const xpInLevel = d.next_level_xp === Infinity
    ? 100
    : Math.round(((d.xp - levelFloor(d.level)) / (d.next_level_xp - levelFloor(d.level))) * 100)

  const gradient = LEVEL_GRADIENTS[d.level] ?? 'from-purple-500 to-purple-600'

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900">Ma progression</h1>
        <p className="text-gray-500 mt-1">Stats, badges et objectifs</p>
      </div>

      {/* XP + Streak hero */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* XP card */}
        <div className="sm:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Niveau {d.level}</p>
              <p className="text-xl font-black text-gray-900">{d.level_label}</p>
            </div>
            <div className={`bg-gradient-to-br ${gradient} text-white rounded-2xl px-4 py-2 text-right shadow-md`}>
              <p className="text-2xl font-black">{d.xp}</p>
              <p className="text-xs opacity-80">XP</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden mb-2">
            <div
              className={`h-3 rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
              style={{ width: `${Math.min(xpInLevel, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{xpInLevel}% vers le niveau {d.level + 1}</p>
            {d.next_level_xp !== Infinity && (
              <p className="text-xs text-gray-400">{d.next_level_xp - d.xp} XP restants</p>
            )}
          </div>
        </div>

        {/* Streak */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-2">{d.streak >= 7 ? '🔥' : d.streak >= 3 ? '⚡' : '📅'}</div>
          <p className="text-4xl font-black text-gray-900">{d.streak}</p>
          <p className="text-sm text-gray-500 mt-1">jour{d.streak > 1 ? 's' : ''} de suite</p>
          {d.streak === 0 && <p className="text-xs text-blue-600 font-semibold mt-2">Révise aujourd'hui !</p>}
          {d.streak >= 7 && <p className="text-xs text-orange-600 font-semibold mt-2">Serie en feu 🔥</p>}
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Documents vus', value: d.stats.documents_viewed, icon: '📄', color: 'bg-blue-50 text-blue-600' },
          { label: 'Questions IA', value: d.stats.questions_asked, icon: '🤖', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Flashcards', value: d.stats.flashcards_reviewed, icon: '🃏', color: 'bg-violet-50 text-violet-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-xl mx-auto mb-2`}>
              {s.icon}
            </div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Flashcard à réviser */}
      {d.next_review && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">⏰</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">Flashcard à réviser maintenant</p>
            <p className="text-sm text-amber-700 truncate mt-0.5">{(d.next_review as any).front}</p>
          </div>
          <Link
            href="/flashcards"
            className="flex-shrink-0 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm"
          >
            Réviser →
          </Link>
        </div>
      )}

      {/* Badges */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-gray-900">Badges obtenus</h2>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {d.badges.length} badge{d.badges.length !== 1 ? 's' : ''}
          </span>
        </div>
        {d.badges.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-3">🏆</p>
            <p className="text-sm text-gray-500">Aucun badge encore — continue à réviser !</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {d.badges.map((b) => (
              <div
                key={b.code}
                className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 hover:bg-gray-100 transition-colors"
                title={b.description}
              >
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{b.label}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(b.earned_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progression par matière */}
      {d.progress.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-black text-gray-900 mb-4">Par matière</h2>
          <div className="space-y-4">
            {d.progress.map((p) => (
              <div key={p.subject_id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{p.subjects?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 uppercase font-medium">{p.subjects?.level?.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div className="hidden sm:block">
                      <p className="text-xs text-gray-400">Flashcards</p>
                      <p className="text-sm font-bold text-gray-900">{p.flashcards_reviewed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Score</p>
                      <p className="text-sm font-black text-gray-900">{Math.round(p.score_avg * 100)}%</p>
                    </div>
                    <div className="text-orange-500 font-bold text-sm">🔥 {p.streak_days}j</div>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-violet-500 h-2 rounded-full transition-all"
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
