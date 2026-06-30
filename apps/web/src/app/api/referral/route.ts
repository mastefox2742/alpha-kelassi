import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth, adminDb } from '@/lib/firebase/server-auth'

/** GET /api/referral — retourne le code de parrainage + stats du parrain */
export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const [profileSnap, referralsSnap] = await Promise.all([
    adminDb.collection('users').doc(userId).get(),
    adminDb.collection('referrals').where('referrer_id', '==', userId).orderBy('created_at', 'desc').get(),
  ])

  const profile  = profileSnap.data()
  const referrals = referralsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  return NextResponse.json({
    data: {
      referral_code:   profile?.referral_code ?? null,
      total_referrals: referrals.length,
      credited:        referrals.filter((r: any) => r.bonus_credited).length,
      referrals,
    },
  })
}
