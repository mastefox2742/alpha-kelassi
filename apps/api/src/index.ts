import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { authRouter } from './routes/auth.js'
import { billingRouter } from './routes/billing.js'
import { webhooksRouter } from './routes/webhooks.js'
import { subjectsRouter } from './routes/subjects.js'
import { documentsRouter } from './routes/documents.js'
import { adminDocumentsRouter } from './routes/admin/documents.js'
import { aiRouter } from './routes/ai.js'
import { flashcardsRouter } from './routes/flashcards.js'
import { progressRouter } from './routes/progress.js'
import { adminAnalyticsRouter } from './routes/admin/analytics.js'
import { accountRouter } from './routes/account.js'
import { startEmbedWorker } from './jobs/embed-worker.js'
import { initSentry } from './lib/monitoring.js'
import { metricsMiddleware, getMetrics } from './middleware/metrics.js'
import { chatRateLimit } from './middleware/rate-limit.js'

// Démarre le worker BullMQ en arrière-plan
startEmbedWorker()
initSentry().catch(() => null)

const app = new Hono()

app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', metricsMiddleware())
app.use(
  '/api/*',
  cors({
    origin: [process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000'],
    credentials: true,
  })
)

app.get('/health', (c) => c.json({ status: 'ok', service: 'alpha-kelassi-api' }))

// Endpoint Prometheus — accès restreint par IP ou token interne
app.get('/metrics', (c) => {
  const token = c.req.header('x-metrics-token')
  if (token !== process.env['METRICS_TOKEN']) return c.text('Forbidden', 403)
  return c.text(getMetrics(), 200, { 'Content-Type': 'text/plain; version=0.0.4' })
})

app.route('/api/auth', authRouter)
app.route('/api/billing', billingRouter)
app.route('/api/subjects', subjectsRouter)
app.route('/api/documents', documentsRouter)
app.route('/api/admin/documents', adminDocumentsRouter)
app.route('/api/ai', aiRouter)
app.route('/api/flashcards', flashcardsRouter)
app.route('/api/progress', progressRouter)
app.route('/api/admin/analytics', adminAnalyticsRouter)
app.route('/api/account', accountRouter)
app.use('/api/ai/chat', chatRateLimit)
app.route('/webhooks', webhooksRouter)

export default {
  port: parseInt(process.env['PORT'] ?? '3001'),
  fetch: app.fetch,
}
