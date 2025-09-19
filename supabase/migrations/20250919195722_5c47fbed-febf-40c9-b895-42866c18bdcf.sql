-- Fix app_settings table permissions for authenticated users
-- Drop existing policies first
DROP POLICY IF EXISTS "Authenticated users can read app settings" ON app_settings;
DROP POLICY IF EXISTS "Service role can manage app settings" ON app_settings;

-- Create proper RLS policies for app_settings
CREATE POLICY "Public read access to app settings"
ON app_settings FOR SELECT
USING (true);

CREATE POLICY "Service role manages app settings"
ON app_settings FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Ensure RLS is enabled
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;