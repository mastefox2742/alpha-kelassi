import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> },
) {
  const { id, chapterId } = await params
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const snap = await adminDb.collection('course_chapters').doc(chapterId).get()

  if (!snap.exists || snap.data()?.document_id !== id) {
    return NextResponse.json({ error: 'Chapitre introuvable' }, { status: 404 })
  }

  return NextResponse.json({ chapter: { id: snap.id, ...snap.data() } })
}
