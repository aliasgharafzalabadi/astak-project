import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useWalletStore } from '@/stores/wallet';

const PENDING_REFRESH_MS = 2000;

export function usePagedResource(fetchPage, { limit = 10 } = {}) {
  const wallet = useWalletStore();
  const items = ref([]);
  const pagination = ref({ page: 1, limit, total: 0, totalPages: 0 });
  const loading = ref(false);
  const error = ref('');
  let refreshTimer = null;

  async function load(page = pagination.value.page) {
    clearTimeout(refreshTimer);
    loading.value = true;
    error.value = '';
    try {
      const result = await fetchPage(page, limit);
      items.value = result.items;
      pagination.value = result.pagination;
      if (result.items.some((item) => item.receiptStatus === 'PENDING')) {
        refreshTimer = setTimeout(() => load(), PENDING_REFRESH_MS);
      }
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => load(1));
  onBeforeUnmount(() => clearTimeout(refreshTimer));
  watch(() => wallet.activityVersion, () => load());

  return { items, pagination, loading, error, load };
}
