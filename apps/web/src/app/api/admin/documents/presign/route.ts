import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'
import { adminStorage } from '@/lib/firebase/admin'

export async function GET(req: NextRequest) {
  // Auth
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérif admin
  const profileSnap = await adminDb.collection('users').doc(userId).get()
  if (profileSnap.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const filename  = searchParams.get('filename') ?? 'document'
  const isPremium = searchParams.get('premium') === 'true'

  const safeName = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/^[._]+/, '')
    .slice(0, 100)

  const bucket      = isPremium ? 'pdfs-premium' : 'pdfs-public'
  const storagePath = `${Date.now()}_${safeName}`

  try {
    const file = adminStorage.bucket(bucket).file(storagePath)
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action:  'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 min
      contentType: 'application/octet-stream',
    })

    return NextResponse.json({ signedUrl, path: storagePath, bucket })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message ?? 'Erreur presign' }, { status: 500 })
  }
}
