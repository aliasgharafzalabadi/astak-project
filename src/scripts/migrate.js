const config = require('../config');
const logger = require('../lib/logger');
const { createPool } = require('../db/pool');
const { runMigrations } = require('../db/migrator');
const { runSeed } = require('../db/seeder');

async function main() {
  const pool = createPool();
  try {
    const applied = await runMigrations(pool, { logger });
    logger.info({ count: applied.length }, 'Migrations completed');
    await runSeed(pool, config.seed, { logger });
    logger.info('Seed completed');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  logger.fatal({ err }, 'Database setup failed');
  process.exit(1);
});
