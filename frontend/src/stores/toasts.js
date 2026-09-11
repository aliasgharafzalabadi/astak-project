import { defineStore } from 'pinia';
import { ref } from 'vue';

let nextId = 1;

export const useToastStore = defineStore('toasts', () => {
  const items = ref([]);

  function dismiss(id) {
    items.value = items.value.filter((toast) => toast.id !== id);
  }

  function push({ title, message, type = 'info', timeout = 5000 }) {
    const id = nextId++;
    items.value.push({ id, title, message, type });
    if (timeout) setTimeout(() => dismiss(id), timeout);
    return id;
  }

  return { items, push, dismiss };
});
