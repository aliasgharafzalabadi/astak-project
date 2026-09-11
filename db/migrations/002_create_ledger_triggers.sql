CREATE OR REPLACE FUNCTION fn_wallet_balance_ledger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.balance > 0 THEN
      INSERT INTO transaction_ledger (wallet_id, transaction_id, entry_type, amount, balance_before, balance_after)
      VALUES (NEW.id, NULL, 'OPENING', NEW.balance, 0, NEW.balance);
    END IF;
    RETURN NEW;
  END IF;

  v_transaction_id := NULLIF(current_setting('app.current_transaction_id', true), '')::UUID;

  IF v_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Wallet % balance can only be changed by transfer_funds', NEW.id
      USING ERRCODE = 'WL006';
  END IF;

  INSERT INTO transaction_ledger (wallet_id, transaction_id, entry_type, amount, balance_before, balance_after)
  VALUES (
    NEW.id,
    v_transaction_id,
    CASE WHEN NEW.balance < OLD.balance THEN 'DEBIT'::ledger_entry_type ELSE 'CREDIT'::ledger_entry_type END,
    abs(NEW.balance - OLD.balance),
    OLD.balance,
    NEW.balance
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wallet_opening_ledger
  AFTER INSERT ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION fn_wallet_balance_ledger();

CREATE TRIGGER trg_wallet_balance_ledger
  AFTER UPDATE OF balance ON wallets
  FOR EACH ROW
  WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
  EXECUTE FUNCTION fn_wallet_balance_ledger();

CREATE OR REPLACE FUNCTION fn_ledger_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'transaction_ledger is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'WL007';
END;
$$;

CREATE TRIGGER trg_ledger_append_only
  BEFORE UPDATE OR DELETE ON transaction_ledger
  FOR EACH ROW
  EXECUTE FUNCTION fn_ledger_append_only();
