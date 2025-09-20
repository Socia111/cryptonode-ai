-- Fix the test signal generation by allowing service role to write to edge_event_log
-- The test-signal-generation function fails because triggers on signals table try to write to edge_event_log

-- Update edge_event_log policies to properly allow service role writes
DROP POLICY IF EXISTS "Allow service role full access to edge_event_log" ON public.edge_event_log;

CREATE POLICY "service_role_full_access_edge_event_log" 
ON public.edge_event_log 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Also ensure the function trigger has proper access
CREATE OR REPLACE FUNCTION public.safe_edge_log_insert(
  fn_name text,
  stage text,
  event_data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only insert if we have permission, otherwise skip silently
  BEGIN
    INSERT INTO public.edge_event_log (fn, stage, event_data)
    VALUES (fn_name, stage, event_data);
  EXCEPTION 
    WHEN insufficient_privilege THEN
      -- Log to console but don't fail
      RAISE NOTICE 'Skipping edge log due to permissions: % - %', fn_name, stage;
    WHEN OTHERS THEN
      -- Log other errors but don't fail the main operation
      RAISE NOTICE 'Edge log error (non-fatal): %', SQLERRM;
  END;
END;
$$;