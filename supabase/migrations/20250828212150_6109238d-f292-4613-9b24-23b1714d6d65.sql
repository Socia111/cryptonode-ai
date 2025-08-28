-- Add configuration table for scheduler settings
CREATE TABLE IF NOT EXISTS public.configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view configs" 
ON public.configs 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage configs" 
ON public.configs 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_configs_key ON public.configs (key);

-- Insert default scheduler configuration
INSERT INTO public.configs (key, value) VALUES 
('scheduler_config', '{
  "enable_aitradex": true,
  "enable_aira": true,
  "scan_intervals": {
    "aitradex_minutes": 5,
    "aira_minutes": 15
  },
  "symbols_limit": 100
}'::jsonb)
ON CONFLICT (key) DO NOTHING;