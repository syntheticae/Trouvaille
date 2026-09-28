-- ==============================================================================
-- TROUVAILLE SUPABASE DATABASE OPTIMIZATION & RPC HARDENING
-- Migration: 20260928_optimize_indexes_and_harden_rpc.sql
-- Description:
-- 1. Adds missing B-Tree indexes on holdings and user_shortcuts foreign keys
-- 2. Revokes EXECUTE privileges from PUBLIC and anon on sensitive RPC functions
-- 3. Sets DEFAULT PRIVILEGES to prevent future public functions from being auto-exposed to anon
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. OPTIMIZE FOREIGN KEY INDEXES (QUERY ACCELERATION)
-- ------------------------------------------------------------------------------
-- Index for holdings -> wallet_id
CREATE INDEX IF NOT EXISTS idx_holdings_wallet_id 
ON public.holdings(wallet_id);

-- Indexes for user_shortcuts -> user_id, category_id, wallet_id
CREATE INDEX IF NOT EXISTS idx_user_shortcuts_user_id 
ON public.user_shortcuts(user_id);

CREATE INDEX IF NOT EXISTS idx_user_shortcuts_category_id 
ON public.user_shortcuts(category_id);

CREATE INDEX IF NOT EXISTS idx_user_shortcuts_wallet_id 
ON public.user_shortcuts(wallet_id);


-- ------------------------------------------------------------------------------
-- 2. HARDEN RPC FUNCTION EXECUTION PRIVILEGES (REVOKE ANON & PUBLIC ACCESS)
-- ------------------------------------------------------------------------------
-- In PostgreSQL, anon inherits from PUBLIC. To completely lock out unauthenticated
-- callers, execute rights must be revoked from both PUBLIC and anon.

-- Helper functions for ledger RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_edit_ledger') THEN
    REVOKE EXECUTE ON FUNCTION public.can_edit_ledger(TEXT, UUID) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.can_edit_ledger(TEXT, UUID) TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_ledger_member') THEN
    REVOKE EXECUTE ON FUNCTION public.is_ledger_member(TEXT, UUID) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.is_ledger_member(TEXT, UUID) TO authenticated, service_role;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_user_account') THEN
    REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated, service_role;
  END IF;
END $$;

-- Quick add transaction RPC (if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'quick_add_transaction') THEN
    REVOKE EXECUTE ON FUNCTION public.quick_add_transaction(TEXT, NUMERIC, TEXT, TEXT, TEXT, DATE, TEXT, TEXT) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.quick_add_transaction(TEXT, NUMERIC, TEXT, TEXT, TEXT, DATE, TEXT, TEXT) TO authenticated, service_role;
  END IF;
END $$;

-- Ensure future functions in public schema do not auto-grant execute to anon
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
