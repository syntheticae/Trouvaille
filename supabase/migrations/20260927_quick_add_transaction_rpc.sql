-- ==============================================================================
-- MIGRATION: 20260927_quick_add_transaction_rpc.sql
-- DESCRIPTION: Background RPC endpoint for Apple Shortcuts & Automations
-- PURPOSE: Allows Apple Shortcuts to silently log transactions via "Get Contents of URL"
--          without launching the app, then displays native iOS notification.
-- IDEMPOTENT: Safe to run repeatedly.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.quick_add_transaction(
  p_user_token text,
  p_amount numeric,
  p_category_name text,
  p_wallet_name text,
  p_note text DEFAULT '',
  p_occurred_on date DEFAULT CURRENT_DATE,
  p_type text DEFAULT 'expense',
  p_ledger_id text DEFAULT 'personal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_category_id uuid;
  v_wallet_id uuid;
  v_resolved_cat_name text;
  v_resolved_wal_name text;
  v_tx_id uuid;
BEGIN
  -- 1. Validate user identifier (UUID or email)
  BEGIN
    v_user_id := p_user_token::uuid;
  EXCEPTION WHEN OTHERS THEN
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_user_token)) LIMIT 1;
  END;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token pengguna tidak valid atau pengguna tidak ditemukan'
    );
  END IF;

  -- 2. Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nominal harus lebih besar dari 0'
    );
  END IF;

  -- 3. Match category by name (case-insensitive fuzzy match)
  SELECT id, name INTO v_category_id, v_resolved_cat_name
  FROM public.categories
  WHERE user_id = v_user_id
    AND (
      lower(name) = lower(trim(p_category_name))
      OR lower(name) LIKE '%' || lower(trim(p_category_name)) || '%'
      OR lower(trim(p_category_name)) LIKE '%' || lower(name) || '%'
    )
  ORDER BY (lower(name) = lower(trim(p_category_name))) DESC, created_at ASC
  LIMIT 1;

  -- Fallback to default expense category if not found
  IF v_category_id IS NULL THEN
    SELECT id, name INTO v_category_id, v_resolved_cat_name
    FROM public.categories
    WHERE user_id = v_user_id AND type = coalesce(p_type, 'expense')
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1;
  END IF;

  -- 4. Match wallet by name (case-insensitive fuzzy match)
  SELECT id, name INTO v_wallet_id, v_resolved_wal_name
  FROM public.wallets
  WHERE user_id = v_user_id
    AND (
      lower(name) = lower(trim(p_wallet_name))
      OR lower(name) LIKE '%' || lower(trim(p_wallet_name)) || '%'
      OR lower(trim(p_wallet_name)) LIKE '%' || lower(name) || '%'
    )
  ORDER BY (lower(name) = lower(trim(p_wallet_name))) DESC, created_at ASC
  LIMIT 1;

  -- Fallback to first wallet if not found
  IF v_wallet_id IS NULL THEN
    SELECT id, name INTO v_wallet_id, v_resolved_wal_name
    FROM public.wallets
    WHERE user_id = v_user_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- 5. Insert transaction record
  INSERT INTO public.transactions (
    user_id,
    category_id,
    wallet_id,
    type,
    amount,
    note,
    occurred_on,
    ledger_id
  ) VALUES (
    v_user_id,
    v_category_id,
    v_wallet_id,
    coalesce(p_type, 'expense'),
    p_amount,
    nullif(trim(p_note), ''),
    coalesce(p_occurred_on, CURRENT_DATE),
    coalesce(nullif(trim(p_ledger_id), ''), 'personal')
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'amount', p_amount,
    'category', coalesce(v_resolved_cat_name, p_category_name),
    'wallet', coalesce(v_resolved_wal_name, p_wallet_name),
    'date', coalesce(p_occurred_on, CURRENT_DATE),
    'note', coalesce(p_note, '')
  );
END;
$$;

-- Grant execution to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.quick_add_transaction TO anon, authenticated, service_role;
