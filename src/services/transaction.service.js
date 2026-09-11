const { notFound } = require('../lib/errors');
const { toOffset, toPaginatedResponse } = require('../lib/pagination');
const { ROLES } = require('../middlewares/authorize');

const canView = (transaction, requester) =>
  requester.role === ROLES.ADMIN ||
  transaction.from.userId === requester.id ||
  transaction.to.userId === requester.id;

function createTransactionService({ transactionRepository }) {
  return {
    async listForUser(userId, pagination) {
      const page = await transactionRepository.listByUserId(userId, toOffset(pagination));
      return toPaginatedResponse(page, pagination);
    },

    async listAll(pagination) {
      const page = await transactionRepository.listAll(toOffset(pagination));
      return toPaginatedResponse(page, pagination);
    },

    async getById(id, requester) {
      const transaction = await transactionRepository.findById(id);
      if (!transaction || !canView(transaction, requester)) {
        throw notFound('Transaction not found', 'TRANSACTION_NOT_FOUND');
      }
      return transaction;
    },
  };
}

module.exports = { createTransactionService };
