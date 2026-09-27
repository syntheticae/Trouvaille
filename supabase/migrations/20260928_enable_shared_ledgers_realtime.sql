-- ==============================================================================
-- TROUVAILLE DATABASE MIGRATION: ENABLE REALTIME ON SHARED LEDGERS & TRANSACTIONS
-- Migration file: supabase/migrations/20260928_enable_shared_ledgers_realtime.sql
-- ==============================================================================
-- Idempotent SQL script to enable Supabase Realtime WebSocket publications
-- for multi-user shared ledgers, members, and collaborative transactions.
--
-- How to run:
-- 1. Open Supabase Dashboard: https://app.supabase.com
-- 2. Select your Trouvaille project
-- 3. Navigate to SQL Editor -> "New Query"
-- 4. Paste this entire script and click "Run"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENSURE ATTRIBUTION COLUMNS EXIST ON TRANSACTIONS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'transactions' 
          AND column_name = 'created_by_name'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN created_by_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'transactions' 
          AND column_name = 'created_by_user_id'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN created_by_user_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'transactions' 
          AND column_name = 'ledger_id'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN ledger_id TEXT DEFAULT 'personal';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ADD TABLES TO SUPABASE_REALTIME PUBLICATION
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Enable realtime for transactions
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;

    -- Enable realtime for ledgers
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'ledgers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ledgers;
    END IF;

    -- Enable realtime for ledger_members
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'ledger_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_members;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. SET REPLICA IDENTITY FULL
-- Guarantees that UPDATE and DELETE payloads contain complete record data
-- so WebSocket subscribers can immediately update their local query caches.
-- ------------------------------------------------------------------------------
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.ledgers REPLICA IDENTITY FULL;
ALTER TABLE public.ledger_members REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES FOR REALTIME QUERIES & SUBSCRIPTIONS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_ledger_id 
    ON public.transactions (ledger_id);

CREATE INDEX IF NOT EXISTS idx_transactions_created_by_user_id 
    ON public.transactions (created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_ledger_members_ledger_user 
    ON public.ledger_members (ledger_id, user_id);

-- ------------------------------------------------------------------------------
-- VERIFICATION OUTPUT
-- ------------------------------------------------------------------------------
SELECT 
    schemaname,
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
