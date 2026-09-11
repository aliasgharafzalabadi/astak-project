<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { transactionApi, transferApi, userApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useWalletStore } from '@/stores/wallet';
import { useToastStore } from '@/stores/toasts';
import StatusBadge from './StatusBadge.vue';
import { RECEIPT_THRESHOLD, formatNumber, formatToman, initials, parseAmount } from '@/utils/format';

const QUICK_AMOUNTS = [100000, 1000000, 5000000, 6000000];
const RECEIPT_POLL_MS = 1000;
const RECEIPT_POLL_LIMIT = 30;

const auth = useAuthStore();
const walletStore = useWalletStore();
const toasts = useToastStore();

const username = ref('');
const recipient = ref(null);
const lookupError = ref('');
const lookingUp = ref(false);
const amountInput = ref('');
const description = ref('');
const submitting = ref(false);
const error = ref('');
const result = ref(null);

let lookupTimer = null;
let pollTimer = null;

const amount = computed(() => parseAmount(amountInput.value));
const balance = computed(() => walletStore.wallet?.balance ?? 0);
const exceedsBalance = computed(() => amount.value !== null && amount.value > balance.value);
const needsReceipt = computed(() => amount.value !== null && amount.value > RECEIPT_THRESHOLD);
const canSubmit = computed(
  () => recipient.value && amount.value > 0 && !exceedsBalance.value && !submitting.value,
);

async function lookup(value) {
  const normalized = value.trim().toLowerCase();
  recipient.value = null;
  lookupError.value = '';
  if (!normalized) return;
  if (normalized === auth.user?.username) {
    lookupError.value = 'You cannot send money to yourself.';
    return;
  }
  lookingUp.value = true;
  try {
    const found = await userApi.findByUsername(normalized);
    if (username.value.trim().toLowerCase() === normalized) recipient.value = found;
  } catch (err) {
    lookupError.value = err.status === 404 ? `No user named "${normalized}".` : err.message;
  } finally {
    lookingUp.value = false;
  }
}

watch(username, (value) => {
  clearTimeout(lookupTimer);
  recipient.value = null;
  lookupError.value = '';
  lookupTimer = setTimeout(() => lookup(value), 400);
});

function onAmountInput(event) {
  const parsed = parseAmount(event.target.value);
  amountInput.value = parsed === null ? '' : formatNumber(parsed);
}

function setAmount(value) {
  amountInput.value = formatNumber(value);
}

function pollReceipt(transactionId, attempt = 0) {
  pollTimer = setTimeout(async () => {
    try {
      const tx = await transactionApi.get(transactionId);
      if (result.value?.id !== transactionId) return;
      result.value = tx;
      if (tx.receiptStatus === 'PENDING' && attempt < RECEIPT_POLL_LIMIT) {
        pollReceipt(transactionId, attempt + 1);
      } else if (tx.receiptStatus === 'GENERATED') {
        walletStore.markActivity();
      }
    } catch {
      if (attempt < RECEIPT_POLL_LIMIT) pollReceipt(transactionId, attempt + 1);
    }
  }, RECEIPT_POLL_MS);
}

async function submit() {
  if (!canSubmit.value) return;
  error.value = '';
  submitting.value = true;
  clearTimeout(pollTimer);
  try {
    const tx = await transferApi.create({
      toUserId: recipient.value.id,
      amount: amount.value,
      description: description.value.trim() || undefined,
    });
    result.value = tx;
    toasts.push({ type: 'success', title: 'Transfer completed', message: `${formatToman(tx.amount)} sent to ${tx.to.fullName}` });
    walletStore.markActivity();
    if (tx.receiptStatus === 'PENDING') pollReceipt(tx.id);
    username.value = '';
    amountInput.value = '';
    description.value = '';
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}

onBeforeUnmount(() => {
  clearTimeout(lookupTimer);
  clearTimeout(pollTimer);
});
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2>Send money</h2>
      <span class="muted small">Receipts above {{ formatToman(RECEIPT_THRESHOLD) }}</span>
    </div>
    <form class="card-body form" @submit.prevent="submit">
      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <div class="field">
        <label for="recipient">Recipient username</label>
        <input
          id="recipient"
          v-model="username"
          class="input"
          :class="{ invalid: lookupError }"
          placeholder="e.g. sara"
          autocomplete="off"
        />
        <span v-if="lookingUp" class="hint">Looking up…</span>
        <span v-else-if="lookupError" class="error-text">{{ lookupError }}</span>
        <div v-else-if="recipient" class="recipient">
          <span class="avatar">{{ initials(recipient.fullName) }}</span>
          <div>
            <strong>{{ recipient.fullName }}</strong>
            <div class="muted small">@{{ recipient.username }} · User #{{ recipient.id }}</div>
          </div>
          <span class="check">✓</span>
        </div>
      </div>

      <div class="field">
        <label for="amount">Amount (Toman)</label>
        <input
          id="amount"
          :value="amountInput"
          class="input amount-input"
          :class="{ invalid: exceedsBalance }"
          inputmode="numeric"
          placeholder="0"
          @input="onAmountInput"
        />
        <div class="chips">
          <button v-for="value in QUICK_AMOUNTS" :key="value" type="button" class="chip" @click="setAmount(value)">
            {{ formatNumber(value) }}
          </button>
        </div>
        <span v-if="exceedsBalance" class="error-text">Amount exceeds your balance of {{ formatToman(balance) }}.</span>
        <span v-else-if="needsReceipt" class="hint receipt-hint">A receipt will be generated in the background and stored in MinIO.</span>
      </div>

      <div class="field">
        <label for="description">Description <span class="muted">(optional)</span></label>
        <input id="description" v-model="description" class="input" maxlength="255" placeholder="e.g. Rent" />
      </div>

      <button class="btn btn-primary btn-block" type="submit" :disabled="!canSubmit">
        <span v-if="submitting" class="spinner" />
        Send {{ amount ? formatToman(amount) : '' }}
      </button>

      <div v-if="result" class="result">
        <div>
          <strong>{{ formatToman(result.amount) }}</strong> sent to <strong>{{ result.to.fullName }}</strong>
          <div class="muted small mono">{{ result.id }}</div>
        </div>
        <a
          v-if="result.receiptStatus === 'GENERATED'"
          :href="result.receiptUrl"
          target="_blank"
          rel="noopener"
          class="btn btn-ghost btn-sm"
        >
          Download receipt
        </a>
        <StatusBadge v-else :status="result.receiptStatus" />
      </div>
    </form>
  </div>
</template>

<style scoped>
.form {
  display: grid;
  gap: 18px;
}

.small {
  font-size: 0.8rem;
}

.amount-input {
  font-size: 1.3rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  border: 1px solid var(--border);
  background: var(--surface-muted);
  border-radius: 999px;
  padding: 3px 10px;
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}

.chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.receipt-hint {
  color: var(--warning);
}

.recipient {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--primary-soft);
}

.recipient .avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
}

.recipient .check {
  margin-left: auto;
  color: var(--success);
  font-weight: 700;
}

.result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--success-soft);
  font-size: 0.9rem;
}
</style>
