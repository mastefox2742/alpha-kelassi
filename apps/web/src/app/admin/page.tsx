import { createClient } from '@/lib/supabase/server'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

async function getAnalytics(token: string) {
  try {
    const res = await fetch(`${API_URL}/api/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data
  } catch {
    return null
  }
}

export default async function AdminOverviewPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const analytics = session ? await getAnalytics(session.access_token) : null

  const totals = analytics?.totals ?? { users: 0, active_subs: 0 }
  const revenue = analytics?.revenue ?? { monthly_revenue_fcfa: 0, active_subscriptions: 0, stripe_count: 0, cinetpay_count: 0 }
  const topDocs = analytics?.top_documents ?? []
  const recentQ = analytics?.recent_questions ?? []

  const statCards = [
    { label: 'Utilisateurs inscrits', value: totals.users.toLocaleString('fr'), icon: '👥', color: 'from-blue-500 to-blue-600' },
    { label: 'Abonnés Premium', value: totals.active_subs.toLocaleString('fr'), icon: '⭐', color: 'from-amber-500 to-orange-500' },
    { label: 'Revenus du mois', value: `${revenue.monthly_revenue_fcfa.toLocaleString('fr')} FCFA`, icon: '💰', color: 'from-emerald-500 to-teal-600' },
    { label: 'Paiements Mobile Money', value: revenue.cinetpay_count.toLocaleString('fr'), icon: '📱', color: 'from-violet-500 to-purple-600' },
  ]

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Vue d'ensemble</h1>
        <p className="text-gray-500 text-sm mt-1">Tableau de bord administrateur Kelassi</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-10 h-10 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center text-xl mb-3`}>
              {s.icon}
            </div>
            <p className="text-2xl font-black text-gray-900 mb-0.5">{s.value}</p>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top documents */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4">Documents les plus consultés (7j)</h2>
          {topDocs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {(topDocs as any[]).slice(0, 8).map((d: any, i: number) => (
                <div key={d.document_id} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-gray-400 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.title}</p>
                    <p className="text-xs text-gray-400 uppercase">{d.type} · {d.level.replace('_', ' ')}</p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">
                    {d.count} vues
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Questions récentes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4">Questions récentes posées à Kelassi</h2>
          {recentQ.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {(recentQ as any[]).map((q: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <span className="text-blue-400 flex-shrink-0 mt-0.5">🤖</span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 leading-snug line-clamp-2">{q.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(q.asked_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!analytics && (
        <div className="mt-6 bg-orange-50 border border-orange-100 rounded-xl p-4 text-orange-700 text-sm">
          ⚠️ Impossible de charger les analytics — l'API est peut-être hors ligne.
        </div>
      )}
    </div>
  )
}
