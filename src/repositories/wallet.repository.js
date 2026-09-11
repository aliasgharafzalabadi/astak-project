const toWallet = (row) =>
  row && {
    id: row.id,
    userId: row.user_id,
    balance: row.balance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

const toLedgerEntry = (row) => ({
  id: row.id,
  transactionId: row.transaction_id,
  entryType: row.entry_type,
  amount: row.amount,
  balanceBefore: row.balance_before,
  balanceAfter: row.balance_after,
  createdAt: row.created_at,
});

function createWalletRepository(db) {
  return {
    async create({ userId, balance }, executor = db) {
      const { rows } = await executor.query(
        `INSERT INTO wallets (user_id, balance)
         VALUES ($1, $2)
         RETURNING id, user_id, balance, created_at, updated_at`,
        [userId, balance],
      );
      return toWallet(rows[0]);
    },

    async findByUserId(userId, executor = db) {
      const { rows } = await executor.query(
        `SELECT id, user_id, balance, created_at, updated_at
         FROM wallets
         WHERE user_id = $1`,
        [userId],
      );
      return toWallet(rows[0]) || null;
    },

    async listLedgerByUserId(userId, { limit, offset }, executor = db) {
      const { rows } = await executor.query(
        `SELECT l.id, l.transaction_id, l.entry_type, l.amount,
                l.balance_before, l.balance_after, l.created_at,
                COUNT(*) OVER () AS total_count
         FROM transaction_ledger l
         JOIN wallets w ON w.id = l.wallet_id
         WHERE w.user_id = $1
         ORDER BY l.created_at DESC, l.id DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );
      return { items: rows.map(toLedgerEntry), total: rows[0]?.total_count ?? 0 };
    },
  };
}

module.exports = { createWalletRepository };
