-- Fix all database permission issues and create missing tables

-- Create missing tables first
CREATE TABLE IF NOT EXISTS public.system_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_check TIMESTAMP WITH TIME ZONE DEFAULT now(),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

-- Create edge_event_log table for function logging
CREATE TABLE IF NOT EXISTS public.edge_event_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fn TEXT NOT NULL,
  stage TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS  
ALTER TABLE public.edge_event_log ENABLE ROW LEVEL SECURITY;

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create api_keys table for 3commas and other integrations
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

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for system_status
CREATE POLICY "Service role manages system_status"
ON public.system_status
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can read system_status"
ON public.system_status
FOR SELECT
TO authenticated
USING (true);

-- Create policies for edge_event_log
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

-- Insert some initial system status data (using correct column names)
INSERT INTO public.system_status (service_name, status, details) VALUES
('signals_engine', 'active', '{"description": "Trading signals generation engine"}'),
('bybit_api', 'active', '{"description": "Bybit API integration"}'),
('3commas_api', 'inactive', '{"description": "3Commas API integration"}'),
('live_scanner', 'active', '{"description": "Live market scanner"}')
ON CONFLICT (service_name) DO NOTHING;

-- Insert initial app settings
INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
('signal_confidence_threshold', '60', 'Minimum confidence score for signals'),
('max_signals_per_timeframe', '10', 'Maximum signals to generate per timeframe'),
('trading_enabled', 'false', 'Global trading enable/disable flag')
ON CONFLICT (setting_key) DO NOTHING;