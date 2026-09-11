const { UnrecoverableError } = require('bullmq');
const {
  createReceiptProcessor,
  createReceiptFailureHandler,
  isFinalFailure,
} = require('../../../src/workers/receipt.processor');

const transaction = {
  id: '5f0c7a4e-8d1f-4f5b-9a55-0a3c7d2b9e11',
  amount: 6000000,
  description: 'Rent',
  receiptStatus: 'PENDING',
  receiptUrl: null,
  receiptObjectKey: null,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  from: { userId: 1, username: 'ali', fullName: 'Ali Ahmadi' },
  to: { userId: 2, username: 'sara', fullName: 'Sara Rezaei' },
};

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const job = (overrides = {}) => ({
  data: { transactionId: transaction.id },
  attemptsMade: 0,
  opts: { attempts: 5 },
  ...overrides,
});

function setup(found = transaction) {
  const transactionRepository = {
    findById: jest.fn().mockResolvedValue(found),
    markReceiptGenerated: jest.fn().mockResolvedValue(true),
    markReceiptFailed: jest.fn().mockResolvedValue(true),
  };
  const storage = {
    upload: jest.fn().mockResolvedValue(),
    getDownloadUrl: jest.fn().mockResolvedValue('http://localhost:9000/receipts/signed'),
  };
  const processor = createReceiptProcessor({ transactionRepository, storage, logger });
  return { processor, transactionRepository, storage };
}

describe('receipt processor', () => {
  it('uploads the receipt to storage and stores the download link on the transaction', async () => {
    const { processor, storage, transactionRepository } = setup();
    const objectKey = `receipts/${transaction.id}.txt`;

    const result = await processor(job());

    expect(storage.upload).toHaveBeenCalledWith(objectKey, expect.stringContaining('6,000,000 Toman'), 'text/plain; charset=utf-8');
    expect(transactionRepository.markReceiptGenerated).toHaveBeenCalledWith(transaction.id, {
      objectKey,
      url: 'http://localhost:9000/receipts/signed',
    });
    expect(result).toEqual({ objectKey, url: 'http://localhost:9000/receipts/signed', skipped: false });
  });

  it('is idempotent when the receipt was already generated', async () => {
    const { processor, storage, transactionRepository } = setup({
      ...transaction,
      receiptStatus: 'GENERATED',
      receiptObjectKey: 'receipts/x.txt',
      receiptUrl: 'http://x',
    });

    const result = await processor(job());

    expect(result.skipped).toBe(true);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(transactionRepository.markReceiptGenerated).not.toHaveBeenCalled();
  });

  it('fails without retry when the transaction does not exist', async () => {
    const { processor } = setup(null);
    await expect(processor(job())).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it('lets storage errors propagate so BullMQ retries the job', async () => {
    const { processor, storage, transactionRepository } = setup();
    storage.upload.mockRejectedValue(new Error('MinIO unavailable'));

    await expect(processor(job())).rejects.toThrow('MinIO unavailable');
    expect(transactionRepository.markReceiptGenerated).not.toHaveBeenCalled();
  });
});

describe('receipt failure handler', () => {
  it.each([
    [1, 5, new Error('x'), false],
    [5, 5, new Error('x'), true],
    [1, 5, new UnrecoverableError('x'), true],
  ])('attempt %i of %i -> final failure: %p', (attemptsMade, attempts, err, expected) => {
    expect(isFinalFailure(job({ attemptsMade, opts: { attempts } }), err)).toBe(expected);
  });

  it('marks the receipt as FAILED once all attempts are exhausted', async () => {
    const transactionRepository = { markReceiptFailed: jest.fn().mockResolvedValue(true) };
    const onFailed = createReceiptFailureHandler({ transactionRepository, logger });

    await onFailed(job({ attemptsMade: 5 }), new Error('boom'));

    expect(transactionRepository.markReceiptFailed).toHaveBeenCalledWith(transaction.id);
  });

  it('does not mark the receipt as failed while retries remain', async () => {
    const transactionRepository = { markReceiptFailed: jest.fn() };
    const onFailed = createReceiptFailureHandler({ transactionRepository, logger });

    await onFailed(job({ attemptsMade: 2 }), new Error('boom'));

    expect(transactionRepository.markReceiptFailed).not.toHaveBeenCalled();
  });
});
