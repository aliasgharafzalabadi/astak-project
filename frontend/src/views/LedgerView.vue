<script setup>
import { walletApi } from '@/api';
import { usePagedResource } from '@/composables/usePagedResource';
import StatusBadge from '@/components/StatusBadge.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import EmptyState from '@/components/EmptyState.vue';
import { formatDate, formatToman, shortId } from '@/utils/format';

const { items, pagination, loading, error, load } = usePagedResource(walletApi.ledger, { limit: 15 });

const signed = (entry) => (entry.entryType === 'DEBIT' ? '−' : '+') + formatToman(entry.amount);
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>Ledger</h1>
        <p>Append-only history of your balance, written by a PostgreSQL trigger on every change.</p>
      </div>
      <button class="btn btn-ghost btn-sm" type="button" :disabled="loading" @click="load()">
        <span v-if="loading" class="spinner" /> Refresh
      </button>
    </div>

    <div class="card">
      <div v-if="error" class="card-body"><div class="alert alert-error">{{ error }}</div></div>
      <template v-else-if="items.length">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Entry</th>
                <th class="num">Amount</th>
                <th class="num">Balance before</th>
                <th class="num">Balance after</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in items" :key="entry.id">
                <td class="muted">{{ formatDate(entry.createdAt) }}</td>
                <td><StatusBadge :status="entry.entryType" /></td>
                <td class="num" :class="entry.entryType === 'DEBIT' ? 'amount-out' : 'amount-in'">{{ signed(entry) }}</td>
                <td class="num muted">{{ formatToman(entry.balanceBefore) }}</td>
                <td class="num"><strong>{{ formatToman(entry.balanceAfter) }}</strong></td>
                <td class="mono muted" :title="entry.transactionId">{{ shortId(entry.transactionId) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <PaginationBar :pagination="pagination" @change="load" />
      </template>
      <EmptyState v-else-if="!loading" title="No ledger entries" />
    </div>
  </div>
</template>
