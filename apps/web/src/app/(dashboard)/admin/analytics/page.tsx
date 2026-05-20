import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

interface AnalyticsData {
  top_documents: { document_id: string; title: string; type: string; level: string; count: number }[]
  active_users_chart: { day: string; active_users: number }[]
  revenue: { active_subscriptions: number; stripe_count: number; cinetpay_count: number; monthly_revenue_fcfa: number }
  recent_questions: { content: string; asked_at: string }[]
  totals: { users: number; active_subs: number }
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const res = await fetch(`${API_URL}/api/admin/analytics`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })
  const json = await res.json()
  const d: AnalyticsData = json.data

  const maxActive = Math.max(...d.active_users_chart.map((r) => r.active_users), 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics — Admin</h1>
        <p className="text-sm text-gray-400 mt-0.5">7 derniers jours · temps réel</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Utilisateurs total', value: d.totals.users, icon: '👥' },
          { label: 'Abonnés actifs', value: d.totals.active_subs, icon: '⭐' },
          { label: 'Stripe', value: d.revenue.stripe_count, icon: '💳' },
          { label: 'CinetPay', value: d.revenue.cinetpay_count, icon: '🏦' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border p-4 text-center">
            <p className="text-2xl mb-1">{k.icon}</p>
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Revenus estimés */}
      <div className="bg-white rounded-2xl border p-5">
        <h2 className="text-base font-semibold mb-1">Revenus mensuels estimés</h2>
        <p className="text-xs text-gray-400 mb-4">Basé sur {d.revenue.active_subscriptions} abonnements actifs · tarif indicatif 2 000 FCFA/mois</p>
        <p className="text-3xl font-extrabold text-green-600">
          {d.revenue.monthly_revenue_fcfa.toLocaleString('fr-FR')} FCFA
        </p>
        <p className="text-sm text-gray-500 mt-1">
          ≈ {Math.round(d.revenue.monthly_revenue_fcfa / 655)} EUR
        </p>
      </div>

      {/* Utilisateurs actifs par jour */}
      <div className="bg-white rounded-2xl border p-5">
        <h2 className="text-base font-semibold mb-4">Utilisateurs actifs — 7 derniers jours</h2>
        {d.active_users_chart.length === 0 ? (
          <p className="text-sm text-gray-400">Pas de données encore.</p>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {d.active_users_chart.map((r) => (
              <div key={r.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-700">{r.active_users}</span>
                <div
                  className="w-full bg-purple-500 rounded-t-md transition-all"
                  style={{ height: `${Math.round((r.active_users / maxActive) * 96)}px` }}
                />
                <span className="text-xs text-gray-400">
                  {new Date(r.day).toLocaleDateString('fr-FR', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents les plus consultés */}
      <div className="bg-white rounded-2xl border p-5">
        <h2 className="text-base font-semibold mb-4">Documents les plus consultés (7j)</h2>
        {d.top_documents.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune vue enregistrée pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {d.top_documents.map((doc, i) => (
              <div key={doc.document_id} className="flex items-center gap-3">
                <span className="w-6 text-sm font-bold text-gray-400 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{doc.title}</p>
                  <p className="text-xs text-gray-400 uppercase">{doc.level?.replace('_', ' ')} · {doc.type}</p>
                </div>
                <span className="text-sm font-semibold text-purple-600">{doc.count} vues</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Questions récentes */}
      <div className="bg-white rounded-2xl border p-5">
        <h2 className="text-base font-semibold mb-1">Questions récentes à Kelassi</h2>
        <p className="text-xs text-gray-400 mb-4">À mettre en cache prioritaire si récurrentes</p>
        {d.recent_questions.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune question encore.</p>
        ) : (
          <div className="space-y-2">
            {d.recent_questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                <span className="text-xs text-gray-400 mt-0.5 w-16 flex-shrink-0">
                  {new Date(q.asked_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
                <p className="text-sm text-gray-700 line-clamp-2">{q.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
