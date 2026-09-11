const { Router } = require('express');
const { validate } = require('../middlewares/validate');
const { registerBody, loginBody } = require('../validators/auth.schemas');

function createAuthRouter({ authController }) {
  const router = Router();
  router.post('/register', validate({ body: registerBody }), authController.register);
  router.post('/login', validate({ body: loginBody }), authController.login);
  return router;
}

module.exports = { createAuthRouter };
