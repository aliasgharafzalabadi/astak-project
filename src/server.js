const http = require('node:http');
const config = require('./config');
const logger = require('./lib/logger');
const { createPool } = require('./db/pool');
const { createContainer } = require('./container');
const { createApp } = require('./app');

async function start() {
  const pool = createPool();
  const container = createContainer({ pool, logger });
  const server = http.createServer(createApp(container));

  server.listen(config.port, () => {
    logger.info({ port: config.port }, 'HTTP server listening');
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down HTTP server');
    server.close();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
