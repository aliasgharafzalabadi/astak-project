const config = require('./config');
const defaultLogger = require('./lib/logger');

function createContainer({ pool, redis = null, logger = defaultLogger }) {
  return { config, logger, pool, redis };
}

module.exports = { createContainer };
