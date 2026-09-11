const request = require('supertest');
const { createTestContext, TEST_PASSWORD } = require('./helpers/test-context');

describe('authentication flow', () => {
  let ctx;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(() => ctx.close());

  beforeEach(() => ctx.reset());

  it('registers a user with a wallet funded with the initial balance', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ username: 'Reza_K', password: 'Password@123', fullName: 'Reza Karimi' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ username: 'reza_k', fullName: 'Reza Karimi', role: 'USER' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.wallet.balance).toBe(10000000);

    const [opening] = await ctx.ledgerOf(res.body.user.id);
    expect(opening).toMatchObject({ entry_type: 'OPENING', amount: 10000000 });
  });

  it('rejects a duplicate username', async () => {
    await ctx.createUser({ username: 'reza' });

    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ username: 'reza', password: 'Password@123', fullName: 'Another Reza' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('logs in and uses the token on protected endpoints', async () => {
    await ctx.createUser({ username: 'ali', balance: 500 });

    const login = await request(ctx.app).post('/api/auth/login').send({ username: 'ali', password: TEST_PASSWORD });

    expect(login.status).toBe(200);
    expect(login.body.tokenType).toBe('Bearer');

    const wallet = await request(ctx.app)
      .get('/api/wallets/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(wallet.status).toBe(200);
    expect(wallet.body.balance).toBe(500);
  });

  it('rejects invalid credentials', async () => {
    await ctx.createUser({ username: 'ali' });

    const res = await request(ctx.app).post('/api/auth/login').send({ username: 'ali', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
