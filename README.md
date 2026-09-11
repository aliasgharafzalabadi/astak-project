# Digital Wallet API

A money transfer API built with **pure Node.js / Express** and **raw PostgreSQL**. It uses no ORM and no NestJS.

- **Transfers** run inside a PostgreSQL **stored procedure** (`transfer_funds`). It uses row-level locks with a fixed lock order, so there are no race conditions and no deadlocks.
- **The ledger** (`transaction_ledger`) is written **only by a PostgreSQL trigger**. Node.js never inserts into it.
- **Real-time notifications** use **Socket.io**: the recipient gets the amount and the sender's name.
- **Receipts**: transfers above 5,000,000 Toman enqueue a **BullMQ** job. A **separate worker** builds a text receipt, uploads it to **MinIO**, and stores the download link on the transaction.
- **Tooling:** Swagger docs, Jest unit and integration tests (including concurrency tests), and the whole stack runs with Docker Compose.
- **Frontend:** a Vue 3 web client (`frontend/`) for trying every flow in a browser.

> 🇮🇷 **[توضیحات فارسی پروژه](#persian)**

---

## Quick start

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Web app (Vue 3) | http://localhost:8080 |
| API | http://localhost:3000 |
| Swagger UI | http://localhost:3000/api-docs |
| Health check | http://localhost:3000/health |
| MinIO console | http://localhost:9001 (`minioadmin` / `minioadmin`) |

On the first start, the one-shot `migrate` service runs these steps before `app` and `worker` start:
- creates the tables, constraints, indexes, triggers and the stored procedure
- seeds the accounts below

### Seeded accounts

| Username | Password | Role | Balance (Toman) |
|---|---|---|---|
| `admin` | `Admin@12345` | ADMIN | 0 |
| `ali` | `Password@123` | USER | 20,000,000 |
| `sara` | `Password@123` | USER | 5,000,000 |

New users registered through `POST /api/auth/register` start with `INITIAL_WALLET_BALANCE` (10,000,000 Toman by default).

> **Tip:** if `registry.npmjs.org` is slow or blocked on your network, build through a mirror:
> `NPM_REGISTRY=https://mirror-npm.runflare.com/ docker-compose up --build`.
> If a host port is already taken, override it, e.g. `POSTGRES_HOST_PORT=5433` or `APP_HOST_PORT=3001`.
> Docker Compose also reads these variables from a local `.env` file.

### Development vs production

Both environments share `docker-compose.yml`. Development adds `docker-compose.dev.yml` on top of it.

| | Production (`npm run docker:prod`) | Development (`npm run docker:dev`) |
|---|---|---|
| Command | `docker-compose up --build` | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` |
| API image | `production` stage: prod dependencies only, runs as the non-root `node` user | `development` stage: all dependencies, `nodemon` reloads on source changes |
| Source code | Baked into the image | `src/`, `db/`, `docs/`, `tests/` bind-mounted from the host |
| Frontend | Built assets served by **nginx** on `:8080`, which proxies `/api` and `/socket.io` to the API | **Vite dev server** with HMR on `:5173` |
| Debugging | — | Node inspector on `:9229` (API) and `:9230` (worker) |
| Logging | `info` | `debug` |

File watching uses polling (`nodemon --legacy-watch`, Vite `usePolling`), because file-change events are not forwarded from Windows and macOS hosts into bind mounts. In the dev stack, tests can run inside the container: `docker compose exec app npm run test:unit`.

---

## Try it

```bash
# 1. Login
TOKEN=$(curl -s localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"ali","password":"Password@123"}' | jq -r .accessToken)

# 2. Send 6,000,000 Toman to sara (user id 3). This is above the threshold, so a receipt is generated.
curl -s localhost:3000/api/transfers -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"toUserId":3,"amount":6000000,"description":"Rent"}'

# 3. A moment later, the worker has uploaded the receipt: receiptStatus = GENERATED and receiptUrl is set
curl -s localhost:3000/api/transactions -H "Authorization: Bearer $TOKEN"

# 4. Ledger rows written by the trigger
curl -s localhost:3000/api/wallets/me/ledger -H "Authorization: Bearer $TOKEN"
```

Listening for notifications (sara):

```js
const { io } = require('socket.io-client');
const socket = io('http://localhost:3000', { auth: { token: SARA_TOKEN } });
socket.on('transfer:received', (n) => console.log(`${n.amount} Toman from ${n.sender.fullName}`));
```

### Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Register; creates a wallet with the initial balance |
| POST | `/api/auth/login` | public | Returns a JWT |
| GET | `/api/users/:username` | user | Look up a recipient (`id`, `username`, `fullName`) |
| GET | `/api/wallets/me` | user | Current balance |
| GET | `/api/wallets/me/ledger` | user | Ledger entries of the current wallet |
| POST | `/api/transfers` | user | Transfer `{ toUserId, amount, description? }`; the sender is always taken from the JWT |
| GET | `/api/transactions` | user | Transactions the user sent or received (paginated) |
| GET | `/api/transactions/:id` | participant / admin | Single transaction |
| GET | `/api/transactions/:id/receipt` | participant / admin | 302 redirect to a fresh presigned receipt URL |
| GET | `/api/admin/transactions` | **admin only** | Every transaction in the system (paginated) |

Errors always use the same shape: `{ "error": { "code": "INSUFFICIENT_FUNDS", "message": "...", "details"?: [...] } }`.

---

## Architecture

```
            ┌──────────────── docker-compose ─────────────────────────────────────┐
 client ──► │  app (Express + Socket.io)                                          │
   ▲        │   Router → Controller → Service → Repository ──pg Pool──► PostgreSQL│
   │        │                │                                   CALL transfer_funds()
   │ socket │                │ after COMMIT                        └► trigger → transaction_ledger
   └─────── │  notifier ◄────┤                                                    │
            │                └► BullMQ queue ──► Redis ◄── worker (separate process)
            │                                              │ build receipt
            │                                              ├► MinIO (receipts bucket)
            │                                              └► UPDATE transactions.receipt_url
            └─────────────────────────────────────────────────────────────────────┘
```

### Frontend (`frontend/`)

A Vue 3 client built with Vite, Vue Router, Pinia and socket.io-client:

- **Login and registration**, with one-click demo accounts.
- **Dashboard:**
  - balance card
  - transfer form: looks up the recipient by username, formats the amount, and warns before overdraft and when a receipt will be generated
  - recent activity
- **Transactions, ledger, and admin** pages (the admin page is shown to the ADMIN role only).
- **Live notifications:** a `transfer:received` event shows a toast and refreshes the balance and lists. The header shows the socket status.
- **Receipts:** while a receipt is `PENDING`, the lists refresh every 2 seconds until the download link appears.
- **Session handling:** an expired or invalid token (over HTTP or the socket) signs the user out.

To run it locally against a running API: `cd frontend && npm install && npm run dev`, then open http://localhost:5173. Vite proxies `/api` and `/socket.io` to `VITE_API_TARGET` (default `http://localhost:3000`).

### Project layout

```
db/migrations/           Plain SQL migrations (schema, triggers, stored procedure)
docs/                    OpenAPI spec and database design (ERD)
src/
  config/                Environment validation (zod), one frozen config object
  db/                    pg Pool + withTransaction helper, migration runner, seeder
  routes/                Express routers: URL, middleware chain, controller
  controllers/           HTTP in/out only
  services/              Business rules (auth, transfer, transactions, notifications, receipt text)
  repositories/          The only place SQL lives
  middlewares/           authenticate (JWT), authorize (roles), validate (zod), error handler
  sockets/               Socket.io server: JWT handshake, per-user rooms, session expiry
  queues/                BullMQ producer
  storage/               MinIO client (upload + presigned URLs)
  workers/               Receipt job processor, failure handler, pending-receipt recovery
  container.js           Composition root: wires everything with dependency injection
  app.js / server.js     Express app factory / HTTP + Socket.io entry point
  worker.js              Worker entry point
tests/unit               Services, middlewares, worker, error mapping (no I/O)
tests/integration        Real PostgreSQL + Supertest + socket.io-client
frontend/                Vue 3 client (views, components, Pinia stores, API client, nginx config)
docker-compose.yml       Production stack
docker-compose.dev.yml   Development overrides (hot reload, debugger, Vite dev server)
```

The layers use factory functions and constructor-style dependency injection, e.g. `createTransferService({ transactionRepository, receiptQueue, notifier })`. This keeps every layer testable without module mocking, and `container.js` is the single place where the real implementations are wired together.

---

## Database

The full ERD and the column-by-column design are in [`docs/database-design.md`](docs/database-design.md).

| Table | Purpose |
|---|---|
| `users` | Credentials (bcrypt) and role (`USER` / `ADMIN`) |
| `wallets` | One wallet per user (`UNIQUE(user_id)`), `CHECK (balance >= 0)` |
| `transactions` | One row per transfer, plus receipt status, URL and object key |
| `transaction_ledger` | Append-only statement: one row per balance change, written by the trigger |
| `schema_migrations` | Applied migration files |

Data integrity is enforced **in the database**, not only in code. The main constraints are:
- amount must be positive
- no self-transfer
- balance can never be negative
- the ledger arithmetic must hold: `balance_after = balance_before ± amount`
- `GENERATED` ⇔ the receipt URL exists
- at most one ledger row per wallet per transaction

The foreign keys use `ON DELETE RESTRICT`, because financial history must never disappear.

### Stored procedure: `transfer_funds`

```sql
CALL transfer_funds(from_user_id, to_user_id, amount, description, receipt_threshold, NULL, NULL);
-- INOUT outputs: o_transaction_id, o_receipt_status
```

1. Validates the amount and rejects self-transfers.
2. Locks **both** wallet rows in one statement with `ORDER BY id FOR UPDATE`.
   - Every transfer locks wallets in the same (ascending id) order, so two opposite transfers (A→B and B→A) can never deadlock.
   - Under `READ COMMITTED`, a transaction that waited on the lock re-reads the latest balance, so a balance cannot be spent twice.
3. Raises custom SQLSTATEs, which the Node error handler maps to HTTP responses:

   | SQLSTATE | Meaning | HTTP |
   |---|---|---|
   | `WL001` | invalid amount | 400 |
   | `WL002` | self-transfer | 400 |
   | `WL003` | sender wallet missing | 404 |
   | `WL004` | recipient missing | 404 |
   | `WL005` | insufficient funds | 422 |

4. Inserts the `transactions` row. `receipt_status` is `PENDING` when the amount is above the threshold.
5. Runs `set_config('app.current_transaction_id', <id>, true)`, then updates both balances.
6. Does not `COMMIT` itself. The `CALL` is a single autocommitted statement, so the whole transfer is atomic.

### How the triggers work

| Trigger | When | What it does |
|---|---|---|
| `trg_wallet_opening_ledger` | `AFTER INSERT ON wallets` | Writes an `OPENING` ledger row for the initial balance |
| `trg_wallet_balance_ledger` | `AFTER UPDATE OF balance ON wallets` (only when the balance actually changes) | Writes a `DEBIT` or `CREDIT` row with `balance_before` / `balance_after` |
| `trg_ledger_append_only` | `BEFORE UPDATE OR DELETE ON transaction_ledger` | Raises `WL007`: the ledger is immutable |
| `trg_*_updated_at` | `BEFORE UPDATE` | Maintains `updated_at` |

**How does the trigger know which transaction caused the balance change?**

A trigger only sees `OLD` and `NEW` wallet rows. So the procedure publishes the transaction id in a **transaction-scoped setting**, and the trigger reads it:
- the procedure sets it with `set_config(..., true)`
- the trigger reads it with `current_setting('app.current_transaction_id', true)`

Because the setting is scoped to the transaction, it disappears on commit or rollback and never leaks to other connections. If the trigger finds no id, the balance was changed outside `transfer_funds`, so it raises `WL006`. As a result, any balance change without a matching transaction is rejected by the database itself.

A transfer therefore always produces exactly one `transactions` row and two ledger rows. After every operation this invariant holds, and the integration tests check it:

```
wallets.balance == last balance_after for the wallet == sum(CREDIT + OPENING) - sum(DEBIT)
```

---

## Background jobs (BullMQ)

- **Producer:** after the procedure commits, `transferService` enqueues `generate-receipt` jobs.
  - `jobId = transactionId`, so a transaction can never produce duplicate jobs.
  - `attempts: 5` with exponential backoff.
  - Completed jobs are cleaned up after 24 hours; failed jobs are kept for 7 days.
- **Worker:** a separate container (`node src/worker.js`, same image) with configurable concurrency. It:
  1. loads the transaction
  2. builds the text receipt
  3. uploads it to `receipts/<transactionId>.txt` in MinIO
  4. stores `receipt_object_key`, `receipt_url` and `receipt_status = GENERATED`
- **Idempotency:** the object key is deterministic, and already-generated receipts are skipped. A retry never creates duplicates.
- **Failures:**
  - Transient errors (e.g. MinIO down) are retried with backoff.
  - A missing transaction is an `UnrecoverableError`, so it is not retried.
  - After the last attempt, the receipt is marked `FAILED`.
- **Dual-write safety:** the transfer commits in PostgreSQL before the job is added to Redis. If Redis is unavailable at that moment:
  - the transfer still succeeds, and the receipt stays `PENDING`
  - every minute, the worker scans for `PENDING` receipts older than 60 seconds (using a partial index) and re-enqueues them

## Object storage (MinIO)

- The worker creates the bucket on startup if it is missing.
- Receipts stay **private**. The stored `receipt_url` is a presigned link, valid for up to 7 days (`RECEIPT_URL_EXPIRY_SECONDS`).
- The link is signed for `MINIO_PUBLIC_URL`, so it works from the host machine and not only inside the Docker network.
- `GET /api/transactions/:id/receipt` always issues a fresh presigned URL, after checking that the caller is a participant or an admin.

## Real-time notifications and sessions (Socket.io)

- **Handshake:** authenticated with the same JWT, passed as `auth.token` or an `Authorization: Bearer` header. An invalid token is rejected with a `connect_error` whose `data.code` is `INVALID_TOKEN` or `TOKEN_EXPIRED`.
- **Rooms:** each socket joins `user:<id>`. A user with several tabs or devices receives every notification on each of them.
- **Session expiry:** a server-side timer emits `session:expired` and disconnects the socket at the token's expiry time. An expired token cannot keep an old socket alive.
- **Scaling:** the `@socket.io/redis-adapter` is enabled, so running several `app` replicas still delivers events to the right user.
- **Delivery timing:** notifications are emitted only **after** the database commit. A failed notification never fails the transfer.

---

## Testing

```bash
npm install
npm run test:unit                          # no infrastructure needed

docker-compose up -d postgres              # creates the wallet_test database on first start
npm run test:integration                   # TEST_DATABASE_URL overrides the default connection
```

- **Unit tests:**
  - JWT and role middlewares
  - auth service (hashing, rollback, credential errors)
  - transfer service (enqueue rules, notifications, failure isolation)
  - transaction access control and pagination
  - receipt worker (idempotency, retry semantics)
  - SQLSTATE → HTTP mapping
- **Integration tests** (real PostgreSQL):
  - the transfer endpoint end to end, including balances, ledger rows, receipt threshold and every error case
  - **concurrency:**
    - 25 parallel transfers against a balance that covers only 10 → exactly 10 succeed and the balance ends at 0
    - opposite-direction transfers → no deadlocks and money is conserved
    - the ledger/balance invariant holds
  - database guarantees: `WL006`, `WL007`, CHECK constraints
  - history endpoints and admin-only access
  - auth flow
  - Socket.io delivery to several sessions, and rejection of unauthenticated sockets

---

## Configuration

All settings come from environment variables and are validated at startup. See [`.env.example`](.env.example). The key ones:

| Variable | Default | Description |
|---|---|---|
| `RECEIPT_THRESHOLD` | `5000000` | Transfers **above** this amount (Toman) get a receipt |
| `INITIAL_WALLET_BALANCE` | `10000000` | Balance of newly registered users |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | — / `1h` | Token signing |
| `DB_POOL_MAX` | `10` | pg pool size per process |
| `RECEIPT_JOB_ATTEMPTS` / `RECEIPT_JOB_BACKOFF_MS` | `5` / `2000` | Retry policy |
| `WORKER_CONCURRENCY` | `5` | Parallel receipt jobs per worker |
| `MINIO_PUBLIC_URL` | `http://localhost:9000` | Host used to sign download links |

## Design decisions and assumptions

| Decision | Reason |
|---|---|
| Money is stored as `BIGINT` Toman | No floating-point rounding. The `pg` parser converts `BIGINT` to `Number` and throws if the value exceeds `MAX_SAFE_INTEGER`. |
| The API identifies recipients by `toUserId` | Wallets are an internal detail. |
| Transfer ids are UUIDs | They are not enumerable, and the same id is reused as the BullMQ `jobId` and the MinIO object key. |
| Plain SQL migration runner | Uses `schema_migrations` and a PostgreSQL advisory lock, so parallel starts are safe. Unlike `docker-entrypoint-initdb.d`, it also applies new migrations to an existing volume. |
| A registration endpoint exists | The task only mentions login, so a minimal `register` was added. |
| Seeded admin | The admin account is created by the seed, not through the API. |
| Unknown and non-participant transactions return 404 | Returning 403 would reveal that the transaction exists. |

### Possible next steps

- `Idempotency-Key` header on transfers, so clients can safely retry
- rate limiting on login
- refresh tokens
- keyset pagination for very large histories
- a PDF receipt instead of plain text

---

<a id="persian"></a>

<div dir="rtl">

## توضیحات فارسی

### معرفی پروژه

این پروژه یک سیستم **کیف پول دیجیتال و انتقال وجه** است که با **Node.js / Express خالص** و **PostgreSQL بدون ORM** نوشته شده است. کاربران می‌توانند به یکدیگر پول منتقل کنند، وضعیت تراکنش‌ها را به‌صورت لحظه‌ای ببینند و برای انتقال‌های بزرگ رسید دریافت کنند.

### اجرای پروژه

- **Production:** دستور `docker-compose up --build`، که کل استک را بالا می‌آورد: API، Worker، PostgreSQL، Redis، MinIO و فرانت.
- **Development:** دستور `npm run docker:dev`. در این حالت:
  - بک‌اند با nodemon بعد از هر تغییر کد خودش ری‌استارت می‌شود.
  - فرانت با Vite و HMR اجرا می‌شود و تغییرات بدون رفرش در مرورگر اعمال می‌شوند.
  - دیباگر Node روی پورت‌های `9229` و `9230` در دسترس است.

| سرویس | آدرس |
|---|---|
| وب‌اپ (Vue 3) | `http://localhost:8080` (در حالت dev: `5173`) |
| API | `http://localhost:3000` |
| مستندات Swagger | `http://localhost:3000/api-docs` |
| کنسول MinIO | `http://localhost:9001` |

**حساب‌های آماده:** `admin / Admin@12345`، `ali / Password@123` و `sara / Password@123`.

### ساختار دیتابیس

| جدول | کاربرد |
|---|---|
| `users` | کاربران، پسورد هش‌شده با bcrypt، و نقش (`USER` یا `ADMIN`) |
| `wallets` | هر کاربر دقیقاً یک کیف پول دارد. موجودی هیچ‌وقت منفی نمی‌شود (`CHECK`). |
| `transactions` | برای هر انتقال یک ردیف، به‌همراه وضعیت و لینک رسید |
| `transaction_ledger` | گردش حساب: یک ردیف برای هر تغییر موجودی. **فقط Trigger در آن می‌نویسد** و قابل ویرایش یا حذف نیست. |

قوانین داده در **خود دیتابیس** اعمال می‌شوند، نه فقط در کد:
- مبلغ باید مثبت باشد و انتقال به خود ممنوع است.
- موجودی نمی‌تواند منفی شود.
- حساب هر ردیف ledger باید درست باشد: `balance_after = balance_before ± amount`.
- وضعیت `GENERATED` یعنی لینک رسید حتماً وجود دارد.
- کلیدهای خارجی `ON DELETE RESTRICT` هستند، چون سابقه مالی نباید پاک شود.

### Stored Procedure: `transfer_funds`

کل منطق انتقال وجه داخل دیتابیس اجرا می‌شود:

1. مبلغ و فرستنده/گیرنده را اعتبارسنجی می‌کند.
2. ردیف هر دو کیف پول را با `SELECT ... ORDER BY id FOR UPDATE` قفل می‌کند.
   - **قفل ردیف** جلوی Race Condition را می‌گیرد: یک موجودی هیچ‌وقت دو بار خرج نمی‌شود.
   - **ترتیب ثابت قفل‌ها** (بر اساس id) جلوی Deadlock را می‌گیرد: دو انتقال همزمان در دو جهت (A→B و B→A) هیچ‌وقت منتظر یکدیگر گیر نمی‌کنند.
3. در صورت خطا (موجودی ناکافی، گیرنده نامعتبر، ...) کد خطای اختصاصی (`WL001` تا `WL005`) برمی‌گرداند. این کدها در Node به کد HTTP مناسب تبدیل می‌شوند.
4. تراکنش را ثبت می‌کند، شناسه آن را در یک متغیر session قرار می‌دهد، و بعد موجودی‌ها را تغییر می‌دهد.

### Triggerها

- **`trg_wallet_balance_ledger`:** با هر تغییر موجودی، یک ردیف `DEBIT` یا `CREDIT` در ledger ثبت می‌کند. شناسه تراکنش را از همان متغیر session می‌خواند. اگر موجودی خارج از `transfer_funds` تغییر کند، خطا می‌دهد.
- **`trg_wallet_opening_ledger`:** برای موجودی اولیه یک ردیف `OPENING` ثبت می‌کند.
- **`trg_ledger_append_only`:** جلوی هر UPDATE و DELETE روی ledger را می‌گیرد.

### معماری کد

لایه‌بندی پروژه: `Router ← Controller ← Service ← Repository`.

- **Controller:** فقط ورودی و خروجی HTTP.
- **Service:** منطق کسب‌وکار.
- **Repository:** تنها جایی که SQL نوشته شده.
- **Middlewareها:** بررسی JWT، کنترل نقش، اعتبارسنجی ورودی با zod، و مدیریت یکپارچه خطا.
- **Dependency Injection:** همه لایه‌ها در `src/container.js` به هم وصل می‌شوند. به همین دلیل تست‌ها بدون mock کردن ماژول‌ها نوشته شده‌اند.

### پردازش پس‌زمینه و ذخیره فایل

- اگر مبلغ انتقال **بیشتر از ۵ میلیون تومان** باشد، یک Job در **BullMQ** ساخته می‌شود.
- یک **Worker مجزا**:
  1. رسید متنی را می‌سازد.
  2. آن را در **MinIO** آپلود می‌کند.
  3. لینک دانلود را در دیتابیس ذخیره می‌کند.
- **Retry:** در صورت خطا (مثلاً MinIO در دسترس نباشد) تا ۵ بار با فاصله‌ای که هر بار بیشتر می‌شود (backoff نمایی) دوباره تلاش می‌کند.
- **جلوگیری از رسید تکراری:** شناسه Job همان شناسه تراکنش است.
- **رسیدهای جامانده:** اگر Redis درست لحظه ثبت تراکنش در دسترس نباشد، Worker هر دقیقه رسیدهای معلق را پیدا می‌کند و دوباره در صف می‌گذارد.

### اطلاع‌رسانی لحظه‌ای

- اتصال Socket.io با همان JWT احراز هویت می‌شود.
- هر کاربر عضو room مخصوص خودش است، پس اعلان به همه تب‌ها و دستگاه‌هایش می‌رسد.
- گیرنده بلافاصله بعد از ثبت تراکنش، اعلانی شامل **مبلغ و نام فرستنده** می‌گیرد.
- با منقضی شدن توکن، نشست Socket هم بسته می‌شود.

### فرانت‌اند

فرانت با **Vue 3 + Vite + Pinia + Vue Router** نوشته شده و این بخش‌ها را دارد:
- ورود و ثبت‌نام
- داشبورد با موجودی و فرم انتقال وجه (جستجوی گیرنده با username)
- تاریخچه تراکنش‌ها و گردش حساب (ledger)
- صفحه مخصوص ادمین
- نمایش لحظه‌ای اعلان‌ها و وضعیت رسیدها

### تست‌ها

- **Unit:** منطق سرویس‌ها، middlewareها، Worker و تبدیل خطاها.
- **Integration:** روی PostgreSQL واقعی. مهم‌ترین تست‌ها:
  - **همزمانی:** ۲۵ انتقال همزمان از کیف پولی که فقط برای ۱۰ انتقال موجودی دارد. دقیقاً ۱۰ تا موفق می‌شوند و موجودی به صفر می‌رسد.
  - **Deadlock:** انتقال‌های همزمان در دو جهت مخالف انجام می‌شوند، بدون Deadlock و با ثابت ماندن جمع کل پول.
  - **سازگاری ledger:** آخرین `balance_after` هر کیف پول همیشه با موجودی آن برابر است.

</div>
