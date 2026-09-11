const config = require('./config');
const defaultLogger = require('./lib/logger');
const { createTokenService } = require('./lib/token');
const { createUserRepository } = require('./repositories/user.repository');
const { createWalletRepository } = require('./repositories/wallet.repository');
const { createAuthService } = require('./services/auth.service');
const { createAuthController } = require('./controllers/auth.controller');

function createContainer({
  pool,
  redis = null,
  logger = defaultLogger,
  tokenService = createTokenService(config.jwt),
}) {
  const userRepository = createUserRepository(pool);
  const walletRepository = createWalletRepository(pool);

  const authService = createAuthService({
    pool,
    userRepository,
    walletRepository,
    tokenService,
    initialBalance: config.wallet.initialBalance,
  });

  return {
    config,
    logger,
    pool,
    redis,
    tokenService,
    authController: createAuthController({ authService }),
  };
}

module.exports = { createContainer };
