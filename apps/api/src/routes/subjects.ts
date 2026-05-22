import { Hono } from 'hono'
import type { AppVariables } from '../lib/types.js'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

import { redis } from '../lib/redis.js'
import { authMiddleware } from '../middleware/auth.js'

const router = new Hono<{ Variables: AppVariables }>()

router.use('*', authMiddleware)

// GET /api/subjects?level=bepc&country=CG
router.get('/', zValidator('query', z.object({
  level: z.enum(['bepc', 'bac_a', 'bac_c', 'bac_d']).optional(),
  country: z.string().default('CG'),
})), async (c) => {
  const { level, country } = c.req.valid('query')
  const cacheKey = `subjects:${level ?? 'all'}:${country}`

  const cached = await redis.get(cacheKey)
  if (cached) return c.json({ data: cached })

  let query = c.get('supabase').from('subjects').select('*').eq('country_code', country).order('name')
  if (level) query = query.eq('level', level)

  const { data, error } = await query
  if (error) return c.json({ error: { code: 'DB_ERROR', message: error.message } }, 500)

  await redis.set(cacheKey, data, { ex: 3600 })
  return c.json({ data })
})

export { router as subjectsRouter }


