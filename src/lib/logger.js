const pino = require('pino');
const config = require('../config');

module.exports = pino({
  level: config.isTest ? 'silent' : config.logLevel,
  base: { service: process.env.SERVICE_NAME || 'wallet-api' },
  redact: ['req.headers.authorization', 'password', '*.password', '*.passwordHash'],
});
