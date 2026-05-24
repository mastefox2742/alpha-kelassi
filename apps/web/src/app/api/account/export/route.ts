import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/account/export — export RGPD de toutes les données personnelles */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const [
    { data: userRow },
    { data: subscriptions },
    { data: progress },
    { data: flashcards },
    { data: sessions },
    { data: badges },
  ] = await Promise.all([
    supabase.from('users')
      .select('id, email, phone, full_name, plan, created_at')
      .eq('id', user.id)
      .single(),
    supabase.from('subscriptions')
      .select('plan, status, expires_at, created_at')
      .eq('user_id', user.id),
    supabase.from('user_progress')
      .select('*, subjects(name, level)')
      .eq('user_id', user.id),
    supabase.from('flashcards')
      .select('front, back, interval, reps, next_review, created_at')
      .eq('user_id', user.id)
      .limit(500),
    supabase.from('chat_sessions')
      .select('id, created_at, title')
      .eq('user_id', user.id)
      .limit(100),
    supabase.from('user_badges')
      .select('badge_code, earned_at')
      .eq('user_id', user.id),
  ])

  const exportData = {
    generated_at:  new Date().toISOString(),
    user:          userRow,
    subscriptions,
    progress,
    flashcards,
    chat_sessions: sessions,
    badges,
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="kelassi-data-${user.id.slice(0, 8)}.json"`,
    },
  })
}
