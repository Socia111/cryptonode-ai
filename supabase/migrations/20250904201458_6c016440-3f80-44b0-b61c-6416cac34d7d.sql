-- Additional critical security fixes: Fix remaining high-priority vulnerabilities
-- (Fixed severity constraint issue)

-- Fix configs table - remove anonymous access
DROP POLICY IF EXISTS "Anyone can view configs" ON public.configs;

-- Create secure config policies - only authenticated users can view configs
CREATE POLICY "Authenticated users can view configs" 
ON public.configs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix spynx_scores table - remove anonymous access  
DROP POLICY IF EXISTS "Anyone can view spynx scores" ON public.spynx_scores;

-- Create secure spynx_scores policy - only authenticated users can view scores
CREATE POLICY "Authenticated users can view spynx scores" 
ON public.spynx_scores 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix scanner_signals table - remove anonymous access
DROP POLICY IF EXISTS "Anyone can view scanner signals" ON public.scanner_signals;

-- Create secure scanner_signals policy - only authenticated users can view signals
CREATE POLICY "Authenticated users can view scanner signals" 
ON public.scanner_signals 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix scans table - remove anonymous access
DROP POLICY IF EXISTS "Anyone can view scans" ON public.scans;

-- Create secure scans policy - only authenticated users can view scans
CREATE POLICY "Authenticated users can view scans" 
ON public.scans 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix quantum_analysis table - remove anonymous access  
DROP POLICY IF EXISTS "Anyone can view quantum analysis" ON public.quantum_analysis;

-- Create secure quantum_analysis policy - only authenticated users can view analysis
CREATE POLICY "Authenticated users can view quantum analysis" 
ON public.quantum_analysis 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix aira_rankings table - secure the public read access
DROP POLICY IF EXISTS "Public read access to AIRA rankings" ON public.aira_rankings;

-- Create secure aira_rankings policy - only authenticated users can view rankings
CREATE POLICY "Authenticated users can view AIRA rankings" 
ON public.aira_rankings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix markets table - remove overly permissive public access
DROP POLICY IF EXISTS "read_markets_public" ON public.markets;

-- Fix exchanges table - remove public access  
DROP POLICY IF EXISTS "read_all_exchanges" ON public.exchanges;

-- Create secure exchanges policy
CREATE POLICY "Authenticated users can view exchanges" 
ON public.exchanges 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix candles_1m table - remove public access
DROP POLICY IF EXISTS "read_candles" ON public.candles_1m;

-- Create secure candles policy
CREATE POLICY "Authenticated users can view candles" 
ON public.candles_1m 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Log the additional security hardening (with correct severity)
INSERT INTO public.security_audit_log (
  action,
  session_data,
  severity,
  ip_address
) VALUES (
  'additional_security_hardening_phase2',
  jsonb_build_object(
    'tables_secured', jsonb_build_array(
      'configs - removed anonymous access',
      'spynx_scores - removed anonymous access', 
      'scanner_signals - removed anonymous access',
      'scans - removed anonymous access',
      'quantum_analysis - removed anonymous access',
      'aira_rankings - removed public access',
      'markets - removed public access policy',
      'exchanges - removed public access',
      'candles_1m - removed public access'
    ),
    'impact', 'Major reduction in data exposure to anonymous users',
    'phase', 2,
    'timestamp', now()
  ),
  'critical',
  '127.0.0.1'
);