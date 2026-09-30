-- ==============================================================================
-- TROUVAILLE SUPABASE MIGRATION: HOLDINGS & WALLETS CONSOLIDATION ADJUSTMENT
-- 1. Deduplicates multiple holding rows per (user_id, symbol)
-- 2. Enforces UNIQUE (user_id, symbol) constraint on public.holdings
-- 3. Links sovereign USDT holding to existing crypto/USDT wallet
-- 4. Modernizes legacy PNG file paths in wallets.icon to standard Lucide icons
-- ==============================================================================
-- Run this script in: Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DEDUPLICATE HOLDINGS ROWS
-- Keeps only the single latest record with positive/highest units
-- ------------------------------------------------------------------------------
DELETE FROM public.holdings
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, UPPER(TRIM(symbol))) id
    FROM public.holdings
    ORDER BY 
        user_id, 
        UPPER(TRIM(symbol)), 
        units DESC, 
        updated_at DESC NULLS LAST, 
        created_at DESC NULLS LAST
);

-- ------------------------------------------------------------------------------
-- 2. CLEAN UP SYMBOL CASING & LINK USDT WALLET
-- ------------------------------------------------------------------------------
UPDATE public.holdings
SET symbol = UPPER(TRIM(symbol));

-- Auto-link USDT holding to the user's USDT wallet if currently unlinked
UPDATE public.holdings h
SET wallet_id = w.id
FROM public.wallets w
WHERE h.symbol = 'USDT'
  AND h.wallet_id IS NULL
  AND w.user_id = h.user_id
  AND (UPPER(w.name) = 'USDT' OR UPPER(w.name) = 'CRYPTO');

-- ------------------------------------------------------------------------------
-- 3. ENFORCE UNIQUE CONSTRAINT ON (user_id, symbol)
-- Guarantees zero duplicate asset symbols can ever be created for a user
-- ------------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_holdings_user_symbol;

CREATE UNIQUE INDEX IF NOT EXISTS uq_holdings_user_symbol 
    ON public.holdings (user_id, symbol);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_holdings_user_symbol_constraint'
    ) THEN
        ALTER TABLE public.holdings
            ADD CONSTRAINT uq_holdings_user_symbol_constraint 
            UNIQUE USING INDEX uq_holdings_user_symbol;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 4. MODERNIZE LEGACY PNG FILE PATHS IN WALLETS.ICON TO LUCIDE VECTOR ICONS
-- Conforms strictly with TROUVAILLE_RULES.md (Monochrome Apple Luxury standard)
-- ------------------------------------------------------------------------------
UPDATE public.wallets
SET icon = CASE
    WHEN icon ILIKE '%saham.png' THEN 'TrendingUp'
    WHEN icon ILIKE '%crypto.png' THEN 'Coins'
    WHEN icon ILIKE '%cash.png' THEN 'Banknote'
    WHEN icon ILIKE '%seabank.png' THEN 'Landmark'
    WHEN icon ILIKE '%krom.png' THEN 'Landmark'
    WHEN icon ILIKE '%jago.png' THEN 'Landmark'
    WHEN icon ILIKE '%superbank.png' THEN 'Landmark'
    WHEN icon ILIKE '%blu.png' THEN 'Landmark'
    WHEN icon ILIKE '%bni.png' THEN 'Landmark'
    WHEN icon ILIKE '%bca.png' THEN 'Landmark'
    WHEN icon ILIKE '%mandiri.png' THEN 'Landmark'
    WHEN icon ILIKE '%bri.png' THEN 'Landmark'
    WHEN icon ILIKE '%dana.png' THEN 'Smartphone'
    WHEN icon ILIKE '%gopay.png' THEN 'Smartphone'
    WHEN icon ILIKE '%shopeepay.png' THEN 'Smartphone'
    WHEN icon ILIKE '%ovo.png' THEN 'Smartphone'
    WHEN icon ILIKE '%tapcash.png' THEN 'CreditCard'
    WHEN icon ILIKE '%liabilities.png' THEN 'Scale'
    WHEN icon ILIKE '%piutang.png' THEN 'HandCoins'
    ELSE icon
END
WHERE icon LIKE '/icons/%' OR icon LIKE '%.png';
