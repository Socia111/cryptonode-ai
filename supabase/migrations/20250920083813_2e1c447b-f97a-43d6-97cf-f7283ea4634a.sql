-- Fix RLS policies for testing tables to allow service role access

-- Enable RLS and create policies for edge_event_log
ALTER TABLE public.edge_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to edge_event_log" 
ON public.edge_event_log 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Enable RLS and create policies for system_status  
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to system_status" 
ON public.system_status 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Enable RLS and create policies for markets
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to markets" 
ON public.markets 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Enable RLS and create policies for api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to api_keys" 
ON public.api_keys 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);