import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'

export const maxDuration = 10

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params

  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérifie rôle admin
  const profileSnap = await adminDb.collection('users').doc(userId).get()
  if (profileSnap.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body   = await req.json().catch(() => ({}))
  const apiUrl = process.env['INTERNAL_API_URL'] ?? 'http://localhost:3001'
  const secret = process.env['INTERNAL_API_SECRET'] ?? ''

  const res = await fetch(`${apiUrl}/api/admin/synthesize/${documentId}`, {
    method:  'POST',
    headers: {
      'Content-Type':     'application/json',
      'x-internal-token': secret,
    },
    body: JSON.stringify({ level: body.level }),
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json(data, { status: res.status })

  return NextResponse.json(data)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params

  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Lit le statut directement depuis Firestore
  const snap = await adminDb
    .collection('course_chapters')
    .where('document_id', '==', documentId)
    .orderBy('chapter_number', 'asc')
    .get()

  const chapters = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const total    = chapters.length
  const done     = chapters.filter((c: any) => c.status === 'done').length
  const errors   = chapters.filter((c: any) => c.status === 'error').length

  return NextResponse.json({ chapters, stats: { total, done, errors } })
}
