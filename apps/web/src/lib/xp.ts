import { adminDb } from './firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

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
  const clampedAmount = Math.min(amount, 1000) // borne max sécurité
  await adminDb.collection('users').doc(userId).update({
    xp: FieldValue.increment(clampedAmount),
  })
}

// ── Badges ───────────────────────────────────────────────────────────────────
export async function checkAndAwardBadges(userId: string): Promise<void> {
  const sessionsSnap = await adminDb
    .collection('chat_sessions')
    .where('user_id', '==', userId)
    .get()
  const sessionIds = sessionsSnap.docs.map((d) => d.id)

  const [
    existingBadgesSnap,
    progressSnap,
    flashcardSnap,
  ] = await Promise.all([
    adminDb.collection('user_badges').where('user_id', '==', userId).get(),
    adminDb.collection('user_progress').where('user_id', '==', userId).get(),
    adminDb.collection('flashcards')
      .where('user_id', '==', userId)
      .where('reps', '>=', 1)
      .get(),
  ])

  // Compte les questions
  let questionCount = 0
  for (let i = 0; i < sessionIds.length; i += 30) {
    const chunk = sessionIds.slice(i, i + 30)
    if (chunk.length === 0) break
    const snap = await adminDb
      .collection('chat_messages')
      .where('session_id', 'in', chunk)
      .where('role', '==', 'user')
      .get()
    questionCount += snap.size
  }

  const earned    = new Set(existingBadgesSnap.docs.map((d) => d.data().badge_code as string))
  const progressRows = progressSnap.docs.map((d) => d.data())
  const maxStreak = Math.max(...progressRows.map((p) => (p.streak_days as number) ?? 0), 0)
  const flashcardCount = flashcardSnap.size

  const toAward: BadgeCode[] = []

  if (!earned.has('first_steps'))                                               toAward.push('first_steps')
  if (maxStreak >= 3  && !earned.has('streak_3'))                               toAward.push('streak_3')
  if (maxStreak >= 7  && !earned.has('streak_7'))                               toAward.push('streak_7')
  if (flashcardCount >= 50 && !earned.has('flashcard_veteran'))                 toAward.push('flashcard_veteran')
  if (questionCount  >= 10 && !earned.has('curious_mind'))                      toAward.push('curious_mind')

  if (toAward.length === 0) return

  const batch = adminDb.batch()
  for (const badge_code of toAward) {
    const ref = adminDb.collection('user_badges').doc(`${userId}_${badge_code}`)
    batch.set(ref, {
      user_id:    userId,
      badge_code,
      earned_at:  new Date().toISOString(),
    }, { merge: true })
  }
  await batch.commit()
}
