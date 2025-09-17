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
  console.log('[signals-realtime] Setting up subscription...');
  
  const channel = supabase
    .channel('signals-realtime-v4')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'signals'
      },
      (payload) => {
        console.log('[signals-realtime] New signal:', payload.new);
        if (payload.new && Number(payload.new.score) >= 70) {
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
              status: rawSignal.is_active !== false ? 'active' : 'inactive',
              created_at: rawSignal.created_at || new Date().toISOString(),
            };
            onInsert(mappedSignal);
          } catch (mapError) {
            console.error('[signals-realtime] Error mapping new signal:', mapError);
          }
        }
      }
    )
    .on(
      'postgres_changes', 
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'signals'
      },
      (payload) => {
        console.log('[signals-realtime] Updated signal:', payload.new);
        if (payload.new && Number(payload.new.score) >= 70) {
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
              status: rawSignal.is_active !== false ? 'active' : 'inactive',
              created_at: rawSignal.created_at || new Date().toISOString(),
            };
            onUpdate(mappedSignal);
          } catch (mapError) {
            console.error('[signals-realtime] Error mapping updated signal:', mapError);
          }
        }
      }
    )
    .subscribe((status: any, err?: any) => {
      console.log('[signals-realtime] Subscription status:', status);
      if (err) {
        console.error('[signals-realtime] Subscription error:', err);
      } else if (status === 'SUBSCRIBED') {
        console.log('[signals-realtime] ✅ Successfully subscribed to signals channel');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[signals-realtime] ❌ Channel error detected');
      } else if (status === 'TIMED_OUT') {
        console.warn('[signals-realtime] ⏰ Subscription timed out');
      } else if (status === 'CLOSED') {
        console.info('[signals-realtime] 🔌 Channel closed');
      }
    });

  return channel;
}

// Convenience wrapper for strategy signals (legacy support)
export function openSignalsChannel(routeKey?: string) {
  return supabase.channel('strategy_signals_channel');
}