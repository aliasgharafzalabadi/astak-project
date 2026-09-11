const { Router } = require('express');
const { authenticate } = require('../middlewares/authenticate');
const { validate } = require('../middlewares/validate');
const { paginationQuery } = require('../validators/common.schemas');

function createWalletRouter({ tokenService, walletController }) {
  const router = Router();
  router.use(authenticate(tokenService));
  router.get('/me', walletController.getMyWallet);
  router.get('/me/ledger', validate({ query: paginationQuery }), walletController.getMyLedger);
  return router;
}

module.exports = { createWalletRouter };
