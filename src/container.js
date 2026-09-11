const config = require('./config');
const defaultLogger = require('./lib/logger');
const { createTokenService } = require('./lib/token');
const { createUserRepository } = require('./repositories/user.repository');
const { createWalletRepository } = require('./repositories/wallet.repository');
const { createTransactionRepository } = require('./repositories/transaction.repository');
const { createAuthService } = require('./services/auth.service');
const { createWalletService } = require('./services/wallet.service');
const { createTransferService } = require('./services/transfer.service');
const { createAuthController } = require('./controllers/auth.controller');
const { createWalletController } = require('./controllers/wallet.controller');
const { createTransferController } = require('./controllers/transfer.controller');

function createContainer({
  pool,
  redis = null,
  logger = defaultLogger,
  tokenService = createTokenService(config.jwt),
}) {
  const userRepository = createUserRepository(pool);
  const walletRepository = createWalletRepository(pool);
  const transactionRepository = createTransactionRepository(pool);

  const authService = createAuthService({
    pool,
    userRepository,
    walletRepository,
    tokenService,
    initialBalance: config.wallet.initialBalance,
  });
  const walletService = createWalletService({ walletRepository });
  const transferService = createTransferService({
    transactionRepository,
    receiptThreshold: config.receipt.threshold,
  });

  return {
    config,
    logger,
    pool,
    redis,
    tokenService,
    authController: createAuthController({ authService }),
    walletController: createWalletController({ walletService }),
    transferController: createTransferController({ transferService }),
  };
}

module.exports = { createContainer };
