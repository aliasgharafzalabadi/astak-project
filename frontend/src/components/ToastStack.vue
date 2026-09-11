<script setup>
import { useToastStore } from '@/stores/toasts';

const toasts = useToastStore();
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts.items" :key="toast.id" class="toast" :class="toast.type" role="status">
        <div class="content">
          <strong>{{ toast.title }}</strong>
          <span v-if="toast.message">{{ toast.message }}</span>
        </div>
        <button type="button" class="close" aria-label="Dismiss" @click="toasts.dismiss(toast.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  top: 76px;
  right: 20px;
  display: grid;
  gap: 10px;
  z-index: 50;
  width: min(360px, calc(100vw - 40px));
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--primary);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 24px rgba(23, 26, 43, 0.12);
}

.toast.success {
  border-left-color: var(--success);
}

.toast.warning {
  border-left-color: var(--warning);
}

.toast.error {
  border-left-color: var(--danger);
}

.content {
  display: grid;
  gap: 2px;
  flex: 1;
  font-size: 0.9rem;
}

.content span {
  color: var(--text-muted);
}

.toast.success strong {
  color: var(--success);
}

.close {
  border: none;
  background: none;
  font-size: 1.2rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
