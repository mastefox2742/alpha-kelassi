import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  level:       z.enum(['bepc', 'bac_a', 'bac_c', 'bac_d']),
  subject_ids: z.array(z.string().uuid()).min(1).max(8),
})

/** POST /api/onboarding/complete — finalise l'onboarding */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: z.infer<typeof schema>
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { level, subject_ids } = body

  // Marque l'onboarding terminé + sauvegarde les préférences
  await supabase.from('users').update({
    onboarding_completed: true,
    study_level_pref:    level,
    subject_ids_pref:    subject_ids,
  }).eq('id', user.id)

  // Crée les entrées user_progress pour les matières choisies
  await supabase.from('user_progress').upsert(
    subject_ids.map((sid) => ({ user_id: user.id, subject_id: sid })),
    { onConflict: 'user_id,subject_id', ignoreDuplicates: true }
  )

  // Trouve un premier document indexé pour suggérer une flashcard
  const { data: doc } = await supabase
    .from('documents')
    .select('id, title')
    .eq('level', level)
    .eq('type', 'cours')
    .not('indexed_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    data: { completed: true, suggested_document: doc ?? null },
  })
}
