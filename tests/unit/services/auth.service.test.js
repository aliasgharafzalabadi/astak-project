const bcrypt = require('bcryptjs');
const { createAuthService } = require('../../../src/services/auth.service');

function createFakePool() {
  const client = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
  return { client, pool: { connect: jest.fn().mockResolvedValue(client) } };
}

function setup({ existingUser = null } = {}) {
  const { pool, client } = createFakePool();
  const userRepository = {
    findByUsername: jest.fn().mockResolvedValue(existingUser),
    create: jest.fn(async ({ username, fullName, passwordHash }) => ({
      id: 10,
      username,
      fullName,
      passwordHash,
      role: 'USER',
      createdAt: new Date(),
    })),
  };
  const walletRepository = {
    create: jest.fn(async ({ userId, balance }) => ({ id: 20, userId, balance })),
  };
  const tokenService = { sign: jest.fn().mockReturnValue('signed-token'), expiresIn: '1h' };
  const service = createAuthService({
    pool,
    userRepository,
    walletRepository,
    tokenService,
    initialBalance: 10000000,
  });
  return { service, pool, client, userRepository, walletRepository, tokenService };
}

describe('authService.register', () => {
  const input = { username: 'reza', password: 'Password@123', fullName: 'Reza Karimi' };

  it('creates the user and a wallet with the initial balance in one database transaction', async () => {
    const { service, client, userRepository, walletRepository } = setup();

    const result = await service.register(input);

    expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({ username: 'reza' }), client);
    expect(walletRepository.create).toHaveBeenCalledWith({ userId: 10, balance: 10000000 }, client);
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'COMMIT']);
    expect(result).toEqual({
      user: expect.objectContaining({ id: 10, username: 'reza', role: 'USER' }),
      wallet: { id: 20, balance: 10000000 },
    });
  });

  it('stores a bcrypt hash and never returns it', async () => {
    const { service, userRepository } = setup();

    const result = await service.register(input);

    const { passwordHash } = userRepository.create.mock.calls[0][0];
    expect(passwordHash).not.toBe(input.password);
    await expect(bcrypt.compare(input.password, passwordHash)).resolves.toBe(true);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rolls back when wallet creation fails', async () => {
    const { service, client, walletRepository } = setup();
    walletRepository.create.mockRejectedValue(new Error('boom'));

    await expect(service.register(input)).rejects.toThrow('boom');
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalled();
  });

  it('rejects a username that is already taken', async () => {
    const { service, userRepository } = setup({ existingUser: { id: 1 } });

    await expect(service.register(input)).rejects.toMatchObject({ statusCode: 409, code: 'USERNAME_TAKEN' });
    expect(userRepository.create).not.toHaveBeenCalled();
  });
});

describe('authService.login', () => {
  const password = 'Password@123';

  it('returns a signed token for valid credentials', async () => {
    const user = { id: 1, username: 'ali', role: 'USER', fullName: 'Ali', passwordHash: bcrypt.hashSync(password, 4) };
    const { service, tokenService } = setup({ existingUser: user });

    const result = await service.login({ username: 'ali', password });

    expect(tokenService.sign).toHaveBeenCalledWith(user);
    expect(result).toMatchObject({ accessToken: 'signed-token', tokenType: 'Bearer', expiresIn: '1h' });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password', async () => {
    const user = { id: 1, username: 'ali', role: 'USER', passwordHash: bcrypt.hashSync(password, 4) };
    const { service } = setup({ existingUser: user });

    await expect(service.login({ username: 'ali', password: 'wrong-password' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('rejects an unknown username with the same error', async () => {
    const { service } = setup();

    await expect(service.login({ username: 'ghost', password })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });
});
