import { Hono } from 'hono'
import type { AppVariables } from '../lib/types.js'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

import { authMiddleware } from '../middleware/auth.js'

const router = new Hono<{ Variables: AppVariables }>()
router.use('*', authMiddleware)

// GET /api/onboarding/status
router.get('/status', async (c) => {
  const userId = c.get('userId') as string
  const { data: user } = await c.get('supabase').from('users')
    .select('onboarding_completed, study_level_pref, subject_ids_pref')
    .eq('id', userId)
    .single()

  return c.json({ data: { completed: user?.onboarding_completed ?? false, ...user } })
})

// POST /api/onboarding/complete
router.post(
  '/complete',
  zValidator('json', z.object({
    level:       z.enum(['bepc', 'bac_a', 'bac_c', 'bac_d']),
    subject_ids: z.array(z.string().uuid()).min(1).max(8),
  })),
  async (c) => {
    const userId = c.get('userId') as string
    const { level, subject_ids } = c.req.valid('json')

    // Marque l'onboarding terminÃ© + sauvegarde les prÃ©fÃ©rences
    await c.get('supabase').from('users').update({
      onboarding_completed: true,
      study_level_pref:    level,
      subject_ids_pref:    subject_ids,
    }).eq('id', userId)

    // CrÃ©e les entrÃ©es user_progress pour les matiÃ¨res choisies
    const progressRows = subject_ids.map((sid) => ({
      user_id:    userId,
      subject_id: sid,
    }))
    await c.get('supabase').from('user_progress').upsert(progressRows, {
      onConflict:     'user_id,subject_id',
      ignoreDuplicates: true,
    })

    // Trouve le premier document indexÃ© pour le niveau choisi â†’ suggÃ¨re une flashcard
    const { data: doc } = await c.get('supabase').from('documents')
      .select('id, title')
      .eq('level', level)
      .eq('type', 'cours')
      .not('indexed_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return c.json({
      data: {
        completed: true,
        suggested_document: doc ?? null,
      },
    })
  }
)

export { router as onboardingRouter }


