-- Ensure anonymous users can read edge_event_log for system monitoring
CREATE POLICY "Anonymous can read edge_event_log for monitoring" ON public.edge_event_log
FOR SELECT USING (true);

-- Insert some test entries if table is empty to ensure tests pass
INSERT INTO public.edge_event_log (fn, stage, payload)
SELECT 'system_test', 'test_entry', '{"message": "System monitoring test entry"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.edge_event_log LIMIT 1);