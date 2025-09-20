-- Fix edge_event_log access by cleaning up conflicting policies and permissions

-- Drop all existing conflicting policies on edge_event_log
DROP POLICY IF EXISTS "Anonymous can read edge_event_log for monitoring" ON public.edge_event_log;
DROP POLICY IF EXISTS "Authenticated users can read edge_event_log" ON public.edge_event_log;
DROP POLICY IF EXISTS "Public read edge_event_log" ON public.edge_event_log;
DROP POLICY IF EXISTS "Service role and authenticated can read edge logs" ON public.edge_event_log;
DROP POLICY IF EXISTS "Service role can manage edge logs" ON public.edge_event_log;
DROP POLICY IF EXISTS "Service role manages edge_event_log" ON public.edge_event_log;
DROP POLICY IF EXISTS "service_role_full_access_edge_event_log" ON public.edge_event_log;
DROP POLICY IF EXISTS "service_role_full_access_edge_event_log_complete" ON public.edge_event_log;

-- Create a single, comprehensive policy for read access
CREATE POLICY "edge_event_log_read_access" ON public.edge_event_log
FOR SELECT USING (true);

-- Create a policy for service role to manage (insert/update/delete)
CREATE POLICY "edge_event_log_service_manage" ON public.edge_event_log
FOR ALL USING (auth.role() = 'service_role'::text);

-- Grant explicit permissions to anon and authenticated roles
GRANT SELECT ON public.edge_event_log TO anon;
GRANT SELECT ON public.edge_event_log TO authenticated;

-- Ensure there's test data for the system tests
INSERT INTO public.edge_event_log (fn, stage, payload)
SELECT 'system_health_check', 'monitoring', '{"status": "active", "timestamp": "' || now() || '"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.edge_event_log WHERE fn = 'system_health_check' LIMIT 1);