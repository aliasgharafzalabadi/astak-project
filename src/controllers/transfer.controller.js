function createTransferController({ transferService }) {
  return {
    async create(req, res) {
      const { toUserId, amount, description } = req.validated.body;
      const transaction = await transferService.transfer({
        fromUserId: req.user.id,
        toUserId,
        amount,
        description,
      });
      res.status(201).json(transaction);
    },
  };
}

module.exports = { createTransferController };
