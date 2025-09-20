-- Create policies for the new tables

-- Create policies for edge_event_log
DROP POLICY IF EXISTS "Service role manages edge_event_log" ON public.edge_event_log;
DROP POLICY IF EXISTS "Authenticated users can read edge_event_log" ON public.edge_event_log;

CREATE POLICY "Service role manages edge_event_log"
ON public.edge_event_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can read edge_event_log"
ON public.edge_event_log
FOR SELECT
TO authenticated
USING (true);

-- Create policies for app_settings
DROP POLICY IF EXISTS "Service role manages app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON public.app_settings;

CREATE POLICY "Service role manages app_settings"
ON public.app_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can read app_settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- Create policies for api_keys
DROP POLICY IF EXISTS "Users can manage their own api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Service role manages api_keys" ON public.api_keys;

CREATE POLICY "Users can manage their own api_keys"
ON public.api_keys
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages api_keys"
ON public.api_keys
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);