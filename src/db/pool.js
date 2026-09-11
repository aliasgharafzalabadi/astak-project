const { Pool, types } = require('pg');
const config = require('../config');
const logger = require('../lib/logger');

const INT8_OID = 20;
types.setTypeParser(INT8_OID, (value) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new RangeError(`BIGINT value ${value} exceeds Number.MAX_SAFE_INTEGER`);
  }
  return parsed;
});

function createPool(options = config.db) {
  const pool = new Pool({
    connectionString: options.connectionString,
    max: options.max,
    idleTimeoutMillis: options.idleTimeoutMillis,
    connectionTimeoutMillis: options.connectionTimeoutMillis,
    application_name: process.env.SERVICE_NAME || 'wallet-api',
  });

  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
  });

  return pool;
}

async function withTransaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch((rollbackErr) => {
      logger.error({ err: rollbackErr }, 'Failed to rollback transaction');
    });
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createPool, withTransaction };
