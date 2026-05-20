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

  const embedding = await embedQuery(question)

  const { data, error } = await supabase.rpc('search_chunks', {
    query_embedding: embedding,
    match_count: matchCount,
    min_similarity: minSimilarity,
    filter_document: documentId ?? null,
  })

  if (error) throw new Error(`Vector search error: ${error.message}`)
  return (data ?? []) as ChunkResult[]
}
