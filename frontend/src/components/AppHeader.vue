<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRealtimeStore } from '@/stores/realtime';
import { initials } from '@/utils/format';

const router = useRouter();
const auth = useAuthStore();
const realtime = useRealtimeStore();

const statusLabel = computed(
  () => ({ live: 'Live', connecting: 'Connecting…', offline: 'Offline' })[realtime.status],
);

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <header class="header">
    <div class="container header-inner">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">W</span>
        <span>Digital Wallet</span>
      </RouterLink>

      <nav class="nav">
        <RouterLink to="/" exact-active-class="active">Dashboard</RouterLink>
        <RouterLink to="/transactions" active-class="active">Transactions</RouterLink>
        <RouterLink to="/ledger" active-class="active">Ledger</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin/transactions" active-class="active">Admin</RouterLink>
      </nav>

      <div class="account">
        <span class="status" :class="realtime.status" :title="`Real-time notifications: ${statusLabel}`">
          <span class="dot" />{{ statusLabel }}
        </span>
        <span class="avatar" :title="auth.user?.fullName">{{ initials(auth.user?.fullName) }}</span>
        <div class="who">
          <strong>{{ auth.user?.fullName }}</strong>
          <span class="muted">@{{ auth.user?.username }} · {{ auth.user?.role }}</span>
        </div>
        <button class="btn btn-ghost btn-sm" type="button" @click="logout">Sign out</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  min-height: 64px;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: var(--text);
}

.brand:hover {
  text-decoration: none;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  font-size: 0.9rem;
}

.nav {
  display: flex;
  gap: 4px;
  flex: 1;
}

.nav a {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-weight: 550;
}

.nav a:hover {
  background: var(--surface-muted);
  text-decoration: none;
  color: var(--text);
}

.nav a.active {
  background: var(--primary-soft);
  color: var(--primary);
}

.account {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface-muted);
  color: var(--text-muted);
}

.status .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.status.live {
  background: var(--success-soft);
  color: var(--success);
}

.status.connecting {
  background: var(--warning-soft);
  color: var(--warning);
}

.avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 700;
  font-size: 0.8rem;
}

.who {
  display: grid;
  line-height: 1.2;
  font-size: 0.85rem;
}

.who .muted {
  font-size: 0.75rem;
}

@media (max-width: 860px) {
  .who {
    display: none;
  }

  .nav {
    order: 3;
    flex-basis: 100%;
    overflow-x: auto;
    padding-bottom: 8px;
  }
}
</style>
