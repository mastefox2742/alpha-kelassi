import { supabase } from './supabase.js'
import { embedQuery } from './embeddings.js'

export interface ChunkResult {
  id: string
  document_id: string
  content: string
  chunk_index: number
  page_number: number | null
  metadata: Record<string, unknown>
  similarity: number
}

export async function searchRelevantChunks(
  question: string,
  options: { matchCount?: number; minSimilarity?: number; documentId?: string } = {}
): Promise<ChunkResult[]> {
  const { matchCount = 5, minSimilarity = 0.72, documentId } = options

  let embedding: number[]
  try {
    embedding = await embedQuery(question)
  } catch (err) {
    // Si les embeddings ne sont pas disponibles (pas de cours indexés ou modèle indisponible),
    // retourner un tableau vide — Kelassi répondra sans contexte de cours
    console.warn('[vector-search] Embeddings unavailable, skipping RAG:', (err as Error).message)
    return []
  }

  const { data, error } = await supabase.rpc('search_chunks', {
    query_embedding: embedding,
    match_count: matchCount,
    min_similarity: minSimilarity,
    filter_document: documentId ?? null,
  })

  if (error) {
    console.warn('[vector-search] RPC error:', error.message)
    return []
  }
  return (data ?? []) as ChunkResult[]
}
