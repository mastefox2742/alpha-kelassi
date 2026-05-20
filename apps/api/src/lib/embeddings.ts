import { GoogleGenerativeAI } from '@google/generative-ai'

const genai = new GoogleGenerativeAI(process.env['GEMINI_API_KEY']!)
const model = genai.getGenerativeModel({ model: 'text-embedding-004' })

const BATCH_SIZE = 100

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map((text) =>
        model.embedContent({
          content: { parts: [{ text }], role: 'user' },
          taskType: 'RETRIEVAL_DOCUMENT' as any,
        })
      )
    )
    for (const result of results) {
      embeddings.push(result.embedding.values)
    }
  }

  return embeddings
}

export async function embedQuery(text: string): Promise<number[]> {
  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    taskType: 'RETRIEVAL_QUERY' as any,
  })
  return result.embedding.values
}
