import { Hono } from 'hono'
import type { AppVariables } from '../lib/types.js'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import Stripe from 'stripe'

import { authMiddleware } from '../middleware/auth.js'

const router = new Hono<{ Variables: AppVariables }>()
const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!)

router.use('*', authMiddleware)

// POST /api/billing/checkout â€” crÃ©e une session Stripe Checkout
router.post(
  '/checkout',
  zValidator('json', z.object({ plan: z.enum(['monthly', 'yearly']) })),
  async (c) => {
    const userId = c.get('userId') as string
    const { plan } = c.req.valid('json')

    const priceId =
      plan === 'monthly'
        ? process.env['STRIPE_PRICE_PREMIUM_MONTHLY']!
        : process.env['STRIPE_PRICE_PREMIUM_YEARLY']!

    // RÃ©cupÃ¨re ou crÃ©e le customer Stripe
    const { data: user } = await c.get('supabase').from('users')
      .select('email')
      .eq('id', userId)
      .single()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user?.email ?? undefined,
      subscription_data: { trial_period_days: 14 },
      metadata: { user_id: userId },
      success_url: `${process.env['NEXT_PUBLIC_SITE_URL']}/billing?success=true`,
      cancel_url: `${process.env['NEXT_PUBLIC_SITE_URL']}/billing?canceled=true`,
    })

    return c.json({ data: { url: session.url } })
  }
)

// POST /api/billing/cinetpay â€” initie un paiement CinetPay Mobile Money
router.post(
  '/cinetpay',
  zValidator('json', z.object({ plan: z.enum(['monthly', 'yearly']), phone: z.string() })),
  async (c) => {
    const userId = c.get('userId') as string
    const { plan, phone } = c.req.valid('json')

    const amount = plan === 'monthly' ? 2000 : 20000 // XAF

    const transactionId = `kelassi_${userId}_${Date.now()}`

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: process.env['CINETPAY_API_KEY'],
        site_id: process.env['CINETPAY_SITE_ID'],
        transaction_id: transactionId,
        amount,
        currency: 'XAF',
        description: `Kelassi Premium â€” ${plan === 'monthly' ? 'Mensuel' : 'Annuel'}`,
        customer_phone_number: phone,
        notify_url: process.env['CINETPAY_NOTIFY_URL'],
        return_url: `${process.env['NEXT_PUBLIC_SITE_URL']}/billing?success=true`,
        metadata: JSON.stringify({ user_id: userId, plan }),
      }),
    })

    const data = (await response.json()) as { data?: { payment_url?: string }; message?: string }

    if (!response.ok || !data.data?.payment_url) {
      return c.json({ error: { code: 'CINETPAY_ERROR', message: data.message ?? 'Erreur paiement' } }, 500)
    }

    return c.json({ data: { url: data.data.payment_url, transaction_id: transactionId } })
  }
)

// GET /api/billing/subscription â€” statut abonnement courant
router.get('/subscription', async (c) => {
  const userId = c.get('userId') as string

  const { data } = await c.get('supabase').from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return c.json({ data })
})

// POST /api/billing/cancel â€” annule l'abonnement Stripe
router.post('/cancel', async (c) => {
  const userId = c.get('userId') as string

  const { data: sub } = await c.get('supabase').from('subscriptions')
    .select('stripe_sub_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!sub?.stripe_sub_id) {
    return c.json({ error: { code: 'NO_SUBSCRIPTION', message: 'Aucun abonnement actif' } }, 404)
  }

  await stripe.subscriptions.update(sub.stripe_sub_id, { cancel_at_period_end: true })

  return c.json({ data: { canceled: true } })
})

export { router as billingRouter }


