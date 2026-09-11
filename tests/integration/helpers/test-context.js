const bcrypt = require('bcryptjs');
const { createPool, withTransaction } = require('../../../src/db/pool');
const { runMigrations } = require('../../../src/db/migrator');
const { createContainer } = require('../../../src/container');
const { createApp } = require('../../../src/app');
const { createTokenService } = require('../../../src/lib/token');
const { createUserRepository } = require('../../../src/repositories/user.repository');
const { createWalletRepository } = require('../../../src/repositories/wallet.repository');
const config = require('../../../src/config');

const silentLogger = { info() {}, warn() {}, error() {}, debug() {}, fatal() {} };
const TEST_PASSWORD = 'Password@123';
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

async function createTestContext({ notifier } = {}) {
  const pool = createPool();
  await runMigrations(pool, { logger: silentLogger });

  const tokenService = createTokenService(config.jwt);
  const receiptQueue = { enqueue: jest.fn().mockResolvedValue({}) };
  const storage = { getDownloadUrl: jest.fn().mockResolvedValue('http://localhost:9000/receipts/signed') };
  const fakeNotifier = notifier || { notifyTransferReceived: jest.fn() };

  const container = createContainer({
    pool,
    logger: silentLogger,
    tokenService,
    notifier: fakeNotifier,
    receiptQueue,
    storage,
  });

  const users = createUserRepository(pool);
  const wallets = createWalletRepository(pool);

  return {
    pool,
    app: createApp(container),
    tokenService,
    receiptQueue,
    storage,
    notifier: fakeNotifier,

    async reset() {
      await pool.query('TRUNCATE transaction_ledger, transactions, wallets, users RESTART IDENTITY CASCADE');
      receiptQueue.enqueue.mockClear();
      fakeNotifier.notifyTransferReceived.mockClear?.();
    },

    async createUser({ username, fullName = username, role = 'USER', balance = 0 }) {
      const user = await withTransaction(pool, async (client) => {
        const created = await users.create({ username, fullName, role, passwordHash: TEST_PASSWORD_HASH }, client);
        await wallets.create({ userId: created.id, balance }, client);
        return created;
      });
      return { ...user, token: tokenService.sign(user) };
    },

    async balanceOf(userId) {
      const { rows } = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
      return rows[0].balance;
    },

    async ledgerOf(userId) {
      const { rows } = await pool.query(
        `SELECT l.* FROM transaction_ledger l JOIN wallets w ON w.id = l.wallet_id
         WHERE w.user_id = $1 ORDER BY l.id`,
        [userId],
      );
      return rows;
    },

    async count(table) {
      const { rows } = await pool.query(`SELECT COUNT(*)::INT AS count FROM ${table}`);
      return rows[0].count;
    },

    close() {
      return pool.end();
    },
  };
}

module.exports = { createTestContext, TEST_PASSWORD };
