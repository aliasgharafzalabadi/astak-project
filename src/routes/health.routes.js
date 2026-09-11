const { Router } = require('express');

async function check(probe) {
  try {
    await probe();
    return 'up';
  } catch {
    return 'down';
  }
}

function createHealthRouter({ pool, redis }) {
  const router = Router();

  router.get('/', async (_req, res) => {
    const [database, cache] = await Promise.all([
      check(() => pool.query('SELECT 1')),
      redis ? check(() => redis.ping()) : 'disabled',
    ]);
    const healthy = database === 'up' && cache !== 'down';
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      services: { database, redis: cache },
      uptime: Math.round(process.uptime()),
    });
  });

  return router;
}

module.exports = { createHealthRouter };
