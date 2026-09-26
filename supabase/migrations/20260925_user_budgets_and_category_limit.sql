-- ==============================================================================
-- Migration: User Budgets and Category Limit (budget_amount)
-- Timestamp: 2026-09-25
-- Description:
-- 1. Create public.user_budgets table with RLS and user/month index
-- 2. Ensure budget_amount column exists on public.categories with performance index
-- ==============================================================================

-- 1. USER BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.user_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  month TEXT NULL,
  updated_at TIMESTAMPTZ NULL DEFAULT now(),
  CONSTRAINT user_budgets_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_user_budgets_user_month 
ON public.user_budgets USING btree (user_id, month);

ALTER TABLE public.user_budgets ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_budgets' AND policyname = 'Users can view their own budgets'
  ) THEN
    CREATE POLICY "Users can view their own budgets" 
    ON public.user_budgets FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_budgets' AND policyname = 'Users can insert/update their own budgets'
  ) THEN
    CREATE POLICY "Users can insert/update their own budgets" 
    ON public.user_budgets FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. CATEGORIES TABLE BUDGET_AMOUNT COLUMN
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS budget_amount NUMERIC DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_user_budget 
ON public.categories USING btree (user_id, budget_amount)
WHERE (budget_amount IS NOT NULL);
