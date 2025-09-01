-- Create SPYNX portfolios table for score tracking
CREATE TABLE IF NOT EXISTS public.spynx_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_name TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
  total_trades INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  roi NUMERIC NOT NULL DEFAULT 0,
  max_drawdown NUMERIC NOT NULL DEFAULT 0,
  sharpe_ratio NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on SPYNX table
ALTER TABLE public.spynx_portfolios ENABLE ROW LEVEL SECURITY;

-- Create policies for SPYNX table
CREATE POLICY "spynx_portfolios_read_authenticated" ON public.spynx_portfolios
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "spynx_portfolios_insert_service_role" ON public.spynx_portfolios
FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'service_role'::text
);

-- Create is_admin function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user has admin role in profiles table
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;