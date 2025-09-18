-- Phase 1: Fix execution_orders RLS policies for edge functions
-- Grant service role permission to manage execution_orders

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "execution_orders_insert_policy" ON execution_orders;
DROP POLICY IF EXISTS "execution_orders_update_policy" ON execution_orders;

-- Create comprehensive policies for execution_orders
CREATE POLICY "Service role can manage execution orders" 
ON execution_orders FOR ALL 
USING ((auth.role() = 'service_role'::text) OR (auth.uid() = user_id))
WITH CHECK ((auth.role() = 'service_role'::text) OR (auth.uid() = user_id));

-- Allow edge functions to insert paper trading orders
CREATE POLICY "Edge functions can insert paper orders" 
ON execution_orders FOR INSERT 
WITH CHECK (paper_mode = true);

-- Allow anonymous reading of paper trading orders for demo purposes
CREATE POLICY "Public read access to paper orders" 
ON execution_orders FOR SELECT 
USING (paper_mode = true);

-- Ensure live_market_data is accessible for price fetching
CREATE POLICY "Public read access to live market data for trading" 
ON live_market_data FOR SELECT 
USING (true);