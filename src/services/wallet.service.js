const { notFound } = require('../lib/errors');
const { toOffset, toPaginatedResponse } = require('../lib/pagination');

function createWalletService({ walletRepository }) {
  return {
    async getByUserId(userId) {
      const wallet = await walletRepository.findByUserId(userId);
      if (!wallet) {
        throw notFound('Wallet not found', 'WALLET_NOT_FOUND');
      }
      return wallet;
    },

    async getLedger(userId, pagination) {
      const page = await walletRepository.listLedgerByUserId(userId, toOffset(pagination));
      return toPaginatedResponse(page, pagination);
    },
  };
}

module.exports = { createWalletService };
