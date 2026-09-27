-- ==============================================================================
-- TROUVAILLE DATABASE RESTORATION: CONSOLIDATE ALL DATA TO 9bead5bd...
-- ==============================================================================
-- Idempotent PL/pgSQL block that firmly consolidates all wallets, transactions,
-- ledgers, members, and ancillary entities to the verified active account:
-- 9bead5bd-27cc-4bce-b348-dfdfe52bbcfa
-- ==============================================================================

DO $$
DECLARE
    v_active_user UUID := '9bead5bd-27cc-4bce-b348-dfdfe52bbcfa'; -- Akun aktif yang Anda gunakan
    v_other_user  UUID := 'f44912b0-c682-4523-8887-7e01aece3cde'; -- Akun duplikat
    r_wallet RECORD;
    v_target_wallet_id UUID;
BEGIN
    -- 1. Alihkan relasi transaksi dari dompet akun duplikat ke dompet akun aktif jika namanya sama
    FOR r_wallet IN (SELECT id, name FROM public.wallets WHERE user_id = v_other_user) LOOP
        SELECT id INTO v_target_wallet_id 
        FROM public.wallets 
        WHERE user_id = v_active_user AND LOWER(TRIM(name)) = LOWER(TRIM(r_wallet.name));

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
    UPDATE public.transactions SET user_id = v_active_user;
    UPDATE public.transactions SET ledger_id = 'personal' WHERE ledger_id IS NULL;

    -- 3. Daftarkan Buku Kas Pribadi dan Buku Kas Bersama TRV-R6YPGH ke akun aktif Anda
    INSERT INTO public.ledgers (id, user_id, name, description, icon, currency, is_default, is_shared, invite_code)
    VALUES 
      ('personal', v_active_user, 'Personal Ledger', 'Buku Kas Pribadi', 'User', 'IDR', true, false, NULL),
      ('ledger-shared-r6ypgh', v_active_user, 'Buku Kas Bersama', 'Buku Kas Kolaborasi', 'Users', 'IDR', false, true, 'TRV-R6YPGH')
    ON CONFLICT (id) DO UPDATE 
    SET user_id = v_active_user,
        name = EXCLUDED.name,
        is_shared = EXCLUDED.is_shared,
        invite_code = EXCLUDED.invite_code;

    UPDATE public.ledgers SET user_id = v_active_user;

    -- 4. Daftarkan akun aktif sebagai pemilik resmi (owner) di ledger_members
    INSERT INTO public.ledger_members (ledger_id, user_id, role, display_name)
    VALUES 
      ('personal', v_active_user, 'owner', 'Owner'),
      ('ledger-shared-r6ypgh', v_active_user, 'owner', 'Owner')
    ON CONFLICT (ledger_id, user_id) DO UPDATE SET role = 'owner';

    UPDATE public.ledger_members SET user_id = v_active_user WHERE user_id = v_other_user;

    -- 5. Pindahkan seluruh data pendukung ke akun aktif Anda
    UPDATE public.holdings SET user_id = v_active_user;
    UPDATE public.categories SET user_id = v_active_user;
    UPDATE public.bills SET user_id = v_active_user;
    UPDATE public.goals SET user_id = v_active_user;
    UPDATE public.user_budgets SET user_id = v_active_user;
    UPDATE public.user_shortcuts SET user_id = v_active_user;

    -- 6. Bersihkan dompet akun duplikat
    DELETE FROM public.wallets WHERE user_id = v_other_user;

    -- 7. Bersihkan akun duplikat dari auth jika memungkinkan
    BEGIN
        DELETE FROM auth.identities WHERE user_id = v_other_user;
        DELETE FROM auth.users WHERE id = v_other_user;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- 8. Tampilkan verifikasi status akhir data di akun 9bead5bd...
SELECT 'Dompet Akun Aktif' AS item, count(*)::text AS jumlah 
FROM public.wallets 
WHERE user_id = '9bead5bd-27cc-4bce-b348-dfdfe52bbcfa'
UNION ALL
SELECT 'Transaksi Akun Aktif' AS item, count(*)::text AS jumlah 
FROM public.transactions 
WHERE user_id = '9bead5bd-27cc-4bce-b348-dfdfe52bbcfa'
UNION ALL
SELECT 'Buku Kas Terdaftar' AS item, count(*)::text AS jumlah 
FROM public.ledgers 
WHERE user_id = '9bead5bd-27cc-4bce-b348-dfdfe52bbcfa';
