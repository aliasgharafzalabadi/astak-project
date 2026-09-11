const { Router } = require('express');
const { createHealthRouter } = require('./health.routes');
const { createAuthRouter } = require('./auth.routes');
const { createWalletRouter } = require('./wallet.routes');
const { createTransferRouter } = require('./transfer.routes');
const { createTransactionRouter } = require('./transaction.routes');
const { createAdminRouter } = require('./admin.routes');

function createRouter(container) {
  const router = Router();
  router.use('/health', createHealthRouter(container));
  router.use('/api/auth', createAuthRouter(container));
  router.use('/api/wallets', createWalletRouter(container));
  router.use('/api/transfers', createTransferRouter(container));
  router.use('/api/transactions', createTransactionRouter(container));
  router.use('/api/admin', createAdminRouter(container));
  return router;
}

module.exports = { createRouter };
