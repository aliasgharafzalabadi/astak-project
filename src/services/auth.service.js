const bcrypt = require('bcryptjs');
const { withTransaction } = require('../db/pool');
const { conflict, unauthorized } = require('../lib/errors');

const BCRYPT_ROUNDS = 10;
const TIMING_SAFE_HASH = bcrypt.hashSync('timing-safe-placeholder', BCRYPT_ROUNDS);

const toPublicUser = ({ id, username, fullName, role, createdAt }) => ({ id, username, fullName, role, createdAt });

function createAuthService({ pool, userRepository, walletRepository, tokenService, initialBalance }) {
  return {
    async register({ username, password, fullName }) {
      if (await userRepository.findByUsername(username)) {
        throw conflict('USERNAME_TAKEN', 'Username is already taken');
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      return withTransaction(pool, async (client) => {
        const user = await userRepository.create({ username, passwordHash, fullName }, client);
        const wallet = await walletRepository.create({ userId: user.id, balance: initialBalance }, client);
        return { user: toPublicUser(user), wallet: { id: wallet.id, balance: wallet.balance } };
      });
    },

    async login({ username, password }) {
      const user = await userRepository.findByUsername(username);
      const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? TIMING_SAFE_HASH);

      if (!user || !passwordMatches) {
        throw unauthorized('Invalid username or password', 'INVALID_CREDENTIALS');
      }

      return {
        accessToken: tokenService.sign(user),
        tokenType: 'Bearer',
        expiresIn: tokenService.expiresIn,
        user: toPublicUser(user),
      };
    },
  };
}

module.exports = { createAuthService };
