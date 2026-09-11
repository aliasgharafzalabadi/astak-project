const { Router } = require('express');
const { authenticate } = require('../middlewares/authenticate');
const { authorize, ROLES } = require('../middlewares/authorize');
const { validate } = require('../middlewares/validate');
const { paginationQuery } = require('../validators/common.schemas');

function createAdminRouter({ tokenService, transactionController }) {
  const router = Router();
  router.use(authenticate(tokenService), authorize(ROLES.ADMIN));
  router.get('/transactions', validate({ query: paginationQuery }), transactionController.listAll);
  return router;
}

module.exports = { createAdminRouter };
