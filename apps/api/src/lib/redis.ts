import { Redis } from '@upstash/redis'

const redisUrl = process.env['UPSTASH_REDIS_REST_URL'] ?? ''
const redisToken = process.env['UPSTASH_REDIS_REST_TOKEN'] ?? ''
const isRedisConfigured = redisUrl && !redisUrl.includes('xxxx') && redisToken && !redisToken.includes('xxxx')

// Crée un client Redis ou un mock no-op si Redis n'est pas configuré (dev local sans cache)
export const redis = isRedisConfigured
  ? new Redis({ url: redisUrl, token: redisToken })
  : {
      get: async (_key: string) => null,
      set: async (_key: string, _value: unknown, _opts?: unknown) => 'OK',
      del: async (..._keys: string[]) => 0,
      incr: async (_key: string) => 1,
      expire: async (_key: string, _seconds: number) => 1,
    } as unknown as Redis
