-- Enable real-time for signals table
ALTER TABLE signals REPLICA IDENTITY FULL;

-- Add signals table to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE signals;