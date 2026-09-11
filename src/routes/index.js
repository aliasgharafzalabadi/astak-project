const { Router } = require('express');
const { createHealthRouter } = require('./health.routes');
const { createAuthRouter } = require('./auth.routes');
const { createWalletRouter } = require('./wallet.routes');

function createRouter(container) {
  const router = Router();
  router.use('/health', createHealthRouter(container));
  router.use('/api/auth', createAuthRouter(container));
  router.use('/api/wallets', createWalletRouter(container));
  return router;
}

module.exports = { createRouter };
