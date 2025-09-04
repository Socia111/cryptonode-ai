-- Fix critical security issues: Secure bookings table with proper RLS policies
-- Remove anonymous access and require authentication

-- 1. Enable RLS on bookings table if not already enabled (should be safe to run multiple times)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing overly permissive policies on bookings table
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.bookings;

-- 3. Create secure policies for bookings table
-- Users can only view their own bookings
CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only create bookings for themselves
CREATE POLICY "Users can create their own bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own bookings
CREATE POLICY "Users can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Service role can manage all bookings for edge functions
CREATE POLICY "Service role can manage bookings" 
ON public.bookings 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- 4. Secure user_behavior_tracking table - remove anonymous access
DROP POLICY IF EXISTS "Anyone can view behavior tracking" ON public.user_behavior_tracking;
DROP POLICY IF EXISTS "Public can insert behavior tracking" ON public.user_behavior_tracking;

-- 5. Secure signals table - remove anonymous access  
DROP POLICY IF EXISTS "Anyone can view signals" ON public.signals;
DROP POLICY IF EXISTS "Public can view signals" ON public.signals;

-- Signals should only be viewable by authenticated users
CREATE POLICY "Authenticated users can view signals" 
ON public.signals 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 6. Secure security_audit_log - remove anonymous access
DROP POLICY IF EXISTS "Anyone can view security audit log" ON public.security_audit_log;
DROP POLICY IF EXISTS "Public can view security events" ON public.security_audit_log;

-- Only admins should be able to view security audit logs
CREATE POLICY "Admins can view security audit log" 
ON public.security_audit_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 7. Log the security fix completion
INSERT INTO public.security_audit_log (
  action,
  session_data,
  severity,
  ip_address
) VALUES (
  'critical_security_fixes_applied',
  jsonb_build_object(
    'fixes_applied', jsonb_build_array(
      'Secured bookings table with proper RLS policies',
      'Removed anonymous access from user_behavior_tracking',
      'Restricted signals access to authenticated users only',
      'Limited security_audit_log access to admins only'
    ),
    'impact', 'Critical data exposure vulnerabilities eliminated',
    'timestamp', now()
  ),
  'critical',
  '127.0.0.1'
);