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
  const channel = supabase
    .channel('signals-realtime')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'signals' },
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
              entry_price: Number(rawSignal.price || 0),
              exit_target: rawSignal.tp ? Number(rawSignal.tp) : null,
              stop_loss: rawSignal.sl ? Number(rawSignal.sl) : null,
              leverage: 1,
              confidence_score: Number(rawSignal.score || 0),
              pms_score: Number(rawSignal.score || 0),
              trend_projection: rawSignal.direction === 'LONG' ? '⬆️' : '⬇️',
              volume_strength: 1.0,
              roi_projection: rawSignal.tp && rawSignal.price ? 
                Math.abs((Number(rawSignal.tp) - Number(rawSignal.price)) / Number(rawSignal.price) * 100) : 10,
              signal_strength: rawSignal.score > 85 ? 'STRONG' : rawSignal.score > 75 ? 'MEDIUM' : 'WEAK',
              risk_level: rawSignal.score > 85 ? 'LOW' : rawSignal.score > 75 ? 'MEDIUM' : 'HIGH',
              quantum_probability: Number(rawSignal.score || 0) / 100,
              status: 'active',
              created_at: rawSignal.created_at || new Date().toISOString(),
            };
            
            console.log('New signal received:', mappedSignal);
            onInsert(mappedSignal);
          } catch (error) {
            console.error('Error mapping new signal:', error);
          }
        }
      })
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'signals' },
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
              entry_price: Number(rawSignal.price || 0),
              exit_target: rawSignal.tp ? Number(rawSignal.tp) : null,
              stop_loss: rawSignal.sl ? Number(rawSignal.sl) : null,
              leverage: 1,
              confidence_score: Number(rawSignal.score || 0),
              pms_score: Number(rawSignal.score || 0),
              trend_projection: rawSignal.direction === 'LONG' ? '⬆️' : '⬇️',
              volume_strength: 1.0,
              roi_projection: rawSignal.tp && rawSignal.price ? 
                Math.abs((Number(rawSignal.tp) - Number(rawSignal.price)) / Number(rawSignal.price) * 100) : 10,
              signal_strength: rawSignal.score > 85 ? 'STRONG' : rawSignal.score > 75 ? 'MEDIUM' : 'WEAK',
              risk_level: rawSignal.score > 85 ? 'LOW' : rawSignal.score > 75 ? 'MEDIUM' : 'HIGH',
              quantum_probability: Number(rawSignal.score || 0) / 100,
              status: 'active',
              created_at: rawSignal.created_at || new Date().toISOString(),
            };
            
            console.log('Signal updated:', mappedSignal);
            onUpdate(mappedSignal);
          } catch (error) {
            console.error('Error mapping updated signal:', error);
          }
        }
      })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('[signals-realtime] Successfully subscribed to signals channel');
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[signals-realtime] Channel error:', err);
        // Don't spam logs, just handle gracefully
      } else if (status === 'CLOSED') {
        console.log('[signals-realtime] CLOSED');
      } else {
        console.log('[signals-realtime]', status);
      }
    });

  return channel;
}

// Convenience wrapper for strategy signals (legacy support)
export function openSignalsChannel(routeKey?: string) {
  return supabase.channel('strategy_signals_channel');
}