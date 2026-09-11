const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { createRouter } = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error-handler');

function createApp(container) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.use(createRouter(container));

  app.use(notFoundHandler);
  app.use(errorHandler(container.logger));

  return app;
}

module.exports = { createApp };
