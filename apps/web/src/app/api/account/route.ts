import { NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'
import { adminAuth } from '@/lib/firebase/admin'

/** DELETE /api/account — suppression RGPD du compte */
export async function DELETE(req: Request) {
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    // Supprime le document Firestore utilisateur
    await adminDb.collection('users').doc(userId).delete()
    // Supprime le compte Firebase Auth
    await adminAuth.deleteUser(userId).catch(() => null)
  } catch (e) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: String(e) } }, { status: 500 })
  }
  return NextResponse.json({ data: { deleted: true } })
}
