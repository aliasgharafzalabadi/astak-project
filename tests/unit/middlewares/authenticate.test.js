const jwt = require('jsonwebtoken');
const { authenticate, extractBearerToken } = require('../../../src/middlewares/authenticate');
const { createTokenService } = require('../../../src/lib/token');

const secret = 'unit-test-secret-that-is-at-least-32-chars';
const tokenService = createTokenService({ secret, expiresIn: '1h' });

function run(headers) {
  const req = { headers };
  const next = jest.fn();
  authenticate(tokenService)(req, {}, next);
  return { req, error: next.mock.calls[0][0] };
}

describe('extractBearerToken', () => {
  it.each([
    [undefined, null],
    ['', null],
    ['Basic abc', null],
    ['Bearer', null],
    ['Bearer abc', 'abc'],
    ['bearer   abc', 'abc'],
  ])('parses %p as %p', (header, expected) => {
    expect(extractBearerToken(header)).toBe(expected);
  });
});

describe('authenticate middleware', () => {
  it('attaches the user to the request for a valid token', () => {
    const token = tokenService.sign({ id: 7, role: 'USER', username: 'ali' });
    const { req, error } = run({ authorization: `Bearer ${token}` });

    expect(error).toBeUndefined();
    expect(req.user).toMatchObject({ id: 7, role: 'USER', username: 'ali' });
    expect(req.user.expiresAt).toBeGreaterThan(Date.now());
  });

  it('rejects a request without an Authorization header', () => {
    const { req, error } = run({});
    expect(error).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
    expect(req.user).toBeUndefined();
  });

  it('rejects a token signed with another secret', () => {
    const token = jwt.sign({ role: 'ADMIN' }, 'another-secret-another-secret-123', { subject: '1' });
    const { error } = run({ authorization: `Bearer ${token}` });
    expect(error).toMatchObject({ statusCode: 401, code: 'INVALID_TOKEN' });
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({ role: 'USER', exp: Math.floor(Date.now() / 1000) - 10 }, secret, { subject: '1' });
    const { error } = run({ authorization: `Bearer ${token}` });
    expect(error).toMatchObject({ statusCode: 401, code: 'TOKEN_EXPIRED' });
  });

  it('rejects a token signed with the "none" algorithm', () => {
    const token = jwt.sign({ role: 'ADMIN' }, null, { algorithm: 'none', subject: '1' });
    const { error } = run({ authorization: `Bearer ${token}` });
    expect(error).toMatchObject({ statusCode: 401, code: 'INVALID_TOKEN' });
  });
});
