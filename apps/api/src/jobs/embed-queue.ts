import { Queue } from 'bullmq'

const queueRedisUrl = process.env['QUEUE_REDIS_URL'] ?? ''
const isQueueConfigured = !!queueRedisUrl && !queueRedisUrl.includes('xxxx')

// Queue BullMQ pour les jobs d'indexation RAG (Sprint S5)
// Retourne null si Redis n'est pas configuré (dev local)
export const embedQueue = isQueueConfigured
  ? new Queue('embed_document', {
      connection: { url: queueRedisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    })
  : null
