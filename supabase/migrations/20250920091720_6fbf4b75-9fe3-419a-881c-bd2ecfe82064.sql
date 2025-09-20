-- Fix RLS permissions for tables without existing policies

-- Drop any conflicting policies first for edge_event_log
DROP POLICY IF EXISTS "Allow service role full access to edge_event_log" ON public.edge_event_log;

-- Add comprehensive service role access to edge_event_log
CREATE POLICY "service_role_full_access_edge_event_log_complete" ON public.edge_event_log
FOR ALL USING (true) WITH CHECK (true);

-- Grant all permissions to service_role on all problematic tables
GRANT ALL ON public.markets TO service_role;
GRANT ALL ON public.system_status TO service_role;
GRANT ALL ON public.api_keys TO service_role;
GRANT ALL ON public.edge_event_log TO service_role;