import { Worker, Job } from 'bullmq'
import pdfParse from 'pdf-parse'
import { supabase } from '../lib/supabase.js'
import { chunkText } from '../lib/chunker.js'
import { embedTexts } from '../lib/embeddings.js'

interface EmbedJobData {
  document_id: string
  pdf_url: string
}

async function processEmbedJob(job: Job<EmbedJobData>) {
  const { document_id, pdf_url } = job.data
  await job.updateProgress(5)

  // 1. Télécharge le PDF depuis Supabase Storage (URL signée ou publique)
  const response = await fetch(pdf_url)
  if (!response.ok) throw new Error(`Impossible de télécharger le PDF : ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await job.updateProgress(20)

  // 2. Extraction du texte brut
  const parsed = await pdfParse(buffer)
  const rawText = parsed.text
  if (!rawText || rawText.trim().length < 50) {
    throw new Error('PDF vide ou non-extractible (probablement scanné)')
  }
  await job.updateProgress(35)

  // 3. Chunking sémantique
  const chunks = chunkText(rawText)
  if (chunks.length === 0) throw new Error('Aucun chunk produit')
  await job.updateProgress(50)

  // 4. Embeddings Gemini (batches de 100)
  const texts = chunks.map((c) => c.content)
  const vectors = await embedTexts(texts)
  await job.updateProgress(80)

  // 5. Upsert dans document_chunks
  // Supprime d'abord les anciens chunks (re-indexation possible)
  await supabase.from('document_chunks').delete().eq('document_id', document_id)

  const rows = chunks.map((chunk, i) => ({
    document_id,
    content: chunk.content,
    embedding: JSON.stringify(vectors[i]),  // pgvector attend un vecteur JSON
    chunk_index: chunk.chunkIndex,
    page_number: chunk.pageNumber,
    metadata: { is_exercise: chunk.isExercise, char_count: chunk.content.length },
  }))

  // Insère en batches de 50 pour éviter les timeouts Supabase
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const { error } = await supabase.from('document_chunks').insert(batch)
    if (error) throw new Error(`Erreur insertion chunks ${i}-${i + batch.length}: ${error.message}`)
  }
  await job.updateProgress(95)

  // 6. Marque le document comme indexé
  await supabase
    .from('documents')
    .update({ indexed_at: new Date().toISOString() })
    .eq('id', document_id)

  await job.updateProgress(100)
  console.log(`[embed-worker] Document ${document_id} indexé — ${chunks.length} chunks`)
  return { document_id, chunks_count: chunks.length }
}

export function startEmbedWorker() {
  const worker = new Worker<EmbedJobData>('embed_document', processEmbedJob, {
    connection: { url: process.env['QUEUE_REDIS_URL']! },
    concurrency: 2,
  })

  worker.on('completed', (job) => {
    console.log(`[embed-worker] Job ${job.id} terminé`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[embed-worker] Job ${job?.id} échoué:`, err.message)
  })

  worker.on('progress', (job, progress) => {
    console.log(`[embed-worker] Job ${job.id} — ${progress}%`)
  })

  return worker
}
