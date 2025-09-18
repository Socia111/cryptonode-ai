-- Fix execution_orders RLS policy to allow authenticated access
UPDATE pg_policy 
SET polpermissive = 'PERMISSIVE',
    polqual = 'auth.uid() IS NOT NULL OR auth.role() = ''service_role''::text OR paper_mode = true',
    polwithcheck = 'auth.uid() IS NOT NULL OR auth.role() = ''service_role''::text OR paper_mode = true'
WHERE polname = 'execution_orders_authenticated_access' 
AND polrelid = (SELECT oid FROM pg_class WHERE relname = 'execution_orders');

-- Allow public read access to exchange_feed_status for authenticated users
CREATE POLICY IF NOT EXISTS "exchange_feed_status_public_read" 
ON exchange_feed_status FOR SELECT 
TO authenticated, anon
USING (true);