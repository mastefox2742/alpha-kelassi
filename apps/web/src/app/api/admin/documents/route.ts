import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const maxDuration = 60 // secondes — extraction PDF peut être lente

// Client admin (bypass RLS)
const supabaseAdmin = createAdminClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
)

const saveSchema = z.object({
  storagePath: z.string().min(1),
  bucket: z.enum(['pdfs-premium', 'pdfs-public']),
  meta: z.object({
    subject_id: z.string().uuid(),
    type: z.enum(['cours', 'examen']),
    title: z.string().min(3),
    level: z.enum(['bepc', 'bac_a', 'bac_c', 'bac_d']),
    year: z.coerce.number().int().min(1990).max(2030).optional(),
    session: z.enum(['normale', 'rattrapage']).optional(),
    country_code: z.string().length(2).default('CG'),
    is_premium: z.boolean().default(false),
  }),
})

function detectFormat(filename: string): 'pdf' | 'docx' | 'txt' | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'txt') return 'txt'
  return null
}

async function extractText(buffer: Buffer, format: 'pdf' | 'docx' | 'txt'): Promise<string> {
  if (format === 'txt') return buffer.toString('utf-8')
  if (format === 'pdf') {
    // Importer le fichier lib directement évite que pdf-parse/index.js
    // charge ses fichiers de test (cause du "unsupported Unicode escape sequence")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse')
    const result = await pdfParse(buffer)
    return result.text
  }
  if (format === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  return ''
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérif admin
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
  }

  // Parse JSON body
  let body: z.infer<typeof saveSchema>
  try {
    const raw = await req.json()
    body = saveSchema.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { storagePath, bucket, meta } = body

  // Télécharge le fichier depuis Supabase Storage pour extraire le texte
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from(bucket)
    .download(storagePath)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: `Fichier introuvable en storage : ${downloadError?.message}` }, { status: 404 })
  }

  const arrayBuffer = await fileData.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const format = detectFormat(storagePath)
  if (!format) {
    return NextResponse.json({ error: 'Format non supporté. Utilisez PDF, DOCX ou TXT.' }, { status: 400 })
  }

  // Extraction texte
  let textContent: string | null = null
  try {
    const raw = await extractText(buffer, format)
    textContent = cleanText(raw)
    if (!textContent || textContent.length < 20) {
      return NextResponse.json({ error: 'Document vide ou non extractible (PDF scanné ?)' }, { status: 422 })
    }
  } catch (err) {
    return NextResponse.json({ error: `Erreur extraction : ${(err as Error).message}` }, { status: 422 })
  }

  // URL publique
  const { data: { publicUrl } } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath)

  // Insert en base
  const { data: doc, error: dbError } = await supabaseAdmin
    .from('documents')
    .insert({
      ...meta,
      year: meta.year ?? null,
      session: meta.session ?? null,
      pdf_url: publicUrl,
      text_content: textContent,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // On ne renvoie pas text_content (peut contenir des séquences Unicode invalides)
  const { text_content: _, ...docSafe } = doc as Record<string, unknown>
  return NextResponse.json({ data: docSafe }, { status: 201 })
}
