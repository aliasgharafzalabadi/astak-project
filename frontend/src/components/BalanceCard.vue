<script setup>
import { useAuthStore } from '@/stores/auth';
import { useWalletStore } from '@/stores/wallet';
import { formatNumber } from '@/utils/format';

const auth = useAuthStore();
const walletStore = useWalletStore();
</script>

<template>
  <div class="balance card">
    <div class="top">
      <span class="label">Available balance</span>
      <button class="refresh" type="button" title="Refresh" :disabled="walletStore.loading" @click="walletStore.refresh()">
        <span v-if="walletStore.loading" class="spinner" />
        <span v-else>↻</span>
      </button>
    </div>
    <div class="amount">
      <template v-if="walletStore.wallet">
        {{ formatNumber(walletStore.wallet.balance) }} <span class="unit">Toman</span>
      </template>
      <span v-else class="placeholder" />
    </div>
    <div class="meta">
      <span>{{ auth.user?.fullName }}</span>
      <span>Wallet #{{ walletStore.wallet?.id ?? '—' }} · User #{{ auth.user?.id }}</span>
    </div>
  </div>
</template>

<style scoped>
.balance {
  background: linear-gradient(135deg, #312e81, #4f46e5 55%, #6d28d9);
  color: #fff;
  border: none;
  padding: 24px;
  display: grid;
  gap: 12px;
  min-height: 190px;
  align-content: space-between;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 0.85rem;
  opacity: 0.8;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.refresh {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
}

.amount {
  font-size: 2.2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.unit {
  font-size: 1rem;
  font-weight: 500;
  opacity: 0.8;
}

.placeholder {
  display: inline-block;
  width: 60%;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.85rem;
  opacity: 0.85;
  flex-wrap: wrap;
}
</style>
