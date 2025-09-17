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
  // Create a more robust subscription with proper error handling
  const channel = supabase
    .channel('signals-realtime', {
      config: {
        broadcast: { self: false },
        presence: { key: 'signals' }
      }
    })
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'signals' },
      (payload) => {
        try {
          if (!payload.new) {
            console.warn('[signals-realtime] INSERT payload missing new data');
            return;
          }

          const rawSignal = payload.new;
          console.log('[signals-realtime] Raw INSERT payload:', rawSignal);
          
          // Only process signals with valid required fields
          if (!rawSignal.id || !rawSignal.symbol || !rawSignal.direction) {
            console.warn('[signals-realtime] INSERT missing required fields:', rawSignal);
            return;
          }

          const mappedSignal: Signal = {
            id: rawSignal.id.toString(),
            token: rawSignal.symbol?.replace('USDT', '/USDT') || 'UNKNOWN/USDT',
            direction: rawSignal.direction === 'LONG' ? 'BUY' : 'SELL',
            signal_type: `${rawSignal.algo || 'AItradeX1'} ${rawSignal.timeframe || '1h'}`,
            timeframe: rawSignal.timeframe || '1h',
            entry_price: Number(rawSignal.entry_price || rawSignal.price || 0),
            exit_target: rawSignal.take_profit ? Number(rawSignal.take_profit) : null,
            stop_loss: rawSignal.stop_loss ? Number(rawSignal.stop_loss) : null,
            leverage: 1,
            confidence_score: Number(rawSignal.score || 0),
            pms_score: Number(rawSignal.score || 0),
            trend_projection: rawSignal.direction === 'LONG' ? '⬆️' : '⬇️',
            volume_strength: 1.0,
            roi_projection: rawSignal.take_profit && (rawSignal.entry_price || rawSignal.price) ? 
              Math.abs((Number(rawSignal.take_profit) - Number(rawSignal.entry_price || rawSignal.price)) / Number(rawSignal.entry_price || rawSignal.price) * 100) : 10,
            signal_strength: rawSignal.score > 85 ? 'STRONG' : rawSignal.score > 75 ? 'MEDIUM' : 'WEAK',
            risk_level: rawSignal.score > 85 ? 'LOW' : rawSignal.score > 75 ? 'MEDIUM' : 'HIGH',
            quantum_probability: Number(rawSignal.score || 0) / 100,
            status: 'active',
            created_at: rawSignal.created_at || new Date().toISOString(),
          };
          
          console.log('[signals-realtime] New signal mapped:', mappedSignal);
          onInsert(mappedSignal);
        } catch (error) {
          console.error('[signals-realtime] Error mapping INSERT signal:', error, payload);
        }
      })
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'signals' },
      (payload) => {
        try {
          if (!payload.new) {
            console.warn('[signals-realtime] UPDATE payload missing new data');
            return;
          }

          const rawSignal = payload.new;
          console.log('[signals-realtime] Raw UPDATE payload:', rawSignal);
          
          // Only process signals with valid required fields
          if (!rawSignal.id || !rawSignal.symbol || !rawSignal.direction) {
            console.warn('[signals-realtime] UPDATE missing required fields:', rawSignal);
            return;
          }

          const mappedSignal: Signal = {
            id: rawSignal.id.toString(),
            token: rawSignal.symbol?.replace('USDT', '/USDT') || 'UNKNOWN/USDT',
            direction: rawSignal.direction === 'LONG' ? 'BUY' : 'SELL',
            signal_type: `${rawSignal.algo || 'AItradeX1'} ${rawSignal.timeframe || '1h'}`,
            timeframe: rawSignal.timeframe || '1h',
            entry_price: Number(rawSignal.entry_price || rawSignal.price || 0),
            exit_target: rawSignal.take_profit ? Number(rawSignal.take_profit) : null,
            stop_loss: rawSignal.stop_loss ? Number(rawSignal.stop_loss) : null,
            leverage: 1,
            confidence_score: Number(rawSignal.score || 0),
            pms_score: Number(rawSignal.score || 0),
            trend_projection: rawSignal.direction === 'LONG' ? '⬆️' : '⬇️',
            volume_strength: 1.0,
            roi_projection: rawSignal.take_profit && (rawSignal.entry_price || rawSignal.price) ? 
              Math.abs((Number(rawSignal.take_profit) - Number(rawSignal.entry_price || rawSignal.price)) / Number(rawSignal.entry_price || rawSignal.price) * 100) : 10,
            signal_strength: rawSignal.score > 85 ? 'STRONG' : rawSignal.score > 75 ? 'MEDIUM' : 'WEAK',
            risk_level: rawSignal.score > 85 ? 'LOW' : rawSignal.score > 75 ? 'MEDIUM' : 'HIGH',
            quantum_probability: Number(rawSignal.score || 0) / 100,
            status: 'active',
            created_at: rawSignal.created_at || new Date().toISOString(),
          };
          
          console.log('[signals-realtime] Updated signal mapped:', mappedSignal);
          onUpdate(mappedSignal);
        } catch (error) {
          console.error('[signals-realtime] Error mapping UPDATE signal:', error, payload);
        }
      })
    .subscribe((status, err) => {
      console.log(`[signals-realtime] Subscription status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        console.log('[signals-realtime] ✅ Successfully subscribed to signals');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[signals-realtime] ❌ Channel error:', err);
      } else if (status === 'CLOSED') {
        console.log('[signals-realtime] 🔌 Connection closed');
      } else if (status === 'TIMED_OUT') {
        console.warn('[signals-realtime] ⏰ Subscription timed out');
      }
    });

  return channel;
}

// Convenience wrapper for strategy signals (legacy support)
export function openSignalsChannel(routeKey?: string) {
  return supabase.channel('strategy_signals_channel');
}