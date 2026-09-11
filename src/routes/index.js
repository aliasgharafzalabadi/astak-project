const { Router } = require('express');
const { createHealthRouter } = require('./health.routes');

function createRouter(container) {
  const router = Router();
  router.use('/health', createHealthRouter(container));
  return router;
}

module.exports = { createRouter };
