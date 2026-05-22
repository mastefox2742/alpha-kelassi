import { redis } from './redis.js'

const FREE_DAILY_LIMIT = 5
const PREMIUM_DAILY_LIMIT = 200

function quotaKey(userId: string): string {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return `quota:chat:${userId}:${today}`
}

export async function checkAndIncrementQuota(
  userId: string,
  plan: string
): Promise<{ allowed: boolean; remaining: number; used: number }> {
  const limit = plan === 'premium' ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT
  const key = quotaKey(userId)

  const used = await redis.incr(key)

  // Expire à minuit + 1h de marge (TTL en secondes)
  if (used === 1) {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setUTCHours(24, 0, 0, 0)
    const ttl = Math.floor((midnight.getTime() - now.getTime()) / 1000) + 3600
    await redis.expire(key, ttl)
  }

  if (used > limit) {
    await redis.decr(key) // annule l'incrément
    return { allowed: false, remaining: 0, used: limit }
  }

  return { allowed: true, remaining: limit - used, used }
}

export async function getQuotaStatus(userId: string, plan: string) {
  const limit = plan === 'premium' ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT
  const key = quotaKey(userId)
  const used = parseInt((await redis.get<string>(key)) ?? '0', 10)
  return { used, remaining: Math.max(0, limit - used), limit }
}
