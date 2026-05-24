import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/flashcards/due?limit=20 — cartes à réviser aujourd'hui */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10), 50)

  const { data, error } = await supabase
    .from('flashcards')
    .select('*, documents(title, subjects(name))')
    .eq('user_id', user.id)
    .lte('next_review', new Date().toISOString())
    .order('next_review', { ascending: true })
    .limit(limit)

  if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data: data ?? [], count: data?.length ?? 0 })
}
