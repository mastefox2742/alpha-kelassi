import { Hono } from 'hono'
import { supabaseAdmin as supabase } from '../lib/supabase.js'

const router = new Hono()

// GET /api/notifications?plan=free  — notifs actives pour le dashboard étudiant (endpoint public)
router.get('/', async (c) => {
  const plan = c.req.query('plan') ?? 'free'
  const { data } = await supabase.from('notifications')
    .select('id, type, title, message, cta_label, cta_url')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .or(`target_plan.eq.all,target_plan.eq.${plan}`)
    .order('created_at', { ascending: false })
    .limit(5)
  return c.json({ data: data ?? [] })
})

export { router as notificationsRouter }


