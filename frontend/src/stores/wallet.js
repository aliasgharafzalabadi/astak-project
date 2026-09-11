import { defineStore } from 'pinia';
import { ref } from 'vue';
import { walletApi } from '@/api';

export const useWalletStore = defineStore('wallet', () => {
  const wallet = ref(null);
  const loading = ref(false);
  const activityVersion = ref(0);

  async function refresh() {
    loading.value = true;
    try {
      wallet.value = await walletApi.me();
    } finally {
      loading.value = false;
    }
  }

  function markActivity() {
    activityVersion.value += 1;
    return refresh();
  }

  function reset() {
    wallet.value = null;
  }

  return { wallet, loading, activityVersion, refresh, markActivity, reset };
});
