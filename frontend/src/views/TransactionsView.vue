<script setup>
import { transactionApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { usePagedResource } from '@/composables/usePagedResource';
import TransactionTable from '@/components/TransactionTable.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import EmptyState from '@/components/EmptyState.vue';

const auth = useAuthStore();
const { items, pagination, loading, error, load } = usePagedResource(transactionApi.list, { limit: 10 });
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>Transactions</h1>
        <p>Every transfer you sent or received.</p>
      </div>
      <button class="btn btn-ghost btn-sm" type="button" :disabled="loading" @click="load()">
        <span v-if="loading" class="spinner" /> Refresh
      </button>
    </div>

    <div class="card">
      <div v-if="error" class="card-body"><div class="alert alert-error">{{ error }}</div></div>
      <template v-else-if="items.length">
        <TransactionTable :items="items" :current-user-id="auth.user?.id" />
        <PaginationBar :pagination="pagination" @change="load" />
      </template>
      <EmptyState v-else-if="!loading" title="No transactions yet" />
    </div>
  </div>
</template>
