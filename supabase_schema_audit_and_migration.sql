-- ==============================================================================
-- TROUVAILLE SUPABASE DATABASE SCHEMA AUDIT & MIGRATION SCRIPT
-- ==============================================================================
-- This script is idempotent (safe to run multiple times).
-- It ensures that all required tables, columns, indexes, foreign keys, and RLS
-- policies are properly configured for Trouvaille.
--
-- How to run:
-- 1. Open your Supabase Dashboard: https://app.supabase.com
-- 2. Navigate to SQL Editor -> New Query
-- 3. Paste this script and click "Run"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. WALLETS TABLE & CLASSIFICATION SUPPORT
-- ------------------------------------------------------------------------------
-- Ensure wallets table exists
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure classification column exists (liquid, investment, credit, loan, receivable)
-- This column enables multi-device synchronization so laptop and mobile phone always match.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'wallets' 
          AND column_name = 'classification'
    ) THEN
        ALTER TABLE public.wallets ADD COLUMN classification TEXT DEFAULT 'liquid';
    END IF;
END $$;

-- Automatically backfill appropriate classifications for default/existing wallets
UPDATE public.wallets 
SET classification = 'investment' 
WHERE classification = 'liquid' AND LOWER(name) IN ('saham', 'crypto', 'investasi', 'reksadana', 'deposito', 'stock', 'emas');

UPDATE public.wallets 
SET classification = 'receivable' 
WHERE classification = 'liquid' AND LOWER(name) IN ('piutang', 'receivable', 'pinjaman teman');

UPDATE public.wallets 
SET classification = 'loan' 
WHERE classification = 'liquid' AND LOWER(name) IN ('liabilities', 'loan', 'kpr', 'hutang', 'pinjaman');

UPDATE public.wallets 
SET classification = 'credit' 
WHERE classification = 'liquid' AND LOWER(name) IN ('credit', 'paylater', 'cc', 'kartu kredit', 'spaylater', 'gopaylater');


-- ------------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. BILLS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    due_date TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    is_paid BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_period TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. TRANSACTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    note TEXT,
    occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure to_wallet_id column exists on transactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'transactions' 
          AND column_name = 'to_wallet_id'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES (Prevents timeouts and slow queries)
-- ------------------------------------------------------------------------------
-- Fast chronological queries for transaction ledger and home screens
CREATE INDEX IF NOT EXISTS idx_transactions_user_occurred_created 
    ON public.transactions (user_id, occurred_on DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date 
    ON public.transactions (user_id, type, occurred_on DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_category_id 
    ON public.transactions (category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id 
    ON public.transactions (wallet_id);

CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet_id 
    ON public.transactions (to_wallet_id);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id 
    ON public.wallets (user_id);

CREATE INDEX IF NOT EXISTS idx_categories_user_id 
    ON public.categories (user_id);

CREATE INDEX IF NOT EXISTS idx_bills_user_due_date 
    ON public.bills (user_id, due_date ASC);

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
-- Enable RLS on core tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Helper to safely recreate user-scoped policies
DO $$
BEGIN
    -- WALLETS
    DROP POLICY IF EXISTS "Users can manage their own wallets" ON public.wallets;
    CREATE POLICY "Users can manage their own wallets" 
        ON public.wallets FOR ALL 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);

    -- CATEGORIES
    DROP POLICY IF EXISTS "Users can manage their own categories" ON public.categories;
    CREATE POLICY "Users can manage their own categories" 
        ON public.categories FOR ALL 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);

    -- BILLS
    DROP POLICY IF EXISTS "Users can manage their own bills" ON public.bills;
    CREATE POLICY "Users can manage their own bills" 
        ON public.bills FOR ALL 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);

    -- TRANSACTIONS
    DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
    CREATE POLICY "Users can manage their own transactions" 
        ON public.transactions FOR ALL 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);
END $$;

-- ------------------------------------------------------------------------------
-- 7. OPTIONAL CLOUD SYNC TABLES (Goals, Budgets, Shortcuts)
-- ------------------------------------------------------------------------------
-- Currently these are kept in localStorage. Creating these tables allows
-- cross-device sync between your phone and laptop whenever you wish.

CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount NUMERIC NOT NULL DEFAULT 0,
    current_amount NUMERIC NOT NULL DEFAULT 0,
    icon TEXT,
    color TEXT,
    target_date TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
CREATE POLICY "Users can manage their own goals" 
    ON public.goals FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_shortcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_shortcuts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own shortcuts" ON public.user_shortcuts;
CREATE POLICY "Users can manage their own shortcuts" 
    ON public.user_shortcuts FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_amount NUMERIC NOT NULL DEFAULT 0,
    month TEXT, -- e.g. '2026-09'
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own budgets" ON public.user_budgets;
CREATE POLICY "Users can manage their own budgets" 
    ON public.user_budgets FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Migration check completed.
