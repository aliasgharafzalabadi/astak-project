const { Queue } = require('bullmq');

const RECEIPT_QUEUE_NAME = 'transaction-receipts';
const RECEIPT_JOB_NAME = 'generate-receipt';

function createReceiptQueue({ connection, attempts, backoffMs }) {
  const queue = new Queue(RECEIPT_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts,
      backoff: { type: 'exponential', delay: backoffMs },
      removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    },
  });

  return {
    queue,
    enqueue(transactionId) {
      return queue.add(RECEIPT_JOB_NAME, { transactionId }, { jobId: transactionId });
    },
    close() {
      return queue.close();
    },
  };
}

module.exports = { createReceiptQueue, RECEIPT_QUEUE_NAME, RECEIPT_JOB_NAME };
