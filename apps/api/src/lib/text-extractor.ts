/**
 * Extraction de texte depuis PDF, DOCX ou TXT.
 * Utilisé à l'upload (admin) et dans le worker d'indexation RAG.
 */
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

export type FileFormat = 'pdf' | 'docx' | 'txt'

/**
 * Détecte le format à partir de l'extension et/ou du MIME type.
 * Valide aussi les magic bytes pour PDF.
 */
export function detectFormat(
  filename: string,
  mimeType: string,
  headerBytes?: Uint8Array
): FileFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase()

  // PDF — vérifie magic bytes si fournis
  if (ext === 'pdf' || mimeType === 'application/pdf') {
    if (headerBytes) {
      const magic = String.fromCharCode(...Array.from(headerBytes.slice(0, 4)))
      if (!magic.startsWith('%PDF')) return null
    }
    return 'pdf'
  }

  // DOCX — magic bytes = PK\x03\x04 (ZIP)
  if (
    ext === 'docx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    if (headerBytes) {
      // DOCX est un ZIP : commence par PK\x03\x04
      if (headerBytes[0] !== 0x50 || headerBytes[1] !== 0x4b) return null
    }
    return 'docx'
  }

  // TXT
  if (ext === 'txt' || mimeType === 'text/plain') return 'txt'

  return null
}

/**
 * Extrait le texte brut depuis le buffer selon le format.
 * Retourne le texte UTF-8 nettoyé.
 */
export async function extractText(buffer: Buffer, format: FileFormat): Promise<string> {
  switch (format) {
    case 'pdf': {
      const parsed = await pdfParse(buffer)
      return cleanText(parsed.text)
    }

    case 'docx': {
      // mammoth.extractRawText garde la structure paragraphes
      const result = await mammoth.extractRawText({ buffer })
      if (result.messages.some((m) => m.type === 'error')) {
        throw new Error('DOCX corrompu ou non supporté')
      }
      return cleanText(result.value)
    }

    case 'txt': {
      // Détection UTF-8 avec BOM
      let text = buffer.toString('utf-8')
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)  // strip BOM
      return cleanText(text)
    }
  }
}

/**
 * Normalise le texte extrait :
 * - Supprime les lignes vides en excès (max 2 consécutives)
 * - Normalise les fins de ligne CRLF → LF
 * - Retire les caractères de contrôle parasites
 */
function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')          // CRLF → LF
    .replace(/\r/g, '\n')             // CR seul → LF
    .replace(/[^\S\n]+/g, ' ')        // espaces multiples → 1 espace
    .replace(/\n{3,}/g, '\n\n')       // > 2 lignes vides → 2
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')  // contrôles sauf \t \n
    .trim()
}
