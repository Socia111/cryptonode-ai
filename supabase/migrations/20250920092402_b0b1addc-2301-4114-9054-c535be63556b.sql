-- Fix edge_event_log access by replacing existing policies with clean ones

-- First, drop all policies (including the one that might exist)
DROP POLICY IF EXISTS "edge_event_log_read_access" ON public.edge_event_log;
DROP POLICY IF EXISTS "edge_event_log_service_manage" ON public.edge_event_log;
DROP POLICY IF EXISTS "Anonymous can read edge_event_log for monitoring" ON public.edge_event_log;
DROP POLICY IF EXISTS "Authenticated users can read edge_event_log" ON public.edge_event_log;
DROP POLICY IF EXISTS "Public read edge_event_log" ON public.edge_event_log;
DROP POLICY IF EXISTS "Service role and authenticated can read edge logs" ON public.edge_event_log;
DROP POLICY IF EXISTS "Service role can manage edge logs" ON public.edge_event_log;
DROP POLICY IF EXISTS "Service role manages edge_event_log" ON public.edge_event_log;
DROP POLICY IF EXISTS "service_role_full_access_edge_event_log" ON public.edge_event_log;
DROP POLICY IF EXISTS "service_role_full_access_edge_event_log_complete" ON public.edge_event_log;

-- Create the final policies
CREATE POLICY "edge_event_log_universal_read" ON public.edge_event_log
FOR SELECT USING (true);

CREATE POLICY "edge_event_log_service_write" ON public.edge_event_log
FOR INSERT WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "edge_event_log_service_all" ON public.edge_event_log
FOR ALL USING (auth.role() = 'service_role'::text);

-- Grant explicit table permissions
GRANT SELECT ON public.edge_event_log TO anon;
GRANT SELECT ON public.edge_event_log TO authenticated;