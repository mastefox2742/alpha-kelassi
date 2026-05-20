import { supabase } from './supabase.js'

export const XP = {
  DOCUMENT_VIEW:    5,
  CHAT_QUESTION:    2,
  FLASHCARD_PASS:   2,
  FLASHCARD_PERFECT: 3,
  STREAK_DAILY:     5,
} as const

export const BADGES = {
  first_steps:       { label: 'Premiers pas',        icon: '🌱', description: 'Premier cours consulté' },
  streak_3:          { label: '3 jours consécutifs',  icon: '🔥', description: 'Révise 3 jours d\'affilée' },
  streak_7:          { label: 'Une semaine !',         icon: '💪', description: 'Révise 7 jours d\'affilée' },
  flashcard_veteran: { label: 'Flashcard veteran',    icon: '🃏', description: '50 flashcards révisées' },
  curious_mind:      { label: 'Esprit curieux',       icon: '🤔', description: '10 questions posées à Kelassi' },
} as const

export type BadgeCode = keyof typeof BADGES

export function computeLevel(xp: number): { level: number; label: string; nextXp: number } {
  if (xp < 100)  return { level: 1, label: 'Débutant',  nextXp: 100 }
  if (xp < 300)  return { level: 2, label: 'Apprenti',  nextXp: 300 }
  if (xp < 600)  return { level: 3, label: 'Élève',     nextXp: 600 }
  if (xp < 1000) return { level: 4, label: 'Avancé',    nextXp: 1000 }
  return           { level: 5, label: 'Expert',     nextXp: Infinity }
}

export async function awardXP(userId: string, amount: number): Promise<void> {
  await supabase.rpc('increment_xp', { p_user_id: userId, p_amount: amount }).throwOnError()
}

export async function updateStreak(userId: string, subjectId: string): Promise<number> {
  const { data: prog } = await supabase
    .from('user_progress')
    .select('streak_days, last_active')
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .single()

  if (!prog) return 0

  const today = new Date().toISOString().slice(0, 10)
  const lastActive = prog.last_active

  if (lastActive === today) return prog.streak_days

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const newStreak = lastActive === yesterday ? prog.streak_days + 1 : 1

  await supabase
    .from('user_progress')
    .update({ streak_days: newStreak, last_active: today })
    .eq('user_id', userId)
    .eq('subject_id', subjectId)

  return newStreak
}

export async function checkAndAwardBadges(userId: string): Promise<void> {
  // Récupère les stats nécessaires en parallèle
  const [
    { data: user },
    { data: existingBadges },
    { data: progressRows },
    { count: flashcardCount },
    { count: questionCount },
  ] = await Promise.all([
    supabase.from('users').select('xp').eq('id', userId).single(),
    supabase.from('user_badges').select('badge_code').eq('user_id', userId),
    supabase.from('user_progress').select('streak_days, flashcards_reviewed').eq('user_id', userId),
    supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('reps', 1),
    supabase.from('chat_messages').select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .in(
        'session_id',
        (await supabase.from('chat_sessions').select('id').eq('user_id', userId)).data?.map((s) => s.id) ?? []
      ),
  ])

  const earned = new Set((existingBadges ?? []).map((b) => b.badge_code))
  const toAward: BadgeCode[] = []

  const xp = user?.xp ?? 0
  const maxStreak = Math.max(...(progressRows ?? []).map((p) => p.streak_days), 0)
  const totalFlashcards = flashcardCount ?? 0
  const totalQuestions = questionCount ?? 0

  if (xp >= 0 && !earned.has('first_steps')) toAward.push('first_steps')
  if (maxStreak >= 3 && !earned.has('streak_3')) toAward.push('streak_3')
  if (maxStreak >= 7 && !earned.has('streak_7')) toAward.push('streak_7')
  if (totalFlashcards >= 50 && !earned.has('flashcard_veteran')) toAward.push('flashcard_veteran')
  if (totalQuestions >= 10 && !earned.has('curious_mind')) toAward.push('curious_mind')

  if (toAward.length === 0) return

  await supabase.from('user_badges').upsert(
    toAward.map((badge_code) => ({ user_id: userId, badge_code })),
    { onConflict: 'user_id,badge_code', ignoreDuplicates: true }
  )
}

export async function trackDocumentView(userId: string, documentId: string): Promise<void> {
  // Un seul insert — le volume sera géré côté analytics (pas de déduplication ici)
  await supabase.from('document_views').insert({ user_id: userId, document_id: documentId })
}
