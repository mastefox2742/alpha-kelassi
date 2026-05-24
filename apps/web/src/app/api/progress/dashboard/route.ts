import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeLevel, BADGES } from '@/lib/xp'

/** GET /api/progress/dashboard — toutes les données de progression élève */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Récupère les IDs de sessions pour compter les questions
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', user.id)

  const sessionIds = (sessions ?? []).map((s) => s.id)

  const [
    { data: userRow },
    { data: badges },
    { data: progressRows },
    { data: nextCard },
    questionsResult,
    { count: viewsCount },
  ] = await Promise.all([
    supabase.from('users').select('xp, full_name, plan').eq('id', user.id).single(),
    supabase.from('user_badges').select('badge_code, earned_at').eq('user_id', user.id).order('earned_at'),
    supabase.from('user_progress')
      .select('subject_id, flashcards_reviewed, score_avg, streak_days, last_active, subjects(name, level)')
      .eq('user_id', user.id),
    supabase.from('flashcards')
      .select('id, front, next_review, documents(title)')
      .eq('user_id', user.id)
      .lte('next_review', new Date().toISOString())
      .order('next_review', { ascending: true })
      .limit(1)
      .maybeSingle(),
    sessionIds.length > 0
      ? supabase.from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'user')
          .in('session_id', sessionIds)
      : Promise.resolve({ count: 0, data: null, error: null }),
    supabase.from('document_views')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const xp        = userRow?.xp ?? 0
  const levelInfo = computeLevel(xp)
  const maxStreak = Math.max(...(progressRows ?? []).map((p) => p.streak_days), 0)

  const badgesWithMeta = (badges ?? []).map((b) => ({
    code:      b.badge_code,
    earned_at: b.earned_at,
    ...(BADGES[b.badge_code as keyof typeof BADGES] ?? { label: b.badge_code, icon: '🏅', description: '' }),
  }))

  return NextResponse.json({
    data: {
      xp,
      level:       levelInfo.level,
      level_label: levelInfo.label,
      next_level_xp: levelInfo.nextXp,
      streak:      maxStreak,
      badges:      badgesWithMeta,
      progress:    progressRows ?? [],
      next_review: nextCard ?? null,
      stats: {
        questions_asked:     questionsResult.count ?? 0,
        documents_viewed:    viewsCount ?? 0,
        flashcards_reviewed: (progressRows ?? []).reduce((s, p) => s + (p.flashcards_reviewed ?? 0), 0),
      },
    },
  })
}
