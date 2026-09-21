-- ==============================================================================
-- TROUVAILLE DATABASE MIGRATION: TRUE MULTI-LEDGER ARCHITECTURE
-- ==============================================================================
-- This script is idempotent (safe to run multiple times).
-- It creates the public.ledgers table and adds ledger_id to public.transactions.
--
-- How to run:
-- 1. Open Supabase Dashboard: https://app.supabase.com
-- 2. Navigate to SQL Editor -> New Query
-- 3. Paste this script and click "Run"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. LEDGERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledgers (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'BookOpen',
    currency TEXT DEFAULT 'IDR',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance index for fast lookup per user
CREATE INDEX IF NOT EXISTS idx_ledgers_user_id 
    ON public.ledgers (user_id, created_at ASC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own ledgers" ON public.ledgers;
    CREATE POLICY "Users can manage their own ledgers" 
        ON public.ledgers FOR ALL 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);
END $$;

-- ------------------------------------------------------------------------------
-- 2. TRANSACTIONS TABLE LEDGER SUPPORT
-- ------------------------------------------------------------------------------
-- Safely add ledger_id column to public.transactions if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'transactions' 
          AND column_name = 'ledger_id'
    ) THEN
        ALTER TABLE public.transactions 
            ADD COLUMN ledger_id TEXT DEFAULT 'personal';
    END IF;
END $$;

-- Performance index for filtered queries by ledger
CREATE INDEX IF NOT EXISTS idx_transactions_user_ledger_date 
    ON public.transactions (user_id, ledger_id, occurred_on DESC);

-- Backfill any existing transactions with null ledger_id to 'personal'
UPDATE public.transactions 
SET ledger_id = 'personal' 
WHERE ledger_id IS NULL;
