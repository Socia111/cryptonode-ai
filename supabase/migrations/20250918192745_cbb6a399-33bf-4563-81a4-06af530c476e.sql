-- Create public read access for exchange_feed_status
CREATE POLICY "exchange_feed_status_read_public" 
ON exchange_feed_status FOR SELECT 
USING (true);

-- Create public read access for execution_orders when authenticated or paper mode
CREATE POLICY "execution_orders_read_public" 
ON execution_orders FOR SELECT 
USING (auth.uid() IS NOT NULL OR paper_mode = true);