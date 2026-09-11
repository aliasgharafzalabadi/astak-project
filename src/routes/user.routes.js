const { Router } = require('express');
const { z } = require('zod');
const { authenticate } = require('../middlewares/authenticate');
const { validate } = require('../middlewares/validate');
const { username } = require('../validators/auth.schemas');

function createUserRouter({ tokenService, userController }) {
  const router = Router();
  router.use(authenticate(tokenService));
  router.get('/:username', validate({ params: z.object({ username }) }), userController.getByUsername);
  return router;
}

module.exports = { createUserRouter };
