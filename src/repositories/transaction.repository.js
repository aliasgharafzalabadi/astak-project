const DETAILS_COLUMNS = `
  t.id, t.amount, t.description, t.receipt_status, t.receipt_url, t.receipt_object_key, t.created_at,
  fu.id AS from_user_id, fu.username AS from_username, fu.full_name AS from_full_name,
  tu.id AS to_user_id, tu.username AS to_username, tu.full_name AS to_full_name
`;

const DETAILS_FROM = `
  FROM transactions t
  JOIN wallets fw ON fw.id = t.from_wallet_id
  JOIN wallets tw ON tw.id = t.to_wallet_id
  JOIN users fu ON fu.id = fw.user_id
  JOIN users tu ON tu.id = tw.user_id
`;

const toTransaction = (row) => ({
  id: row.id,
  amount: row.amount,
  description: row.description,
  receiptStatus: row.receipt_status,
  receiptUrl: row.receipt_url,
  receiptObjectKey: row.receipt_object_key,
  createdAt: row.created_at,
  from: { userId: row.from_user_id, username: row.from_username, fullName: row.from_full_name },
  to: { userId: row.to_user_id, username: row.to_username, fullName: row.to_full_name },
});

const toPage = (rows) => ({ items: rows.map(toTransaction), total: rows[0]?.total_count ?? 0 });

function createTransactionRepository(db) {
  return {
    async transfer({ fromUserId, toUserId, amount, description, receiptThreshold }, executor = db) {
      const { rows } = await executor.query(
        `CALL transfer_funds($1::BIGINT, $2::BIGINT, $3::BIGINT, $4::VARCHAR, $5::BIGINT, NULL::UUID, NULL::receipt_status)`,
        [fromUserId, toUserId, amount, description ?? null, receiptThreshold],
      );
      return { transactionId: rows[0].o_transaction_id, receiptStatus: rows[0].o_receipt_status };
    },

    async findById(id, executor = db) {
      const { rows } = await executor.query(`SELECT ${DETAILS_COLUMNS} ${DETAILS_FROM} WHERE t.id = $1`, [id]);
      return rows[0] ? toTransaction(rows[0]) : null;
    },

    async listByUserId(userId, { limit, offset }, executor = db) {
      const { rows } = await executor.query(
        `SELECT ${DETAILS_COLUMNS}, COUNT(*) OVER () AS total_count
         ${DETAILS_FROM}
         WHERE t.from_wallet_id = (SELECT id FROM wallets WHERE user_id = $1)
            OR t.to_wallet_id = (SELECT id FROM wallets WHERE user_id = $1)
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );
      return toPage(rows);
    },

    async listAll({ limit, offset }, executor = db) {
      const { rows } = await executor.query(
        `SELECT ${DETAILS_COLUMNS}, COUNT(*) OVER () AS total_count
         ${DETAILS_FROM}
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      return toPage(rows);
    },

    async findPendingReceiptIds({ olderThanSeconds, limit }, executor = db) {
      const { rows } = await executor.query(
        `SELECT id
         FROM transactions
         WHERE receipt_status = 'PENDING'
           AND created_at < now() - make_interval(secs => $1)
         ORDER BY created_at
         LIMIT $2`,
        [olderThanSeconds, limit],
      );
      return rows.map((row) => row.id);
    },

    async markReceiptGenerated(id, { objectKey, url }, executor = db) {
      const { rowCount } = await executor.query(
        `UPDATE transactions
         SET receipt_status = 'GENERATED', receipt_object_key = $2, receipt_url = $3
         WHERE id = $1`,
        [id, objectKey, url],
      );
      return rowCount === 1;
    },

    async markReceiptFailed(id, executor = db) {
      const { rowCount } = await executor.query(
        `UPDATE transactions
         SET receipt_status = 'FAILED'
         WHERE id = $1 AND receipt_status = 'PENDING'`,
        [id],
      );
      return rowCount === 1;
    },
  };
}

module.exports = { createTransactionRepository };
