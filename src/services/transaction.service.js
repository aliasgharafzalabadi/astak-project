const { AppError, notFound } = require('../lib/errors');
const { toOffset, toPaginatedResponse } = require('../lib/pagination');
const { ROLES } = require('../middlewares/authorize');

const canView = (transaction, requester) =>
  requester.role === ROLES.ADMIN ||
  transaction.from.userId === requester.id ||
  transaction.to.userId === requester.id;

function createTransactionService({ transactionRepository, storage }) {
  async function getById(id, requester) {
    const transaction = await transactionRepository.findById(id);
    if (!transaction || !canView(transaction, requester)) {
      throw notFound('Transaction not found', 'TRANSACTION_NOT_FOUND');
    }
    return transaction;
  }

  return {
    getById,

    async listForUser(userId, pagination) {
      const page = await transactionRepository.listByUserId(userId, toOffset(pagination));
      return toPaginatedResponse(page, pagination);
    },

    async listAll(pagination) {
      const page = await transactionRepository.listAll(toOffset(pagination));
      return toPaginatedResponse(page, pagination);
    },

    async getReceiptDownloadUrl(id, requester) {
      const transaction = await getById(id, requester);
      if (transaction.receiptStatus === 'NOT_REQUIRED') {
        throw notFound('This transaction does not have a receipt', 'RECEIPT_NOT_REQUIRED');
      }
      if (transaction.receiptStatus !== 'GENERATED') {
        throw new AppError(409, 'RECEIPT_NOT_READY', `Receipt is ${transaction.receiptStatus.toLowerCase()}`);
      }
      return storage.getDownloadUrl(transaction.receiptObjectKey);
    },
  };
}

module.exports = { createTransactionService };
