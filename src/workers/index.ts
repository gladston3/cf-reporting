import { Worker } from 'bullmq';

import { logger } from '../lib/logger';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const worker = new Worker(
  'report-generation',
  async (job) => {
    logger.info('Job received (not yet implemented)', {
      jobId: job.id,
      jobName: job.name,
    });
  },
  { connection: { url: REDIS_URL, maxRetriesPerRequest: null } },
);

worker.on('ready', () => logger.info('Worker ready', { queue: 'report-generation' }));
worker.on('failed', (job, err) =>
  logger.error('Job failed', { jobId: job?.id, error: err.message }),
);

async function shutdown() {
  logger.info('Shutting down worker...');
  await worker.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
