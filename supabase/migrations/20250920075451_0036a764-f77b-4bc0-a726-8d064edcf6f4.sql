-- Create missing tables that don't exist yet

-- Check if edge_event_log table exists, if not create it
CREATE TABLE IF NOT EXISTS public.edge_event_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fn TEXT NOT NULL,
  stage TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on edge_event_log
ALTER TABLE public.edge_event_log ENABLE ROW LEVEL SECURITY;

-- Check if app_settings table exists, if not create it
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Check if api_keys table exists, if not create it
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service TEXT NOT NULL,
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Add missing details column to existing system_status table
ALTER TABLE public.system_status ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';

-- Create policies for edge_event_log (drop existing first)
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

-- Create policies for app_settings (drop existing first)
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

-- Create policies for api_keys (drop existing first)
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

-- Insert initial app settings
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
('signal_confidence_threshold', '"60"', 'Minimum confidence score for signals'),
('max_signals_per_timeframe', '"10"', 'Maximum signals to generate per timeframe'),
('trading_enabled', '"false"', 'Global trading enable/disable flag')
ON CONFLICT (setting_key) DO NOTHING;