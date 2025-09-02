-- Ensure signals table is properly configured for real-time updates
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Enable real-time for signals table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;

-- Create/update function to handle signal notifications
CREATE OR REPLACE FUNCTION public.notify_signal_insert()
RETURNS trigger AS $$
BEGIN
  -- Log the new signal
  RAISE NOTICE 'New signal created: % % %', NEW.symbol, NEW.direction, NEW.score;
  
  -- Return the new record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new signals
DROP TRIGGER IF EXISTS signal_notification_trigger ON public.signals;
CREATE TRIGGER signal_notification_trigger
  AFTER INSERT ON public.signals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_signal_insert();