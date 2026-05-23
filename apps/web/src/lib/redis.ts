import { Redis } from '@upstash/redis'

// Nettoie une valeur d'env qui pourrait avoir des guillemets parasites
// ex: '"https://foo.upstash.io"' → 'https://foo.upstash.io'
function cleanEnv(v: string | undefined): string {
  return (v ?? '').replace(/^["']|["']$/g, '').trim()
}

const redisUrl   = cleanEnv(process.env['UPSTASH_REDIS_REST_URL'])
const redisToken = cleanEnv(process.env['UPSTASH_REDIS_REST_TOKEN'])

const isConfigured =
  redisUrl.startsWith('https://') &&
  redisToken.length > 0

// Singleton lazy — créé une seule fois au premier appel
let _redis: Redis | null = null

function getRedis(): Redis {
  if (_redis) return _redis

  if (!isConfigured) {
    // Mock no-op utilisé en dev / si Redis n'est pas configuré
    _redis = {
      get:    async (_k: string)                            => null,
      set:    async (_k: string, _v: unknown, _o?: unknown) => 'OK',
      del:    async (..._k: string[])                       => 0,
      incr:   async (_k: string)                            => 1,
      decr:   async (_k: string)                            => 0,
      expire: async (_k: string, _s: number)                => 1,
    } as unknown as Redis
    return _redis
  }

  _redis = new Redis({ url: redisUrl, token: redisToken })
  return _redis
}

// Export proxy — se comporte comme un client Redis normal
// mais n'instancie pas Redis au chargement du module (safe au build time)
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return (...args: unknown[]) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getRedis() as any)[prop](...args)
  },
})
