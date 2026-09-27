-- Migration: Create public bucket for app releases (Trouvaille APK)
-- Enables automated cloud deployment of the latest Android APK directly to Supabase CDN

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-releases',
  'app-releases',
  true,
  104857600, -- 100MB
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['application/vnd.android.package-archive', 'application/octet-stream'];

-- 1. Allow public read access to anyone
DROP POLICY IF EXISTS "Public Access App Releases" ON storage.objects;
CREATE POLICY "Public Access App Releases"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-releases');

-- 2. Allow upload with anon or service_role key
DROP POLICY IF EXISTS "Allow Upload App Releases" ON storage.objects;
CREATE POLICY "Allow Upload App Releases"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'app-releases');

-- 3. Allow update / overwrite (upsert)
DROP POLICY IF EXISTS "Allow Update App Releases" ON storage.objects;
CREATE POLICY "Allow Update App Releases"
ON storage.objects FOR UPDATE
USING (bucket_id = 'app-releases')
WITH CHECK (bucket_id = 'app-releases');
