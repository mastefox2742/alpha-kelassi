import { Hono } from 'hono'
import type { AppVariables } from '../lib/types.js'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

import { authMiddleware } from '../middleware/auth.js'

const router = new Hono<{ Variables: AppVariables }>()
router.use('*', authMiddleware)

// POST /api/feedback
router.post(
  '/',
  zValidator('json', z.object({
    rating:      z.number().int().min(1).max(5),
    comment:     z.string().max(1000).optional(),
    page:        z.string().max(100).optional(),
    app_version: z.string().max(20).optional(),
  })),
  async (c) => {
    const userId = c.get('userId') as string
    const body = c.req.valid('json')

    const { error } = await c.get('supabase').from('beta_feedback').insert({
      user_id:     userId,
      rating:      body.rating,
      comment:     body.comment ?? null,
      page:        body.page ?? null,
      app_version: body.app_version ?? null,
    })

    if (error) return c.json({ error: { code: 'DB_ERROR', message: error.message } }, 500)
    return c.json({ data: { submitted: true } }, 201)
  }
)

// GET /api/feedback â€” admin seulement
router.get('/', async (c) => {
  const userId = c.get('userId') as string
  const { data: user } = await c.get('supabase').from('users').select('role').eq('id', userId).single()
  if (user?.role !== 'admin') return c.json({ error: { code: 'FORBIDDEN' } }, 403)

  const { data } = await c.get('supabase').from('beta_feedback')
    .select('id, rating, comment, page, app_version, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const avg = data && data.length > 0
    ? (data.reduce((s, r) => s + r.rating, 0) / data.length).toFixed(1)
    : null

  return c.json({ data: data ?? [], meta: { count: data?.length ?? 0, avg_rating: avg } })
})

export { router as feedbackRouter }


