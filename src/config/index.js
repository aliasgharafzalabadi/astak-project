require('dotenv').config({ quiet: true });
const { z } = require('zod');

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(5000),

  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),

  INITIAL_WALLET_BALANCE: z.coerce.number().int().nonnegative().default(10000000),
  RECEIPT_THRESHOLD: z.coerce.number().int().nonnegative().default(5000000),
  RECEIPT_JOB_ATTEMPTS: z.coerce.number().int().positive().default(5),
  RECEIPT_JOB_BACKOFF_MS: z.coerce.number().int().positive().default(2000),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),

  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: booleanString,
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(3).default('receipts'),
  MINIO_REGION: z.string().default('us-east-1'),
  MINIO_PUBLIC_URL: z.string().url(),
  RECEIPT_URL_EXPIRY_SECONDS: z.coerce.number().int().positive().max(604800).default(604800),

  ADMIN_USERNAME: z.string().min(3).default('admin'),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_FULL_NAME: z.string().min(1).default('System Administrator'),
  SEED_DEMO_USERS: booleanString,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
}

const env = parsed.data;
const publicUrl = new URL(env.MINIO_PUBLIC_URL);

module.exports = Object.freeze({
  env: env.NODE_ENV,
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  db: {
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  },
  redis: {
    url: env.REDIS_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  wallet: {
    initialBalance: env.INITIAL_WALLET_BALANCE,
  },
  receipt: {
    threshold: env.RECEIPT_THRESHOLD,
    jobAttempts: env.RECEIPT_JOB_ATTEMPTS,
    jobBackoffMs: env.RECEIPT_JOB_BACKOFF_MS,
    workerConcurrency: env.WORKER_CONCURRENCY,
    urlExpirySeconds: env.RECEIPT_URL_EXPIRY_SECONDS,
  },
  minio: {
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    useSSL: env.MINIO_USE_SSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    bucket: env.MINIO_BUCKET,
    region: env.MINIO_REGION,
    public: {
      endPoint: publicUrl.hostname,
      port: Number(publicUrl.port) || (publicUrl.protocol === 'https:' ? 443 : 80),
      useSSL: publicUrl.protocol === 'https:',
    },
  },
  seed: {
    adminUsername: env.ADMIN_USERNAME,
    adminPassword: env.ADMIN_PASSWORD,
    adminFullName: env.ADMIN_FULL_NAME,
    demoUsers: env.SEED_DEMO_USERS,
  },
});
