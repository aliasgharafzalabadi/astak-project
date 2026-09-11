const { authorize, ROLES } = require('../../../src/middlewares/authorize');

function run(user, ...roles) {
  const next = jest.fn();
  authorize(...roles)({ user }, {}, next);
  return next.mock.calls[0][0];
}

describe('authorize middleware', () => {
  it('allows a user whose role is permitted', () => {
    expect(run({ id: 1, role: ROLES.ADMIN }, ROLES.ADMIN)).toBeUndefined();
  });

  it('allows any of several permitted roles', () => {
    expect(run({ id: 1, role: ROLES.USER }, ROLES.USER, ROLES.ADMIN)).toBeUndefined();
  });

  it('returns 403 for a role that is not permitted', () => {
    expect(run({ id: 1, role: ROLES.USER }, ROLES.ADMIN)).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('returns 401 when the request is not authenticated', () => {
    expect(run(undefined, ROLES.ADMIN)).toMatchObject({ statusCode: 401 });
  });
});
