import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'

/** GET /api/ai/sessions — liste des sessions de chat de l'utilisateur */
export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const snap = await adminDb
    .collection('chat_sessions')
    .where('user_id', '==', userId)
    .orderBy('created_at', 'desc')
    .limit(30)
    .get()

  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ data })
}

/** DELETE /api/ai/sessions — supprime TOUTES les sessions de l'utilisateur */
export async function DELETE(req: NextRequest) {
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const sessionsSnap = await adminDb
    .collection('chat_sessions')
    .where('user_id', '==', userId)
    .get()

  if (!sessionsSnap.empty) {
    const sessionIds = sessionsSnap.docs.map((d) => d.id)

    // Supprime les messages d'abord (en batches de 500)
    for (const sid of sessionIds) {
      const msgsSnap = await adminDb
        .collection('chat_messages')
        .where('session_id', '==', sid)
        .get()
      const batch = adminDb.batch()
      msgsSnap.docs.forEach((d) => batch.delete(d.ref))
      if (!msgsSnap.empty) await batch.commit()
    }

    // Supprime les sessions
    const sessionBatch = adminDb.batch()
    sessionsSnap.docs.forEach((d) => sessionBatch.delete(d.ref))
    await sessionBatch.commit()
  }

  return NextResponse.json({ success: true })
}
