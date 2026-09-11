<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
});
</script>

<template>
  <div class="empty">
    <div class="icon">∅</div>
    <strong>{{ title }}</strong>
    <p v-if="description" class="muted">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 40px 20px;
  text-align: center;
}

.icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: 1.2rem;
}

p {
  margin: 0;
  font-size: 0.9rem;
}
</style>
