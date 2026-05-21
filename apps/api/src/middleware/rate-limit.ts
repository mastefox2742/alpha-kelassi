import type { Context, Next } from 'hono'
import { redis } from '../lib/redis.js'

interface RateLimitOptions {
  windowSeconds: number
  max: number
  keyPrefix: string
}

function getClientIp(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-real-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export function rateLimit({ windowSeconds, max, keyPrefix }: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    const ip = getClientIp(c)
    const key = `rl:${keyPrefix}:${ip}`

    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }

    c.res.headers.set('X-RateLimit-Limit', String(max))
    c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, max - count)))

    if (count > max) {
      return c.json(
        { error: { code: 'RATE_LIMITED', message: 'Trop de requêtes. Réessaie dans quelques minutes.' } },
        429
      )
    }

    await next()
  }
}

// Préconfigurés
export const authRateLimit = rateLimit({ windowSeconds: 300, max: 10, keyPrefix: 'auth' })   // 10 OTP / 5 min
export const chatRateLimit  = rateLimit({ windowSeconds: 60,  max: 30, keyPrefix: 'chat' })  // 30 req / min (quota métier par-dessus)
