const { Router } = require('express');
const { createHealthRouter } = require('./health.routes');
const { createAuthRouter } = require('./auth.routes');

function createRouter(container) {
  const router = Router();
  router.use('/health', createHealthRouter(container));
  router.use('/api/auth', createAuthRouter(container));
  return router;
}

module.exports = { createRouter };
