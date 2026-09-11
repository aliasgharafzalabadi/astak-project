const { Router } = require('express');
const { authenticate } = require('../middlewares/authenticate');
const { authorize, ROLES } = require('../middlewares/authorize');
const { validate } = require('../middlewares/validate');
const { transferBody } = require('../validators/transfer.schemas');

function createTransferRouter({ tokenService, transferController }) {
  const router = Router();
  router.post(
    '/',
    authenticate(tokenService),
    authorize(ROLES.USER, ROLES.ADMIN),
    validate({ body: transferBody }),
    transferController.create,
  );
  return router;
}

module.exports = { createTransferRouter };
