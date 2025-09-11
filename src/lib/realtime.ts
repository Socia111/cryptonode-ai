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

function mapPayloadToSignal(rawSignal: any): Signal {
  if (!rawSignal) {
    throw new Error('Invalid signal payload');
  }

  return {
    id: String(rawSignal.id || ''),
    token: rawSignal.symbol?.replace('USDT', '/USDT') || 'UNKNOWN/USDT',
    direction: rawSignal.direction === 'LONG' ? 'BUY' : 'SELL',
    signal_type: `${rawSignal.algo || 'AItradeX1'} ${rawSignal.timeframe || '1h'}`,
    timeframe: rawSignal.timeframe || '1h',
    entry_price: Number(rawSignal.price || rawSignal.entry_price || 0),
    exit_target: rawSignal.tp ? Number(rawSignal.tp) : null,
    stop_loss: rawSignal.sl ? Number(rawSignal.sl) : null,
    leverage: Number(rawSignal.leverage || 1),
    confidence_score: Number(rawSignal.score || rawSignal.confidence_score || 0),
    pms_score: Number(rawSignal.score || rawSignal.pms_score || 0),
    trend_projection: rawSignal.direction === 'LONG' ? '⬆️' : '⬇️',
    volume_strength: Number(rawSignal.volume_strength || 1.0),
    roi_projection: rawSignal.tp && rawSignal.price ? 
      Math.abs((Number(rawSignal.tp) - Number(rawSignal.price)) / Number(rawSignal.price) * 100) : 10,
    signal_strength: rawSignal.score > 85 ? 'STRONG' : rawSignal.score > 75 ? 'MEDIUM' : 'WEAK',
    risk_level: rawSignal.score > 85 ? 'LOW' : rawSignal.score > 75 ? 'MEDIUM' : 'HIGH',
    quantum_probability: Number(rawSignal.score || rawSignal.quantum_probability || 0) / 100,
    status: 'active',
    created_at: rawSignal.created_at || new Date().toISOString(),
  };
}

export function subscribeSignals(
  onInsert: (signal: Signal) => void,
  onUpdate: (signal: Signal) => void,
) {
  let channel: any = null;
  let retryCount = 0;
  const maxRetries = 3;
  
  const setupSubscription = () => {
    try {
      console.log('[Realtime] Setting up signals subscription...');
      
      channel = supabase
        .channel('signals_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'signals'
          },
          (payload) => {
            console.log('[Realtime] New signal received:', payload);
            try {
              const signal = mapPayloadToSignal(payload.new);
              onInsert(signal);
            } catch (error) {
              console.error('[Realtime] Error mapping INSERT payload:', error);
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
            console.log('[Realtime] Signal updated:', payload);
            try {
              const signal = mapPayloadToSignal(payload.new);
              onUpdate(signal);
            } catch (error) {
              console.error('[Realtime] Error mapping UPDATE payload:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] Successfully subscribed to signals');
            retryCount = 0; // Reset retry count on success
          } else if (status === 'CLOSED') {
            console.warn('[Realtime] Signals subscription closed');
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`[Realtime] Retrying subscription (${retryCount}/${maxRetries})...`);
              setTimeout(() => setupSubscription(), 2000 * retryCount);
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[Realtime] Signals subscription error');
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`[Realtime] Retrying after error (${retryCount}/${maxRetries})...`);
              setTimeout(() => setupSubscription(), 3000 * retryCount);
            }
          }
        });

      return channel;
    } catch (error) {
      console.error('[Realtime] Failed to setup subscription:', error);
      return null;
    }
  };

  return setupSubscription();
}

// Convenience wrapper for strategy signals (legacy support)
export function openSignalsChannel(routeKey?: string) {
  return supabase.channel('strategy_signals_channel');
}