import { http } from './http';

export const authApi = {
  login: (credentials) => http.post('/api/auth/login', credentials),
  register: (payload) => http.post('/api/auth/register', payload),
};

export const userApi = {
  findByUsername: (username) => http.get(`/api/users/${encodeURIComponent(username)}`),
};

export const walletApi = {
  me: () => http.get('/api/wallets/me'),
  ledger: (page, limit) => http.get('/api/wallets/me/ledger', { page, limit }),
};

export const transferApi = {
  create: (payload) => http.post('/api/transfers', payload),
};

export const transactionApi = {
  list: (page, limit) => http.get('/api/transactions', { page, limit }),
  get: (id) => http.get(`/api/transactions/${id}`),
};

export const adminApi = {
  transactions: (page, limit) => http.get('/api/admin/transactions', { page, limit }),
};
