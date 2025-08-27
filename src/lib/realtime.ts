// Realtime channel utilities - ensures unique channels and proper cleanup
import { supabase } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChannelManager {
  ch: RealtimeChannel;
  close: () => void;
}

// Create uniquely named channels with automatic cleanup
export function openChannel(name: string, suffix?: string): ChannelManager {
  const channelName = suffix ? `${name}_${suffix}` : name;
  console.info(`[Realtime] Opening channel: ${channelName}`);
  
  const ch = supabase.channel(channelName);
  
  const close = () => {
    console.info(`[Realtime] Closing channel: ${channelName}`);
    supabase.removeChannel(ch);
  };
  
  return { ch, close };
}

// Convenience wrapper for strategy signals
export function openSignalsChannel(routeKey?: string) {
  return openChannel('strategy_signals_channel', routeKey);
}