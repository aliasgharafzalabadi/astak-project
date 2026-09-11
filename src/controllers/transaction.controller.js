function createTransactionController({ transactionService }) {
  return {
    async listMine(req, res) {
      res.json(await transactionService.listForUser(req.user.id, req.validated.query));
    },

    async listAll(req, res) {
      res.json(await transactionService.listAll(req.validated.query));
    },

    async getById(req, res) {
      res.json(await transactionService.getById(req.validated.params.id, req.user));
    },

    async downloadReceipt(req, res) {
      const url = await transactionService.getReceiptDownloadUrl(req.validated.params.id, req.user);
      res.redirect(302, url);
    },
  };
}

module.exports = { createTransactionController };
