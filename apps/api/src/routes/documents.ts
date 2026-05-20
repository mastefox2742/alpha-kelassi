import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { supabase } from '../lib/supabase.js'
import { redis } from '../lib/redis.js'
import { authMiddleware } from '../middleware/auth.js'

const router = new Hono()

router.use('*', authMiddleware)

// GET /api/documents?subject_id=&type=cours&level=bepc&year=2023&cursor=&limit=20
router.get('/', zValidator('query', z.object({
  subject_id: z.string().uuid().optional(),
  type: z.enum(['cours', 'examen']).optional(),
  level: z.enum(['bepc', 'bac_a', 'bac_c', 'bac_d']).optional(),
  year: z.coerce.number().int().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})), async (c) => {
  const { subject_id, type, level, year, cursor, limit } = c.req.valid('query')
  const userId = c.get('userId') as string

  // Vérifie le plan de l'utilisateur
  const { data: user } = await supabase.from('users').select('plan').eq('id', userId).single()
  const isPremium = user?.plan === 'premium'

  const cacheKey = `docs:${subject_id}:${type}:${level}:${year}:${cursor}:${limit}:${isPremium}`
  const cached = await redis.get(cacheKey)
  if (cached) return c.json(cached)

  let query = supabase
    .from('documents')
    .select('id, title, type, level, year, session, subject_id, is_premium, country_code, created_at')
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (!isPremium) query = query.eq('is_premium', false)
  if (subject_id) query = query.eq('subject_id', subject_id)
  if (type) query = query.eq('type', type)
  if (level) query = query.eq('level', level)
  if (year) query = query.eq('year', year)
  if (cursor) query = query.lt('created_at', cursor)

  const { data, error } = await query
  if (error) return c.json({ error: { code: 'DB_ERROR', message: error.message } }, 500)

  const hasMore = data.length > limit
  const items = hasMore ? data.slice(0, limit) : data
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null

  const result = { data: items, next_cursor: nextCursor, has_more: hasMore }
  await redis.set(cacheKey, result, { ex: 3600 })
  return c.json(result)
})

// GET /api/documents/:id — détail + URL PDF signée 15 min
router.get('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId') as string

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !doc) return c.json({ error: { code: 'NOT_FOUND', message: 'Document introuvable' } }, 404)

  if (doc.is_premium) {
    const { data: user } = await supabase.from('users').select('plan').eq('id', userId).single()
    if (user?.plan !== 'premium') {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Abonnement premium requis' } }, 403)
    }
  }

  // Génère une URL signée (15 min) pour le PDF
  const bucket = doc.is_premium ? 'pdfs-premium' : 'pdfs-public'
  const filePath = doc.pdf_url.split('/').pop() ?? ''
  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 900)

  // XP + tracking vue en arrière-plan
  const { awardXP, trackDocumentView, checkAndAwardBadges } = await import('../lib/xp.js')
  Promise.all([
    trackDocumentView(userId, id),
    awardXP(userId, 5),
    checkAndAwardBadges(userId),
  ]).catch(() => null)

  return c.json({ data: { ...doc, signed_url: signed?.signedUrl } })
})

// GET /api/documents/:id/exercises — chunks exercices pour contextualisation Kelassi
router.get('/:id/exercises', async (c) => {
  const id = c.req.param('id')

  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index, page_number, metadata')
    .eq('document_id', id)
    .filter('metadata->>is_exercise', 'eq', 'true')
    .order('chunk_index')
    .limit(30)

  if (error) return c.json({ error: { code: 'DB_ERROR', message: error.message } }, 500)
  return c.json({ data: chunks ?? [] })
})

// GET /api/documents/:id/text — texte extrait pour mode hors-ligne
router.get('/:id/text', async (c) => {
  const id = c.req.param('id')

  const { data: doc } = await supabase
    .from('documents')
    .select('text_content, is_premium')
    .eq('id', id)
    .single()

  if (!doc) return c.json({ error: { code: 'NOT_FOUND', message: 'Document introuvable' } }, 404)

  if (doc.is_premium) {
    const userId = c.get('userId') as string
    const { data: user } = await supabase.from('users').select('plan').eq('id', userId).single()
    if (user?.plan !== 'premium') {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Abonnement premium requis' } }, 403)
    }
  }

  return c.json({ data: { text_content: doc.text_content } })
})

export { router as documentsRouter }
