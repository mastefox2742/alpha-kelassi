import { NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'

/** GET /api/ai/sessions/[id]/messages — messages d'une session */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérifie que la session appartient à l'utilisateur
  const sessionSnap = await adminDb.collection('chat_sessions').doc(sessionId).get()
  if (!sessionSnap.exists || sessionSnap.data()?.user_id !== userId) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  }

  const msgsSnap = await adminDb
    .collection('chat_messages')
    .where('session_id', '==', sessionId)
    .orderBy('created_at', 'asc')
    .get()

  const data = msgsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ data })
}
