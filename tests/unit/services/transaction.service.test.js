const { createTransactionService } = require('../../../src/services/transaction.service');

const transaction = {
  id: 'tx-1',
  receiptStatus: 'GENERATED',
  receiptObjectKey: 'receipts/tx-1.txt',
  from: { userId: 1 },
  to: { userId: 2 },
};

function setup(overrides = {}) {
  const transactionRepository = {
    findById: jest.fn().mockResolvedValue({ ...transaction, ...overrides }),
    listByUserId: jest.fn().mockResolvedValue({ items: [transaction], total: 41 }),
    listAll: jest.fn().mockResolvedValue({ items: [transaction], total: 3 }),
  };
  const storage = { getDownloadUrl: jest.fn().mockResolvedValue('http://minio/receipts/tx-1.txt?sig') };
  return { service: createTransactionService({ transactionRepository, storage }), transactionRepository, storage };
}

describe('transactionService.getById', () => {
  it.each([
    ['sender', { id: 1, role: 'USER' }],
    ['recipient', { id: 2, role: 'USER' }],
    ['admin', { id: 99, role: 'ADMIN' }],
  ])('returns the transaction to the %s', async (_label, requester) => {
    const { service } = setup();
    await expect(service.getById('tx-1', requester)).resolves.toMatchObject({ id: 'tx-1' });
  });

  it('hides transactions from users who are not a participant', async () => {
    const { service } = setup();
    await expect(service.getById('tx-1', { id: 3, role: 'USER' })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('transactionService listings', () => {
  it('converts page/limit into limit/offset and builds pagination metadata', async () => {
    const { service, transactionRepository } = setup();

    const result = await service.listForUser(1, { page: 3, limit: 20 });

    expect(transactionRepository.listByUserId).toHaveBeenCalledWith(1, { limit: 20, offset: 40 });
    expect(result.pagination).toEqual({ page: 3, limit: 20, total: 41, totalPages: 3 });
  });

  it('lists all transactions for admins', async () => {
    const { service, transactionRepository } = setup();

    await service.listAll({ page: 1, limit: 10 });

    expect(transactionRepository.listAll).toHaveBeenCalledWith({ limit: 10, offset: 0 });
  });
});

describe('transactionService.getReceiptDownloadUrl', () => {
  it('returns a fresh presigned URL for a generated receipt', async () => {
    const { service, storage } = setup();

    await expect(service.getReceiptDownloadUrl('tx-1', { id: 1, role: 'USER' })).resolves.toContain('receipts/tx-1');
    expect(storage.getDownloadUrl).toHaveBeenCalledWith('receipts/tx-1.txt');
  });

  it('returns 409 while the receipt is still pending', async () => {
    const { service } = setup({ receiptStatus: 'PENDING', receiptObjectKey: null });
    await expect(service.getReceiptDownloadUrl('tx-1', { id: 1, role: 'USER' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'RECEIPT_NOT_READY',
    });
  });

  it('returns 404 when the transfer did not require a receipt', async () => {
    const { service } = setup({ receiptStatus: 'NOT_REQUIRED', receiptObjectKey: null });
    await expect(service.getReceiptDownloadUrl('tx-1', { id: 1, role: 'USER' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECEIPT_NOT_REQUIRED',
    });
  });
});
