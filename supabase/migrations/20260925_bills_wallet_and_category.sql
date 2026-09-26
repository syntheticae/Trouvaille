-- Migration: Add wallet_id and category_id columns to public.bills table
-- Idempotent script for Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'bills' 
      AND column_name = 'wallet_id'
  ) THEN
    ALTER TABLE public.bills ADD COLUMN wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'bills' 
      AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.bills ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bills_wallet_id ON public.bills(wallet_id);
CREATE INDEX IF NOT EXISTS idx_bills_category_id ON public.bills(category_id);
