import { Redis } from '@upstash/redis'

const redisUrl   = process.env['UPSTASH_REDIS_REST_URL']   ?? ''
const redisToken = process.env['UPSTASH_REDIS_REST_TOKEN'] ?? ''

const isConfigured =
  redisUrl   && !redisUrl.includes('xxxx') &&
  redisToken && !redisToken.includes('xxxx')

// Client Redis réel ou mock no-op si non configuré (dev sans cache)
export const redis = isConfigured
  ? new Redis({ url: redisUrl, token: redisToken })
  : ({
      get:    async (_k: string)                        => null,
      set:    async (_k: string, _v: unknown, _o?: unknown) => 'OK',
      del:    async (..._k: string[])                   => 0,
      incr:   async (_k: string)                        => 1,
      decr:   async (_k: string)                        => 0,
      expire: async (_k: string, _s: number)            => 1,
    } as unknown as Redis)
