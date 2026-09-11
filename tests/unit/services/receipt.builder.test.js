const { buildReceipt, formatAmount } = require('../../../src/services/receipt.builder');

describe('receipt builder', () => {
  const transaction = {
    id: 'a1b2c3',
    amount: 6000000,
    description: null,
    createdAt: '2026-01-01T10:00:00.000Z',
    from: { userId: 1, username: 'ali', fullName: 'Ali Ahmadi' },
    to: { userId: 2, username: 'sara', fullName: 'Sara Rezaei' },
  };

  it('formats amounts with thousands separators', () => {
    expect(formatAmount(6000000)).toBe('6,000,000 Toman');
  });

  it('includes every transaction detail', () => {
    const receipt = buildReceipt(transaction, { generatedAt: new Date('2026-01-01T10:00:05.000Z') });

    expect(receipt).toContain('Transaction ID : a1b2c3');
    expect(receipt).toContain('Date           : 2026-01-01T10:00:00.000Z');
    expect(receipt).toContain('From           : Ali Ahmadi (@ali, user #1)');
    expect(receipt).toContain('To             : Sara Rezaei (@sara, user #2)');
    expect(receipt).toContain('Amount         : 6,000,000 Toman');
    expect(receipt).toContain('Description    : -');
    expect(receipt).toContain('Generated at   : 2026-01-01T10:00:05.000Z');
  });
});
