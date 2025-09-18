-- Enable replica identity for trading tables to ensure complete row data is captured
-- Skip adding to publication since they're already there

-- Enable replica identity for signals table
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Enable replica identity for execution_orders table  
ALTER TABLE public.execution_orders REPLICA IDENTITY FULL;

-- Enable replica identity for live_market_data table
ALTER TABLE public.live_market_data REPLICA IDENTITY FULL;

-- Enable replica identity for user_trading_accounts for credential updates
ALTER TABLE public.user_trading_accounts REPLICA IDENTITY FULL;