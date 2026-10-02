-- ==============================================================================
-- TROUVAILLE SUPABASE MIGRATION: DEDUPLICATE & HARDEN CATEGORIES AND WALLETS
-- 1. Merges duplicate categories per (user_id, type, lower(name))
-- 2. Relinks transactions, bills, and shortcuts to survivor category ID
-- 3. Deletes duplicate category records
-- 4. Merges duplicate wallets per (user_id, lower(name))
-- 5. Relinks transactions, bills, shortcuts, and holdings to survivor wallet ID
-- 6. Deletes duplicate wallet records
-- 7. Enforces UNIQUE INDEX on categories and wallets
-- ==============================================================================
-- Run this script in: Supabase Dashboard -> SQL Editor
-- (Uses anonymous PL/pgSQL block with zero TEMP tables for PgBouncer compatibility)
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
    v_has_bills_cat BOOLEAN := FALSE;
    v_has_bills_wal BOOLEAN := FALSE;
    v_has_shortcuts_cat BOOLEAN := FALSE;
    v_has_shortcuts_wal BOOLEAN := FALSE;
    v_has_holdings_wal BOOLEAN := FALSE;
BEGIN
    -- Check optional columns dynamically to prevent compile errors
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'bills' AND column_name = 'category_id'
    ) INTO v_has_bills_cat;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'bills' AND column_name = 'wallet_id'
    ) INTO v_has_bills_wal;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_shortcuts' AND column_name = 'category_id'
    ) INTO v_has_shortcuts_cat;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_shortcuts' AND column_name = 'wallet_id'
    ) INTO v_has_shortcuts_wal;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'holdings' AND column_name = 'wallet_id'
    ) INTO v_has_holdings_wal;

    -- --------------------------------------------------------------------------
    -- 1. DEDUPLICATE CATEGORIES
    -- --------------------------------------------------------------------------
    FOR r IN (
        SELECT 
            c.id AS duplicate_id,
            FIRST_VALUE(c.id) OVER (
                PARTITION BY c.user_id, c.type, LOWER(TRIM(c.name))
                ORDER BY 
                    COALESCE(tx_stats.tx_count, 0) DESC,
                    c.is_default DESC,
                    c.created_at ASC NULLS LAST,
                    c.id ASC
            ) AS survivor_id
        FROM public.categories c
        LEFT JOIN (
            SELECT category_id, COUNT(*) AS tx_count
            FROM public.transactions
            WHERE category_id IS NOT NULL
            GROUP BY category_id
        ) tx_stats ON tx_stats.category_id = c.id
    ) LOOP
        IF r.duplicate_id <> r.survivor_id THEN
            -- Reassign transactions category
            UPDATE public.transactions
            SET category_id = r.survivor_id
            WHERE category_id = r.duplicate_id;

            -- Reassign bills category
            IF v_has_bills_cat THEN
                EXECUTE 'UPDATE public.bills SET category_id = $1 WHERE category_id = $2'
                USING r.survivor_id, r.duplicate_id;
            END IF;

            -- Reassign user_shortcuts category
            IF v_has_shortcuts_cat THEN
                EXECUTE 'UPDATE public.user_shortcuts SET category_id = $1 WHERE category_id = $2'
                USING r.survivor_id, r.duplicate_id;
            END IF;

            -- Delete the duplicate category
            DELETE FROM public.categories
            WHERE id = r.duplicate_id;
        END IF;
    END LOOP;

    -- --------------------------------------------------------------------------
    -- 2. DEDUPLICATE WALLETS
    -- --------------------------------------------------------------------------
    FOR r IN (
        SELECT 
            w.id AS duplicate_id,
            FIRST_VALUE(w.id) OVER (
                PARTITION BY w.user_id, LOWER(TRIM(w.name))
                ORDER BY 
                    COALESCE(tx_stats.tx_count, 0) DESC,
                    w.created_at ASC NULLS LAST,
                    w.id ASC
            ) AS survivor_id
        FROM public.wallets w
        LEFT JOIN (
            SELECT wallet_ref, COUNT(*) AS tx_count
            FROM (
                SELECT wallet_id AS wallet_ref FROM public.transactions WHERE wallet_id IS NOT NULL
                UNION ALL
                SELECT to_wallet_id AS wallet_ref FROM public.transactions WHERE to_wallet_id IS NOT NULL
            ) all_tx
            GROUP BY wallet_ref
        ) tx_stats ON tx_stats.wallet_ref = w.id
    ) LOOP
        IF r.duplicate_id <> r.survivor_id THEN
            -- Reassign transactions wallet_id
            UPDATE public.transactions
            SET wallet_id = r.survivor_id
            WHERE wallet_id = r.duplicate_id;

            -- Reassign transactions to_wallet_id
            UPDATE public.transactions
            SET to_wallet_id = r.survivor_id
            WHERE to_wallet_id = r.duplicate_id;

            -- Reassign bills wallet
            IF v_has_bills_wal THEN
                EXECUTE 'UPDATE public.bills SET wallet_id = $1 WHERE wallet_id = $2'
                USING r.survivor_id, r.duplicate_id;
            END IF;

            -- Reassign user_shortcuts wallet
            IF v_has_shortcuts_wal THEN
                EXECUTE 'UPDATE public.user_shortcuts SET wallet_id = $1 WHERE wallet_id = $2'
                USING r.survivor_id, r.duplicate_id;
            END IF;

            -- Reassign holdings wallet
            IF v_has_holdings_wal THEN
                EXECUTE 'UPDATE public.holdings SET wallet_id = $1 WHERE wallet_id = $2'
                USING r.survivor_id, r.duplicate_id;
            END IF;

            -- Delete the duplicate wallet
            DELETE FROM public.wallets
            WHERE id = r.duplicate_id;
        END IF;
    END LOOP;

    -- Normalize names
    UPDATE public.categories SET name = TRIM(name) WHERE name <> TRIM(name);
    UPDATE public.wallets SET name = TRIM(name) WHERE name <> TRIM(name);

END $$;

-- ------------------------------------------------------------------------------
-- 3. ENFORCE UNIQUE INDEXES
-- ------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_type_name
    ON public.categories (user_id, type, LOWER(TRIM(name)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallets_user_name
    ON public.wallets (user_id, LOWER(TRIM(name)));
