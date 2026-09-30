-- ==============================================================================
-- TROUVAILLE DATABASE MIGRATION: CLEANUP ZERO USDT & SHARED SPACE APPROVAL
-- ==============================================================================
-- Idempotent SQL script:
-- 1. Cleans up phantom 0-unit USDT rows in public.holdings created on new user accounts.
-- 2. Adds 'status' ('active' | 'pending') to public.ledger_members.
-- 3. Updates RPC join_ledger_by_invite_code:
--    - join via 'qr' is auto-approved ('active')
--    - join via 'code' requires space owner approval ('pending')
-- 4. Updates RLS policies so pending members can view the space in their list,
--    but cannot view or record transactions until approved by the owner.
--
-- How to run:
-- 1. Open Supabase Dashboard: https://app.supabase.com
-- 2. Navigate to SQL Editor -> New Query
-- 3. Paste this entire script and click "Run"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CLEANUP PHANTOM ZERO-UNIT USDT HOLDINGS
-- ------------------------------------------------------------------------------
DELETE FROM public.holdings
WHERE UPPER(TRIM(symbol)) = 'USDT' 
  AND (COALESCE(units, 0) <= 0);

-- ------------------------------------------------------------------------------
-- 2. ADD STATUS COLUMN TO LEDGER_MEMBERS ('active' | 'pending')
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ledger_members' 
          AND column_name = 'status'
    ) THEN
        ALTER TABLE public.ledger_members 
            ADD COLUMN status TEXT NOT NULL DEFAULT 'active' 
            CHECK (status IN ('active', 'pending'));
    END IF;
END $$;

-- Ensure existing members default to 'active'
UPDATE public.ledger_members 
SET status = 'active' 
WHERE status IS NULL;

-- Index on ledger_members (ledger_id, status) for fast membership checks
CREATE INDEX IF NOT EXISTS idx_ledger_members_status 
    ON public.ledger_members (ledger_id, status);

-- ------------------------------------------------------------------------------
-- 3. RPC: JOIN LEDGER WITH DUAL APPROVAL (QR = AUTO-ACTIVE, CODE = PENDING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_ledger_by_invite_code(
    p_invite_code TEXT,
    p_display_name TEXT DEFAULT NULL,
    p_join_method TEXT DEFAULT 'code'
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
    v_existing RECORD;
    v_clean_code TEXT;
    v_initial_status TEXT;
    v_clean_method TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to join a shared ledger.';
    END IF;

    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

    -- Normalize invite code (strip hyphens and uppercase)
    v_clean_code := UPPER(TRIM(REPLACE(p_invite_code, '-', '')));
    v_clean_method := LOWER(TRIM(COALESCE(p_join_method, 'code')));

    -- Determine initial status: QR is immediately active; Code requires owner approval
    IF v_clean_method = 'qr' THEN
        v_initial_status := 'active';
    ELSE
        v_initial_status := 'pending';
    END IF;

    -- Find matching shared ledger
    SELECT id, name, user_id, is_shared INTO v_ledger 
    FROM public.ledgers 
    WHERE UPPER(REPLACE(invite_code, '-', '')) = v_clean_code;

    IF v_ledger.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Kode undangan tidak valid atau space tidak ditemukan.'
        );
    END IF;

    -- If caller is the owner of the ledger
    IF v_ledger.user_id = v_user_id THEN
        INSERT INTO public.ledger_members (ledger_id, user_id, role, status, display_name, email)
        VALUES (v_ledger.id, v_user_id, 'owner', 'active', COALESCE(NULLIF(TRIM(p_display_name), ''), 'Owner'), v_user_email)
        ON CONFLICT (ledger_id, user_id) 
        DO UPDATE SET role = 'owner', status = 'active';

        RETURN jsonb_build_object(
            'success', true,
            'ledger_id', v_ledger.id,
            'ledger_name', v_ledger.name,
            'role', 'owner',
            'status', 'active',
            'message', 'Anda adalah pemilik space ini.'
        );
    END IF;

    -- Check if already a member or pending request
    SELECT role, status INTO v_existing 
    FROM public.ledger_members 
    WHERE ledger_id = v_ledger.id AND user_id = v_user_id;

    IF v_existing.role IS NOT NULL THEN
        -- If user previously joined via code ('pending') but now scans QR ('qr'), auto-upgrade to 'active'
        IF v_existing.status = 'pending' AND v_clean_method = 'qr' THEN
            UPDATE public.ledger_members 
            SET status = 'active', display_name = COALESCE(NULLIF(TRIM(p_display_name), ''), display_name)
            WHERE ledger_id = v_ledger.id AND user_id = v_user_id;

            RETURN jsonb_build_object(
                'success', true,
                'ledger_id', v_ledger.id,
                'ledger_name', v_ledger.name,
                'role', v_existing.role,
                'status', 'active',
                'message', 'Status bergabung berhasil diaktifkan melalui pemindaian QR!'
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'ledger_id', v_ledger.id,
            'ledger_name', v_ledger.name,
            'role', v_existing.role,
            'status', v_existing.status,
            'message', CASE 
                WHEN v_existing.status = 'pending' THEN 'Permintaan bergabung masih menunggu persetujuan pemilik space.'
                ELSE 'Anda sudah menjadi anggota aktif di space ini.'
            END
        );
    END IF;

    -- Insert new membership with initial status
    INSERT INTO public.ledger_members (ledger_id, user_id, role, status, display_name, email)
    VALUES (
        v_ledger.id, 
        v_user_id, 
        'editor', 
        v_initial_status,
        COALESCE(NULLIF(TRIM(p_display_name), ''), split_part(v_user_email, '@', 1)), 
        v_user_email
    );

    RETURN jsonb_build_object(
        'success', true,
        'ledger_id', v_ledger.id,
        'ledger_name', v_ledger.name,
        'role', 'editor',
        'status', v_initial_status,
        'message', CASE 
            WHEN v_initial_status = 'pending' THEN 'Permintaan bergabung terkirim. Menunggu persetujuan pemilik space.'
            ELSE 'Berhasil bergabung otomatis ke space bersama!'
        END
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. SECURITY DEFINER HELPER FUNCTIONS (ELIMINATE POSTGRESQL RLS RECURSION 42P17)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_ledger_member(check_ledger_id TEXT, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ledger_members 
    WHERE ledger_id = check_ledger_id 
      AND user_id = check_user_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_ledger(check_ledger_id TEXT, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ledger_members 
    WHERE ledger_id = check_ledger_id 
      AND user_id = check_user_id 
      AND role IN ('owner', 'editor')
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_ledger_owner(check_ledger_id TEXT, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ledgers 
    WHERE id = check_ledger_id AND user_id = check_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_ledger_member(TEXT, UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_ledger(TEXT, UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_ledger_owner(TEXT, UUID) TO authenticated, service_role, anon;

-- ------------------------------------------------------------------------------
-- 5. UPDATE RLS: CLEAN, FAST, NON-RECURSIVE POLICIES
-- ------------------------------------------------------------------------------
-- A. TABEL LEDGER_MEMBERS
DROP POLICY IF EXISTS "ledger_members_select_policy" ON public.ledger_members;
DROP POLICY IF EXISTS "Members can view co-members" ON public.ledger_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.ledger_members;
DROP POLICY IF EXISTS "Users can leave shared ledger" ON public.ledger_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.ledger_members;

CREATE POLICY "Members can view co-members" 
    ON public.ledger_members FOR SELECT 
    USING (
        user_id = auth.uid() 
        OR public.is_ledger_owner(ledger_id, auth.uid())
        OR public.is_ledger_member(ledger_id, auth.uid())
    );

CREATE POLICY "Owners can manage members" 
    ON public.ledger_members FOR ALL 
    USING (
        public.is_ledger_owner(ledger_id, auth.uid())
    )
    WITH CHECK (
        public.is_ledger_owner(ledger_id, auth.uid())
    );

CREATE POLICY "Users can leave shared ledger" 
    ON public.ledger_members FOR DELETE 
    USING (user_id = auth.uid());

-- B. TABEL TRANSACTIONS
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own or shared ledger transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert transactions into own or shared ledgers" ON public.transactions;
DROP POLICY IF EXISTS "Users can update transactions in own or shared ledgers" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete transactions in own or shared ledgers" ON public.transactions;
DROP POLICY IF EXISTS "transactions_shared_ledger_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_shared_ledger_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_shared_ledger_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_shared_ledger_delete" ON public.transactions;

CREATE POLICY "transactions_shared_ledger_select" 
    ON public.transactions FOR SELECT 
    USING (
        auth.uid() = user_id 
        OR (ledger_id IS NOT NULL AND public.is_ledger_member(ledger_id, auth.uid()))
    );

CREATE POLICY "transactions_shared_ledger_insert" 
    ON public.transactions FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id 
        OR (ledger_id IS NOT NULL AND public.can_edit_ledger(ledger_id, auth.uid()))
    );

CREATE POLICY "transactions_shared_ledger_update" 
    ON public.transactions FOR UPDATE 
    USING (
        auth.uid() = user_id 
        OR (ledger_id IS NOT NULL AND public.can_edit_ledger(ledger_id, auth.uid()))
    );

CREATE POLICY "transactions_shared_ledger_delete" 
    ON public.transactions FOR DELETE 
    USING (
        auth.uid() = user_id 
        OR (ledger_id IS NOT NULL AND public.can_edit_ledger(ledger_id, auth.uid()))
    );
