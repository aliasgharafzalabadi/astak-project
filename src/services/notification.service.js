const { userRoom } = require('../sockets');

const EVENTS = Object.freeze({ TRANSFER_RECEIVED: 'transfer:received' });

function createSocketNotifier(io) {
  return {
    notifyTransferReceived(transaction) {
      io.to(userRoom(transaction.to.userId)).emit(EVENTS.TRANSFER_RECEIVED, {
        transactionId: transaction.id,
        amount: transaction.amount,
        description: transaction.description,
        sender: {
          id: transaction.from.userId,
          username: transaction.from.username,
          fullName: transaction.from.fullName,
        },
        createdAt: transaction.createdAt,
      });
    },
  };
}

const noopNotifier = Object.freeze({ notifyTransferReceived() {} });

module.exports = { createSocketNotifier, noopNotifier, EVENTS };
