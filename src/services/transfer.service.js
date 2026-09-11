function createTransferService({ transactionRepository, receiptThreshold }) {
  return {
    async transfer({ fromUserId, toUserId, amount, description }) {
      const { transactionId } = await transactionRepository.transfer({
        fromUserId,
        toUserId,
        amount,
        description,
        receiptThreshold,
      });

      return transactionRepository.findById(transactionId);
    },
  };
}

module.exports = { createTransferService };
