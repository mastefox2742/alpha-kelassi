import { GoogleGenAI } from '@google/genai'

const genai = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY']! })
const EMBED_MODEL = 'gemini-embedding-2'

/** Génère un embedding pour une requête utilisateur (RAG retrieval). */
export async function embedQuery(text: string): Promise<number[]> {
  const result = await genai.models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { taskType: 'RETRIEVAL_QUERY' },
  })
  return result.embeddings?.[0]?.values ?? []
}
