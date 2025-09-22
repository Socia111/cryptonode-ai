-- Enable realtime for signals table
ALTER TABLE signals REPLICA IDENTITY FULL;

-- Add signals table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE signals;

-- Generate fresh signals immediately
SELECT net.http_post(
  url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/comprehensive-live-system',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGhsd2pvZ2ZqeXdtanlqYmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMDc2OCwiZXhwIjoyMDY5MDg2NzY4fQ.ZQpVIrWL1HTGXRTOrhL-pLq3qAUvJQBCLG1F6P6nfj0"}'::jsonb,
  body := '{"force_generation": true, "timeframe": "1h"}'::jsonb
);