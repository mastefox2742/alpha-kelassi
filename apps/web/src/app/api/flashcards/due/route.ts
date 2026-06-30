import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'

/** GET /api/flashcards/due?limit=20 — cartes à réviser aujourd'hui */
export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10), 50)

  try {
    const snap = await adminDb
      .collection('flashcards')
      .where('user_id', '==', userId)
      .where('next_review', '<=', new Date().toISOString())
      .orderBy('next_review', 'asc')
      .limit(limit)
      .get()

    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ data, count: data.length })
  } catch (err) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: (err as Error).message } }, { status: 500 })
  }
}
