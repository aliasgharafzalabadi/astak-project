const { AppError, notFound, mapDatabaseError } = require('../lib/errors');

function notFoundHandler(req, _res, next) {
  next(notFound(`Route ${req.method} ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND'));
}

function errorHandler(logger) {
  return (err, req, res, _next) => {
    let error = mapDatabaseError(err);

    if (err.type === 'entity.parse.failed') {
      error = new AppError(400, 'INVALID_JSON', 'Request body is not valid JSON');
    } else if (err.type === 'entity.too.large') {
      error = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    }

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: { code: error.code, message: error.message, ...(error.details && { details: error.details }) },
      });
    }

    logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled request error');
    return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' } });
  };
}

module.exports = { errorHandler, notFoundHandler };
