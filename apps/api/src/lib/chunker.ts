/**
 * Chunking sémantique pour le pipeline RAG.
 *
 * Règles :
 * - Chunk cible : 400-600 tokens (≈ 1600-2400 chars, ratio ~4 chars/token)
 * - Overlap : 80 tokens (≈ 320 chars) entre chunks consécutifs
 * - Les paragraphes ne sont jamais coupés en milieu de phrase
 * - Les énoncés d'exercice (débutant par "Exercice", "Problème", "Question") sont atomiques
 * - Les formules LaTeX ($...$, $$...$$) ne sont jamais tronquées
 */

const TARGET_CHARS = 2000   // ~500 tokens
const MAX_CHARS    = 2400   // ~600 tokens
const OVERLAP_CHARS = 320   // ~80 tokens

export interface TextChunk {
  content: string
  chunkIndex: number
  pageNumber: number | null
  isExercise: boolean
}

// Détecte si un paragraphe est un énoncé d'exercice atomique
function isExerciseBlock(para: string): boolean {
  return /^(Exercice|Problème|Problem|Question|Partie|Part|Activité)\s*\d*/i.test(para.trimStart())
}

// Préserve les blocs LaTeX : ne coupe jamais à l'intérieur d'un $...$
function splitRespectingLatex(text: string): string[] {
  const parts: string[] = []
  let current = ''
  let inLatex = false
  let i = 0

  while (i < text.length) {
    if (text[i] === '$') {
      if (text[i + 1] === '$') {
        inLatex = !inLatex
        current += '$$'
        i += 2
      } else {
        inLatex = !inLatex
        current += '$'
        i++
      }
    } else if (text[i] === '\n' && text[i + 1] === '\n' && !inLatex) {
      if (current.trim()) parts.push(current.trim())
      current = ''
      i += 2
    } else {
      current += text[i]
      i++
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

export function chunkText(text: string, pageNumber: number | null = null): TextChunk[] {
  const paragraphs = splitRespectingLatex(text)
  const chunks: TextChunk[] = []
  let currentChunk = ''
  let chunkIndex = 0

  for (let p = 0; p < paragraphs.length; p++) {
    const para = paragraphs[p]
    if (!para) continue

    // Énoncé d'exercice → chunk atomique
    if (isExerciseBlock(para)) {
      // Flush le chunk en cours s'il existe
      if (currentChunk.trim().length > 0) {
        chunks.push({ content: currentChunk.trim(), chunkIndex: chunkIndex++, pageNumber, isExercise: false })
        currentChunk = ''
      }
      chunks.push({ content: para, chunkIndex: chunkIndex++, pageNumber, isExercise: true })
      continue
    }

    // Bloc trop grand seul → le découper par phrases
    if (para.length > MAX_CHARS) {
      const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para]
      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length > MAX_CHARS && currentChunk.trim().length > 0) {
          chunks.push({ content: currentChunk.trim(), chunkIndex: chunkIndex++, pageNumber, isExercise: false })
          // Overlap : reprend les derniers OVERLAP_CHARS du chunk précédent
          currentChunk = currentChunk.slice(-OVERLAP_CHARS) + ' ' + sentence
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence
        }
      }
      continue
    }

    // Ajout normal
    if ((currentChunk + '\n\n' + para).length > TARGET_CHARS && currentChunk.trim().length > 0) {
      chunks.push({ content: currentChunk.trim(), chunkIndex: chunkIndex++, pageNumber, isExercise: false })
      // Overlap : reprend le dernier paragraphe comme contexte
      currentChunk = currentChunk.slice(-OVERLAP_CHARS) + '\n\n' + para
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
    }
  }

  // Dernier chunk résiduel
  if (currentChunk.trim().length > 50) {
    chunks.push({ content: currentChunk.trim(), chunkIndex: chunkIndex++, pageNumber, isExercise: false })
  }

  return chunks
}
