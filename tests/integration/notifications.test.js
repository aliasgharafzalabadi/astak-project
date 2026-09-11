const http = require('node:http');
const request = require('supertest');
const { io: connect } = require('socket.io-client');
const { createSocketServer } = require('../../src/sockets');
const { createSocketNotifier } = require('../../src/services/notification.service');
const { createTestContext } = require('./helpers/test-context');

const silentLogger = { info() {}, warn() {}, error() {} };

function waitFor(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 5000);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('real-time transfer notifications', () => {
  let ctx;
  let server;
  let io;
  let url;
  const sockets = [];

  beforeAll(async () => {
    server = http.createServer();
    const notifier = { notifyTransferReceived: (tx) => createSocketNotifier(io).notifyTransferReceived(tx) };
    ctx = await createTestContext({ notifier });
    io = createSocketServer(server, { tokenService: ctx.tokenService, redis: null, logger: silentLogger });
    server.on('request', ctx.app);
    await new Promise((resolve) => server.listen(0, resolve));
    url = `http://localhost:${server.address().port}`;
  });

  afterEach(() => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
  });

  afterAll(async () => {
    await new Promise((resolve) => io.close(resolve));
    await ctx.close();
  });

  beforeEach(() => ctx.reset());

  function open(token) {
    const socket = connect(url, { auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    return socket;
  }

  it('pushes the amount and sender name to every open session of the recipient', async () => {
    const ali = await ctx.createUser({ username: 'ali', fullName: 'Ali Ahmadi', balance: 1000000 });
    const sara = await ctx.createUser({ username: 'sara', fullName: 'Sara Rezaei' });

    const phone = open(sara.token);
    const laptop = open(sara.token);
    const sender = open(ali.token);
    await Promise.all([waitFor(phone, 'session:ready'), waitFor(laptop, 'session:ready'), waitFor(sender, 'session:ready')]);

    let senderNotified = false;
    sender.on('transfer:received', () => {
      senderNotified = true;
    });

    const received = Promise.all([waitFor(phone, 'transfer:received'), waitFor(laptop, 'transfer:received')]);
    const res = await request(server)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${ali.token}`)
      .send({ toUserId: sara.id, amount: 42000 });

    const [onPhone, onLaptop] = await received;
    expect(onPhone).toMatchObject({
      transactionId: res.body.id,
      amount: 42000,
      sender: { id: ali.id, username: 'ali', fullName: 'Ali Ahmadi' },
    });
    expect(onLaptop).toEqual(onPhone);
    expect(senderNotified).toBe(false);
  });

  it('refuses socket connections without a valid token', async () => {
    const socket = open('invalid-token');
    const err = await waitFor(socket, 'connect_error');
    expect(err.message).toBe('Access token is invalid');
    expect(err.data).toEqual({ code: 'INVALID_TOKEN' });
  });
});
