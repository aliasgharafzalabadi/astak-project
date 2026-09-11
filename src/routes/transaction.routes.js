const { Router } = require('express');
const { authenticate } = require('../middlewares/authenticate');
const { validate } = require('../middlewares/validate');
const { paginationQuery, uuidParams } = require('../validators/common.schemas');

function createTransactionRouter({ tokenService, transactionController }) {
  const router = Router();
  router.use(authenticate(tokenService));
  router.get('/', validate({ query: paginationQuery }), transactionController.listMine);
  router.get('/:id', validate({ params: uuidParams }), transactionController.getById);
  router.get('/:id/receipt', validate({ params: uuidParams }), transactionController.downloadReceipt);
  return router;
}

module.exports = { createTransactionRouter };
