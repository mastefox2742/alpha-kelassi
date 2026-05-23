import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/ai/sessions — liste des sessions de chat de l'utilisateur */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data } = await supabase
    .from('chat_sessions')
    .select('id, created_at, document_id, documents(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ data: data ?? [] })
}
