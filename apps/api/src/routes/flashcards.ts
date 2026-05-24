import { Hono } from 'hono'
import type { AppVariables } from '../lib/types.js'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { GoogleGenAI } from '@google/genai'
import { authMiddleware } from '../middleware/auth.js'

import { computeSM2 } from '../lib/sm2.js'

const router = new Hono<{ Variables: AppVariables }>()
const genai = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY']! })

router.use('*', authMiddleware)

// GET /flashcards/due — cartes à réviser aujourd'hui
router.get('/due', async (c) => {
  const userId = c.get('userId') as string
  const limit = parseInt(c.req.query('limit') ?? '20', 10)

  const { data, error } = await c.get('supabase').from('flashcards')
    .select('*, documents(title, subjects(name))')
    .eq('user_id', userId)
    .lte('next_review', new Date().toISOString())
    .order('next_review', { ascending: true })
    .limit(limit)

  if (error) return c.json({ error: { code: 'DB_ERROR', message: error.message } }, 500)
  return c.json({ data: data ?? [], count: data?.length ?? 0 })
})

// GET /flashcards — toutes les cartes (avec filtre optionnel)
router.get('/', async (c) => {
  const userId = c.get('userId') as string
  const documentId = c.req.query('document_id')

  let query = c.get('supabase').from('flashcards')
    .select('*, documents(title, subjects(name))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (documentId) query = query.eq('document_id', documentId)

  const { data, error } = await query.limit(200)
  if (error) return c.json({ error: { code: 'DB_ERROR', message: error.message } }, 500)
  return c.json({ data: data ?? [] })
})

// POST /flashcards/review — enregistre une révision SM-2
router.post(
  '/review',
  zValidator('json', z.object({ flashcard_id: z.string().uuid(), quality: z.number().int().min(0).max(5) })),
  async (c) => {
    const userId = c.get('userId') as string
    const { flashcard_id, quality } = c.req.valid('json')

    const { data: card } = await c.get('supabase').from('flashcards')
      .select('ease_factor, interval, reps')
      .eq('id', flashcard_id)
      .eq('user_id', userId)
      .single()

    if (!card) return c.json({ error: { code: 'NOT_FOUND' } }, 404)

    const result = computeSM2(
      { easeFactor: card.ease_factor, interval: card.interval, reps: card.reps },
      quality
    )

    const { data: updated, error } = await c.get('supabase').from('flashcards')
      .update({
        ease_factor: result.easeFactor,
        interval: result.interval,
        reps: result.reps,
        next_review: result.nextReview.toISOString(),
      })
      .eq('id', flashcard_id)
      .select()
      .single()

    if (error) return c.json({ error: { code: 'DB_ERROR', message: error.message } }, 500)

    // XP + badges en arrière-plan (non bloquant)
    const xpAmount = quality >= 4 ? 3 : quality >= 3 ? 2 : 0
    if (xpAmount > 0) {
      const { awardXP, checkAndAwardBadges } = await import('../lib/xp.js')
      awardXP(userId, xpAmount).catch(() => null)
      checkAndAwardBadges(userId).catch(() => null)
    }

    return c.json({ data: updated })
  }
)

// POST /flashcards/generate — génère des flashcards depuis un document
router.post(
  '/generate',
  zValidator('json', z.object({ document_id: z.string().uuid(), count: z.number().int().min(1).max(20).default(10) })),
  async (c) => {
    const userId = c.get('userId') as string
    const { document_id, count } = c.req.valid('json')

    // Récupère les chunks du document
    const { data: chunks } = await c.get('supabase').from('document_chunks')
      .select('content')
      .eq('document_id', document_id)
      .order('chunk_index', { ascending: true })
      .limit(30)

    if (!chunks || chunks.length === 0) {
      return c.json({ error: { code: 'NOT_INDEXED', message: 'Ce document n\'est pas encore indexé. Réessaie dans quelques minutes.' } }, 422)
    }

    const context = chunks.map((c) => c.content).join('\n\n---\n\n').slice(0, 8000)

    const prompt = `Tu es un expert pédagogique. À partir du contenu de cours ci-dessous, génère exactement ${count} flashcards pour aider un élève congolais à réviser.

Règles :
- Recto (front) : question courte et précise (max 120 caractères)
- Verso (back) : réponse concise (max 300 caractères), avec un exemple concret si possible
- Couvre les concepts clés, définitions et formules importantes
- Varie les types : définition, application, exemple, calcul

Retourne UNIQUEMENT un tableau JSON valide, sans markdown, sans commentaires :
[{"front":"...","back":"..."},...]

Contenu du cours :
${context}`

    const response = await genai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })
    const raw = response.text ?? ''

    let cards: Array<{ front: string; back: string }>
    try {
      const jsonStr = raw.startsWith('[') ? raw : raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)
      cards = JSON.parse(jsonStr)
      if (!Array.isArray(cards)) throw new Error('Not an array')
    } catch {
      return c.json({ error: { code: 'GENERATION_ERROR', message: 'Erreur de génération. Réessaie.' } }, 500)
    }

    const rows = cards.slice(0, count).map((card) => ({
      user_id: userId,
      document_id,
      front: card.front,
      back: card.back,
    }))

    const { data: inserted, error: dbError } = await c.get('supabase').from('flashcards')
      .insert(rows)
      .select()

    if (dbError) return c.json({ error: { code: 'DB_ERROR', message: dbError.message } }, 500)
    return c.json({ data: inserted, count: inserted?.length ?? 0 }, 201)
  }
)

// DELETE /flashcards/:id
router.delete('/:id', async (c) => {
  const userId = c.get('userId') as string
  const id = c.req.param('id')
  await c.get('supabase').from('flashcards').delete().eq('id', id).eq('user_id', userId)
  return c.json({ data: { deleted: true } })
})

export { router as flashcardsRouter }


