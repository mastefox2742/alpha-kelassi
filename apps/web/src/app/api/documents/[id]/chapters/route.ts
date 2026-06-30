import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const snap = await adminDb
      .collection('course_chapters')
      .where('document_id', '==', id)
      .where('status', '==', 'done')
      .orderBy('chapter_number', 'asc')
      .get()

    const chapters = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ chapters })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
