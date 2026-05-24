import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

export const maxDuration = 60

let _genai: GoogleGenAI | null = null
function getGenai() {
  if (!_genai) _genai = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] ?? '' })
  return _genai
}

const schema = z.object({
  document_id: z.string().uuid(),
  count:       z.number().int().min(1).max(20).default(10),
})

/** POST /api/flashcards/generate — génère des flashcards IA depuis un document */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: z.infer<typeof schema>
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { document_id, count } = body

  // Récupère les chunks du document
  const { data: chunks } = await supabase
    .from('document_chunks')
    .select('content')
    .eq('document_id', document_id)
    .order('chunk_index', { ascending: true })
    .limit(30)

  if (!chunks || chunks.length === 0) {
    return NextResponse.json(
      { error: { code: 'NOT_INDEXED', message: 'Ce document n\'est pas encore indexé. Réessaie dans quelques minutes.' } },
      { status: 422 }
    )
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

  const response = await getGenai().models.generateContent({
    model:    'gemini-2.5-flash',
    config:   { thinkingConfig: { thinkingBudget: 0 } },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })
  const raw = response.text ?? ''

  let cards: Array<{ front: string; back: string }>
  try {
    const jsonStr = raw.startsWith('[') ? raw : raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)
    cards = JSON.parse(jsonStr)
    if (!Array.isArray(cards)) throw new Error('Not an array')
  } catch {
    return NextResponse.json(
      { error: { code: 'GENERATION_ERROR', message: 'Erreur de génération. Réessaie.' } },
      { status: 500 }
    )
  }

  const rows = cards.slice(0, count).map((card) => ({
    user_id:     user.id,
    document_id,
    front:       card.front,
    back:        card.back,
  }))

  const { data: inserted, error: dbError } = await supabase
    .from('flashcards')
    .insert(rows)
    .select()

  if (dbError) return NextResponse.json({ error: { code: 'DB_ERROR', message: dbError.message } }, { status: 500 })
  return NextResponse.json({ data: inserted, count: inserted?.length ?? 0 }, { status: 201 })
}
