import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'

const schema = z.object({
  level:       z.enum(['bepc', 'bac_a', 'bac_c', 'bac_d']),
  subject_ids: z.array(z.string()).min(1).max(8),
})

/** POST /api/onboarding/complete — finalise l'onboarding */
export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: z.infer<typeof schema>
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { level, subject_ids } = body

  // Marque l'onboarding terminé + sauvegarde les préférences
  await adminDb.collection('users').doc(userId).update({
    onboarding_completed: true,
    study_level_pref:    level,
    subject_ids_pref:    subject_ids,
  })

  // Crée les entrées user_progress pour les matières choisies (upsert via set merge)
  const batch = adminDb.batch()
  for (const sid of subject_ids) {
    const ref = adminDb.collection('user_progress').doc(`${userId}_${sid}`)
    batch.set(ref, { user_id: userId, subject_id: sid }, { merge: true })
  }
  await batch.commit()

  // Trouve un premier document indexé pour suggérer une flashcard
  const docSnap = await adminDb
    .collection('documents')
    .where('level', '==', level)
    .where('type', '==', 'cours')
    .where('indexed_at', '!=', null)
    .orderBy('indexed_at', 'desc')
    .limit(1)
    .get()

  const doc = docSnap.empty ? null : { id: docSnap.docs[0].id, ...docSnap.docs[0].data() }

  return NextResponse.json({
    data: { completed: true, suggested_document: doc },
  })
}
