const formatAmount = (amount) => `${new Intl.NumberFormat('en-US').format(amount)} Toman`;

const party = ({ fullName, username, userId }) => `${fullName} (@${username}, user #${userId})`;

function buildReceipt(transaction, { generatedAt = new Date() } = {}) {
  const lines = [
    '==================================================',
    '              DIGITAL WALLET RECEIPT              ',
    '==================================================',
    `Transaction ID : ${transaction.id}`,
    `Date           : ${new Date(transaction.createdAt).toISOString()}`,
    `Status         : COMPLETED`,
    '--------------------------------------------------',
    `From           : ${party(transaction.from)}`,
    `To             : ${party(transaction.to)}`,
    `Amount         : ${formatAmount(transaction.amount)}`,
    `Description    : ${transaction.description || '-'}`,
    '--------------------------------------------------',
    `Generated at   : ${generatedAt.toISOString()}`,
    '==================================================',
  ];
  return `${lines.join('\n')}\n`;
}

module.exports = { buildReceipt, formatAmount };
