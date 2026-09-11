const request = require('supertest');
const { createTestContext } = require('./helpers/test-context');

describe('GET /api/users/:username', () => {
  let ctx;
  let ali;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(() => ctx.close());

  beforeEach(async () => {
    await ctx.reset();
    ali = await ctx.createUser({ username: 'ali', fullName: 'Ali Ahmadi' });
    await ctx.createUser({ username: 'sara', fullName: 'Sara Rezaei' });
  });

  const lookup = (username) =>
    request(ctx.app).get(`/api/users/${username}`).set('Authorization', `Bearer ${ali.token}`);

  it('returns the public profile of a user, case-insensitively', async () => {
    const res = await lookup('Sara');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: expect.any(Number), username: 'sara', fullName: 'Sara Rezaei' });
  });

  it('returns 404 for an unknown user', async () => {
    const res = await lookup('ghost');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('requires authentication', async () => {
    await request(ctx.app).get('/api/users/sara').expect(401);
  });
});
