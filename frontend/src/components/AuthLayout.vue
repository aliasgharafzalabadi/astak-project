<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
});
</script>

<template>
  <div class="auth">
    <section class="intro">
      <div class="brand"><span class="brand-mark">W</span> Digital Wallet</div>
      <h1>Move money instantly, with every change on the ledger.</h1>
      <ul>
        <li>Transfers settle inside a PostgreSQL stored procedure</li>
        <li>Every balance change is recorded by a database trigger</li>
        <li>Real-time notifications when money arrives</li>
        <li>Receipts for transfers above 5,000,000 Toman</li>
      </ul>
    </section>
    <section class="panel">
      <div class="card form-card">
        <div class="card-body">
          <h2>{{ title }}</h2>
          <p v-if="subtitle" class="muted subtitle">{{ subtitle }}</p>
          <slot />
        </div>
      </div>
      <slot name="footer" />
    </section>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.intro {
  background: linear-gradient(160deg, #312e81, #4f46e5 60%, #6366f1);
  color: #fff;
  padding: 56px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1.05rem;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.18);
}

.intro h1 {
  font-size: 2rem;
  max-width: 440px;
}

.intro ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
  color: rgba(255, 255, 255, 0.85);
}

.intro li::before {
  content: '✓';
  margin-right: 10px;
  font-weight: 700;
}

.panel {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 16px;
  padding: 40px 20px;
}

.form-card {
  width: min(420px, 100%);
}

.subtitle {
  margin: 4px 0 20px;
}

@media (max-width: 860px) {
  .auth {
    grid-template-columns: 1fr;
  }

  .intro {
    padding: 32px 24px;
  }

  .intro h1 {
    font-size: 1.4rem;
  }
}
</style>
