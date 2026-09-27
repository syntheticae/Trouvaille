-- ==============================================================================
-- TROUVAILLE DATABASE MIGRATION: SHARED LEDGERS & COLLABORATIVE SPACES
-- ==============================================================================
-- Idempotent SQL script for multi-tenant collaborative ledgers.
-- Safely creates ledger_members table, adds invite_code and is_shared to ledgers,
-- adds created_by_name to transactions, and enables secure multi-user RLS policies.
--
-- How to run:
-- 1. Open Supabase Dashboard: https://app.supabase.com
-- 2. Navigate to SQL Editor -> New Query
-- 3. Paste this script and click "Run"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. LEDGERS TABLE EXTENSIONS (invite_code & is_shared)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ledgers' 
          AND column_name = 'is_shared'
    ) THEN
        ALTER TABLE public.ledgers ADD COLUMN is_shared BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ledgers' 
          AND column_name = 'invite_code'
    ) THEN
        ALTER TABLE public.ledgers ADD COLUMN invite_code TEXT;
    END IF;
END $$;

-- Ensure index on invite_code for fast O(1) lookup
CREATE INDEX IF NOT EXISTS idx_ledgers_invite_code 
    ON public.ledgers (UPPER(invite_code)) 
    WHERE invite_code IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. LEDGER MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_id TEXT NOT NULL REFERENCES public.ledgers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
    display_name TEXT,
    email TEXT,
    joined_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_ledger_member UNIQUE (ledger_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_members_user_id 
    ON public.ledger_members (user_id);

CREATE INDEX IF NOT EXISTS idx_ledger_members_ledger_id 
    ON public.ledger_members (ledger_id);

-- Enable RLS on ledger_members
ALTER TABLE public.ledger_members ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. TRANSACTIONS TABLE ATTRIBUTION EXTENSION
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
END $$;

-- ------------------------------------------------------------------------------
-- 4. RPC: JOIN LEDGER BY INVITE CODE (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_ledger_by_invite_code(
    p_invite_code TEXT,
    p_display_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_user_email TEXT;
    v_ledger RECORD;
    v_existing_role TEXT;
    v_clean_code TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to join a shared ledger.';
    END IF;

    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

    -- Normalize invite code (trim whitespace and uppercase)
    v_clean_code := UPPER(TRIM(REPLACE(p_invite_code, '-', '')));

    -- Find matching shared ledger
    SELECT id, name, user_id, is_shared INTO v_ledger 
    FROM public.ledgers 
    WHERE UPPER(REPLACE(invite_code, '-', '')) = v_clean_code;

    IF v_ledger.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Kode undangan tidak valid atau buku kas tidak ditemukan.'
        );
    END IF;

    -- If caller is the owner of the ledger
    IF v_ledger.user_id = v_user_id THEN
        -- Ensure owner is recorded in ledger_members
        INSERT INTO public.ledger_members (ledger_id, user_id, role, display_name, email)
        VALUES (v_ledger.id, v_user_id, 'owner', COALESCE(p_display_name, 'Owner'), v_user_email)
        ON CONFLICT (ledger_id, user_id) DO NOTHING;

        RETURN jsonb_build_object(
            'success', true,
            'ledger_id', v_ledger.id,
            'ledger_name', v_ledger.name,
            'role', 'owner',
            'message', 'Anda adalah pemilik buku kas ini.'
        );
    END IF;

    -- Check if already a member
    SELECT role INTO v_existing_role 
    FROM public.ledger_members 
    WHERE ledger_id = v_ledger.id AND user_id = v_user_id;

    IF v_existing_role IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'ledger_id', v_ledger.id,
            'ledger_name', v_ledger.name,
            'role', v_existing_role,
            'message', 'Anda sudah menjadi anggota di buku kas ini.'
        );
    END IF;

    -- Insert new membership with 'editor' role
    INSERT INTO public.ledger_members (ledger_id, user_id, role, display_name, email)
    VALUES (
        v_ledger.id, 
        v_user_id, 
        'editor', 
        COALESCE(NULLIF(TRIM(p_display_name), ''), split_part(v_user_email, '@', 1)), 
        v_user_email
    );

    RETURN jsonb_build_object(
        'success', true,
        'ledger_id', v_ledger.id,
        'ledger_name', v_ledger.name,
        'role', 'editor',
        'message', 'Berhasil bergabung ke buku kas bersama!'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. RPC: REGENERATE INVITE CODE (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.regenerate_ledger_invite_code(
    p_ledger_id TEXT,
    p_new_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_is_owner BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Verify that caller is the owner
    SELECT EXISTS (
        SELECT 1 FROM public.ledgers 
        WHERE id = p_ledger_id AND user_id = v_user_id
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
        RAISE EXCEPTION 'Hanya pemilik buku kas yang dapat memperbarui kode undangan.';
    END IF;

    UPDATE public.ledgers 
    SET invite_code = UPPER(TRIM(p_new_code)),
        updated_at = now()
    WHERE id = p_ledger_id;

    RETURN jsonb_build_object('success', true, 'invite_code', UPPER(TRIM(p_new_code)));
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. MULTI-TENANT ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- A. LEDGERS POLICIES
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own ledgers" ON public.ledgers;
    DROP POLICY IF EXISTS "Users can read own or shared ledgers" ON public.ledgers;
    DROP POLICY IF EXISTS "Users can insert own ledgers" ON public.ledgers;
    DROP POLICY IF EXISTS "Users can update own ledgers" ON public.ledgers;
    DROP POLICY IF EXISTS "Users can delete own ledgers" ON public.ledgers;

    CREATE POLICY "Users can read own or shared ledgers" 
        ON public.ledgers FOR SELECT 
        USING (
            auth.uid() = user_id 
            OR id IN (
                SELECT lm.ledger_id 
                FROM public.ledger_members lm 
                WHERE lm.user_id = auth.uid()
            )
        );

    CREATE POLICY "Users can insert own ledgers" 
        ON public.ledgers FOR INSERT 
        WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own ledgers" 
        ON public.ledgers FOR UPDATE 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own ledgers" 
        ON public.ledgers FOR DELETE 
        USING (auth.uid() = user_id);
END $$;

-- B. LEDGER_MEMBERS POLICIES
DO $$
BEGIN
    DROP POLICY IF EXISTS "Members can view co-members" ON public.ledger_members;
    DROP POLICY IF EXISTS "Owners can manage members" ON public.ledger_members;
    DROP POLICY IF EXISTS "Users can leave shared ledger" ON public.ledger_members;

    CREATE POLICY "Members can view co-members" 
        ON public.ledger_members FOR SELECT 
        USING (
            ledger_id IN (
                SELECT id FROM public.ledgers WHERE user_id = auth.uid()
            )
            OR ledger_id IN (
                SELECT lm.ledger_id FROM public.ledger_members lm WHERE lm.user_id = auth.uid()
            )
        );

    CREATE POLICY "Owners can manage members" 
        ON public.ledger_members FOR ALL 
        USING (
            ledger_id IN (
                SELECT id FROM public.ledgers WHERE user_id = auth.uid()
            )
        )
        WITH CHECK (
            ledger_id IN (
                SELECT id FROM public.ledgers WHERE user_id = auth.uid()
            )
        );

    CREATE POLICY "Users can leave shared ledger" 
        ON public.ledger_members FOR DELETE 
        USING (user_id = auth.uid());
END $$;

-- C. TRANSACTIONS POLICIES (MULTI-USER SHARED LEDGER ACCESS)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Users can view own or shared ledger transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Users can insert transactions into own or shared ledgers" ON public.transactions;
    DROP POLICY IF EXISTS "Users can update transactions in own or shared ledgers" ON public.transactions;
    DROP POLICY IF EXISTS "Users can delete transactions in own or shared ledgers" ON public.transactions;

    -- SELECT: Own transactions OR transactions belonging to a shared ledger the user is a member of
    CREATE POLICY "Users can view own or shared ledger transactions" 
        ON public.transactions FOR SELECT 
        USING (
            auth.uid() = user_id 
            OR (
                ledger_id IS NOT NULL 
                AND ledger_id IN (
                    SELECT lm.ledger_id 
                    FROM public.ledger_members lm 
                    WHERE lm.user_id = auth.uid()
                )
            )
        );

    -- INSERT: Own transactions OR inserting into a shared ledger where user is owner/editor
    CREATE POLICY "Users can insert transactions into own or shared ledgers" 
        ON public.transactions FOR INSERT 
        WITH CHECK (
            auth.uid() = user_id 
            OR (
                ledger_id IS NOT NULL 
                AND ledger_id IN (
                    SELECT lm.ledger_id 
                    FROM public.ledger_members lm 
                    WHERE lm.user_id = auth.uid() 
                      AND lm.role IN ('owner', 'editor')
                )
            )
        );

    -- UPDATE: Own transactions OR editing in a shared ledger where user is owner/editor
    CREATE POLICY "Users can update transactions in own or shared ledgers" 
        ON public.transactions FOR UPDATE 
        USING (
            auth.uid() = user_id 
            OR (
                ledger_id IS NOT NULL 
                AND ledger_id IN (
                    SELECT lm.ledger_id 
                    FROM public.ledger_members lm 
                    WHERE lm.user_id = auth.uid() 
                      AND lm.role IN ('owner', 'editor')
                )
            )
        )
        WITH CHECK (
            auth.uid() = user_id 
            OR (
                ledger_id IS NOT NULL 
                AND ledger_id IN (
                    SELECT lm.ledger_id 
                    FROM public.ledger_members lm 
                    WHERE lm.user_id = auth.uid() 
                      AND lm.role IN ('owner', 'editor')
                )
            )
        );

    -- DELETE: Own transactions OR deleting in a shared ledger where user is owner/editor
    CREATE POLICY "Users can delete transactions in own or shared ledgers" 
        ON public.transactions FOR DELETE 
        USING (
            auth.uid() = user_id 
            OR (
                ledger_id IS NOT NULL 
                AND ledger_id IN (
                    SELECT lm.ledger_id 
                    FROM public.ledger_members lm 
                    WHERE lm.user_id = auth.uid() 
                      AND lm.role IN ('owner', 'editor')
                )
            )
        );
END $$;
