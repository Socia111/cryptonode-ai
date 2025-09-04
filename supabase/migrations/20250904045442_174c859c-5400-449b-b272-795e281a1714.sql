-- Update trigger function to use 80% threshold instead of 77%
CREATE OR REPLACE FUNCTION public.trigger_signal_automation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only trigger automation for high-confidence signals (80% and above)
  IF NEW.score >= 80 THEN
    PERFORM net.http_post(
      url := 'https://codhlwjogfjywmjyjbbn.supabase.co/functions/v1/signal-automation-trigger',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update default minimum confidence score in user_trading_configs table
ALTER TABLE user_trading_configs ALTER COLUMN min_confidence_score SET DEFAULT 80;