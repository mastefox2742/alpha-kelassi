import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'

const schema = z.object({
  rating:      z.number().int().min(1).max(5),
  comment:     z.string().max(1000).optional(),
  page:        z.string().max(100).optional(),
  app_version: z.string().max(20).optional(),
})

/** POST /api/feedback — soumet un feedback beta */
export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: z.infer<typeof schema>
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  try {
    await adminDb.collection('feedback').add({
      user_id:     userId,
      rating:      body.rating,
      comment:     body.comment ?? null,
      page:        body.page ?? null,
      app_version: body.app_version ?? null,
      created_at:  FieldValue.serverTimestamp(),
    })
  } catch (e) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: String(e) } }, { status: 500 })
  }
  return NextResponse.json({ data: { submitted: true } }, { status: 201 })
}
