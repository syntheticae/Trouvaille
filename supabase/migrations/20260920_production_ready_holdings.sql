-- ==============================================================================
-- TROUVAILLE PRODUCTION READY SUPABASE MIGRATION
-- Adds Cloud Holdings Table & Completes Cross-Device Synchronization
-- ==============================================================================
-- This script is idempotent (safe to run multiple times).
-- How to run:
-- 1. Open Supabase Dashboard -> SQL Editor
-- 2. Paste and run this script
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HOLDINGS TABLE (USDT, Crypto, Stocks, Gold, Mutual Funds, Fixed Assets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL DEFAULT 'crypto', -- 'crypto', 'stock', 'gold', 'fixed_asset', 'mutual_fund', 'bond'
    units NUMERIC NOT NULL DEFAULT 0,
    avg_buy_price NUMERIC NOT NULL DEFAULT 0,
    current_price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    notes TEXT,
    icon TEXT DEFAULT 'TrendingUp',
    annual_rate NUMERIC,
    purchase_date DATE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    last_price_updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_holdings_user_id 
    ON public.holdings (user_id);

CREATE INDEX IF NOT EXISTS idx_holdings_user_symbol 
    ON public.holdings (user_id, symbol);

CREATE INDEX IF NOT EXISTS idx_holdings_asset_type 
    ON public.holdings (user_id, asset_type);

-- Row Level Security (RLS)
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own holdings" ON public.holdings;
CREATE POLICY "Users can manage their own holdings" 
    ON public.holdings FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 2. GOALS & BUDGETS CLOUD SYNC (If not already created)
-- ------------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals (user_id);

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

CREATE INDEX IF NOT EXISTS idx_user_budgets_user_month ON public.user_budgets (user_id, month);
