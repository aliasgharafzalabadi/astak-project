function createWalletController({ walletService }) {
  return {
    async getMyWallet(req, res) {
      res.json(await walletService.getByUserId(req.user.id));
    },

    async getMyLedger(req, res) {
      res.json(await walletService.getLedger(req.user.id, req.validated.query));
    },
  };
}

module.exports = { createWalletController };
