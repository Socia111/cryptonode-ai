-- Create cron jobs for live AItradeX1 scanner schedule
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule production scans based on recommended timeframes
-- 1m discovery scan (relaxed=true)
SELECT cron.schedule(
  'aitradex1-1m-discovery',
  '*/1 * * * *', -- every minute
  $$
  SELECT net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-scanner-production',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.8K0CK6bKEn2Yq9p-XHxcfJqgq9gxz73gzkzLWlCzL6Y"}'::jsonb,
    body := '{"exchange": "bybit", "timeframe": "1m", "relaxed_filters": true}'::jsonb
  );
  $$
);

-- 5m canonical scan
SELECT cron.schedule(
  'aitradex1-5m-canonical',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-scanner-production',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.8K0CK6bKEn2Yq9p-XHxcfJqgq9gxz73gzkzLWlCzL6Y"}'::jsonb,
    body := '{"exchange": "bybit", "timeframe": "5m", "relaxed_filters": false}'::jsonb
  );
  $$
);

-- 15m canonical scan
SELECT cron.schedule(
  'aitradex1-15m-canonical',
  '*/15 * * * *', -- every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-scanner-production',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.8K0CK6bKEn2Yq9p-XHxcfJqgq9gxz73gzkzLWlCzL6Y"}'::jsonb,
    body := '{"exchange": "bybit", "timeframe": "15m", "relaxed_filters": false}'::jsonb
  );
  $$
);

-- 1h canonical scan (main production timeframe)
SELECT cron.schedule(
  'aitradex1-1h-canonical',
  '0 * * * *', -- every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/live-scanner-production',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.8K0CK6bKEn2Yq9p-XHxcfJqgq9gxz73gzkzLWlCzL6Y"}'::jsonb,
    body := '{"exchange": "bybit", "timeframe": "1h", "relaxed_filters": false}'::jsonb
  );
  $$
);

-- Create indexes for optimized signal queries
CREATE INDEX IF NOT EXISTS idx_signals_exchange_symbol_timeframe_created 
ON public.signals (exchange, symbol, timeframe, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_created_at_desc 
ON public.signals (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_score_desc 
ON public.signals (score DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_log_created_at 
ON public.alerts_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_errors_log_created_at 
ON public.errors_log (created_at DESC);