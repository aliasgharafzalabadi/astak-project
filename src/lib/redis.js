const Redis = require('ioredis');
const logger = require('./logger');

function createRedisConnection(url, options = {}) {
  const connection = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    ...options,
  });

  connection.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  return connection;
}

module.exports = { createRedisConnection };
