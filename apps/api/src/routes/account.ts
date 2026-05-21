import { Hono } from 'hono'
import { supabase } from '../lib/supabase.js'
import { authMiddleware } from '../middleware/auth.js'

const router = new Hono()
router.use('*', authMiddleware)

// GET /api/account/export — export RGPD de toutes les données personnelles
router.get('/export', async (c) => {
  const userId = c.get('userId') as string

  const [
    { data: user },
    { data: subscriptions },
    { data: progress },
    { data: flashcards },
    { data: sessions },
    { data: badges },
  ] = await Promise.all([
    supabase.from('users').select('id, email, phone, full_name, plan, created_at').eq('id', userId).single(),
    supabase.from('subscriptions').select('plan, status, expires_at, created_at').eq('user_id', userId),
    supabase.from('user_progress').select('*, subjects(name, level)').eq('user_id', userId),
    supabase.from('flashcards').select('front, back, interval, reps, next_review, created_at').eq('user_id', userId).limit(500),
    supabase.from('chat_sessions').select('id, created_at, title').eq('user_id', userId).limit(100),
    supabase.from('user_badges').select('badge_code, earned_at').eq('user_id', userId),
  ])

  const exportData = {
    generated_at: new Date().toISOString(),
    user,
    subscriptions,
    progress,
    flashcards,
    chat_sessions: sessions,
    badges,
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="kelassi-data-${userId.slice(0, 8)}.json"`,
    },
  })
})

// DELETE /api/account — suppression du compte (RGPD)
router.delete('/', async (c) => {
  const userId = c.get('userId') as string

  // La cascade PostgreSQL supprime automatiquement toutes les données liées
  // (subscriptions, progress, flashcards, chat_sessions, user_badges, document_views)
  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) return c.json({ error: { code: 'DB_ERROR', message: error.message } }, 500)

  // Supprime aussi l'utilisateur Supabase Auth (nécessite le service_role key côté admin)
  // En attendant, l'entrée users est supprimée et la cascade désactive l'accès
  return c.json({ data: { deleted: true } })
})

export { router as accountRouter }
