function createTransferService({ transactionRepository, notifier, logger, receiptThreshold }) {
  return {
    async transfer({ fromUserId, toUserId, amount, description }) {
      const { transactionId } = await transactionRepository.transfer({
        fromUserId,
        toUserId,
        amount,
        description,
        receiptThreshold,
      });

      const transaction = await transactionRepository.findById(transactionId);

      try {
        notifier.notifyTransferReceived(transaction);
      } catch (err) {
        logger.error({ err, transactionId }, 'Failed to send transfer notification');
      }

      return transaction;
    },
  };
}

module.exports = { createTransferService };
