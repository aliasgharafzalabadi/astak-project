<script setup>
import { transactionApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { usePagedResource } from '@/composables/usePagedResource';
import BalanceCard from '@/components/BalanceCard.vue';
import TransferForm from '@/components/TransferForm.vue';
import TransactionTable from '@/components/TransactionTable.vue';
import EmptyState from '@/components/EmptyState.vue';

const auth = useAuthStore();
const { items, loading, error } = usePagedResource(transactionApi.list, { limit: 5 });
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>Hello, {{ auth.user?.fullName?.split(' ')[0] }}</h1>
        <p>Here is what is happening with your wallet.</p>
      </div>
    </div>

    <div class="grid">
      <div class="left">
        <BalanceCard />
        <div class="card info">
          <div class="card-body">
            <h2>How it works</h2>
            <ol class="muted">
              <li>The transfer runs inside the <code>transfer_funds</code> stored procedure with row locks.</li>
              <li>A trigger writes DEBIT and CREDIT rows to the ledger.</li>
              <li>The recipient is notified instantly over Socket.io.</li>
              <li>Above the threshold, a BullMQ worker builds a receipt and uploads it to MinIO.</li>
            </ol>
          </div>
        </div>
      </div>
      <TransferForm />
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Recent activity</h2>
        <RouterLink to="/transactions" class="small">View all →</RouterLink>
      </div>
      <div v-if="error" class="card-body"><div class="alert alert-error">{{ error }}</div></div>
      <TransactionTable v-else-if="items.length" :items="items" :current-user-id="auth.user?.id" />
      <EmptyState
        v-else-if="!loading"
        title="No transactions yet"
        description="Send money to another user to see it here."
      />
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 20px;
  align-items: start;
}

.left {
  display: grid;
  gap: 20px;
}

.info ol {
  margin: 12px 0 0;
  padding-left: 20px;
  display: grid;
  gap: 6px;
  font-size: 0.9rem;
}

code {
  font-family: var(--mono);
  font-size: 0.85em;
  background: var(--surface-muted);
  padding: 1px 5px;
  border-radius: 4px;
}

.small {
  font-size: 0.85rem;
}

@media (max-width: 860px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
