const request = require('supertest');
const { createTestContext } = require('./helpers/test-context');

describe('transaction history', () => {
  let ctx;
  let ali;
  let sara;
  let reza;
  let admin;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(() => ctx.close());

  beforeEach(async () => {
    await ctx.reset();
    ali = await ctx.createUser({ username: 'ali', balance: 1000000 });
    sara = await ctx.createUser({ username: 'sara', balance: 1000000 });
    reza = await ctx.createUser({ username: 'reza', balance: 1000000 });
    admin = await ctx.createUser({ username: 'admin', role: 'ADMIN' });

    for (const [from, to, amount] of [
      [ali, sara, 100],
      [sara, ali, 200],
      [sara, reza, 300],
    ]) {
      await request(ctx.app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${from.token}`)
        .send({ toUserId: to.id, amount })
        .expect(201);
    }
  });

  const get = (user, url) => request(ctx.app).get(url).set('Authorization', `Bearer ${user.token}`);

  describe('GET /api/transactions', () => {
    it('returns only transactions the user sent or received, newest first', async () => {
      const res = await get(ali, '/api/transactions');

      expect(res.status).toBe(200);
      expect(res.body.items.map((t) => t.amount)).toEqual([200, 100]);
      expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
    });

    it('paginates results', async () => {
      const res = await get(sara, '/api/transactions?page=2&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.items.map((t) => t.amount)).toEqual([100]);
      expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    });

    it('rejects invalid pagination parameters', async () => {
      const res = await get(ali, '/api/transactions?limit=500');
      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      await request(ctx.app).get('/api/transactions').expect(401);
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('is visible to participants and hidden from other users', async () => {
      const { body } = await get(reza, '/api/transactions');
      const id = body.items[0].id;

      await get(reza, `/api/transactions/${id}`).expect(200);
      await get(sara, `/api/transactions/${id}`).expect(200);
      await get(admin, `/api/transactions/${id}`).expect(200);
      const res = await get(ali, `/api/transactions/${id}`);
      expect(res.status).toBe(404);
    });

    it('validates the id format', async () => {
      await get(ali, '/api/transactions/not-a-uuid').expect(400);
    });
  });

  describe('GET /api/admin/transactions', () => {
    it('returns every transaction in the system to admins', async () => {
      const res = await get(admin, '/api/admin/transactions');

      expect(res.status).toBe(200);
      expect(res.body.items.map((t) => t.amount)).toEqual([300, 200, 100]);
      expect(res.body.pagination.total).toBe(3);
    });

    it('forbids regular users', async () => {
      const res = await get(ali, '/api/admin/transactions');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('requires authentication', async () => {
      await request(ctx.app).get('/api/admin/transactions').expect(401);
    });
  });

  describe('wallet endpoints', () => {
    it('returns the current balance', async () => {
      const res = await get(ali, '/api/wallets/me');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ userId: ali.id, balance: 1000100 });
    });

    it('returns the ledger written by the trigger', async () => {
      const res = await get(sara, '/api/wallets/me/ledger');

      expect(res.status).toBe(200);
      expect(res.body.items.map((e) => [e.entryType, e.amount, e.balanceAfter])).toEqual([
        ['DEBIT', 300, 999600],
        ['DEBIT', 200, 999900],
        ['CREDIT', 100, 1000100],
        ['OPENING', 1000000, 1000000],
      ]);
    });
  });
});
