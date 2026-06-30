import { getServerUser } from '@/lib/supabase/server'
import { adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { redis } from '@/lib/redis'
import { BookOpen, FileText, Bot, Layers, Crown, BarChart3, type LucideIcon } from 'lucide-react'

interface Shortcut {
  href: string; label: string; Icon: LucideIcon
  gradient: string; bg: string; text: string; iconColor: string
}

const SHORTCUTS: Shortcut[] = [
  { href: '/cours',      label: 'Cours',      Icon: BookOpen, gradient: 'from-blue-500 to-blue-600',      bg: 'bg-blue-50',    text: 'text-blue-700',    iconColor: 'text-white' },
  { href: '/examens',    label: 'Examens',    Icon: FileText, gradient: 'from-violet-500 to-violet-600',  bg: 'bg-violet-50',  text: 'text-violet-700',  iconColor: 'text-white' },
  { href: '/tuteur',     label: 'Kelassi IA', Icon: Bot,      gradient: 'from-emerald-500 to-emerald-600',bg: 'bg-emerald-50', text: 'text-emerald-700', iconColor: 'text-white' },
  { href: '/flashcards', label: 'Flashcards', Icon: Layers,   gradient: 'from-amber-500 to-orange-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   iconColor: 'text-white' },
]

type RecentDoc = { id: string; title: string; type: string; level: string }
type Progress = { id: string; score_avg: number | null; streak_days: number; subjects: { name: string } | null }

async function getRecentDocs(): Promise<RecentDoc[]> {
  const cached = await redis.get<RecentDoc[]>('docs:recent:4')
  if (cached) return cached
  try {
    const snap = await adminDb.collection('documents')
      .where('is_premium', '==', false)
      .orderBy('created_at', 'desc')
      .limit(4)
      .get()
    const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RecentDoc, 'id'>) }))
    await redis.set('docs:recent:4', docs, { ex: 90 })
    return docs
  } catch {
    return []
  }
}

export default async function DashboardPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const [profileSnap, progressSnap, recentDocs] = await Promise.all([
    adminDb.collection('users').doc(user.id).get().catch(() => null),
    adminDb.collection('user_progress').where('user_id', '==', user.id).limit(5).get().catch(() => null),
    getRecentDocs(),
  ])

  const profile = profileSnap?.data() ?? null
  const progress: Progress[] = progressSnap?.docs.map((d) => ({ id: d.id, ...d.data() })) as Progress[] ?? []

  // Redirige les nouveaux utilisateurs vers l'onboarding
  if (profile && !profile['onboarding_completed']) redirect('/onboarding')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = (profile?.['full_name'] as string | undefined)?.split(' ')[0] ?? 'Élève'

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">

      {/* ── HERO GREETING ── */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 rounded-3xl px-8 py-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 pointer-events-none" />
        <div className="relative">
          <p className="text-blue-200 text-sm font-medium mb-1">{greeting} 👋</p>
          <h1 className="text-3xl font-black text-white mb-2">{firstName}</h1>
          <p className="text-blue-100 text-sm max-w-xs">Prêt à réviser aujourd'hui ? Continue là où tu t'es arrêté.</p>
          {profile?.['plan'] !== 'premium' && (
            <Link
              href="/billing"
              className="inline-flex items-center gap-2 mt-5 bg-white text-blue-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <Crown className="w-4 h-4" />
              Passer Premium — 2 000 FCFA/mois
            </Link>
          )}
        </div>
      </div>

      {/* ── SHORTCUTS ── */}
      <div>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Accès rapide</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`${s.bg} rounded-2xl p-5 flex flex-col items-center gap-3 hover:scale-105 transition-all duration-200 border border-white shadow-sm group`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-md`}>
                <s.Icon className="w-6 h-6 text-white" strokeWidth={1.75} />
              </div>
              <span className={`text-sm font-bold ${s.text}`}>{s.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Progression */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Ma progression</h2>
            <Link href="/progression" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Voir tout →</Link>
          </div>
          {progress && progress.length > 0 ? (
            <div className="space-y-4">
              {progress.map((p) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">
                      {p.subjects?.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-orange-500">{p.streak_days}🔥</span>
                      <span className="text-xs text-gray-400">{Math.round((p.score_avg ?? 0) * 100)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                      style={{ width: `${Math.min((p.score_avg ?? 0) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-gray-400">Commence à réviser pour voir<br />ta progression ici.</p>
              <Link href="/cours" className="inline-block mt-4 text-sm font-semibold text-blue-600 hover:underline">
                Parcourir les cours →
              </Link>
            </div>
          )}
        </div>

        {/* Cours récents */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Cours récents</h2>
            <Link href="/cours" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Voir tout →</Link>
          </div>
          <div className="space-y-2">
            {recentDocs && recentDocs.length > 0 ? recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/cours/${doc.id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  doc.type === 'examen' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {doc.type === 'examen'
                    ? <FileText className="w-5 h-5" strokeWidth={1.5} />
                    : <BookOpen className="w-5 h-5" strokeWidth={1.5} />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {doc.title}
                  </p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">
                    {doc.level.replace('_', ' ')}
                  </p>
                </div>
                <span className="text-gray-300 ml-auto group-hover:text-blue-400 transition-colors">→</span>
              </Link>
            )) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-gray-400">Aucun document disponible.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TIPS CARD ── */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-emerald-700" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-bold text-emerald-900 mb-1">Conseil du jour</p>
          <p className="text-sm text-emerald-700 leading-relaxed">
            Pose tes questions à <strong>Kelassi IA</strong> en disant "explique-moi comme si j'avais 10 ans" pour des explications ultra-claires. La méthode Feynman est la plus efficace pour mémoriser.
          </p>
          <Link href="/tuteur" className="inline-flex items-center gap-1 mt-3 text-sm font-bold text-emerald-700 hover:text-emerald-900">
            Essayer maintenant →
          </Link>
        </div>
      </div>

    </div>
  )
}
