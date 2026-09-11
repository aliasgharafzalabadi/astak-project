const http = require('node:http');
const config = require('./config');
const logger = require('./lib/logger');
const { createPool } = require('./db/pool');
const { createRedisConnection } = require('./lib/redis');
const { createTokenService } = require('./lib/token');
const { createSocketServer } = require('./sockets');
const { createSocketNotifier } = require('./services/notification.service');
const { createReceiptQueue } = require('./queues/receipt.queue');
const { createReceiptStorage } = require('./storage/receipt.storage');
const { createContainer } = require('./container');
const { createApp } = require('./app');

async function start() {
  const pool = createPool();
  const redis = createRedisConnection(config.redis.url);
  const tokenService = createTokenService(config.jwt);
  const receiptQueue = createReceiptQueue({
    connection: redis,
    attempts: config.receipt.jobAttempts,
    backoffMs: config.receipt.jobBackoffMs,
  });

  const server = http.createServer();
  const io = createSocketServer(server, { tokenService, redis, logger });

  const container = createContainer({
    pool,
    redis,
    logger,
    tokenService,
    notifier: createSocketNotifier(io),
    receiptQueue,
    storage: createReceiptStorage(config.minio, { urlExpirySeconds: config.receipt.urlExpirySeconds }),
  });
  server.on('request', createApp(container));

  server.listen(config.port, () => {
    logger.info({ port: config.port }, 'HTTP server listening');
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down HTTP server');
    await new Promise((resolve) => io.close(() => resolve()));
    await receiptQueue.close();
    await pool.end();
    redis.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
