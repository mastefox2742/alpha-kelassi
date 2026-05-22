import { GoogleGenAI } from '@google/genai'

const genai = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY']! })

const BATCH_SIZE = 100
const EMBED_MODEL = 'gemini-embedding-2'

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map((text) =>
        genai.models.embedContent({
          model: EMBED_MODEL,
          contents: text,
          config: { taskType: 'RETRIEVAL_DOCUMENT' },
        })
      )
    )
    for (const result of results) {
      const values = result.embeddings?.[0]?.values ?? []
      embeddings.push(values)
    }
  }

  return embeddings
}

export async function embedQuery(text: string): Promise<number[]> {
  const result = await genai.models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { taskType: 'RETRIEVAL_QUERY' },
  })
  return result.embeddings?.[0]?.values ?? []
}
