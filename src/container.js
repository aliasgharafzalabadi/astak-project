const config = require('./config');
const defaultLogger = require('./lib/logger');
const { createTokenService } = require('./lib/token');
const { createUserRepository } = require('./repositories/user.repository');
const { createWalletRepository } = require('./repositories/wallet.repository');
const { createTransactionRepository } = require('./repositories/transaction.repository');
const { createAuthService } = require('./services/auth.service');
const { createWalletService } = require('./services/wallet.service');
const { createTransferService } = require('./services/transfer.service');
const { createTransactionService } = require('./services/transaction.service');
const { createAuthController } = require('./controllers/auth.controller');
const { createWalletController } = require('./controllers/wallet.controller');
const { createTransferController } = require('./controllers/transfer.controller');
const { createTransactionController } = require('./controllers/transaction.controller');
const { noopNotifier } = require('./services/notification.service');

function createContainer({
  pool,
  redis = null,
  logger = defaultLogger,
  tokenService = createTokenService(config.jwt),
  notifier = noopNotifier,
  receiptQueue,
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
    receiptQueue,
    notifier,
    logger,
    receiptThreshold: config.receipt.threshold,
  });
  const transactionService = createTransactionService({ transactionRepository });

  return {
    config,
    logger,
    pool,
    redis,
    tokenService,
    authController: createAuthController({ authService }),
    walletController: createWalletController({ walletService }),
    transferController: createTransferController({ transferService }),
    transactionController: createTransactionController({ transactionService }),
  };
}

module.exports = { createContainer };
