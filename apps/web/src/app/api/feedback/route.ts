import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  rating:      z.number().int().min(1).max(5),
  comment:     z.string().max(1000).optional(),
  page:        z.string().max(100).optional(),
  app_version: z.string().max(20).optional(),
})

/** POST /api/feedback — soumet un feedback beta */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: z.infer<typeof schema>
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { error } = await supabase.from('beta_feedback').insert({
    user_id:     user.id,
    rating:      body.rating,
    comment:     body.comment ?? null,
    page:        body.page ?? null,
    app_version: body.app_version ?? null,
  })

  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data: { submitted: true } }, { status: 201 })
}
