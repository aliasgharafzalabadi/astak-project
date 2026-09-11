<script setup>
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import { configureHttp } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { useWalletStore } from '@/stores/wallet';
import { useRealtimeStore } from '@/stores/realtime';
import { useToastStore } from '@/stores/toasts';
import AppHeader from '@/components/AppHeader.vue';
import ToastStack from '@/components/ToastStack.vue';

const router = useRouter();
const auth = useAuthStore();
const wallet = useWalletStore();
const realtime = useRealtimeStore();
const toasts = useToastStore();

function endSession(message) {
  if (!auth.isAuthenticated && !auth.token) return;
  auth.logout();
  toasts.push({ type: 'warning', title: 'Signed out', message });
  router.push({ name: 'login' });
}

configureHttp({
  getToken: () => auth.token,
  onUnauthorized: () => endSession('Your session is no longer valid. Please sign in again.'),
});

watch(
  () => auth.token,
  (token) => {
    if (token) {
      realtime.connect(token, { onSessionExpired: () => endSession('Your session has expired.') });
      wallet.refresh().catch(() => {});
    } else {
      realtime.disconnect();
      wallet.reset();
    }
  },
  { immediate: true },
);
</script>

<template>
  <AppHeader v-if="auth.isAuthenticated" />
  <main>
    <RouterView />
  </main>
  <ToastStack />
</template>
