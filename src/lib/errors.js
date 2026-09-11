class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (code, message, details) => new AppError(400, code, message, details);
const unauthorized = (message = 'Authentication required', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message);
const forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError(403, 'FORBIDDEN', message);
const notFound = (message = 'Resource not found', code = 'NOT_FOUND') => new AppError(404, code, message);
const conflict = (code, message) => new AppError(409, code, message);

const DATABASE_ERRORS = {
  WL001: { statusCode: 400, code: 'INVALID_AMOUNT' },
  WL002: { statusCode: 400, code: 'SELF_TRANSFER_NOT_ALLOWED' },
  WL003: { statusCode: 404, code: 'SENDER_WALLET_NOT_FOUND' },
  WL004: { statusCode: 404, code: 'RECIPIENT_NOT_FOUND' },
  WL005: { statusCode: 422, code: 'INSUFFICIENT_FUNDS' },
};

function mapDatabaseError(err) {
  const mapped = DATABASE_ERRORS[err.code];
  if (mapped) {
    return new AppError(mapped.statusCode, mapped.code, err.message);
  }
  if (err.code === '23505') {
    return conflict('DUPLICATE_RESOURCE', 'Resource already exists');
  }
  if (err.code === '23514') {
    return badRequest('CONSTRAINT_VIOLATION', 'Request violates a data integrity rule');
  }
  return err;
}

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  mapDatabaseError,
};
