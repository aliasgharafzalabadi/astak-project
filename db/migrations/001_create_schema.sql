CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE receipt_status AS ENUM ('NOT_REQUIRED', 'PENDING', 'GENERATED', 'FAILED');
CREATE TYPE ledger_entry_type AS ENUM ('OPENING', 'DEBIT', 'CREDIT');

CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL,
  password_hash TEXT         NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'USER',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT users_username_key UNIQUE (username),
  CONSTRAINT users_username_format_chk CHECK (username ~ '^[a-z0-9_]{3,50}$'),
  CONSTRAINT users_full_name_not_blank_chk CHECK (length(btrim(full_name)) > 0)
);

CREATE TABLE wallets (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT      NOT NULL,
  balance    BIGINT      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallets_user_id_key UNIQUE (user_id),
  CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT wallets_balance_non_negative_chk CHECK (balance >= 0)
);

CREATE TABLE transactions (
  id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  from_wallet_id     BIGINT         NOT NULL,
  to_wallet_id       BIGINT         NOT NULL,
  amount             BIGINT         NOT NULL,
  description        VARCHAR(255),
  receipt_status     receipt_status NOT NULL DEFAULT 'NOT_REQUIRED',
  receipt_url        TEXT,
  receipt_object_key TEXT,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT transactions_from_wallet_fkey FOREIGN KEY (from_wallet_id) REFERENCES wallets (id) ON DELETE RESTRICT,
  CONSTRAINT transactions_to_wallet_fkey FOREIGN KEY (to_wallet_id) REFERENCES wallets (id) ON DELETE RESTRICT,
  CONSTRAINT transactions_amount_positive_chk CHECK (amount > 0),
  CONSTRAINT transactions_distinct_wallets_chk CHECK (from_wallet_id <> to_wallet_id),
  CONSTRAINT transactions_receipt_consistency_chk CHECK (
    (receipt_status = 'GENERATED') = (receipt_url IS NOT NULL AND receipt_object_key IS NOT NULL)
  )
);

CREATE TABLE transaction_ledger (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_id      BIGINT            NOT NULL,
  transaction_id UUID,
  entry_type     ledger_entry_type NOT NULL,
  amount         BIGINT            NOT NULL,
  balance_before BIGINT            NOT NULL,
  balance_after  BIGINT            NOT NULL,
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT now(),
  CONSTRAINT ledger_wallet_fkey FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE RESTRICT,
  CONSTRAINT ledger_transaction_fkey FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE RESTRICT,
  CONSTRAINT ledger_transaction_wallet_key UNIQUE (transaction_id, wallet_id),
  CONSTRAINT ledger_amount_positive_chk CHECK (amount > 0),
  CONSTRAINT ledger_balance_non_negative_chk CHECK (balance_before >= 0 AND balance_after >= 0),
  CONSTRAINT ledger_transaction_required_chk CHECK (transaction_id IS NOT NULL OR entry_type = 'OPENING'),
  CONSTRAINT ledger_arithmetic_chk CHECK (
    (entry_type = 'DEBIT'   AND balance_after = balance_before - amount) OR
    (entry_type = 'CREDIT'  AND balance_after = balance_before + amount) OR
    (entry_type = 'OPENING' AND balance_before = 0 AND balance_after = amount)
  )
);

CREATE INDEX transactions_from_wallet_created_idx ON transactions (from_wallet_id, created_at DESC);
CREATE INDEX transactions_to_wallet_created_idx   ON transactions (to_wallet_id, created_at DESC);
CREATE INDEX transactions_created_idx             ON transactions (created_at DESC);
CREATE INDEX transactions_pending_receipt_idx     ON transactions (created_at) WHERE receipt_status = 'PENDING';
CREATE INDEX ledger_wallet_created_idx            ON transaction_ledger (wallet_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
