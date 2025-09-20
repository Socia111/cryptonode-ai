-- Fix missing relaxed_mode column in signals table
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS relaxed_mode boolean DEFAULT false;

-- Fix authentication and session issues by ensuring proper RLS policies
-- Update signals policies to be more permissive for testing
DROP POLICY IF EXISTS "Authenticated users can read signals for testing" ON public.signals;
CREATE POLICY "Public read signals for testing" ON public.signals
FOR SELECT USING (true);

-- Ensure realtime is working properly for signals
ALTER TABLE public.signals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;

-- Fix edge_event_log permissions
DROP POLICY IF EXISTS "edge_event_log_universal_read" ON public.edge_event_log;
CREATE POLICY "edge_event_log_universal_read" ON public.edge_event_log
FOR SELECT USING (true);

-- Update system status to allow better access
DROP POLICY IF EXISTS "Public read system status" ON public.system_status;
CREATE POLICY "Public read system status" ON public.system_status
FOR SELECT USING (true);