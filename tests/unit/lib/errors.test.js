const { AppError, mapDatabaseError } = require('../../../src/lib/errors');
const { errorHandler } = require('../../../src/middlewares/error-handler');

const pgError = (code, message = 'db error') => Object.assign(new Error(message), { code });

describe('mapDatabaseError', () => {
  it.each([
    ['WL001', 400, 'INVALID_AMOUNT'],
    ['WL002', 400, 'SELF_TRANSFER_NOT_ALLOWED'],
    ['WL003', 404, 'SENDER_WALLET_NOT_FOUND'],
    ['WL004', 404, 'RECIPIENT_NOT_FOUND'],
    ['WL005', 422, 'INSUFFICIENT_FUNDS'],
    ['23505', 409, 'DUPLICATE_RESOURCE'],
    ['23514', 400, 'CONSTRAINT_VIOLATION'],
  ])('maps SQLSTATE %s to HTTP %i %s', (sqlState, statusCode, code) => {
    const mapped = mapDatabaseError(pgError(sqlState));
    expect(mapped).toBeInstanceOf(AppError);
    expect(mapped).toMatchObject({ statusCode, code });
  });

  it('leaves unknown errors untouched', () => {
    const err = pgError('08006');
    expect(mapDatabaseError(err)).toBe(err);
  });
});

describe('errorHandler', () => {
  function respond(err) {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const logger = { error: jest.fn() };
    errorHandler(logger)(err, { method: 'POST', originalUrl: '/x' }, res, jest.fn());
    return { res, logger };
  }

  it('serializes stored procedure errors as API errors', () => {
    const { res } = respond(pgError('WL005', 'Insufficient funds'));
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds' } });
  });

  it('hides internal error details and logs them', () => {
    const { res, logger } = respond(new Error('connection string leaked'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error.message).not.toContain('leaked');
    expect(logger.error).toHaveBeenCalled();
  });
});
