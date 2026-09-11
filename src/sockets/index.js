const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { extractBearerToken } = require('../middlewares/authenticate');

const MAX_TIMER_MS = 2 ** 31 - 1;

const userRoom = (userId) => `user:${userId}`;

function extractSocketToken(socket) {
  return socket.handshake.auth?.token || extractBearerToken(socket.handshake.headers.authorization);
}

function authenticateSocket(tokenService) {
  return (socket, next) => {
    const token = extractSocketToken(socket);
    if (!token) {
      return next(Object.assign(new Error('Authentication required'), { data: { code: 'UNAUTHORIZED' } }));
    }
    try {
      socket.data.user = tokenService.verify(token);
      return next();
    } catch (err) {
      return next(Object.assign(new Error(err.message), { data: { code: err.code } }));
    }
  };
}

function scheduleSessionExpiry(socket) {
  const remaining = socket.data.user.expiresAt - Date.now();
  return setTimeout(
    () => {
      socket.emit('session:expired', { message: 'Access token has expired, reconnect with a new token' });
      socket.disconnect(true);
    },
    Math.min(Math.max(remaining, 0), MAX_TIMER_MS),
  );
}

function createSocketServer(httpServer, { tokenService, redis, logger }) {
  const io = new Server(httpServer, { cors: { origin: '*' } });

  if (redis) {
    io.adapter(createAdapter(redis.duplicate(), redis.duplicate()));
  }

  io.use(authenticateSocket(tokenService));

  io.on('connection', (socket) => {
    const { user } = socket.data;
    socket.join(userRoom(user.id));
    const expiryTimer = scheduleSessionExpiry(socket);

    logger.info({ userId: user.id, socketId: socket.id }, 'Socket connected');
    socket.emit('session:ready', { userId: user.id, expiresAt: new Date(user.expiresAt).toISOString() });

    socket.on('disconnect', (reason) => {
      clearTimeout(expiryTimer);
      logger.info({ userId: user.id, socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  return io;
}

module.exports = { createSocketServer, authenticateSocket, userRoom };
