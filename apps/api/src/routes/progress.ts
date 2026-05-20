import { Hono } from 'hono'
import { supabase } from '../lib/supabase.js'
import { authMiddleware } from '../middleware/auth.js'
import { computeLevel, BADGES } from '../lib/xp.js'

const router = new Hono()
router.use('*', authMiddleware)

// GET /api/progress/dashboard — toutes les données de progression élève
router.get('/dashboard', async (c) => {
  const userId = c.get('userId') as string

  const [
    { data: user },
    { data: badges },
    { data: progressRows },
    { data: nextCard },
    { count: questionsCount },
    { count: viewsCount },
  ] = await Promise.all([
    supabase.from('users').select('xp, full_name, plan').eq('id', userId).single(),
    supabase.from('user_badges').select('badge_code, earned_at').eq('user_id', userId).order('earned_at'),
    supabase
      .from('user_progress')
      .select('subject_id, flashcards_reviewed, score_avg, streak_days, last_active, subjects(name, level)')
      .eq('user_id', userId),
    supabase
      .from('flashcards')
      .select('id, front, next_review, documents(title)')
      .eq('user_id', userId)
      .lte('next_review', new Date().toISOString())
      .order('next_review', { ascending: true })
      .limit(1)
      .single(),
    supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .in(
        'session_id',
        (await supabase.from('chat_sessions').select('id').eq('user_id', userId)).data?.map((s) => s.id) ?? []
      ),
    supabase
      .from('document_views')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  const xp = user?.xp ?? 0
  const levelInfo = computeLevel(xp)
  const maxStreak = Math.max(...(progressRows ?? []).map((p) => p.streak_days), 0)

  const badgesWithMeta = (badges ?? []).map((b) => ({
    code: b.badge_code,
    earned_at: b.earned_at,
    ...BADGES[b.badge_code as keyof typeof BADGES],
  }))

  return c.json({
    data: {
      xp,
      level: levelInfo.level,
      level_label: levelInfo.label,
      next_level_xp: levelInfo.nextXp,
      streak: maxStreak,
      badges: badgesWithMeta,
      progress: progressRows ?? [],
      next_review: nextCard ?? null,
      stats: {
        questions_asked: questionsCount ?? 0,
        documents_viewed: viewsCount ?? 0,
        flashcards_reviewed: (progressRows ?? []).reduce((s, p) => s + p.flashcards_reviewed, 0),
      },
    },
  })
})

export { router as progressRouter }
