import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi } from '@/api';

const STORAGE_KEY = 'wallet.session';

function decodeExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000;
  } catch {
    return 0;
  }
}

function loadSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return session && decodeExpiry(session.token) > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref(loadSession());

  const token = computed(() => session.value?.token ?? null);
  const user = computed(() => session.value?.user ?? null);
  const isAuthenticated = computed(() => Boolean(token.value) && decodeExpiry(token.value) > Date.now());
  const isAdmin = computed(() => user.value?.role === 'ADMIN');

  function persist(value) {
    session.value = value;
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  }

  async function login(credentials) {
    const { accessToken, user: profile } = await authApi.login(credentials);
    persist({ token: accessToken, user: profile });
  }

  async function register(payload) {
    await authApi.register(payload);
    await login({ username: payload.username, password: payload.password });
  }

  function logout() {
    persist(null);
  }

  return { token, user, isAuthenticated, isAdmin, login, register, logout };
});
