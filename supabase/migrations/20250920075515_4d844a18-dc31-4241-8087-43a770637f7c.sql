-- Fix database permission issues by creating proper policies for existing tables

-- Fix app_settings table structure to match existing schema
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS setting_key TEXT,
ADD COLUMN IF NOT EXISTS setting_value JSONB,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create api_keys table for 3commas integration (must exist for functions to work)
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

-- Create proper policies for api_keys
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

-- Add details column to system_status for compatibility
ALTER TABLE public.system_status ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';

-- Insert some test system status data (using existing metadata column if details doesn't work)
UPDATE public.system_status 
SET metadata = '{"description": "Trading signals generation engine"}'
WHERE service_name = 'signals_engine';

INSERT INTO public.system_status (service_name, status, metadata) VALUES
('signals_engine', 'active', '{"description": "Trading signals generation engine"}'),
('bybit_api', 'active', '{"description": "Bybit API integration"}'),
('3commas_api', 'inactive', '{"description": "3Commas API integration"}'),
('live_scanner', 'active', '{"description": "Live market scanner"}')
ON CONFLICT (service_name) DO NOTHING;