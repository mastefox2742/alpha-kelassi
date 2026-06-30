import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'
import { adminStorage } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'

export const maxDuration = 60 // secondes — extraction PDF peut être lente

const saveSchema = z.object({
  storagePath: z.string().min(1),
  bucket: z.enum(['pdfs-premium', 'pdfs-public']),
  meta: z.object({
    subject_id: z.string().min(1),
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
    const pdfjs = await import('pdfjs-dist')
    const { createRequire } = await import('module')
    const _require = createRequire(process.cwd() + '/package.json')
    pdfjs.GlobalWorkerOptions.workerSrc = _require.resolve(
      'pdfjs-dist/build/pdf.worker.min.mjs'
    )

    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    }).promise

    const pages: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page    = await doc.getPage(i)
      const content = await page.getTextContent()
      const text    = content.items
        .map((item) => ('str' in item ? (item as { str: string }).str : ''))
        .join(' ')
      pages.push(text)
    }
    await doc.destroy()
    return pages.join('\n')
  }
  if (format === 'docx') {
    const mammoth = await import('mammoth')
    const result  = await mammoth.extractRawText({ buffer })
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
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérif admin
  const profileSnap = await adminDb.collection('users').doc(userId).get()
  if (profileSnap.data()?.role !== 'admin') {
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

  // Télécharge le fichier depuis Firebase Storage pour extraire le texte
  const bucket_ref = adminStorage.bucket(bucket)
  const file       = bucket_ref.file(storagePath)

  let buffer: Buffer
  try {
    const [contents] = await file.download()
    buffer = contents
  } catch {
    return NextResponse.json({ error: `Fichier introuvable en storage : ${storagePath}` }, { status: 404 })
  }

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

  // URL publique Firebase Storage
  const publicUrl = `https://storage.googleapis.com/${bucket}/${storagePath}`

  // Insert en Firestore
  try {
    const docRef = await adminDb.collection('documents').add({
      ...meta,
      year:         meta.year ?? null,
      session:      meta.session ?? null,
      pdf_url:      publicUrl,
      text_content: textContent,
      created_at:   FieldValue.serverTimestamp(),
    })

    const docSnap = await docRef.get()
    const docData = docSnap.data() as Record<string, unknown>
    // On ne renvoie pas text_content
    const { text_content: _, ...docSafe } = docData
    return NextResponse.json({ data: { id: docRef.id, ...docSafe } }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
