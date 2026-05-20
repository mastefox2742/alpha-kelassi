import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: progress }, { data: recentDocs }] = await Promise.all([
    supabase.from('users').select('full_name, plan').eq('id', user!.id).single(),
    supabase.from('user_progress').select('*, subjects(name)').eq('user_id', user!.id).limit(5),
    supabase.from('documents').select('id, title, type, level').eq('is_premium', false).order('created_at', { ascending: false }).limit(4),
  ])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {greeting}, {profile?.full_name?.split(' ')[0] ?? 'Élève'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Prêt à réviser aujourd'hui ?</p>
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { href: '/cours', label: 'Cours', icon: '📚', color: 'bg-blue-50' },
          { href: '/examens', label: 'Examens', icon: '📝', color: 'bg-purple-50' },
          { href: '/tuteur', label: 'Kelassi IA', icon: '🤖', color: 'bg-green-50' },
          { href: '/flashcards', label: 'Flashcards', icon: '🃏', color: 'bg-amber-50' },
        ].map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`${s.color} rounded-xl p-4 text-center hover:scale-105 transition-transform`}
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-sm font-medium">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progression */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-4">Ma progression</h2>
          {progress && progress.length > 0 ? (
            <div className="space-y-3">
              {progress.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{(p.subjects as { name: string } | null)?.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(p.score_avg * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{p.streak_days}🔥</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Commence à réviser pour voir ta progression ici.</p>
          )}
        </div>

        {/* Derniers cours */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Cours récents</h2>
            <Link href="/cours" className="text-xs text-blue-600 hover:underline">Voir tout</Link>
          </div>
          <div className="space-y-2">
            {recentDocs?.map((doc) => (
              <Link
                key={doc.id}
                href={`/cours/${doc.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
              >
                <span className="text-lg">{doc.type === 'examen' ? '📝' : '📖'}</span>
                <div>
                  <p className="text-sm font-medium line-clamp-1">{doc.title}</p>
                  <p className="text-xs text-gray-400 uppercase">{doc.level.replace('_', ' ')}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Banner premium */}
      {profile?.plan === 'free' && (
        <div className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="font-semibold">Passe à Premium ⭐</p>
            <p className="text-sm text-blue-100 mt-0.5">Questions IA illimitées · Tous les examens · Mode hors-ligne</p>
          </div>
          <Link
            href="/billing"
            className="bg-white text-blue-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-blue-50 whitespace-nowrap"
          >
            2 000 FCFA/mois
          </Link>
        </div>
      )}
    </div>
  )
}
