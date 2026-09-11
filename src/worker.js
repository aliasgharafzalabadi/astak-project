process.env.SERVICE_NAME ||= 'wallet-worker';

const { Worker } = require('bullmq');
const config = require('./config');
const logger = require('./lib/logger');
const { createPool } = require('./db/pool');
const { createRedisConnection } = require('./lib/redis');
const { createTransactionRepository } = require('./repositories/transaction.repository');
const { createReceiptStorage } = require('./storage/receipt.storage');
const { createReceiptQueue, RECEIPT_QUEUE_NAME } = require('./queues/receipt.queue');
const { createReceiptProcessor, createReceiptFailureHandler } = require('./workers/receipt.processor');
const { createPendingReceiptRecovery } = require('./workers/pending-receipts.recovery');

const RECOVERY_INTERVAL_MS = 60 * 1000;

async function start() {
  const pool = createPool();
  const redis = createRedisConnection(config.redis.url);
  const transactionRepository = createTransactionRepository(pool);
  const storage = createReceiptStorage(config.minio, { urlExpirySeconds: config.receipt.urlExpirySeconds });
  const receiptQueue = createReceiptQueue({
    connection: redis,
    attempts: config.receipt.jobAttempts,
    backoffMs: config.receipt.jobBackoffMs,
  });

  await storage.ensureBucket();

  const worker = new Worker(
    RECEIPT_QUEUE_NAME,
    createReceiptProcessor({ transactionRepository, storage, logger }),
    { connection: redis, concurrency: config.receipt.workerConcurrency },
  );

  worker.on('completed', (job, result) => {
    logger.info({ jobId: job.id, skipped: result?.skipped }, 'Receipt job completed');
  });
  worker.on('failed', createReceiptFailureHandler({ transactionRepository, logger }));
  worker.on('error', (err) => logger.error({ err }, 'Receipt worker error'));

  const recoverPendingReceipts = createPendingReceiptRecovery({ transactionRepository, receiptQueue, logger });
  const runRecovery = () =>
    recoverPendingReceipts().catch((err) => logger.error({ err }, 'Pending receipt recovery failed'));
  await runRecovery();
  const recoveryTimer = setInterval(runRecovery, RECOVERY_INTERVAL_MS);

  logger.info({ queue: RECEIPT_QUEUE_NAME, concurrency: config.receipt.workerConcurrency }, 'Receipt worker started');

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down receipt worker');
    clearInterval(recoveryTimer);
    await worker.close();
    await receiptQueue.close();
    await pool.end();
    redis.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start receipt worker');
  process.exit(1);
});
