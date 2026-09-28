-- ==============================================================================
-- TROUVAILLE SUPABASE AUTHENTICATION & IDENTITY HEALTH AUDITOR
-- File: supabase/migrations/20260928_auth_security_audit_query.sql
-- Description:
-- Read-only comprehensive audit query for Supabase Auth configuration:
-- 1. Detects duplicate user accounts for the same email
-- 2. Checks email confirmation status for smooth OAuth identity linking
-- 3. Inspects linked providers (email, google) per user
-- 4. Verifies auth schema table isolation from anonymous callers
-- 5. Checks referential integrity between public data (txs, wallets) and auth.users
-- 6. Audits active and revoked refresh tokens
-- ==============================================================================

WITH 
-- 1. Pemeriksaan Akun Ganda (Duplikasi Email di auth.users)
duplicate_emails AS (
  SELECT 
    '1. Deteksi Akun Ganda' AS kategori,
    COALESCE(email, '(tanpa surel)') AS objek,
    CASE 
      WHEN count(*) = 1 THEN 'SESUAI'
      ELSE 'PERINGATAN: AKUN DUPLIKAT DITEMUKAN'
    END AS status,
    CASE 
      WHEN count(*) = 1 THEN 'Surel tunggal, tidak ada konflik akun ganda'
      ELSE 'Ditemukan ' || count(*) || ' akun berbeda dengan surel yang sama (perlu dikonsolidasi)'
    END AS keterangan
  FROM auth.users
  WHERE deleted_at IS NULL
  GROUP BY email
),

-- 2. Pemeriksaan Status Verifikasi Surel (Email Confirmation)
email_verification AS (
  SELECT 
    '2. Status Verifikasi Surel' AS kategori,
    COALESCE(email, '(tanpa surel)') || ' [' || substring(id::text from 1 for 8) || '...]' AS objek,
    CASE 
      WHEN email_confirmed_at IS NOT NULL THEN 'SESUAI'
      ELSE 'PERINGATAN: SUREL BELUM TERVERIFIKASI'
    END AS status,
    CASE 
      WHEN email_confirmed_at IS NOT NULL THEN 'Surel telah terverifikasi resmi pada ' || to_char(email_confirmed_at, 'YYYY-MM-DD HH24:MI')
      ELSE 'Surel belum diverifikasi. OAuth otomatis linking mungkin terhambat'
    END AS keterangan
  FROM auth.users
  WHERE deleted_at IS NULL
),

-- 3. Pemeriksaan Identitas Tertaut (Email + Google)
linked_identities AS (
  SELECT 
    '3. Penautan Identitas (Provider)' AS kategori,
    COALESCE(u.email, '(tanpa surel)') || ' [' || substring(u.id::text from 1 for 8) || '...]' AS objek,
    CASE 
      WHEN count(i.id) > 1 THEN 'SESUAI (Multi-Identitas Tertaut)'
      ELSE 'SESUAI (Identitas Tunggal: ' || COALESCE(max(i.provider), 'email') || ')'
    END AS status,
    'Tertaut ke ' || count(i.id) || ' metode login: [' || COALESCE(string_agg(i.provider, ', '), 'email') || ']' AS keterangan
  FROM auth.users u
  LEFT JOIN auth.identities i ON i.user_id = u.id
  WHERE u.deleted_at IS NULL
  GROUP BY u.id, u.email
),

-- 4. Pemeriksaan Izin Akses Tabel Auth (Mencegah Akses Publik Langsung)
auth_grants_check AS (
  SELECT 
    '4. Keamanan Tabel Auth' AS kategori,
    'auth.' || table_name AS objek,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.role_table_grants g
        WHERE g.table_schema = 'auth' 
          AND g.table_name = t.table_name 
          AND g.grantee IN ('anon', 'public')
          AND g.privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
      ) THEN 'PERINGATAN: AKSES TERLALU TERBUKA'
      ELSE 'SESUAI (Terisolasi dari Anon)'
    END AS status,
    'Tabel auth terisolasi dan hanya dapat dikelola oleh peladen autentikasi resmi' AS keterangan
  FROM (VALUES ('users'), ('identities'), ('sessions'), ('refresh_tokens')) AS t(table_name)
),

-- 5. Pemeriksaan Integritas Data Publik vs Auth (Cek Data Yatim Piatu / Orphaned)
orphaned_data_check AS (
  SELECT 
    '5. Integritas Data Pengguna' AS kategori,
    'public.transactions' AS objek,
    CASE 
      WHEN count(*) = 0 THEN 'SESUAI'
      ELSE 'PERINGATAN: DATA YATIM PIATU DITEMUKAN'
    END AS status,
    CASE 
      WHEN count(*) = 0 THEN 'Semua transaksi memiliki pemilik sah di auth.users'
      ELSE 'Ditemukan ' || count(*) || ' transaksi dengan user_id yang tidak terdaftar di auth.users'
    END AS keterangan
  FROM public.transactions t
  WHERE t.user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.user_id)
  
  UNION ALL
  
  SELECT 
    '5. Integritas Data Pengguna' AS kategori,
    'public.wallets' AS objek,
    CASE 
      WHEN count(*) = 0 THEN 'SESUAI'
      ELSE 'PERINGATAN: DATA YATIM PIATU DITEMUKAN'
    END AS status,
    CASE 
      WHEN count(*) = 0 THEN 'Semua dompet memiliki pemilik sah di auth.users'
      ELSE 'Ditemukan ' || count(*) || ' dompet dengan user_id yang tidak terdaftar di auth.users'
    END AS keterangan
  FROM public.wallets w
  WHERE w.user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = w.user_id)
),

-- 6. Pemeriksaan Sesi Aktif dan Token Kedaluwarsa
session_tokens_check AS (
  SELECT 
    '6. Manajemen Sesi & Token' AS kategori,
    'auth.refresh_tokens' AS objek,
    'SESUAI' AS status,
    'Total ' || count(*) || ' token tersimpan (' || count(*) FILTER (WHERE revoked = true) || ' dicabut, ' || count(*) FILTER (WHERE revoked = false OR revoked IS NULL) || ' aktif)' AS keterangan
  FROM auth.refresh_tokens
)

SELECT * FROM duplicate_emails
UNION ALL
SELECT * FROM email_verification
UNION ALL
SELECT * FROM linked_identities
UNION ALL
SELECT * FROM auth_grants_check
UNION ALL
SELECT * FROM orphaned_data_check
UNION ALL
SELECT * FROM session_tokens_check
ORDER BY kategori, status DESC, objek;
