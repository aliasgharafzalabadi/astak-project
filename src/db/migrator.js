const fs = require('node:fs/promises');
const path = require('node:path');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../db/migrations');
const MIGRATION_LOCK_ID = 727274;

async function listMigrationFiles(dir) {
  const entries = await fs.readdir(dir);
  return entries.filter((name) => name.endsWith('.sql')).sort();
}

async function runMigrations(pool, { dir = MIGRATIONS_DIR, logger = console } = {}) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.version));
    const pending = (await listMigrationFiles(dir)).filter((file) => !applied.has(file));

    for (const file of pending) {
      const sql = await fs.readFile(path.join(dir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info({ migration: file }, 'Migration applied');
      } catch (err) {
        await client.query('ROLLBACK');
        err.message = `Migration ${file} failed: ${err.message}`;
        throw err;
      }
    }

    return pending;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
}

module.exports = { runMigrations, MIGRATIONS_DIR };
