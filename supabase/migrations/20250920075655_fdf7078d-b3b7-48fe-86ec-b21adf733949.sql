-- Create missing tables without conflicts

-- Create edge_event_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.edge_event_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fn TEXT NOT NULL,
  stage TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on edge_event_log
ALTER TABLE public.edge_event_log ENABLE ROW LEVEL SECURITY;

-- Create app_settings table if it doesn't exist  
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

-- Create api_keys table if it doesn't exist
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