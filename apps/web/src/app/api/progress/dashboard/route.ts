import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'
import { computeLevel, BADGES } from '@/lib/xp'

/** GET /api/progress/dashboard — toutes les données de progression élève */
export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Récupère les IDs de sessions pour compter les questions
  const sessionsSnap = await adminDb
    .collection('chat_sessions')
    .where('user_id', '==', userId)
    .get()
  const sessionIds = sessionsSnap.docs.map((d) => d.id)

  const [
    userSnap,
    badgesSnap,
    progressSnap,
    nextCardSnap,
  ] = await Promise.all([
    adminDb.collection('users').doc(userId).get(),
    adminDb.collection('user_badges').where('user_id', '==', userId).orderBy('earned_at').get(),
    adminDb.collection('user_progress').where('user_id', '==', userId).get(),
    adminDb.collection('flashcards')
      .where('user_id', '==', userId)
      .where('next_review', '<=', new Date().toISOString())
      .orderBy('next_review', 'asc')
      .limit(1)
      .get(),
  ])

  const userRow     = userSnap.data()
  const badges      = badgesSnap.docs.map((d) => d.data())
  const progressRows = progressSnap.docs.map((d) => d.data())
  const nextCard    = nextCardSnap.empty ? null : { id: nextCardSnap.docs[0].id, ...nextCardSnap.docs[0].data() }

  // Compte les questions posées (messages user dans toutes les sessions)
  let questionsCount = 0
  if (sessionIds.length > 0) {
    // Firestore ne supporte pas IN > 30, on compte en mémoire sur sessionIds
    for (let i = 0; i < sessionIds.length; i += 30) {
      const chunk = sessionIds.slice(i, i + 30)
      const snap  = await adminDb
        .collection('chat_messages')
        .where('session_id', 'in', chunk)
        .where('role', '==', 'user')
        .get()
      questionsCount += snap.size
    }
  }

  // Compte les document_views
  const viewsSnap = await adminDb
    .collection('document_views')
    .where('user_id', '==', userId)
    .get()
  const viewsCount = viewsSnap.size

  const xp       = userRow?.xp ?? 0
  const levelInfo = computeLevel(xp)
  const maxStreak = Math.max(...progressRows.map((p) => p.streak_days ?? 0), 0)

  const badgesWithMeta = badges.map((b) => ({
    code:      b.badge_code,
    earned_at: b.earned_at,
    ...(BADGES[b.badge_code as keyof typeof BADGES] ?? { label: b.badge_code, icon: '🏅', description: '' }),
  }))

  return NextResponse.json({
    data: {
      xp,
      level:         levelInfo.level,
      level_label:   levelInfo.label,
      next_level_xp: levelInfo.nextXp,
      streak:        maxStreak,
      badges:        badgesWithMeta,
      progress:      progressRows,
      next_review:   nextCard,
      stats: {
        questions_asked:     questionsCount,
        documents_viewed:    viewsCount,
        flashcards_reviewed: progressRows.reduce((s, p) => s + (p.flashcards_reviewed ?? 0), 0),
      },
    },
  })
}
