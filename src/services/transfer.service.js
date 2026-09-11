function createTransferService({ transactionRepository, receiptQueue, notifier, logger, receiptThreshold }) {
  return {
    async transfer({ fromUserId, toUserId, amount, description }) {
      const { transactionId, receiptStatus } = await transactionRepository.transfer({
        fromUserId,
        toUserId,
        amount,
        description,
        receiptThreshold,
      });

      const transaction = await transactionRepository.findById(transactionId);

      if (receiptStatus === 'PENDING') {
        try {
          await receiptQueue.enqueue(transactionId);
        } catch (err) {
          logger.error({ err, transactionId }, 'Failed to enqueue receipt job, it will be recovered by the worker');
        }
      }

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
