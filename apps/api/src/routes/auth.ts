import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { redis } from '../lib/redis.js'
import { authRateLimit, rateLimit } from '../middleware/rate-limit.js'

// Rate limit strict sur la vérification OTP : 5 essais / 10 min par IP
// Empêche le brute-force des 1 000 000 combinaisons à 6 chiffres
const otpVerifyRateLimit = rateLimit({ windowSeconds: 600, max: 5, keyPrefix: 'otp_verify' })

const router = new Hono()

const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+?[0-9]{9,15}$/, 'Numéro invalide'),
})

// POST /api/auth/send-otp — envoi OTP via Africa's Talking
router.post('/send-otp', authRateLimit, zValidator('json', sendOtpSchema), async (c) => {
  const { phone } = c.req.valid('json')
  const formattedPhone = phone.startsWith('+') ? phone : `+242${phone}`

  // Génère un OTP 6 chiffres
  const otp = Math.floor(100000 + Math.random() * 900000).toString()

  // Stocke l'OTP dans Redis (TTL 10 minutes)
  await redis.set(`otp:${formattedPhone}`, otp, { ex: 600 })

  // Envoie via Africa's Talking
  const ATResponse = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey: process.env['AT_API_KEY']!,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: process.env['AT_USERNAME'] ?? 'sandbox',
      to: formattedPhone,
      message: `Votre code Kelassi : ${otp}. Valable 10 minutes.`,
      from: process.env['AT_SENDER_ID'] ?? 'Kelassi',
    }),
  })

  if (!ATResponse.ok) {
    return c.json({ error: { code: 'SMS_FAILED', message: 'Envoi SMS échoué' } }, 500)
  }

  return c.json({ data: { sent: true, phone: formattedPhone } })
})

// POST /api/auth/verify-otp — vérification manuelle (fallback hors Supabase Auth)
router.post(
  '/verify-otp',
  otpVerifyRateLimit,
  zValidator('json', z.object({ phone: z.string(), otp: z.string().length(6) })),
  async (c) => {
    const { phone, otp } = c.req.valid('json')
    const formattedPhone = phone.startsWith('+') ? phone : `+242${phone}`

    const stored = await redis.get<string>(`otp:${formattedPhone}`)
    if (!stored || stored !== otp) {
      return c.json({ error: { code: 'INVALID_OTP', message: 'Code invalide ou expiré' } }, 400)
    }

    await redis.del(`otp:${formattedPhone}`)
    return c.json({ data: { verified: true } })
  }
)

export { router as authRouter }
