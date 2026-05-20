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
import { startEmbedWorker } from './jobs/embed-worker.js'

// Démarre le worker BullMQ en arrière-plan
startEmbedWorker()

const app = new Hono()

app.use('*', logger())
app.use('*', secureHeaders())
app.use(
  '/api/*',
  cors({
    origin: [process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000'],
    credentials: true,
  })
)

app.get('/health', (c) => c.json({ status: 'ok', service: 'alpha-kelassi-api' }))

app.route('/api/auth', authRouter)
app.route('/api/billing', billingRouter)
app.route('/api/subjects', subjectsRouter)
app.route('/api/documents', documentsRouter)
app.route('/api/admin/documents', adminDocumentsRouter)
app.route('/webhooks', webhooksRouter)

export default {
  port: parseInt(process.env['PORT'] ?? '3001'),
  fetch: app.fetch,
}
