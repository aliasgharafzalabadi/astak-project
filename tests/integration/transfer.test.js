const request = require('supertest');
const { createTestContext } = require('./helpers/test-context');

const THRESHOLD = 5000000;

describe('POST /api/transfers', () => {
  let ctx;
  let ali;
  let sara;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(() => ctx.close());

  beforeEach(async () => {
    await ctx.reset();
    ali = await ctx.createUser({ username: 'ali', fullName: 'Ali Ahmadi', balance: 20000000 });
    sara = await ctx.createUser({ username: 'sara', fullName: 'Sara Rezaei', balance: 1000000 });
  });

  const transfer = (user, body) =>
    request(ctx.app).post('/api/transfers').set('Authorization', `Bearer ${user.token}`).send(body);

  describe('successful transfer', () => {
    it('moves money between wallets and returns the transaction', async () => {
      const res = await transfer(ali, { toUserId: sara.id, amount: 250000, description: 'Lunch' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        amount: 250000,
        description: 'Lunch',
        receiptStatus: 'NOT_REQUIRED',
        receiptUrl: null,
        from: { userId: ali.id, username: 'ali', fullName: 'Ali Ahmadi' },
        to: { userId: sara.id, username: 'sara', fullName: 'Sara Rezaei' },
      });
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(await ctx.balanceOf(ali.id)).toBe(19750000);
      expect(await ctx.balanceOf(sara.id)).toBe(1250000);
    });

    it('writes a DEBIT and a CREDIT ledger entry through the trigger', async () => {
      const res = await transfer(ali, { toUserId: sara.id, amount: 250000 });

      const [aliOpening, aliDebit] = await ctx.ledgerOf(ali.id);
      const [, saraCredit] = await ctx.ledgerOf(sara.id);

      expect(aliOpening).toMatchObject({ entry_type: 'OPENING', transaction_id: null, balance_after: 20000000 });
      expect(aliDebit).toMatchObject({
        entry_type: 'DEBIT',
        transaction_id: res.body.id,
        amount: 250000,
        balance_before: 20000000,
        balance_after: 19750000,
      });
      expect(saraCredit).toMatchObject({
        entry_type: 'CREDIT',
        transaction_id: res.body.id,
        amount: 250000,
        balance_before: 1000000,
        balance_after: 1250000,
      });
    });

    it('notifies the recipient in real time', async () => {
      const res = await transfer(ali, { toUserId: sara.id, amount: 1000 });

      expect(ctx.notifier.notifyTransferReceived).toHaveBeenCalledTimes(1);
      expect(ctx.notifier.notifyTransferReceived).toHaveBeenCalledWith(
        expect.objectContaining({ id: res.body.id, amount: 1000, to: expect.objectContaining({ userId: sara.id }) }),
      );
    });

    it('does not enqueue a receipt job at exactly the threshold', async () => {
      const res = await transfer(ali, { toUserId: sara.id, amount: THRESHOLD });

      expect(res.body.receiptStatus).toBe('NOT_REQUIRED');
      expect(ctx.receiptQueue.enqueue).not.toHaveBeenCalled();
    });

    it('marks the receipt as pending and enqueues a job above the threshold', async () => {
      const res = await transfer(ali, { toUserId: sara.id, amount: THRESHOLD + 1 });

      expect(res.status).toBe(201);
      expect(res.body.receiptStatus).toBe('PENDING');
      expect(ctx.receiptQueue.enqueue).toHaveBeenCalledWith(res.body.id);
    });
  });

  describe('rejected transfers', () => {
    async function expectNothingChanged() {
      expect(await ctx.balanceOf(ali.id)).toBe(20000000);
      expect(await ctx.balanceOf(sara.id)).toBe(1000000);
      expect(await ctx.count('transactions')).toBe(0);
      expect(await ctx.count('transaction_ledger')).toBe(2);
      expect(ctx.notifier.notifyTransferReceived).not.toHaveBeenCalled();
    }

    it('returns 422 when the sender has insufficient funds', async () => {
      const res = await transfer(sara, { toUserId: ali.id, amount: 1000001 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
      await expectNothingChanged();
    });

    it('returns 400 for a transfer to yourself', async () => {
      const res = await transfer(ali, { toUserId: ali.id, amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SELF_TRANSFER_NOT_ALLOWED');
      await expectNothingChanged();
    });

    it('returns 404 when the recipient does not exist', async () => {
      const res = await transfer(ali, { toUserId: 999999, amount: 100 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RECIPIENT_NOT_FOUND');
      await expectNothingChanged();
    });

    it.each([
      ['zero', { amount: 0 }],
      ['negative', { amount: -100 }],
      ['fractional', { amount: 10.5 }],
      ['string', { amount: '100' }],
      ['missing', {}],
    ])('returns 400 for a %s amount', async (_label, body) => {
      const res = await transfer(ali, { toUserId: sara.id, ...body });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      await expectNothingChanged();
    });

    it('ignores a sender id in the body and always debits the authenticated user', async () => {
      const res = await transfer(sara, { fromUserId: ali.id, toUserId: ali.id, amount: 100 });

      expect(res.status).toBe(201);
      expect(res.body.from.userId).toBe(sara.id);
      expect(await ctx.balanceOf(sara.id)).toBe(999900);
    });

    it('returns 401 without a token', async () => {
      const res = await request(ctx.app).post('/api/transfers').send({ toUserId: sara.id, amount: 100 });

      expect(res.status).toBe(401);
      await expectNothingChanged();
    });

    it('returns 401 with a tampered token', async () => {
      const res = await transfer({ token: `${ali.token}x` }, { toUserId: sara.id, amount: 100 });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('concurrency', () => {
    it('never overdraws a wallet under concurrent transfers', async () => {
      const payer = await ctx.createUser({ username: 'payer', balance: 1000000 });
      const attempts = 25;

      const responses = await Promise.all(
        Array.from({ length: attempts }, () => transfer(payer, { toUserId: sara.id, amount: 100000 })),
      );

      const statuses = responses.map((res) => res.status);
      expect(statuses.filter((status) => status === 201)).toHaveLength(10);
      expect(statuses.filter((status) => status === 422)).toHaveLength(attempts - 10);
      expect(await ctx.balanceOf(payer.id)).toBe(0);
      expect(await ctx.balanceOf(sara.id)).toBe(2000000);
    });

    it('handles opposite-direction transfers without deadlocks and conserves money', async () => {
      const { rows: before } = await ctx.pool.query('SELECT SUM(balance)::BIGINT AS total FROM wallets');

      const responses = await Promise.all(
        Array.from({ length: 30 }, (_, i) =>
          i % 2 === 0
            ? transfer(ali, { toUserId: sara.id, amount: 1000 })
            : transfer(sara, { toUserId: ali.id, amount: 1000 }),
        ),
      );

      expect(responses.every((res) => res.status === 201)).toBe(true);
      const { rows: after } = await ctx.pool.query('SELECT SUM(balance)::BIGINT AS total FROM wallets');
      expect(after[0].total).toBe(before[0].total);
      expect(await ctx.balanceOf(ali.id)).toBe(20000000);
      expect(await ctx.balanceOf(sara.id)).toBe(1000000);
    });

    it('keeps the ledger consistent with wallet balances', async () => {
      await Promise.all(
        Array.from({ length: 20 }, (_, i) => transfer(i % 2 ? ali : sara, { toUserId: i % 2 ? sara.id : ali.id, amount: 5000 + i })),
      );

      const { rows } = await ctx.pool.query(`
        SELECT w.id, w.balance,
               (SELECT l.balance_after FROM transaction_ledger l WHERE l.wallet_id = w.id ORDER BY l.id DESC LIMIT 1) AS last_balance,
               (SELECT COALESCE(SUM(CASE WHEN l.entry_type = 'DEBIT' THEN -l.amount ELSE l.amount END), 0)
                FROM transaction_ledger l WHERE l.wallet_id = w.id)::BIGINT AS ledger_sum
        FROM wallets w
      `);

      for (const row of rows) {
        expect(row.last_balance).toBe(row.balance);
        expect(row.ledger_sum).toBe(row.balance);
      }
      expect(await ctx.count('transaction_ledger')).toBe(2 + 20 * 2);
    });
  });

  describe('database guarantees', () => {
    it('rejects balance changes made outside transfer_funds', async () => {
      await expect(ctx.pool.query('UPDATE wallets SET balance = balance + 1000 WHERE user_id = $1', [ali.id])).rejects.toMatchObject({
        code: 'WL006',
      });
    });

    it('keeps the ledger append-only', async () => {
      await expect(ctx.pool.query('DELETE FROM transaction_ledger')).rejects.toMatchObject({ code: 'WL007' });
      await expect(ctx.pool.query('UPDATE transaction_ledger SET amount = 1')).rejects.toMatchObject({ code: 'WL007' });
    });

    it('enforces a non-negative balance with a CHECK constraint', async () => {
      await expect(ctx.pool.query('INSERT INTO wallets (user_id, balance) VALUES ($1, -1)', [ali.id])).rejects.toMatchObject({
        code: '23514',
      });
    });
  });
});
