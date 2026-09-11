<script setup>
import { computed } from 'vue';
import { adminApi } from '@/api';
import { usePagedResource } from '@/composables/usePagedResource';
import TransactionTable from '@/components/TransactionTable.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import EmptyState from '@/components/EmptyState.vue';
import { formatNumber, formatToman } from '@/utils/format';

const { items, pagination, loading, error, load } = usePagedResource(adminApi.transactions, { limit: 15 });

const pageVolume = computed(() => items.value.reduce((sum, tx) => sum + tx.amount, 0));
const pendingReceipts = computed(() => items.value.filter((tx) => tx.receiptStatus === 'PENDING').length);
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>All transactions</h1>
        <p>System-wide history. This endpoint is available to the ADMIN role only.</p>
      </div>
      <button class="btn btn-ghost btn-sm" type="button" :disabled="loading" @click="load()">
        <span v-if="loading" class="spinner" /> Refresh
      </button>
    </div>

    <div class="stats">
      <div class="card stat">
        <span class="muted">Total transactions</span>
        <strong>{{ formatNumber(pagination.total) }}</strong>
      </div>
      <div class="card stat">
        <span class="muted">Volume on this page</span>
        <strong>{{ formatToman(pageVolume) }}</strong>
      </div>
      <div class="card stat">
        <span class="muted">Pending receipts on this page</span>
        <strong>{{ pendingReceipts }}</strong>
      </div>
    </div>

    <div class="card">
      <div v-if="error" class="card-body"><div class="alert alert-error">{{ error }}</div></div>
      <template v-else-if="items.length">
        <TransactionTable :items="items" mode="admin" />
        <PaginationBar :pagination="pagination" @change="load" />
      </template>
      <EmptyState v-else-if="!loading" title="No transactions in the system yet" />
    </div>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat {
  padding: 16px 20px;
  display: grid;
  gap: 4px;
}

.stat span {
  font-size: 0.8rem;
}

.stat strong {
  font-size: 1.4rem;
  font-variant-numeric: tabular-nums;
}
</style>
