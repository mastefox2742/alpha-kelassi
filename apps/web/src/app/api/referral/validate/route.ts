import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'
import { FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { z } from 'zod'
import { addDailyBonus } from '@/lib/ai/quota'

const schema = z.object({
  code: z.string().regex(/^KELASSI-[A-Z2-9]{4}$/, 'Format invalide (ex: KELASSI-AB3Z)'),
})

/**
 * POST /api/referral/validate
 * Body: { code: 'KELASSI-XXXX' }
 */
export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await req.json())
  } catch (e: unknown) {
    const msg = e instanceof z.ZodError ? e.errors[0]?.message : 'Code invalide'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const code = body.code.toUpperCase()

  // 1. Trouve le parrain via son code
  const referrerSnap = await adminDb
    .collection('users')
    .where('referral_code', '==', code)
    .limit(1)
    .get()

  if (referrerSnap.empty) {
    return NextResponse.json({ error: 'Code introuvable. Vérifie l\'orthographe.' }, { status: 404 })
  }

  const referrerDoc = referrerSnap.docs[0]
  const referrerId  = referrerDoc.id

  // 2. Auto-parrainage
  if (referrerId === userId) {
    return NextResponse.json({ error: 'Tu ne peux pas utiliser ton propre code.' }, { status: 400 })
  }

  // 3. Vérifie que le filleul n'a pas déjà utilisé un code
  const existingSnap = await adminDb
    .collection('referrals')
    .where('referee_id', '==', userId)
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    return NextResponse.json({ error: 'Tu as déjà utilisé un code de parrainage.' }, { status: 409 })
  }

  // 4. Empreinte douce (IP + user-agent)
  const ip          = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ua          = req.headers.get('user-agent') ?? ''
  const fingerprint = createHash('sha256').update(`${ip}:${ua}`).digest('hex')

  // Crée l'entrée de parrainage
  try {
    await adminDb.collection('referrals').add({
      referrer_id:        referrerId,
      referee_id:         userId,
      referral_code:      code,
      signup_fingerprint: fingerprint,
      bonus_credited:     false,
      created_at:         FieldValue.serverTimestamp(),
    })
  } catch (err) {
    console.error('[referral/validate] insert error:', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }

  // Crédite +5 questions au parrain pour aujourd'hui
  try {
    await Promise.all([
      addDailyBonus(referrerId, 5),
      adminDb.collection('quota_bonuses').add({
        user_id:      referrerId,
        reason:       'referral',
        bonus_amount: 5,
        bonus_date:   new Date().toISOString().slice(0, 10),
        created_at:   FieldValue.serverTimestamp(),
      }),
      // Marque le bonus comme crédité
      (async () => {
        const snap = await adminDb.collection('referrals')
          .where('referrer_id', '==', referrerId)
          .where('referee_id', '==', userId)
          .limit(1)
          .get()
        if (!snap.empty) await snap.docs[0].ref.update({ bonus_credited: true })
      })(),
    ])
  } catch (err) {
    console.error('[referral/validate] bonus error:', err)
  }

  return NextResponse.json({
    data: {
      success: true,
      message: 'Code validé ! Ton parrain reçoit +5 questions aujourd\'hui. Merci de faire partie de Kelassi.',
    },
  })
}
