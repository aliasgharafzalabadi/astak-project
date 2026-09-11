<script setup>
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AuthLayout from '@/components/AuthLayout.vue';

const auth = useAuthStore();
const router = useRouter();

const form = reactive({ fullName: '', username: '', password: '' });
const error = ref('');
const fieldErrors = ref({});
const submitting = ref(false);

const usernameValid = computed(() => !form.username || /^[a-zA-Z0-9_]{3,50}$/.test(form.username));

async function submit() {
  error.value = '';
  fieldErrors.value = {};
  submitting.value = true;
  try {
    await auth.register({ fullName: form.fullName.trim(), username: form.username.trim(), password: form.password });
    router.replace('/');
  } catch (err) {
    error.value = err.message;
    fieldErrors.value = Object.fromEntries((err.details ?? []).map((detail) => [detail.path, detail.message]));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Create account" subtitle="Your wallet starts with an opening balance of 10,000,000 Toman.">
    <form class="form" @submit.prevent="submit">
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div class="field">
        <label for="fullName">Full name</label>
        <input id="fullName" v-model="form.fullName" class="input" autocomplete="name" maxlength="100" required />
        <span v-if="fieldErrors.fullName" class="error-text">{{ fieldErrors.fullName }}</span>
      </div>
      <div class="field">
        <label for="username">Username</label>
        <input
          id="username"
          v-model="form.username"
          class="input"
          :class="{ invalid: !usernameValid }"
          autocomplete="username"
          required
        />
        <span class="hint">3–50 characters: letters, digits or underscore.</span>
        <span v-if="fieldErrors.username" class="error-text">{{ fieldErrors.username }}</span>
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="form.password"
          class="input"
          type="password"
          autocomplete="new-password"
          minlength="8"
          maxlength="72"
          required
        />
        <span class="hint">At least 8 characters.</span>
        <span v-if="fieldErrors.password" class="error-text">{{ fieldErrors.password }}</span>
      </div>
      <button class="btn btn-primary btn-block" type="submit" :disabled="submitting || !usernameValid">
        <span v-if="submitting" class="spinner" /> Create account
      </button>
    </form>

    <template #footer>
      <p class="muted">Already have an account? <RouterLink to="/login">Sign in</RouterLink></p>
    </template>
  </AuthLayout>
</template>

<style scoped>
.form {
  display: grid;
  gap: 16px;
}
</style>
