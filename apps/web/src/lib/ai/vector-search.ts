import { createClient } from '@supabase/supabase-js'
import { embedQuery } from './embeddings'

// Client admin pour l'accès RPC (bypass RLS sur document_chunks)
const supabaseAdmin = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
)

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
    console.warn('[vector-search] Embeddings unavailable, skipping RAG:', (err as Error).message)
    return []
  }

  const { data, error } = await supabaseAdmin.rpc('search_chunks', {
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
