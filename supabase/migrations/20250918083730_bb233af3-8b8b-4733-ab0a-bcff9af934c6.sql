-- Enable realtime for signals table
ALTER TABLE public.signals REPLICA IDENTITY FULL;

-- Add signals table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;

-- Ensure other tables have realtime enabled too
ALTER TABLE public.execution_orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.execution_orders;

-- Fix any potential RLS policy conflicts
CREATE OR REPLACE FUNCTION public.signals_realtime_policy()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow realtime events for all signals
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;