// Sentry + Slack alertes — monitoring production

const SLACK_WEBHOOK = process.env['SLACK_WEBHOOK_URL']
const SENTRY_DSN    = process.env['SENTRY_DSN']

// Initialise Sentry si le DSN est configuré
export async function initSentry() {
  if (!SENTRY_DSN) return
  try {
    const Sentry = await import('@sentry/node')
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env['NODE_ENV'] ?? 'development',
      tracesSampleRate: 0.2,
      integrations: [Sentry.httpIntegration()],
    })
    console.log('[monitoring] Sentry initialisé')
  } catch {
    console.warn('[monitoring] @sentry/node non installé — Sentry désactivé')
  }
}

export async function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) return
  try {
    const Sentry = await import('@sentry/node')
    Sentry.withScope((scope) => {
      if (context) scope.setExtras(context)
      Sentry.captureException(err)
    })
  } catch {}
}

export async function sendSlackAlert(message: string, level: 'warning' | 'critical' = 'warning') {
  if (!SLACK_WEBHOOK) return
  const emoji = level === 'critical' ? '🚨' : '⚠️'
  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} *[Kelassi ${level.toUpperCase()}]* ${message}`,
        username: 'Kelassi Monitor',
        icon_emoji: ':robot_face:',
      }),
    })
  } catch (err) {
    console.error('[monitoring] Slack alert failed:', err)
  }
}
