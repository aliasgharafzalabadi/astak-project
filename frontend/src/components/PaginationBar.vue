<script setup>
defineProps({ pagination: { type: Object, required: true } });
defineEmits(['change']);
</script>

<template>
  <div v-if="pagination.totalPages > 1" class="pager">
    <span class="muted">
      Page {{ pagination.page }} of {{ pagination.totalPages }} · {{ pagination.total }} items
    </span>
    <div class="buttons">
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        :disabled="pagination.page <= 1"
        @click="$emit('change', pagination.page - 1)"
      >
        Previous
      </button>
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        :disabled="pagination.page >= pagination.totalPages"
        @click="$emit('change', pagination.page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<style scoped>
.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  font-size: 0.85rem;
}

.buttons {
  display: flex;
  gap: 8px;
}
</style>
