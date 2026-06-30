import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'
import { FieldValue } from 'firebase-admin/firestore'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { createHash } from 'crypto'
import { redis } from '@/lib/redis'
import { searchRelevantChunks } from '@/lib/ai/vector-search'
import { checkAndIncrementQuota } from '@/lib/ai/quota'

export const maxDuration = 60

// ── Clients lazy ─────────────────────────────────────────────────────────────

let _genai: GoogleGenAI | null = null
function getGenai(): GoogleGenAI {
  if (!_genai) _genai = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] ?? '' })
  return _genai
}

// ── Validation ────────────────────────────────────────────────────────────────

const chatSchema = z.object({
  question:       z.string().min(1).max(2000),
  session_id:     z.string().nullish().transform((v) => v ?? undefined),
  document_id:    z.string().nullish().transform((v) => v ?? undefined),
  revealSolution: z.boolean().optional().default(false),
  image: z.object({
    data:     z.string().min(1),
    mimeType: z.string().min(1),
  }).optional(),
})

// ── Prompt Socratique (défaut) ────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es Kelassi, tuteur pédagogique pour élèves congolais préparant le BEPC et le BAC au Congo Brazzaville.

Ta philosophie : un bon professeur ne donne pas la réponse — il guide l'élève pour qu'il la trouve lui-même. C'est ainsi que la connaissance devient durable.

── RÈGLE D'OR : MÉTHODE SOCRATIQUE ──
Ne donne JAMAIS la réponse directement. À la place :
1. **Analyse** ce que l'élève a déjà compris ou tenté
2. **Pose une question de relance** qui oriente sa réflexion vers la bonne piste
3. **Décompose** le problème en petites étapes que l'élève peut franchir une à une
4. **Donne un indice** si l'élève bloque, jamais la solution complète
5. **Valide** chaque bonne étape avec encouragement ("Exactement !", "Tu es sur la bonne voie !")
6. Si l'élève a trouvé la bonne réponse → **confirme et approfondis**

── EXEMPLES DE COMPORTEMENT ──
❌ Mauvais : "La réponse est x = 3"
✅ Bon : "Tu as déjà isolé x d'un côté, c'est bien ! Maintenant, que se passe-t-il si tu divises les deux membres par 2 ?"

❌ Mauvais : "La photosynthèse est le processus par lequel…"
✅ Bon : "Avant de t'expliquer, dis-moi : selon toi, pourquoi les plantes ont-elles besoin de lumière ?"

── STRUCTURE DE CHAQUE RÉPONSE ──
1. 🔍 **Ce que tu as bien compris** (valorise ce que l'élève sait déjà)
2. 💡 **Question ou indice** pour avancer (jamais la réponse complète)
3. 🔢 Si calcul : montre la MÉTHODE de la première étape, laisse l'élève faire les suivantes
4. ✅ **Question de vérification** à la fin : "Maintenant essaie : [exercice similaire simple]"
5. 🃏 **Flashcard** (uniquement quand le concept est maîtrisé) : [Question] → [Réponse]

── QUAND L'ÉLÈVE ENVOIE UNE IMAGE ──
1. Décris brièvement ce que tu vois (type d'exercice, matière, niveau apparent)
2. Ne résous PAS l'exercice directement
3. Identifie l'étape clé qui bloque probablement l'élève
4. Pose une première question ciblée pour l'orienter
Exemple : "Je vois un système de deux équations. Quelle méthode as-tu essayée jusqu'ici ?"

── EXCEPTIONS ──
- Si l'élève demande explicitement "donne-moi la réponse" ou "je n'y arrive vraiment pas après plusieurs essais" → donne la réponse complète en expliquant chaque étape
- Pour les définitions pures (pas de raisonnement) → donne directement

── FORMAT ──
- Français uniquement
- Maths : LaTeX inline \`$...$\` et bloc \`$$...$$\`
- Markdown : **gras**, listes, ## titres si nécessaire
- Maximum 300 mots — sois concis, l'élève doit agir, pas lire
- Si contexte document : cite "D'après le document, page X…"
- Si connaissances générales : précise "D'après le programme BEPC/BAC…"
- Utilise des analogies congolaises (marché, fleuve Congo, manioc, saison des pluies…) pour illustrer`

// ── Prompt Solution Directe (Premium / coûte tous les crédits) ───────────────

const SOLUTION_PROMPT = `Tu es Kelassi, correcteur expert pour les examens officiels congolais (BEPC et BAC — MEPSA).

L'élève a débloqué le MODE CORRECTION COMPLÈTE. Fournis une correction exhaustive et méthodique.

── STRUCTURE OBLIGATOIRE DE LA CORRECTION ──
## 📋 Identification
- Type d'exercice, matière, niveau, notions clés mobilisées

## 🔢 Correction étape par étape
Numérote chaque étape. Montre TOUT le calcul/raisonnement sans sauter d'étape.
Pour chaque étape : **[Étape N]** → action → résultat intermédiaire

## 📐 Formules et lois utilisées
Liste avec leur nom officiel au programme (ex: "Théorème de Pythagore", "Loi d'Ohm")

## ✅ Résultat final
**Réponse :** [valeur + unité + interprétation si nécessaire]

## 💡 À retenir pour l'examen
Une règle mnémotechnique ou astuce spécifique au programme congolais pour ne plus se tromper.

── RÈGLES DE QUALITÉ ──
- Français uniquement, style académique
- Maths : LaTeX inline \`$...$\` et bloc \`$$...$$\` pour toutes les formules
- Maximum 500 mots — précis et complet
- Méthodologie exacte attendue par les correcteurs MEPSA
- Si document fourni : cite la page/section source`

function sanitize(text: string): string {
  return text.replace(/<(?:.|\n)*?>/gm, '').trim()
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env['GEMINI_API_KEY']) {
    return NextResponse.json(
      { error: { code: 'MISCONFIGURED', message: 'GEMINI_API_KEY non configurée.' } },
      { status: 503 }
    )
  }

  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: z.infer<typeof chatSchema>
  try {
    body = chatSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const profileSnap = await adminDb.collection('users').doc(userId).get()
  const plan        = (profileSnap.data()?.plan as string) ?? 'free'

  // ── Quota : mode solution coûte tous les crédits free ──
  const quotaMode = body.revealSolution ? 'solution' : 'socratic'
  const quota     = await checkAndIncrementQuota(userId, plan, quotaMode)

  if (!quota.allowed) {
    const isSolutionBlock = body.revealSolution && plan !== 'premium'
    return NextResponse.json({
      error: {
        code:    isSolutionBlock ? 'SOLUTION_NO_CREDITS' : 'QUOTA_EXCEEDED',
        message: isSolutionBlock
          ? 'Tu n\'as plus de crédits aujourd\'hui. Passe à Premium pour des solutions illimitées.'
          : `Limite journalière atteinte (${plan === 'free' ? '5' : '200'} questions/jour).${
              plan === 'free' ? ' Passe à Premium pour continuer.' : ' Réessaie demain.'
            }`,
        remaining:   0,
        upgrade_url: '/billing',
      },
    }, { status: 429 })
  }

  const question = sanitize(body.question)

  // Session
  let sessionId = body.session_id
  if (!sessionId) {
    const sessionRef = await adminDb.collection('chat_sessions').add({
      user_id:     userId,
      document_id: body.document_id ?? null,
      created_at:  FieldValue.serverTimestamp(),
    })
    sessionId = sessionRef.id
  }

  // Cache Redis — clé distincte pour solutions vs socratique
  const cachePrefix = body.revealSolution ? 'cache:solution' : 'cache:chat'
  const cacheKey    = `${cachePrefix}:${createHash('sha256').update(question.toLowerCase()).digest('hex')}`
  const cached      = await redis.get<string>(cacheKey)
  if (cached) {
    saveChatMessages(sessionId, question, cached).catch(() => {})
    return new Response(cached, {
      headers: {
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        'X-Session-Id':      sessionId ?? '',
        'X-Quota-Remaining': String(quota.remaining),
        'X-Cache':           'HIT',
        'X-Mode':            body.revealSolution ? 'solution' : 'socratic',
      },
    })
  }

  // Document context
  let documentTitle: string | null = null
  if (body.document_id) {
    const docSnap = await adminDb.collection('documents').doc(body.document_id).get()
    documentTitle = docSnap.data()?.title ?? null
  }

  // RAG — seuil plus bas en mode solution (on veut le maximum de contexte)
  const chunks = await searchRelevantChunks(question, {
    matchCount:    body.revealSolution ? 12 : 8,
    minSimilarity: body.revealSolution ? 0.40 : 0.72,
    documentId:    body.document_id,
  })

  // Historique
  const historySnap = await adminDb
    .collection('chat_messages')
    .where('session_id', '==', sessionId)
    .orderBy('created_at', 'desc')
    .limit(10)
    .get()

  const historyText = historySnap.docs
    .reverse()
    .map((d) => {
      const m = d.data()
      return `${m.role === 'user' ? 'Élève' : 'Kelassi'}: ${m.content}`
    })
    .join('\n')

  const contextText = chunks.length > 0
    ? chunks.map((c, i) =>
        `[Source ${i + 1}${c.page_number ? `, page ${c.page_number}` : ''}]\n${c.content}`
      ).join('\n\n---\n\n')
    : documentTitle
      ? `Aucun passage spécifique trouvé dans "${documentTitle}". Utilise tes connaissances du programme BEPC/BAC.`
      : 'Pas de document — réponds sur le programme BEPC/BAC congolais.'

  const userPrompt = [
    documentTitle ? `DOCUMENT ÉTUDIÉ : "${documentTitle}"` : null,
    `CONTEXTE :\n${contextText}`,
    historyText ? `HISTORIQUE :\n${historyText}` : null,
    body.revealSolution
      ? `DEMANDE DE CORRECTION COMPLÈTE :\n${question}`
      : `QUESTION DE L'ÉLÈVE :\n${question}`,
  ].filter(Boolean).join('\n\n===\n\n')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [{ text: userPrompt }]
  if (body.image) {
    parts.push({ inlineData: { mimeType: body.image.mimeType, data: body.image.data } })
  }

  const systemPrompt = body.revealSolution ? SOLUTION_PROMPT : SYSTEM_PROMPT

  const stream = await getGenai().models.generateContentStream({
    model:    'gemini-2.5-flash',
    config:   {
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingBudget: body.revealSolution ? 2048 : 0 },
    },
    contents: [{ role: 'user', parts }],
  })

  let fullResponse = ''

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      try {
        controller.enqueue(enc.encode(
          `event: meta\ndata: ${JSON.stringify({
            session_id:      sessionId,
            quota_remaining: quota.remaining,
            credits_cost:    quota.creditsCost,
            sources_count:   chunks.length,
            mode:            body.revealSolution ? 'solution' : 'socratic',
          })}\n\n`
        ))

        for await (const chunk of stream) {
          const text = chunk.text
          if (text) {
            fullResponse += text
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }

        controller.enqueue(enc.encode('event: done\ndata: {}\n\n'))
        controller.close()

        Promise.all([
          saveChatMessages(sessionId!, question, fullResponse),
          redis.set(cacheKey, fullResponse, { ex: body.revealSolution ? 86400 : 3600 }),
        ]).catch(console.error)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur Gemini inconnue'
        console.error('[chat/stream] error:', message)
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
          controller.close()
        } catch {}
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Session-Id':      sessionId ?? '',
      'X-Quota-Remaining': String(quota.remaining),
      'X-Credits-Cost':    String(quota.creditsCost),
      'X-Mode':            body.revealSolution ? 'solution' : 'socratic',
    },
  })
}

async function saveChatMessages(sessionId: string, question: string, answer: string) {
  const batch = adminDb.batch()
  const userRef      = adminDb.collection('chat_messages').doc()
  const assistantRef = adminDb.collection('chat_messages').doc()
  batch.set(userRef,      { session_id: sessionId, role: 'user',      content: question, created_at: FieldValue.serverTimestamp() })
  batch.set(assistantRef, { session_id: sessionId, role: 'assistant', content: answer,   created_at: FieldValue.serverTimestamp() })
  await batch.commit()
}
