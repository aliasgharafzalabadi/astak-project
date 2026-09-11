<script setup>
import { computed } from 'vue';

const props = defineProps({ status: { type: String, required: true } });

const VARIANTS = {
  NOT_REQUIRED: { label: 'No receipt', tone: 'neutral' },
  PENDING: { label: 'Generating', tone: 'warning' },
  GENERATED: { label: 'Receipt ready', tone: 'success' },
  FAILED: { label: 'Receipt failed', tone: 'danger' },
  OPENING: { label: 'Opening', tone: 'primary' },
  DEBIT: { label: 'Debit', tone: 'neutral' },
  CREDIT: { label: 'Credit', tone: 'success' },
};

const variant = computed(() => VARIANTS[props.status] ?? { label: props.status, tone: 'neutral' });
</script>

<template>
  <span class="badge" :class="variant.tone">
    <span v-if="status === 'PENDING'" class="pulse" />
    {{ variant.label }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  background: var(--surface-muted);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.success {
  background: var(--success-soft);
  color: var(--success);
  border-color: transparent;
}

.warning {
  background: var(--warning-soft);
  color: var(--warning);
  border-color: transparent;
}

.danger {
  background: var(--danger-soft);
  color: var(--danger);
  border-color: transparent;
}

.primary {
  background: var(--primary-soft);
  color: var(--primary);
  border-color: transparent;
}

.pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.3;
  }
}
</style>
