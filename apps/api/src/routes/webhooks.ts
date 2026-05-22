import { Hono } from 'hono'
import Stripe from 'stripe'
import { createHash } from 'crypto'
import { supabaseAdmin as supabase } from '../lib/supabase.js'

const router = new Hono()
const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!)

// POST /webhooks/stripe
router.post('/stripe', async (c) => {
  const sig = c.req.header('stripe-signature')
  const body = await c.req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env['STRIPE_WEBHOOK_SECRET']!)
  } catch {
    return c.json({ error: 'Invalid signature' }, 400)
  }

  const sub = event.data.object as Stripe.Subscription
  const userId = sub.metadata?.['user_id']
  if (!userId) return c.json({ received: true })

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const status = sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status
      const plan = sub.items.data[0]?.price.id === process.env['STRIPE_PRICE_PREMIUM_YEARLY']
        ? 'premium' : 'premium'

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_sub_id: sub.id,
        plan,
        status: status as 'active' | 'canceled' | 'past_due' | 'trialing',
        expires_at: new Date(sub.current_period_end * 1000).toISOString(),
      }, { onConflict: 'stripe_sub_id' })

      if (status === 'active') {
        await supabase.from('users').update({ plan: 'premium' }).eq('id', userId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_sub_id', sub.id)

      await supabase.from('users').update({ plan: 'free' }).eq('id', userId)
      break
    }

    case 'invoice.payment_failed': {
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_sub_id', (event.data.object as Stripe.Invoice).subscription as string)
      break
    }
  }

  return c.json({ received: true })
})

// POST /webhooks/cinetpay
router.post('/cinetpay', async (c) => {
  const body = await c.req.json<{
    cpm_trans_id: string
    cpm_result: string
    cpm_custom: string
    cpm_site_id: string
    cpm_amount: string
    cpm_currency: string
    signature: string
  }>()

  // VÃ©rification HMAC CinetPay â€” prÃ©vient les faux paiements
  const apiKey = process.env['CINETPAY_API_KEY']!
  const expectedSig = createHash('sha256')
    .update(
      apiKey +
      body.cpm_amount +
      body.cpm_currency +
      body.cpm_trans_id +
      body.cpm_custom
    )
    .digest('hex')

  if (body.signature !== expectedSig) {
    return c.json({ error: 'Invalid signature' }, 400)
  }

  if (body.cpm_result !== '00') return c.json({ received: true })

  let meta: { user_id?: string; plan?: string } = {}
  try { meta = JSON.parse(body.cpm_custom) } catch { return c.json({ received: true }) }

  const { user_id: userId, plan } = meta
  if (!userId) return c.json({ received: true })

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + (plan === 'yearly' ? 12 : 1))

  await supabase.from('subscriptions').insert({
    user_id: userId,
    cinetpay_ref: body.cpm_trans_id,
    plan: 'premium',
    status: 'active',
    expires_at: expiresAt.toISOString(),
  })

  await supabase.from('users').update({ plan: 'premium' }).eq('id', userId)

  return c.json({ received: true })
})

export { router as webhooksRouter }

