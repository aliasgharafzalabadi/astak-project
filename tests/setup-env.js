require('dotenv').config({ quiet: true });

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgres://wallet:wallet@localhost:5432/wallet_test',
  REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: 'test-secret-that-is-definitely-longer-than-32-chars',
  JWT_EXPIRES_IN: '1h',
  INITIAL_WALLET_BALANCE: '10000000',
  RECEIPT_THRESHOLD: '5000000',
  MINIO_ENDPOINT: 'localhost',
  MINIO_ACCESS_KEY: 'minioadmin',
  MINIO_SECRET_KEY: 'minioadmin',
  MINIO_PUBLIC_URL: 'http://localhost:9000',
  ADMIN_PASSWORD: 'Admin@12345',
  SEED_DEMO_USERS: 'false',
});
