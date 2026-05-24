import { GoogleGenAI } from '@google/genai'

const EMBED_MODEL = 'text-embedding-004'

// Lazy — instancié seulement au premier appel, jamais au build time
let _genai: GoogleGenAI | null = null
function getGenai(): GoogleGenAI {
  if (!_genai) {
    const key = process.env['GEMINI_API_KEY'] ?? ''
    _genai = new GoogleGenAI({ apiKey: key })
  }
  return _genai
}

/** Génère un embedding pour une requête utilisateur (RAG retrieval). */
export async function embedQuery(text: string): Promise<number[]> {
  const result = await getGenai().models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { taskType: 'RETRIEVAL_QUERY' },
  })
  return result.embeddings?.[0]?.values ?? []
}
