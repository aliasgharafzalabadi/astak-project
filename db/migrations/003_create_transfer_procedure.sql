CREATE OR REPLACE PROCEDURE transfer_funds(
  p_from_user_id      BIGINT,
  p_to_user_id        BIGINT,
  p_amount            BIGINT,
  p_description       VARCHAR,
  p_receipt_threshold BIGINT,
  INOUT o_transaction_id UUID DEFAULT NULL,
  INOUT o_receipt_status receipt_status DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet      wallets%ROWTYPE;
  v_from_wallet wallets%ROWTYPE;
  v_to_wallet   wallets%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero' USING ERRCODE = 'WL001';
  END IF;

  IF p_from_user_id = p_to_user_id THEN
    RAISE EXCEPTION 'Cannot transfer funds to the same wallet' USING ERRCODE = 'WL002';
  END IF;

  FOR v_wallet IN
    SELECT *
    FROM wallets
    WHERE user_id IN (p_from_user_id, p_to_user_id)
    ORDER BY id
    FOR UPDATE
  LOOP
    IF v_wallet.user_id = p_from_user_id THEN
      v_from_wallet := v_wallet;
    ELSE
      v_to_wallet := v_wallet;
    END IF;
  END LOOP;

  IF v_from_wallet.id IS NULL THEN
    RAISE EXCEPTION 'Sender wallet not found' USING ERRCODE = 'WL003';
  END IF;

  IF v_to_wallet.id IS NULL THEN
    RAISE EXCEPTION 'Recipient wallet not found' USING ERRCODE = 'WL004';
  END IF;

  IF v_from_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds' USING ERRCODE = 'WL005';
  END IF;

  o_receipt_status := CASE
    WHEN p_amount > p_receipt_threshold THEN 'PENDING'::receipt_status
    ELSE 'NOT_REQUIRED'::receipt_status
  END;

  INSERT INTO transactions (from_wallet_id, to_wallet_id, amount, description, receipt_status)
  VALUES (v_from_wallet.id, v_to_wallet.id, p_amount, p_description, o_receipt_status)
  RETURNING id INTO o_transaction_id;

  PERFORM set_config('app.current_transaction_id', o_transaction_id::TEXT, true);

  UPDATE wallets SET balance = balance - p_amount WHERE id = v_from_wallet.id;
  UPDATE wallets SET balance = balance + p_amount WHERE id = v_to_wallet.id;

  PERFORM set_config('app.current_transaction_id', '', true);
END;
$$;
