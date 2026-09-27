-- ==============================================================================
-- TROUVAILLE DATABASE REPAIR & ACCOUNT CONSOLIDATION
-- ==============================================================================
-- 1. Perbaikan Bug RLS Infinite Recursion (42P17) pada ledgers, ledger_members, dan transactions
-- 2. Konsolidasi seluruh data (2.345 transaksi, dompet, buku kas) ke akun aktif:
--    9bead5bd-27cc-4bce-b348-dfdfe52bbcfa
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BAGIAN 1: FUNGSI BANTU SECURITY DEFINER (MENCEGAH REKURSI RLS POSTGRESQL)
-- ------------------------------------------------------------------------------
-- Fungsi-fungsi ini berjalan dengan izin pembuat tabel sehingga membaca ledger_members
-- tanpa memicu evaluasi RLS berulang (memutus loop rekursi secara total).

CREATE OR REPLACE FUNCTION public.is_ledger_member(check_ledger_id TEXT, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ledger_members 
    WHERE ledger_id = check_ledger_id AND user_id = check_user_id
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
-- BAGIAN 2: PERBAIKAN KEBIJAKAN RLS (ROW LEVEL SECURITY) TANPA REKURSI
-- ------------------------------------------------------------------------------

-- A. TABEL LEDGERS
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own ledgers" ON public.ledgers;
DROP POLICY IF EXISTS "Users can read own or shared ledgers" ON public.ledgers;
DROP POLICY IF EXISTS "Users can insert own ledgers" ON public.ledgers;
DROP POLICY IF EXISTS "Users can update own ledgers" ON public.ledgers;
DROP POLICY IF EXISTS "Users can delete own ledgers" ON public.ledgers;

CREATE POLICY "Users can read own or shared ledgers" 
    ON public.ledgers FOR SELECT 
    USING (
        auth.uid() = user_id 
        OR public.is_ledger_member(id, auth.uid())
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

-- B. TABEL LEDGER_MEMBERS
ALTER TABLE public.ledger_members ENABLE ROW LEVEL SECURITY;

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

-- C. TABEL TRANSACTIONS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own or shared ledger transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert transactions into own or shared ledgers" ON public.transactions;
DROP POLICY IF EXISTS "Users can update transactions in own or shared ledgers" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete transactions in own or shared ledgers" ON public.transactions;

CREATE POLICY "Users can view own or shared ledger transactions" 
    ON public.transactions FOR SELECT 
    USING (
        auth.uid() = user_id 
        OR (ledger_id IS NOT NULL AND public.is_ledger_member(ledger_id, auth.uid()))
    );

CREATE POLICY "Users can insert transactions into own or shared ledgers" 
    ON public.transactions FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id 
        OR (ledger_id IS NOT NULL AND public.can_edit_ledger(ledger_id, auth.uid()))
    );

CREATE POLICY "Users can update transactions in own or shared ledgers" 
    ON public.transactions FOR UPDATE 
    USING (
        auth.uid() = user_id 
        OR (ledger_id IS NOT NULL AND public.can_edit_ledger(ledger_id, auth.uid()))
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR (ledger_id IS NOT NULL AND public.can_edit_ledger(ledger_id, auth.uid()))
    );

CREATE POLICY "Users can delete transactions in own or shared ledgers" 
    ON public.transactions FOR DELETE 
    USING (
        auth.uid() = user_id 
        OR (ledger_id IS NOT NULL AND public.can_edit_ledger(ledger_id, auth.uid()))
    );

-- ------------------------------------------------------------------------------
-- BAGIAN 3: KONSOLIDASI DATA KE AKUN AKTIF 9bead5bd...
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_active_user UUID := '9bead5bd-27cc-4bce-b348-dfdfe52bbcfa'; -- Akun email aktif Anda
    v_other_user  UUID := 'f44912b0-c682-4523-8887-7e01aece3cde'; -- Akun sekunder/duplikat
    r_wallet RECORD;
    v_target_wallet_id UUID;
BEGIN
    -- 1. Alihkan relasi transaksi dari dompet akun duplikat ke dompet akun aktif jika namanya sama
    FOR r_wallet IN (SELECT id, name FROM public.wallets WHERE user_id = v_other_user) LOOP
        SELECT id INTO v_target_wallet_id 
        FROM public.wallets 
        WHERE user_id = v_active_user AND LOWER(TRIM(name)) = LOWER(TRIM(r_wallet.name))
        LIMIT 1;

        IF v_target_wallet_id IS NOT NULL THEN
            UPDATE public.transactions SET wallet_id = v_target_wallet_id WHERE wallet_id = r_wallet.id;
            UPDATE public.transactions SET to_wallet_id = v_target_wallet_id WHERE to_wallet_id = r_wallet.id;
            UPDATE public.holdings SET wallet_id = v_target_wallet_id WHERE wallet_id = r_wallet.id;
            UPDATE public.bills SET wallet_id = v_target_wallet_id WHERE wallet_id = r_wallet.id;
            UPDATE public.user_shortcuts SET wallet_id = v_target_wallet_id WHERE wallet_id = r_wallet.id;
            DELETE FROM public.wallets WHERE id = r_wallet.id;
        ELSE
            UPDATE public.wallets SET user_id = v_active_user WHERE id = r_wallet.id;
        END IF;
    END LOOP;

    -- Pindahkan sisa dompet jika masih ada
    UPDATE public.wallets SET user_id = v_active_user WHERE user_id = v_other_user;

    -- 2. Pindahkan seluruh riwayat transaksi ke akun aktif Anda
    UPDATE public.transactions SET user_id = v_active_user WHERE user_id = v_other_user OR user_id IS NULL;
    UPDATE public.transactions SET ledger_id = 'personal' WHERE ledger_id IS NULL;

    -- 3. Daftarkan Buku Kas Pribadi dan Buku Kas Bersama ke akun aktif Anda
    INSERT INTO public.ledgers (id, user_id, name, description, icon, currency, is_default, is_shared, invite_code)
    VALUES 
      ('personal', v_active_user, 'Personal Ledger', 'Buku Kas Pribadi', 'User', 'IDR', true, false, NULL),
      ('ledger-shared-r6ypgh', v_active_user, 'Buku Kas Bersama', 'Buku Kas Kolaborasi', 'Users', 'IDR', false, true, 'TRV-R6YPGH')
    ON CONFLICT (id) DO UPDATE 
    SET user_id = v_active_user,
        name = EXCLUDED.name,
        is_shared = EXCLUDED.is_shared,
        invite_code = EXCLUDED.invite_code;

    UPDATE public.ledgers SET user_id = v_active_user WHERE user_id = v_other_user;

    -- 4. Daftarkan akun aktif sebagai pemilik resmi (owner) di ledger_members
    INSERT INTO public.ledger_members (ledger_id, user_id, role, display_name)
    VALUES 
      ('personal', v_active_user, 'owner', 'Owner'),
      ('ledger-shared-r6ypgh', v_active_user, 'owner', 'Owner')
    ON CONFLICT (ledger_id, user_id) DO UPDATE SET role = 'owner';

    UPDATE public.ledger_members SET user_id = v_active_user WHERE user_id = v_other_user;

    -- 5. Pindahkan seluruh data pendukung ke akun aktif Anda
    UPDATE public.holdings SET user_id = v_active_user WHERE user_id = v_other_user;
    UPDATE public.categories SET user_id = v_active_user WHERE user_id = v_other_user;
    UPDATE public.bills SET user_id = v_active_user WHERE user_id = v_other_user;
    UPDATE public.goals SET user_id = v_active_user WHERE user_id = v_other_user;
    UPDATE public.user_budgets SET user_id = v_active_user WHERE user_id = v_other_user;
    UPDATE public.user_shortcuts SET user_id = v_active_user WHERE user_id = v_other_user;

    -- 6. Bersihkan dompet akun duplikat
    DELETE FROM public.wallets WHERE user_id = v_other_user;
END $$;

-- ------------------------------------------------------------------------------
-- BAGIAN 4: VERIFIKASI HASIL AKHIR
-- ------------------------------------------------------------------------------
SELECT 'Dompet Terdaftar' AS entitas, count(*)::text AS total 
FROM public.wallets 
WHERE user_id = '9bead5bd-27cc-4bce-b348-dfdfe52bbcfa'
UNION ALL
SELECT 'Transaksi Aktif' AS entitas, count(*)::text AS total 
FROM public.transactions 
WHERE user_id = '9bead5bd-27cc-4bce-b348-dfdfe52bbcfa'
UNION ALL
SELECT 'Buku Kas Terdaftar' AS entitas, count(*)::text AS total 
FROM public.ledgers 
WHERE user_id = '9bead5bd-27cc-4bce-b348-dfdfe52bbcfa'
UNION ALL
SELECT 'Anggota Buku Kas' AS entitas, count(*)::text AS total 
FROM public.ledger_members 
WHERE user_id = '9bead5bd-27cc-4bce-b348-dfdfe52bbcfa';
