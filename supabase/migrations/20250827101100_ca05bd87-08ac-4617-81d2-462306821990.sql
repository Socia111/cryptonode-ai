-- Create telegram_notifications table for tracking sent notifications
CREATE TABLE IF NOT EXISTS public.telegram_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'signal_alert',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_score NUMERIC,
  channel_type TEXT CHECK (channel_type IN ('free', 'premium', 'both')) DEFAULT 'both',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can manage telegram notifications"
ON public.telegram_notifications
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_telegram_notifications_signal_id ON public.telegram_notifications(signal_id);
CREATE INDEX IF NOT EXISTS idx_telegram_notifications_sent_at ON public.telegram_notifications(sent_at);