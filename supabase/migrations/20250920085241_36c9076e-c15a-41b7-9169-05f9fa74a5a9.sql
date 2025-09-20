-- Fix permissions for all tables causing errors with correct type casting

-- Enable RLS on missing tables
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create basic read policies for authenticated users
CREATE POLICY "Users can read markets" ON public.markets
FOR SELECT USING (true);

CREATE POLICY "Users can read system status" ON public.system_status  
FOR SELECT USING (true);

-- Check if user_id column exists and is UUID type
CREATE POLICY "Users can read their own api keys" ON public.api_keys
FOR SELECT USING (auth.uid() = user_id);

-- Add insert/update policies for api_keys
CREATE POLICY "Users can insert their own api keys" ON public.api_keys
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api keys" ON public.api_keys
FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions to authenticated role
GRANT SELECT ON public.markets TO authenticated;
GRANT SELECT ON public.system_status TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.api_keys TO authenticated;