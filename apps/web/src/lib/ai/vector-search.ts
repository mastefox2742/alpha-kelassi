import { adminDb } from '../firebase/admin'
import { embedQuery } from './embeddings'

export interface ChunkResult {
  id: string
  document_id: string
  content: string
  chunk_index: number
  page_number: number | null
  metadata: Record<string, unknown>
  similarity: number
}

/**
 * Recherche les chunks les plus pertinents via les embeddings.
 * Firestore ne supporte pas la recherche vectorielle native,
 * donc on récupère les candidats et on filtre côté serveur.
 * En production, envisager Firebase Vector Search (Vertex AI) ou un service externe.
 */
export async function searchRelevantChunks(
  question: string,
  options: { matchCount?: number; minSimilarity?: number; documentId?: string } = {}
): Promise<ChunkResult[]> {
  const { matchCount = 5, minSimilarity = 0.72, documentId } = options

  const effectiveCount = documentId ? Math.max(matchCount, 8) : matchCount

  // Si on a un document précis, on récupère ses chunks et on calcule la similarité
  if (documentId) {
    let embedding: number[] | null = null
    try {
      embedding = await embedQuery(question)
    } catch (err) {
      console.warn('[vector-search] Embeddings unavailable, fallback direct chunks:', (err as Error).message)
    }

    const snap = await adminDb
      .collection('document_chunks')
      .where('document_id', '==', documentId)
      .orderBy('chunk_index', 'asc')
      .limit(60)
      .get()

    const chunks = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as (ChunkResult & Record<string, unknown>)[]

    if (!embedding || embedding.length === 0) {
      // Fallback sans embedding
      return chunks.slice(0, effectiveCount).map((c) => ({ ...c, similarity: 1 } as ChunkResult))
    }

    // Calcul cosine similarity côté serveur
    const withSim = chunks
      .map((c) => {
        const emb = (c as any).embedding as number[] | undefined
        const sim = emb ? cosineSimilarity(embedding!, emb) : 0
        return { ...c, similarity: sim } as ChunkResult
      })
      .filter((c) => c.similarity >= Math.min(minSimilarity, 0.45))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, effectiveCount)

    if (withSim.length < 2) {
      return chunks.slice(0, effectiveCount).map((c) => ({ ...c, similarity: 1 } as ChunkResult))
    }

    return withSim
  }

  // Sans document : recherche globale — fallback sur premiers chunks
  try {
    const embedding = await embedQuery(question)
    if (!embedding || embedding.length === 0) return []

    // Récupère un échantillon de chunks pour la recherche globale
    const snap = await adminDb
      .collection('document_chunks')
      .limit(200)
      .get()

    const results = snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>
        const emb  = data.embedding as number[] | undefined
        const sim  = emb ? cosineSimilarity(embedding, emb) : 0
        return { id: d.id, ...data, similarity: sim } as ChunkResult
      })
      .filter((c) => c.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, matchCount)

    return results
  } catch (err) {
    console.warn('[vector-search] Error:', (err as Error).message)
    return []
  }
}

/** Similarité cosinus entre deux vecteurs */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}
