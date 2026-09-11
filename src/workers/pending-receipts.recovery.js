function createPendingReceiptRecovery({ transactionRepository, receiptQueue, logger, olderThanSeconds = 60, batchSize = 100 }) {
  return async function recoverPendingReceipts() {
    const ids = await transactionRepository.findPendingReceiptIds({ olderThanSeconds, limit: batchSize });
    for (const id of ids) {
      await receiptQueue.enqueue(id);
    }
    if (ids.length > 0) {
      logger.info({ count: ids.length }, 'Re-enqueued pending receipt jobs');
    }
    return ids.length;
  };
}

module.exports = { createPendingReceiptRecovery };
