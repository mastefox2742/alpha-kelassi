import { Queue } from 'bullmq'

// Queue BullMQ pour les jobs d'indexation RAG (Sprint S5)
export const embedQueue = new Queue('embed_document', {
  connection: { url: process.env['QUEUE_REDIS_URL']! },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})
