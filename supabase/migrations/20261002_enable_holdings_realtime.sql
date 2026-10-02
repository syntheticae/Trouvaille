-- ==============================================================================
-- TROUVAILLE SUPABASE MIGRATION: ENABLE REALTIME FOR HOLDINGS TABLE
-- Migration file: supabase/migrations/20261002_enable_holdings_realtime.sql
-- ==============================================================================
-- Idempotent SQL script to enable Supabase Realtime WebSocket publications
-- for investment holdings and asset valuations across mobile and web dashboard.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'holdings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.holdings;
    END IF;
END $$;
