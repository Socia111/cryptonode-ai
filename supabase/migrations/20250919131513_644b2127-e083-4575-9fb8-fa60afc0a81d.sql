-- Fix execution_orders RLS policies for automated trading
DROP POLICY IF EXISTS "exec_orders_insert_auth" ON public.execution_orders;
DROP POLICY IF EXISTS "exec_orders_service_all" ON public.execution_orders;
DROP POLICY IF EXISTS "Authenticated users can insert execution orders" ON public.execution_orders;

-- Create proper policies for execution orders
CREATE POLICY "execution_orders_read_own" ON public.execution_orders
FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "execution_orders_insert_authenticated" ON public.execution_orders
FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "execution_orders_service_manage" ON public.execution_orders
FOR ALL USING (auth.role() = 'service_role');

-- Fix automated trading config policies
DROP POLICY IF EXISTS "Users can manage own trading config" ON public.automated_trading_config;

CREATE POLICY "automated_trading_read_own" ON public.automated_trading_config
FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "automated_trading_manage_own" ON public.automated_trading_config
FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role')
WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Fix signals policies for better access
DROP POLICY IF EXISTS "Public read live active signals" ON public.signals;
DROP POLICY IF EXISTS "service-only-mutate" ON public.signals;

CREATE POLICY "signals_read_active" ON public.signals
FOR SELECT USING (is_active = true AND score >= 60);

CREATE POLICY "signals_service_manage" ON public.signals
FOR ALL USING (auth.role() = 'service_role');

-- Ensure live market data is properly accessible
DROP POLICY IF EXISTS "Universal read access to live market data" ON public.live_market_data;

CREATE POLICY "live_market_data_read_all" ON public.live_market_data
FOR SELECT USING (true);