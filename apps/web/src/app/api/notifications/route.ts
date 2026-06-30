import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

/** GET /api/notifications?plan=free — notifs actives affichées dans le dashboard */
export async function GET(req: NextRequest) {
  const plan = req.nextUrl.searchParams.get('plan') ?? 'free'
  const now  = new Date().toISOString()

  try {
    // Notifications actives, non expirées, pour ce plan ou pour tous
    const snap = await adminDb
      .collection('notifications')
      .where('is_active', '==', true)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get()

    const allNotifs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]

    // Filtre en mémoire (Firestore ne supporte pas OR multi-champs facilement)
    const data = allNotifs
      .filter((n) => {
        const notExpired = !n.expires_at || n.expires_at > now
        const matchesPlan = n.target_plan === 'all' || n.target_plan === plan
        return notExpired && matchesPlan
      })
      .slice(0, 5)
      .map((n) => ({
        id:        n.id,
        type:      n.type,
        title:     n.title,
        message:   n.message,
        cta_label: n.cta_label ?? null,
        cta_url:   n.cta_url ?? null,
      }))

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
