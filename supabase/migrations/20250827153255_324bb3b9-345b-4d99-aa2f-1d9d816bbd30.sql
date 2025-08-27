-- Security hardening migration: Fix and enhance authentication

-- Check if profiles table exists, if not create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    CREATE TABLE public.profiles (
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
  END IF;
END $$;

-- Create secure RLS policies for profiles (replace existing ones)
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

-- Secure signals table - require authentication
DROP POLICY IF EXISTS "signals_read_authenticated" ON public.signals;
DROP POLICY IF EXISTS "signals_insert_authenticated" ON public.signals;

CREATE POLICY "signals_read_authenticated"
  ON public.signals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "signals_insert_service_role"
  ON public.signals FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role'::text) = 'service_role'::text OR
    auth.uid() IS NOT NULL
  );

-- Secure strategy_signals table 
DROP POLICY IF EXISTS "strategy_signals_read_authenticated" ON public.strategy_signals;
DROP POLICY IF EXISTS "strategy_signals_insert_authenticated" ON public.strategy_signals;
DROP POLICY IF EXISTS "signals_read_own_or_public" ON public.strategy_signals;
DROP POLICY IF EXISTS "signals_write_self" ON public.strategy_signals;

CREATE POLICY "strategy_signals_read_authenticated"
  ON public.strategy_signals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "strategy_signals_insert_service_role"
  ON public.strategy_signals FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role'::text) = 'service_role'::text OR
    auth.uid() IS NOT NULL
  );

-- Function to create user profile on signup (using correct search path)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup (drop if exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to log security events (using existing table structure)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_session_data JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    session_data,
    severity,
    ip_address
  ) VALUES (
    auth.uid(),
    p_action,
    p_session_data,
    p_severity,
    inet_client_addr()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't let logging failures break the application
    RAISE WARNING 'Failed to log security event: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
  'security_hardening_authentication_phase_complete',
  jsonb_build_object(
    'changes', jsonb_build_array(
      'Implemented user authentication system',
      'Secured signals tables with authentication requirements', 
      'Created user profiles with secure RLS policies',
      'Added automated user profile creation on signup',
      'Enhanced security audit logging'
    ),
    'timestamp', now(),
    'phase', 'authentication_security'
  ),
  'info'
);