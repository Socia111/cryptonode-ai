-- Check current policies on signals table and fix permissions
-- Drop all existing policies first to recreate them properly

DROP POLICY IF EXISTS "Public can view signals" ON public.signals;
DROP POLICY IF EXISTS "Anyone can view signals" ON public.signals;
DROP POLICY IF EXISTS "Service role can manage signals" ON public.signals;

-- Create new policy allowing all roles to view signals
CREATE POLICY "Allow all to view signals" 
ON public.signals 
FOR SELECT 
TO public, authenticated, anon
USING (true);

-- Service role can manage all signals  
CREATE POLICY "Service role manages signals" 
ON public.signals 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Also allow authenticated users to insert signals (for edge functions)
CREATE POLICY "Authenticated can insert signals"
ON public.signals
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Insert some sample signals for testing
INSERT INTO public.signals (symbol, direction, timeframe, price, score, confidence, metadata, bar_time)
VALUES 
('BTCUSDT', 'LONG', '15m', 45000.50, 85, 85.5, '{"source":"live-scanner","volume":1500000}', now() - interval '5 minutes'),
('ETHUSDT', 'LONG', '1h', 2800.25, 88, 88.2, '{"source":"live-scanner","volume":850000}', now() - interval '10 minutes'),
('SOLUSDT', 'SHORT', '30m', 98.75, 82, 82.1, '{"source":"live-scanner","volume":420000}', now() - interval '15 minutes')
ON CONFLICT (id) DO NOTHING;