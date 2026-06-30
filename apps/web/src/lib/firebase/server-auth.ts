/**
 * Helper pour vérifier l'auth Firebase dans les Route Handlers Next.js.
 * Supporte le header Authorization: Bearer <token> ET le cookie firebase-token.
 */
import { cookies } from 'next/headers'
import { adminAuth, adminDb } from './admin'

export async function verifyAuth(req: Request): Promise<string | null> {
  // 1. Essaie le header Authorization
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.slice(7))
      return decoded.uid
    } catch {
      return null
    }
  }

  // 2. Fallback : cookie firebase-token (SSC, formulaires)
  try {
    const store = await cookies()
    const token = store.get('firebase-token')?.value
    if (!token) return null
    const decoded = await adminAuth.verifyIdToken(token)
    return decoded.uid
  } catch {
    return null
  }
}

/** Vérifie l'auth et charge le profil utilisateur */
export async function verifyAuthWithProfile(req: Request) {
  const userId = await verifyAuth(req)
  if (!userId) return { userId: null, profile: null }
  try {
    const snap = await adminDb.collection('users').doc(userId).get()
    return { userId, profile: snap.exists ? snap.data()! : null }
  } catch {
    return { userId, profile: null }
  }
}

export { adminDb }
