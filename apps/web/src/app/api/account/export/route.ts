import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'

/** GET /api/account/export — export RGPD de toutes les données personnelles */
export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const [
    userSnap,
    subsSnap,
    progressSnap,
    flashcardsSnap,
    sessionsSnap,
    badgesSnap,
  ] = await Promise.all([
    adminDb.collection('users').doc(userId).get(),
    adminDb.collection('subscriptions').where('user_id', '==', userId).get(),
    adminDb.collection('user_progress').where('user_id', '==', userId).get(),
    adminDb.collection('flashcards').where('user_id', '==', userId).limit(500).get(),
    adminDb.collection('chat_sessions').where('user_id', '==', userId).limit(100).get(),
    adminDb.collection('user_badges').where('user_id', '==', userId).get(),
  ])

  const exportData = {
    generated_at:  new Date().toISOString(),
    user:          userSnap.exists ? { id: userId, ...userSnap.data() } : null,
    subscriptions: subsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    progress:      progressSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    flashcards:    flashcardsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    chat_sessions: sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    badges:        badgesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="kelassi-data-${userId.slice(0, 8)}.json"`,
    },
  })
}
