<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AuthLayout from '@/components/AuthLayout.vue';

const DEMO_ACCOUNTS = [
  { username: 'ali', password: 'Password@123', label: 'Ali · user' },
  { username: 'sara', password: 'Password@123', label: 'Sara · user' },
  { username: 'admin', password: 'Admin@12345', label: 'Admin' },
];

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({ username: '', password: '' });
const error = ref('');
const submitting = ref(false);

async function submit() {
  error.value = '';
  submitting.value = true;
  try {
    await auth.login({ username: form.username.trim(), password: form.password });
    router.replace(route.query.redirect || '/');
  } catch (err) {
    error.value = err.message;
  } finally {
    submitting.value = false;
  }
}

function useDemo(account) {
  form.username = account.username;
  form.password = account.password;
  submit();
}
</script>

<template>
  <AuthLayout title="Sign in" subtitle="Welcome back. Sign in to your wallet.">
    <form class="form" @submit.prevent="submit">
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div class="field">
        <label for="username">Username</label>
        <input id="username" v-model="form.username" class="input" autocomplete="username" required />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="form.password"
          class="input"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <button class="btn btn-primary btn-block" type="submit" :disabled="submitting">
        <span v-if="submitting" class="spinner" /> Sign in
      </button>
    </form>

    <div class="demo">
      <span class="muted">Demo accounts</span>
      <div class="demo-buttons">
        <button
          v-for="account in DEMO_ACCOUNTS"
          :key="account.username"
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="submitting"
          @click="useDemo(account)"
        >
          {{ account.label }}
        </button>
      </div>
    </div>

    <template #footer>
      <p class="muted">New here? <RouterLink to="/register">Create an account</RouterLink></p>
    </template>
  </AuthLayout>
</template>

<style scoped>
.form {
  display: grid;
  gap: 16px;
}

.demo {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: grid;
  gap: 8px;
  font-size: 0.85rem;
}

.demo-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
