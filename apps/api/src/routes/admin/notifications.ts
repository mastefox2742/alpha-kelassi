import { Hono } from 'hono'
import type { AppVariables } from '../../lib/types.js'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { supabaseAdmin as supabase } from '../../lib/supabase.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = new Hono<{ Variables: AppVariables }>()
router.use('*', authMiddleware)

router.use('*', async (c, next) => {
  const userId = c.get('userId') as string
  const { data: user } = await supabase.from('users').select('role').eq('id', userId).single()
  if (user?.role !== 'admin') return c.json({ error: { code: 'FORBIDDEN' } }, 403)
  await next()
})

const notifSchema = z.object({
  type: z.enum(['annonce', 'promo', 'pub', 'alerte']).default('annonce'),
  title: z.string().min(2).max(120),
  message: z.string().min(5).max(500),
  cta_label: z.string().max(60).optional().nullable(),
  cta_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
  target_plan: z.enum(['all', 'free', 'premium']).default('all'),
  expires_at: z.string().datetime().optional().nullable(),
})

// GET /api/admin/notifications
router.get('/', async (c) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return c.json({ error: { message: error.message } }, 500)
  return c.json({ data })
})

// POST /api/admin/notifications
router.post('/', zValidator('json', notifSchema), async (c) => {
  const body = c.req.valid('json')
  const { data, error } = await supabase.from('notifications').insert(body).select().single()
  if (error) return c.json({ error: { message: error.message } }, 500)
  return c.json({ data }, 201)
})

// PATCH /api/admin/notifications/:id
router.patch('/:id', zValidator('json', notifSchema.partial()), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const { data, error } = await supabase
    .from('notifications').update(body).eq('id', id).select().single()
  if (error) return c.json({ error: { message: error.message } }, 500)
  return c.json({ data })
})

// DELETE /api/admin/notifications/:id
router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await supabase.from('notifications').delete().eq('id', id)
  return c.json({ data: { deleted: true } })
})

export { router as adminNotificationsRouter }


