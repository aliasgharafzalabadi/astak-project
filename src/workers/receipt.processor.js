const { UnrecoverableError } = require('bullmq');
const { buildReceipt } = require('../services/receipt.builder');
const { receiptObjectKey } = require('../storage/receipt.storage');

const RECEIPT_CONTENT_TYPE = 'text/plain; charset=utf-8';

function createReceiptProcessor({ transactionRepository, storage, logger }) {
  return async function processReceiptJob(job) {
    const { transactionId } = job.data;
    const transaction = await transactionRepository.findById(transactionId);

    if (!transaction) {
      throw new UnrecoverableError(`Transaction ${transactionId} not found`);
    }

    if (transaction.receiptStatus === 'GENERATED') {
      return { objectKey: transaction.receiptObjectKey, url: transaction.receiptUrl, skipped: true };
    }

    const objectKey = receiptObjectKey(transaction.id);
    await storage.upload(objectKey, buildReceipt(transaction), RECEIPT_CONTENT_TYPE);
    const url = await storage.getDownloadUrl(objectKey);
    await transactionRepository.markReceiptGenerated(transaction.id, { objectKey, url });

    logger.info({ transactionId, objectKey, attempt: job.attemptsMade + 1 }, 'Receipt generated');
    return { objectKey, url, skipped: false };
  };
}

function isFinalFailure(job, err) {
  return err?.name === 'UnrecoverableError' || job.attemptsMade >= (job.opts.attempts ?? 1);
}

function createReceiptFailureHandler({ transactionRepository, logger }) {
  return async function onReceiptJobFailed(job, err) {
    if (!job) {
      logger.error({ err }, 'Receipt job failed without job reference');
      return;
    }

    const { transactionId } = job.data;
    if (!isFinalFailure(job, err)) {
      logger.warn({ err, transactionId, attempt: job.attemptsMade }, 'Receipt job failed, retrying');
      return;
    }

    logger.error({ err, transactionId, attempts: job.attemptsMade }, 'Receipt job exhausted all attempts');
    await transactionRepository.markReceiptFailed(transactionId).catch((dbErr) => {
      logger.error({ err: dbErr, transactionId }, 'Failed to mark receipt as failed');
    });
  };
}

module.exports = { createReceiptProcessor, createReceiptFailureHandler, isFinalFailure };
