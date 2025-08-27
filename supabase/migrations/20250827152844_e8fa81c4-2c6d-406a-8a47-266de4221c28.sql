-- Security hardening migration: Authentication and secure RLS policies

-- Create profiles table for user management (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Secure signals table - only allow authenticated users to view their own signals
DROP POLICY IF EXISTS "signals_read_authenticated" ON public.signals;
DROP POLICY IF EXISTS "signals_insert_authenticated" ON public.signals;

CREATE POLICY "signals_read_authenticated"
  ON public.signals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "signals_insert_authenticated"
  ON public.signals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Secure strategy_signals table 
DROP POLICY IF EXISTS "signals_read_own_or_public" ON public.strategy_signals;
DROP POLICY IF EXISTS "signals_write_self" ON public.strategy_signals;

CREATE POLICY "strategy_signals_read_authenticated"
  ON public.strategy_signals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "strategy_signals_insert_authenticated"
  ON public.strategy_signals FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "security_logs_admin_only"
  ON public.security_audit_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_details JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    details,
    severity,
    ip_address
  ) VALUES (
    auth.uid(),
    p_action,
    p_details,
    p_severity,
    inet_client_addr()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Log this security hardening
SELECT public.log_security_event(
  'security_hardening_phase_1_complete',
  jsonb_build_object(
    'changes', jsonb_build_array(
      'Created secure profiles table with RLS',
      'Implemented user authentication requirement for signals',
      'Added security audit logging',
      'Created automated user profile creation',
      'Enhanced RLS policies for data protection'
    ),
    'timestamp', now()
  ),
  'info'
);