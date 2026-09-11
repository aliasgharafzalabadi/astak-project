const { createTransferService } = require('../../../src/services/transfer.service');

const THRESHOLD = 5000000;

function buildTransaction(overrides = {}) {
  return {
    id: 'tx-1',
    amount: 1000,
    description: null,
    receiptStatus: 'NOT_REQUIRED',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    from: { userId: 1, username: 'ali', fullName: 'Ali Ahmadi' },
    to: { userId: 2, username: 'sara', fullName: 'Sara Rezaei' },
    ...overrides,
  };
}

function setup({ receiptStatus = 'NOT_REQUIRED', enqueueError, notifyError } = {}) {
  const transaction = buildTransaction({ receiptStatus });
  const transactionRepository = {
    transfer: jest.fn().mockResolvedValue({ transactionId: transaction.id, receiptStatus }),
    findById: jest.fn().mockResolvedValue(transaction),
  };
  const receiptQueue = {
    enqueue: enqueueError ? jest.fn().mockRejectedValue(enqueueError) : jest.fn().mockResolvedValue({}),
  };
  const notifier = {
    notifyTransferReceived: jest.fn(() => {
      if (notifyError) throw notifyError;
    }),
  };
  const logger = { error: jest.fn() };
  const service = createTransferService({
    transactionRepository,
    receiptQueue,
    notifier,
    logger,
    receiptThreshold: THRESHOLD,
  });
  return { service, transaction, transactionRepository, receiptQueue, notifier, logger };
}

const input = { fromUserId: 1, toUserId: 2, amount: 1000, description: 'Lunch' };

describe('transferService.transfer', () => {
  it('delegates to the stored procedure with the configured receipt threshold', async () => {
    const { service, transactionRepository } = setup();

    await service.transfer(input);

    expect(transactionRepository.transfer).toHaveBeenCalledWith({ ...input, receiptThreshold: THRESHOLD });
  });

  it('returns the persisted transaction details', async () => {
    const { service, transaction, transactionRepository } = setup();

    await expect(service.transfer(input)).resolves.toBe(transaction);
    expect(transactionRepository.findById).toHaveBeenCalledWith('tx-1');
  });

  it('notifies the recipient after the transfer is committed', async () => {
    const { service, transaction, notifier, transactionRepository } = setup();

    await service.transfer(input);

    expect(notifier.notifyTransferReceived).toHaveBeenCalledWith(transaction);
    expect(transactionRepository.transfer.mock.invocationCallOrder[0]).toBeLessThan(
      notifier.notifyTransferReceived.mock.invocationCallOrder[0],
    );
  });

  it('enqueues a receipt job when the procedure marks the receipt as pending', async () => {
    const { service, receiptQueue } = setup({ receiptStatus: 'PENDING' });

    await service.transfer({ ...input, amount: THRESHOLD + 1 });

    expect(receiptQueue.enqueue).toHaveBeenCalledWith('tx-1');
  });

  it('does not enqueue a receipt job for transfers that do not need a receipt', async () => {
    const { service, receiptQueue } = setup({ receiptStatus: 'NOT_REQUIRED' });

    await service.transfer(input);

    expect(receiptQueue.enqueue).not.toHaveBeenCalled();
  });

  it('still succeeds when the queue is unavailable because the transfer is already committed', async () => {
    const { service, transaction, logger } = setup({
      receiptStatus: 'PENDING',
      enqueueError: new Error('Redis down'),
    });

    await expect(service.transfer(input)).resolves.toBe(transaction);
    expect(logger.error).toHaveBeenCalled();
  });

  it('still succeeds when the notification cannot be delivered', async () => {
    const { service, transaction } = setup({ notifyError: new Error('socket failure') });

    await expect(service.transfer(input)).resolves.toBe(transaction);
  });

  it('propagates database errors without notifying or enqueueing', async () => {
    const { service, transactionRepository, notifier, receiptQueue } = setup();
    const dbError = Object.assign(new Error('Insufficient funds'), { code: 'WL005' });
    transactionRepository.transfer.mockRejectedValue(dbError);

    await expect(service.transfer(input)).rejects.toBe(dbError);
    expect(notifier.notifyTransferReceived).not.toHaveBeenCalled();
    expect(receiptQueue.enqueue).not.toHaveBeenCalled();
  });
});
