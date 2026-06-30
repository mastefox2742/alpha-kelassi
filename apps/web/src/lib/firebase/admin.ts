/**
 * Firebase Admin SDK côté serveur Next.js (Server Components, Route Handlers).
 * Utilise les mêmes variables d'env que l'API Hono.
 */
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

function initAdmin(): App {
  if (getApps().length > 0) return getApps()[0]!
  const rawKey    = process.env['FIREBASE_PRIVATE_KEY'] ?? ''
  const privateKey = rawKey.replace(/\\n/g, '\n')
  return initializeApp({
    credential: cert({
      projectId:   process.env['FIREBASE_PROJECT_ID']!,
      clientEmail: process.env['FIREBASE_CLIENT_EMAIL']!,
      privateKey,
    }),
    storageBucket: process.env['FIREBASE_STORAGE_BUCKET']!,
  })
}

const adminApp = initAdmin()

export const adminAuth    = getAuth(adminApp)
export const adminDb      = getFirestore(adminApp)
export const adminStorage = getStorage(adminApp)
