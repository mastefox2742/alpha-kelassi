import { Hono } from 'hono'
import { z } from 'zod'
import { createHash } from 'crypto'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { authMiddleware } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { redis } from '../lib/redis.js'
import { searchRelevantChunks } from '../lib/vector-search.js'
import { checkAndIncrementQuota, getQuotaStatus } from '../lib/quota.js'

const router = new Hono()
const genai = new GoogleGenerativeAI(process.env['GEMINI_API_KEY']!)

router.use('*', authMiddleware)

const chatSchema = z.object({
  question: z.string().min(3).max(2000),
  session_id: z.string().uuid().optional(),
  document_id: z.string().uuid().optional(),
})

const SYSTEM_PROMPT = `Tu es Kelassi, un tuteur pédagogique expert pour les élèves congolais préparant le BEPC et le BAC au Congo Brazzaville.

MÉTHODE FEYNMAN (obligatoire) :
1. Reformule la question en termes simples, comme si l'élève avait 12 ans
2. Explique le concept avec des analogies tirées de la vie quotidienne congolaise (marché Total, fleuve Congo, agriculture, sports locaux...)
3. Numérote chaque étape du raisonnement (Étape 1, Étape 2...)
4. Identifie et corrige les erreurs de compréhension possibles
5. Termine TOUJOURS par une question de vérification : "✅ Pour vérifier ta compréhension : [question simple]"
6. Propose une flashcard : "🃏 Flashcard : [Question courte] → [Réponse courte]"

RÈGLES :
- Réponds UNIQUEMENT en français
- Cite les numéros de page si disponibles dans le contexte
- Si la réponse n'est pas dans le contexte du cours, dis : "Je n'ai pas cette information dans les cours disponibles. Consulte ton manuel de [matière]."
- Formules mathématiques : utilise la notation LaTeX entre $ (ex: $x^2 + y^2 = z^2$)
- Maximum 400 mots par réponse`

// GET /ai/quota — quota restant
router.get('/quota', async (c) => {
  const userId = c.get('userId') as string
  const { data: profile } = await supabase.from('users').select('plan').eq('id', userId).single()
  const status = await getQuotaStatus(userId, profile?.plan ?? 'free')
  return c.json({ data: status })
})

// GET /ai/sessions — liste des sessions de chat
router.get('/sessions', async (c) => {
  const userId = c.get('userId') as string
  const { data } = await supabase
    .from('chat_sessions')
    .select('id, created_at, document_id, documents(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  return c.json({ data: data ?? [] })
})

// GET /ai/sessions/:id/messages — historique d'une session
router.get('/sessions/:id/messages', async (c) => {
  const userId = c.get('userId') as string
  const sessionId = c.req.param('id')

  // Vérifie que la session appartient à l'utilisateur
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (!session) return c.json({ error: { code: 'NOT_FOUND' } }, 404)

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  return c.json({ data: messages ?? [] })
})

// POST /ai/chat — streaming SSE
router.post('/chat', async (c) => {
  const userId = c.get('userId') as string
  const body = chatSchema.parse(await c.req.json())

  // 1. Plan + quota
  const { data: profile } = await supabase.from('users').select('plan').eq('id', userId).single()
  const plan = profile?.plan ?? 'free'
  const quota = await checkAndIncrementQuota(userId, plan)

  if (!quota.allowed) {
    return c.json({
      error: {
        code: 'QUOTA_EXCEEDED',
        message: `Limite journalière atteinte (${plan === 'free' ? '10' : '200'} questions/jour). ${plan === 'free' ? 'Passe à Premium pour continuer.' : 'Réessaie demain.'}`,
        remaining: 0,
      },
    }, 429)
  }

  // 2. Session : crée ou récupère
  let sessionId = body.session_id
  if (!sessionId) {
    const { data: session } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, document_id: body.document_id ?? null })
      .select('id')
      .single()
    sessionId = session!.id
  }

  // 3. Cache Redis (clé = SHA256 de la question normalisée)
  const cacheKey = `cache:chat:${createHash('sha256').update(body.question.toLowerCase().trim()).digest('hex')}`
  const cached = await redis.get<string>(cacheKey)
  if (cached) {
    // Sauvegarde async sans bloquer
    saveChatMessages(sessionId, body.question, cached).catch(() => {})
    return new Response(cached, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Session-Id': sessionId,
        'X-Quota-Remaining': String(quota.remaining),
        'X-Cache': 'HIT',
      },
    })
  }

  // 4. Recherche vectorielle
  const chunks = await searchRelevantChunks(body.question, {
    matchCount: 5,
    minSimilarity: 0.72,
    documentId: body.document_id,
  })

  // 5. Historique (5 derniers tours)
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10)

  const historyText = (history ?? [])
    .reverse()
    .map((m) => `${m.role === 'user' ? 'Élève' : 'Kelassi'}: ${m.content}`)
    .join('\n')

  // 6. Construction du prompt
  const contextText = chunks.length > 0
    ? chunks.map((c, i) => `[Source ${i + 1}${c.page_number ? `, page ${c.page_number}` : ''}]\n${c.content}`).join('\n\n---\n\n')
    : 'Aucun contenu de cours disponible pour cette question.'

  const userPrompt = [
    `CONTEXTE DU COURS :\n${contextText}`,
    historyText ? `HISTORIQUE RÉCENT :\n${historyText}` : null,
    `QUESTION DE L'ÉLÈVE :\n${body.question}`,
  ].filter(Boolean).join('\n\n===\n\n')

  // 7. Streaming Gemini
  const model = genai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
  })

  const stream = await model.generateContentStream(userPrompt)

  let fullResponse = ''

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Envoie les métadonnées en premier événement
      controller.enqueue(encoder.encode(
        `event: meta\ndata: ${JSON.stringify({ session_id: sessionId, quota_remaining: quota.remaining, sources_count: chunks.length })}\n\n`
      ))

      for await (const chunk of stream.stream) {
        const text = chunk.text()
        if (text) {
          fullResponse += text
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }
      }

      controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'))
      controller.close()

      // Sauvegarde async après la fin du stream
      Promise.all([
        saveChatMessages(sessionId!, body.question, fullResponse),
        redis.set(cacheKey, fullResponse, { ex: 86400 }), // TTL 24h
      ]).catch(console.error)
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Session-Id': sessionId,
      'X-Quota-Remaining': String(quota.remaining),
    },
  })
})

async function saveChatMessages(sessionId: string, question: string, answer: string) {
  await supabase.from('chat_messages').insert([
    { session_id: sessionId, role: 'user', content: question },
    { session_id: sessionId, role: 'assistant', content: answer },
  ])
}

export { router as aiRouter }
