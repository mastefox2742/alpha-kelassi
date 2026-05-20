import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { supabase } from '../../lib/supabase.js'
import { authMiddleware } from '../../middleware/auth.js'
import { embedQueue } from '../../jobs/embed-queue.js'

const router = new Hono()

router.use('*', authMiddleware)

// Middleware admin uniquement
router.use('*', async (c, next) => {
  const userId = c.get('userId') as string
  const { data: user } = await supabase.from('users').select('role').eq('id', userId).single()
  if (user?.role !== 'admin') {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Admin requis' } }, 403)
  }
  await next()
})

const uploadSchema = z.object({
  subject_id: z.string().uuid(),
  type: z.enum(['cours', 'examen']),
  title: z.string().min(3),
  level: z.enum(['bepc', 'bac_a', 'bac_c', 'bac_d']),
  year: z.coerce.number().int().min(1990).max(2030).optional(),
  session: z.enum(['normale', 'rattrapage']).optional(),
  country_code: z.string().length(2).default('CG'),
  is_premium: z.boolean().default(false),
})

// POST /api/admin/documents — upload PDF + extraction texte
router.post('/', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const metaRaw = formData.get('meta') as string | null

  if (!file || !metaRaw) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Fichier et métadonnées requis' } }, 400)
  }

  const meta = uploadSchema.parse(JSON.parse(metaRaw))

  // Vérification content-type réel (magic bytes PDF = %PDF)
  const headerBytes = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  const magic = String.fromCharCode(...headerBytes)
  if (!magic.startsWith('%PDF')) {
    return c.json({ error: { code: 'INVALID_FILE', message: 'Le fichier doit être un PDF valide' } }, 400)
  }

  // Sanitise le nom de fichier : supprime path traversal + caractères dangereux
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // garde seulement les caractères sûrs
    .replace(/\.{2,}/g, '_')            // bloque ../
    .replace(/^[._]+/, '')              // pas de point/underscore en début
    .slice(0, 100)                      // longueur max

  // Upload vers Supabase Storage
  const bucket = meta.is_premium ? 'pdfs-premium' : 'pdfs-public'
  const fileName = `${Date.now()}_${safeName || 'document.pdf'}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: storageError } = await supabase.storage
    .from(bucket)
    .upload(fileName, arrayBuffer, { contentType: 'application/pdf', upsert: false })

  if (storageError) {
    return c.json({ error: { code: 'UPLOAD_ERROR', message: storageError.message } }, 500)
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)

  // Insère le document en base
  const { data: doc, error: dbError } = await supabase
    .from('documents')
    .insert({ ...meta, pdf_url: publicUrl })
    .select()
    .single()

  if (dbError) {
    return c.json({ error: { code: 'DB_ERROR', message: dbError.message } }, 500)
  }

  // Déclenche le job d'indexation RAG (Sprint S5)
  await embedQueue.add('embed_document', { document_id: doc.id, pdf_url: publicUrl })

  return c.json({ data: doc }, 201)
})

// PUT /api/admin/documents/:id — mise à jour métadonnées
router.put('/:id', zValidator('json', uploadSchema.partial()), async (c) => {
  const id = c.req.param('id')
  const updates = c.req.valid('json')

  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return c.json({ error: { code: 'DB_ERROR', message: error.message } }, 500)
  return c.json({ data })
})

// PATCH /api/admin/documents/:id/corrige — upload du PDF corrigé
router.patch('/:id/corrige', async (c) => {
  const id = c.req.param('id')

  const { data: doc } = await supabase.from('documents').select('id, is_premium').eq('id', id).single()
  if (!doc) return c.json({ error: { code: 'NOT_FOUND', message: 'Document introuvable' } }, 404)

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: { code: 'BAD_REQUEST', message: 'Fichier requis' } }, 400)

  // Magic bytes PDF
  const headerBytes = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  if (!String.fromCharCode(...headerBytes).startsWith('%PDF')) {
    return c.json({ error: { code: 'INVALID_FILE', message: 'Le fichier doit être un PDF valide' } }, 400)
  }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/^[._]+/, '')
    .slice(0, 100)

  const bucket = doc.is_premium ? 'pdfs-premium' : 'pdfs-public'
  const fileName = `corrige_${Date.now()}_${safeName || 'corrige.pdf'}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: storageError } = await supabase.storage
    .from(bucket)
    .upload(fileName, arrayBuffer, { contentType: 'application/pdf', upsert: false })

  if (storageError) return c.json({ error: { code: 'UPLOAD_ERROR', message: storageError.message } }, 500)

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)

  const { data, error } = await supabase
    .from('documents')
    .update({ corrige_url: publicUrl })
    .eq('id', id)
    .select()
    .single()

  if (error) return c.json({ error: { code: 'DB_ERROR', message: error.message } }, 500)
  return c.json({ data })
})

// DELETE /api/admin/documents/:id
router.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const { data: doc } = await supabase.from('documents').select('pdf_url, is_premium').eq('id', id).single()
  if (!doc) return c.json({ error: { code: 'NOT_FOUND', message: 'Introuvable' } }, 404)

  // Supprime le fichier du storage
  const bucket = doc.is_premium ? 'pdfs-premium' : 'pdfs-public'
  const fileName = doc.pdf_url.split('/').pop() ?? ''
  await supabase.storage.from(bucket).remove([fileName])

  await supabase.from('documents').delete().eq('id', id)
  return c.json({ data: { deleted: true } })
})

export { router as adminDocumentsRouter }
