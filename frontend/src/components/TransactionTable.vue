<script setup>
import StatusBadge from './StatusBadge.vue';
import { formatDate, formatToman, shortId } from '@/utils/format';

const props = defineProps({
  items: { type: Array, required: true },
  currentUserId: { type: Number, default: null },
  mode: { type: String, default: 'user', validator: (value) => ['user', 'admin'].includes(value) },
});

const isIncoming = (transaction) => transaction.to.userId === props.currentUserId;
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <template v-if="mode === 'user'">
            <th>Counterparty</th>
          </template>
          <template v-else>
            <th>From</th>
            <th>To</th>
          </template>
          <th>Description</th>
          <th class="num">Amount</th>
          <th>Receipt</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tx in items" :key="tx.id">
          <td class="nowrap muted">{{ formatDate(tx.createdAt) }}</td>
          <template v-if="mode === 'user'">
            <td>
              <div class="party">
                <span class="direction" :class="isIncoming(tx) ? 'in' : 'out'">{{ isIncoming(tx) ? '↓' : '↑' }}</span>
                <div>
                  <strong>{{ isIncoming(tx) ? tx.from.fullName : tx.to.fullName }}</strong>
                  <div class="muted small">
                    {{ isIncoming(tx) ? 'Received from' : 'Sent to' }} @{{ isIncoming(tx) ? tx.from.username : tx.to.username }}
                  </div>
                </div>
              </div>
            </td>
          </template>
          <template v-else>
            <td>
              <strong>{{ tx.from.fullName }}</strong>
              <div class="muted small">@{{ tx.from.username }}</div>
            </td>
            <td>
              <strong>{{ tx.to.fullName }}</strong>
              <div class="muted small">@{{ tx.to.username }}</div>
            </td>
          </template>
          <td class="muted">{{ tx.description || '—' }}</td>
          <td class="num" :class="mode === 'user' && isIncoming(tx) ? 'amount-in' : 'amount-out'">
            <template v-if="mode === 'user'">{{ isIncoming(tx) ? '+' : '−' }}</template>{{ formatToman(tx.amount) }}
          </td>
          <td>
            <a v-if="tx.receiptStatus === 'GENERATED'" :href="tx.receiptUrl" target="_blank" rel="noopener" class="receipt-link">
              <StatusBadge :status="tx.receiptStatus" /> <span>Download</span>
            </a>
            <StatusBadge v-else :status="tx.receiptStatus" />
          </td>
          <td class="mono muted" :title="tx.id">{{ shortId(tx.id) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.nowrap {
  white-space: nowrap;
}

.small {
  font-size: 0.8rem;
}

.party {
  display: flex;
  align-items: center;
  gap: 10px;
}

.direction {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-weight: 700;
  flex-shrink: 0;
}

.direction.in {
  background: var(--success-soft);
  color: var(--success);
}

.direction.out {
  background: var(--surface-muted);
  color: var(--text-muted);
}

.receipt-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}
</style>
