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
  };
}

module.exports = { createTransactionController };
