import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { computeSM2 } from '@/lib/sm2'
import { awardXP, checkAndAwardBadges } from '@/lib/xp'

const schema = z.object({
  flashcard_id: z.string().uuid(),
  quality:      z.number().int().min(0).max(5),
})

/** POST /api/flashcards/review — enregistre une révision SM-2 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: z.infer<typeof schema>
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { flashcard_id, quality } = body

  const { data: card } = await supabase
    .from('flashcards')
    .select('ease_factor, interval, reps')
    .eq('id', flashcard_id)
    .eq('user_id', user.id)
    .single()

  if (!card) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })

  const result = computeSM2(
    { easeFactor: card.ease_factor, interval: card.interval, reps: card.reps },
    quality
  )

  const { data: updated, error } = await supabase
    .from('flashcards')
    .update({
      ease_factor: result.easeFactor,
      interval:    result.interval,
      reps:        result.reps,
      next_review: result.nextReview.toISOString(),
    })
    .eq('id', flashcard_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })

  // XP + badges en arrière-plan
  const xpAmount = quality >= 4 ? 3 : quality >= 3 ? 2 : 0
  if (xpAmount > 0) {
    awardXP(user.id, xpAmount).catch(() => null)
    checkAndAwardBadges(user.id).catch(() => null)
  }

  return NextResponse.json({ data: updated })
}
