import type { Context, Next } from 'hono'
import { sendSlackAlert } from '../lib/monitoring.js'

// Compteurs en mémoire (reset au redémarrage — suffisant pour alertes temps réel)
const counters = {
  requests:  new Map<string, number>(),
  errors:    new Map<string, number>(),
  durations: new Map<string, number[]>(),
}

let lastAlertAt = 0
const ALERT_COOLDOWN_MS = 5 * 60_000  // 1 alerte toutes les 5 min max

export function metricsMiddleware() {
  return async (c: Context, next: Next) => {
    const route = `${c.req.method} ${new URL(c.req.url).pathname}`
    const start = Date.now()

    await next()

    const duration = Date.now() - start
    const status   = c.res.status

    // Incrémente compteurs
    counters.requests.set(route, (counters.requests.get(route) ?? 0) + 1)
    if (status >= 500) {
      counters.errors.set(route, (counters.errors.get(route) ?? 0) + 1)
    }
    const durs = counters.durations.get(route) ?? []
    durs.push(duration)
    if (durs.length > 1000) durs.shift()
    counters.durations.set(route, durs)

    // Alerte Slack si taux d'erreur /ai/chat > 5%
    if (route.includes('/ai/chat')) {
      const total  = counters.requests.get(route) ?? 0
      const errors = counters.errors.get(route) ?? 0
      if (total >= 20 && errors / total > 0.05 && Date.now() - lastAlertAt > ALERT_COOLDOWN_MS) {
        lastAlertAt = Date.now()
        const rate = ((errors / total) * 100).toFixed(1)
        sendSlackAlert(`Taux d'erreur /ai/chat = ${rate}% (${errors}/${total} requêtes)`, 'critical').catch(() => null)
      }
    }
  }
}

export function getMetrics() {
  const lines: string[] = [
    '# HELP http_requests_total Total HTTP requests',
    '# TYPE http_requests_total counter',
  ]
  for (const [route, count] of counters.requests) {
    const safe = route.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+/, '')
    lines.push(`http_requests_total{route="${route}"} ${count}`)
    lines.push(`# HELP http_errors_total Total HTTP 5xx errors`)
    lines.push(`# TYPE http_errors_total counter`)
    const errors = counters.errors.get(route) ?? 0
    lines.push(`http_errors_total{route="${route}"} ${errors}`)

    const durs = counters.durations.get(route) ?? []
    if (durs.length > 0) {
      const sorted = [...durs].sort((a, b) => a - b)
      const p50 = sorted[Math.floor(sorted.length * 0.5)]
      const p95 = sorted[Math.floor(sorted.length * 0.95)]
      lines.push(`# HELP http_request_duration_p50_ms p50 latency ms`)
      lines.push(`http_request_duration_p50_ms{route="${route}"} ${p50}`)
      lines.push(`# HELP http_request_duration_p95_ms p95 latency ms`)
      lines.push(`http_request_duration_p95_ms{route="${route}"} ${p95}`)
    }
    void safe
  }
  return lines.join('\n')
}
