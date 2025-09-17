import { supabase } from '@/integrations/supabase/client';

export type Signal = {
  id: string;
  token: string;
  direction: 'BUY' | 'SELL';
  confidence_score: number;
  entry_price: number;
  stop_loss?: number | null;
  exit_target?: number | null;
  timeframe: string;
  signal_type: string;
  leverage: number;
  pms_score: number;
  trend_projection: '⬆️' | '⬇️';
  volume_strength: number;
  roi_projection: number;
  signal_strength: 'WEAK' | 'MEDIUM' | 'STRONG';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  quantum_probability: number;
  status: 'active' | 'inactive';
  created_at: string;
};

export function subscribeSignals(
  onInsert: (signal: Signal) => void,
  onUpdate: (signal: Signal) => void,
) {
  try {
    const channel = supabase
      .channel('signals-realtime-v2')
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'signals'
        },
        (payload) => {
          if (payload.new) {
            try {
              const rawSignal = payload.new;
              const mappedSignal: Signal = {
                id: rawSignal.id.toString(),
                token: rawSignal.symbol?.replace('USDT', '/USDT') || 'UNKNOWN/USDT',
                direction: rawSignal.direction === 'LONG' ? 'BUY' : 'SELL',
                signal_type: `${rawSignal.algo || 'AItradeX1'} ${rawSignal.timeframe}`,
                timeframe: rawSignal.timeframe || '1h',
                entry_price: Number(rawSignal.entry_price || rawSignal.price || 0),
                exit_target: rawSignal.take_profit ? Number(rawSignal.take_profit) : null,
                stop_loss: rawSignal.stop_loss ? Number(rawSignal.stop_loss) : null,
                leverage: 1,
                confidence_score: Number(rawSignal.confidence || rawSignal.score || 0),
                pms_score: Number(rawSignal.score || 0),
                trend_projection: rawSignal.direction === 'LONG' ? '⬆️' : '⬇️',
                volume_strength: 1.0,
                roi_projection: rawSignal.take_profit && rawSignal.entry_price ? 
                  Math.abs((Number(rawSignal.take_profit) - Number(rawSignal.entry_price)) / Number(rawSignal.entry_price) * 100) : 10,
                signal_strength: Number(rawSignal.score) > 85 ? 'STRONG' : Number(rawSignal.score) > 75 ? 'MEDIUM' : 'WEAK',
                risk_level: Number(rawSignal.score) > 85 ? 'LOW' : Number(rawSignal.score) > 75 ? 'MEDIUM' : 'HIGH',
                quantum_probability: Number(rawSignal.score || 0) / 100,
                status: 'active',
                created_at: rawSignal.created_at || new Date().toISOString(),
              };
              
              console.log('[signals-realtime] New signal received:', mappedSignal);
              onInsert(mappedSignal);
            } catch (error) {
              console.error('[signals-realtime] Error mapping new signal:', error);
            }
          }
        })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[signals-realtime] Successfully subscribed to signals channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[signals-realtime] Channel error, retrying...:', err);
          // Auto-retry after delay
          setTimeout(() => {
            try {
              channel.unsubscribe();
              subscribeSignals(onInsert, onUpdate);
            } catch (retryErr) {
              console.warn('[signals-realtime] Retry failed:', retryErr);
            }
          }, 5000);
        } else if (status === 'CLOSED') {
          console.log('[signals-realtime] Channel closed');
        } else {
          console.log('[signals-realtime] Status:', status);
        }
      });

    return channel;
  } catch (error) {
    console.error('[signals-realtime] Subscription setup failed:', error);
    return null;
  }
}

// Convenience wrapper for strategy signals (legacy support)
export function openSignalsChannel(routeKey?: string) {
  return supabase.channel('strategy_signals_channel');
}