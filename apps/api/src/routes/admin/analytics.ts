import { Hono } from 'hono'
import { supabase } from '../../lib/supabase.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = new Hono()
router.use('*', authMiddleware)

router.use('*', async (c, next) => {
  const userId = c.get('userId') as string
  const { data: user } = await supabase.from('users').select('role').eq('id', userId).single()
  if (user?.role !== 'admin') return c.json({ error: { code: 'FORBIDDEN' } }, 403)
  await next()
})

// GET /api/admin/analytics
router.get('/', async (c) => {
  const [
    { data: topDocs },
    { data: activeStats },
    { data: activeSubs },
    { data: recentQuestions },
    { count: totalUsers },
  ] = await Promise.all([
    // Documents les plus vus sur 7 jours
    supabase
      .from('document_views')
      .select('document_id, documents(title, type, level)')
      .gte('viewed_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(500),

    // Utilisateurs actifs par jour (7 derniers jours)
    supabase
      .from('user_progress')
      .select('user_id, last_active')
      .gte('last_active', new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)),

    // Abonnements actifs
    supabase
      .from('subscriptions')
      .select('plan, status, stripe_sub_id, cinetpay_ref, expires_at, created_at')
      .eq('status', 'active'),

    // Questions récentes (pour cache prioritaire)
    supabase
      .from('chat_messages')
      .select('content, created_at')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(50),

    // Total utilisateurs
    supabase.from('users').select('id', { count: 'exact', head: true }),
  ])

  // Agrège les vues par document côté JS
  const viewsByDoc = new Map<string, { count: number; title: string; type: string; level: string }>()
  for (const row of topDocs ?? []) {
    const doc = row.documents as { title: string; type: string; level: string } | null
    const cur = viewsByDoc.get(row.document_id) ?? { count: 0, title: doc?.title ?? '', type: doc?.type ?? '', level: doc?.level ?? '' }
    viewsByDoc.set(row.document_id, { ...cur, count: cur.count + 1 })
  }
  const topDocsSorted = [...viewsByDoc.entries()]
    .map(([id, v]) => ({ document_id: id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Utilisateurs actifs par jour
  const activeByDay = new Map<string, Set<string>>()
  for (const row of activeStats ?? []) {
    const day = row.last_active
    if (!activeByDay.has(day)) activeByDay.set(day, new Set())
    activeByDay.get(day)!.add(row.user_id)
  }
  const activeChart = [...activeByDay.entries()]
    .map(([day, users]) => ({ day, active_users: users.size }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // Revenus estimés
  const stripeCount = (activeSubs ?? []).filter((s) => s.stripe_sub_id).length
  const cinetpayCount = (activeSubs ?? []).filter((s) => s.cinetpay_ref).length
  const revenueEstimate = {
    active_subscriptions: (activeSubs ?? []).length,
    stripe_count: stripeCount,
    cinetpay_count: cinetpayCount,
    // Prix indicatifs : 2000 FCFA/mois ≈ 3 EUR, 20000 FCFA/an ≈ 30 EUR
    monthly_revenue_fcfa: stripeCount * 2000 + cinetpayCount * 2000,
  }

  return c.json({
    data: {
      top_documents: topDocsSorted,
      active_users_chart: activeChart,
      revenue: revenueEstimate,
      recent_questions: (recentQuestions ?? []).slice(0, 20).map((q) => ({
        content: q.content.slice(0, 120),
        asked_at: q.created_at,
      })),
      totals: {
        users: totalUsers ?? 0,
        active_subs: (activeSubs ?? []).length,
      },
    },
  })
})

export { router as adminAnalyticsRouter }
