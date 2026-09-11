const bcrypt = require('bcryptjs');
const { withTransaction } = require('./pool');
const { createUserRepository } = require('../repositories/user.repository');
const { createWalletRepository } = require('../repositories/wallet.repository');

const DEMO_USERS = [
  { username: 'ali', fullName: 'Ali Ahmadi', password: 'Password@123', balance: 20000000 },
  { username: 'sara', fullName: 'Sara Rezaei', password: 'Password@123', balance: 5000000 },
];

async function ensureUser(pool, { username, fullName, password, role, balance }) {
  return withTransaction(pool, async (client) => {
    const users = createUserRepository(client);
    const wallets = createWalletRepository(client);

    if (await users.findByUsername(username)) {
      return false;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await users.create({ username, passwordHash, fullName, role });
    await wallets.create({ userId: user.id, balance });
    return true;
  });
}

async function runSeed(pool, seedConfig, { logger = console } = {}) {
  const accounts = [
    {
      username: seedConfig.adminUsername,
      fullName: seedConfig.adminFullName,
      password: seedConfig.adminPassword,
      role: 'ADMIN',
      balance: 0,
    },
    ...(seedConfig.demoUsers ? DEMO_USERS.map((user) => ({ ...user, role: 'USER' })) : []),
  ];

  for (const account of accounts) {
    if (await ensureUser(pool, account)) {
      logger.info({ username: account.username, role: account.role }, 'Seeded user');
    }
  }
}

module.exports = { runSeed, DEMO_USERS };
