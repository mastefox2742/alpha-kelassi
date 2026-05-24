import { createClient } from '@supabase/supabase-js'

// ── Admin client lazy ────────────────────────────────────────────────────────
let _admin: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!
    )
  }
  return _admin
}

// ── XP amounts ───────────────────────────────────────────────────────────────
export const XP = {
  DOCUMENT_VIEW:     5,
  CHAT_QUESTION:     2,
  FLASHCARD_PASS:    2,
  FLASHCARD_PERFECT: 3,
  STREAK_DAILY:      5,
} as const

// ── Badges ───────────────────────────────────────────────────────────────────
export const BADGES = {
  first_steps:       { label: 'Premiers pas',       icon: '🌱', description: 'Premier cours consulté'           },
  streak_3:          { label: '3 jours consécutifs', icon: '🔥', description: 'Révise 3 jours d\'affilée'       },
  streak_7:          { label: 'Une semaine !',        icon: '💪', description: 'Révise 7 jours d\'affilée'       },
  flashcard_veteran: { label: 'Flashcard veteran',   icon: '🃏', description: '50 flashcards révisées'          },
  curious_mind:      { label: 'Esprit curieux',      icon: '🤔', description: '10 questions posées à Kelassi'   },
} as const

export type BadgeCode = keyof typeof BADGES

// ── Niveaux ──────────────────────────────────────────────────────────────────
export function computeLevel(xp: number): { level: number; label: string; nextXp: number } {
  if (xp < 100)  return { level: 1, label: 'Débutant', nextXp: 100  }
  if (xp < 300)  return { level: 2, label: 'Apprenti', nextXp: 300  }
  if (xp < 600)  return { level: 3, label: 'Élève',    nextXp: 600  }
  if (xp < 1000) return { level: 4, label: 'Avancé',   nextXp: 1000 }
  return           { level: 5, label: 'Expert',    nextXp: Infinity }
}

// ── XP ───────────────────────────────────────────────────────────────────────
export async function awardXP(userId: string, amount: number): Promise<void> {
  await getAdmin().rpc('increment_xp', { p_user_id: userId, p_amount: amount })
}

// ── Badges ───────────────────────────────────────────────────────────────────
export async function checkAndAwardBadges(userId: string): Promise<void> {
  const supabase = getAdmin()

  const sessionIds = (
    await supabase.from('chat_sessions').select('id').eq('user_id', userId)
  ).data?.map((s) => s.id) ?? []

  const [
    { data: existingBadges },
    { data: progressRows },
    { count: flashcardCount },
    { count: questionCount },
  ] = await Promise.all([
    supabase.from('user_badges').select('badge_code').eq('user_id', userId),
    supabase.from('user_progress').select('streak_days').eq('user_id', userId),
    supabase.from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('reps', 1),
    sessionIds.length > 0
      ? supabase.from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'user')
          .in('session_id', sessionIds)
      : Promise.resolve({ count: 0 }),
  ])

  const earned    = new Set((existingBadges ?? []).map((b) => b.badge_code))
  const maxStreak = Math.max(...(progressRows ?? []).map((p) => p.streak_days), 0)
  const toAward: BadgeCode[] = []

  if (!earned.has('first_steps'))       toAward.push('first_steps')
  if (maxStreak >= 3  && !earned.has('streak_3'))          toAward.push('streak_3')
  if (maxStreak >= 7  && !earned.has('streak_7'))          toAward.push('streak_7')
  if ((flashcardCount ?? 0) >= 50 && !earned.has('flashcard_veteran')) toAward.push('flashcard_veteran')
  if ((questionCount  ?? 0) >= 10 && !earned.has('curious_mind'))      toAward.push('curious_mind')

  if (toAward.length === 0) return

  await supabase.from('user_badges').upsert(
    toAward.map((badge_code) => ({ user_id: userId, badge_code })),
    { onConflict: 'user_id,badge_code', ignoreDuplicates: true }
  )
}
