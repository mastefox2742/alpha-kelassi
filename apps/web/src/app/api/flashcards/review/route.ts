import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'
import { z } from 'zod'
import { computeSM2 } from '@/lib/sm2'
import { awardXP, checkAndAwardBadges } from '@/lib/xp'

const schema = z.object({
  flashcard_id: z.string().min(1),
  quality:      z.number().int().min(0).max(5),
})

/** POST /api/flashcards/review — enregistre une révision SM-2 */
export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: z.infer<typeof schema>
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { flashcard_id, quality } = body

  const cardRef  = adminDb.collection('flashcards').doc(flashcard_id)
  const cardSnap = await cardRef.get()

  if (!cardSnap.exists || cardSnap.data()?.user_id !== userId) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  const card = cardSnap.data()!
  const result = computeSM2(
    { easeFactor: card.ease_factor, interval: card.interval, reps: card.reps },
    quality
  )

  try {
    await cardRef.update({
      ease_factor: result.easeFactor,
      interval:    result.interval,
      reps:        result.reps,
      next_review: result.nextReview.toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: (err as Error).message } }, { status: 500 })
  }

  const updated = { id: flashcard_id, ...card, ease_factor: result.easeFactor, interval: result.interval, reps: result.reps, next_review: result.nextReview.toISOString() }

  // XP + badges en arrière-plan
  const xpAmount = quality >= 4 ? 3 : quality >= 3 ? 2 : 0
  if (xpAmount > 0) {
    awardXP(userId, xpAmount).catch(() => null)
    checkAndAwardBadges(userId).catch(() => null)
  }

  return NextResponse.json({ data: updated })
}
