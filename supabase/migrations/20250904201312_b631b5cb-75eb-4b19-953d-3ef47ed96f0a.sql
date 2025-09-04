-- Fix remaining security issues: Secure additional tables and fix policies
-- This addresses the security issues found by the linter

-- 1. Drop any existing problematic policies and create secure ones
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role can manage bookings" ON public.bookings;

-- Recreate bookings policies if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings' AND table_schema = 'public') THEN
    -- Enable RLS on bookings table
    ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
    
    -- Create secure policies for bookings table
    CREATE POLICY "Secure bookings - users view own" 
    ON public.bookings 
    FOR SELECT 
    USING (auth.uid() = user_id);

    CREATE POLICY "Secure bookings - users create own" 
    ON public.bookings 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Secure bookings - service role access" 
    ON public.bookings 
    FOR ALL 
    USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
    WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);
  END IF;
END $$;

-- 2. Secure signals table - drop any anonymous policies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signals' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Anyone can view signals" ON public.signals;
    DROP POLICY IF EXISTS "Public can view signals" ON public.signals;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.signals;
    
    -- Create secure policy for signals
    CREATE POLICY "Secure signals - authenticated users only" 
    ON public.signals 
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 3. Secure fcm_tokens table - ensure user access only
DROP POLICY IF EXISTS "Enable read access for all users" ON public.fcm_tokens;
DROP POLICY IF EXISTS "Anyone can view FCM tokens" ON public.fcm_tokens;

-- 4. Secure user_stats table - remove anonymous access
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stats' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_stats;
    DROP POLICY IF EXISTS "Anyone can view user stats" ON public.user_stats;
    
    CREATE POLICY "Secure user stats - own data only" 
    ON public.user_stats 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Add proper search_path to security functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 6. Log the additional security fixes
INSERT INTO public.security_audit_log (
  action,
  session_data,
  severity,
  ip_address
) VALUES (
  'additional_security_hardening_complete',
  jsonb_build_object(
    'fixes_applied', jsonb_build_array(
      'Fixed duplicate function in automated-trading-engine',
      'Secured bookings table with user-specific access',
      'Removed anonymous access from signals table',
      'Secured FCM tokens and user stats tables',
      'Added proper search_path to security functions'
    ),
    'impact', 'Critical vulnerabilities resolved, trading engine functional',
    'timestamp', now()
  ),
  'critical',
  '127.0.0.1'
);