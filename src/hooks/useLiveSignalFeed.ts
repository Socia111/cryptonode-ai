import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TradingSignal } from '@/types/trading';
import { enhanceSignal } from '@/lib/signalCalculations';
import { toast } from 'sonner';

interface LiveSignalFeedData {
  signals: TradingSignal[];
  loading: boolean;
  error: string | null;
  newSignalsCount: number;
  lastUpdate: Date | null;
  refreshSignals: () => Promise<void>;
  markSignalsAsRead: () => void;
}

export function useLiveSignalFeed(): LiveSignalFeedData {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSignalsCount, setNewSignalsCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('signals')
        .select('*')
        .eq('is_active', true)
        .gte('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // Last 4 hours
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error('Error fetching signals:', fetchError);
        setError(fetchError.message);
        return;
      }

      const enhancedSignals = (data || []).map(signal => {
        const enhanced = enhanceSignal({
          ...signal,
          side: signal.direction,
          confidence_score: signal.confidence || signal.score || 0,
          generated_at: signal.created_at
        });

        // Mark as new if created in last 3 minutes
        const isNew = new Date(signal.created_at).getTime() > Date.now() - 3 * 60 * 1000;
        return { ...enhanced, isNew };
      });

      setSignals(enhancedSignals);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error in fetchSignals:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time subscription for new signals
  useEffect(() => {
    const channel = supabase
      .channel('signals-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload) => {
          console.log('New signal received:', payload.new);
          
          const newSignal = enhanceSignal({
            ...payload.new,
            side: payload.new.direction,
            confidence_score: payload.new.confidence || payload.new.score || 0,
            generated_at: payload.new.created_at,
            isNew: true
          });

          setSignals(prev => [newSignal, ...prev.slice(0, 49)]);
          setNewSignalsCount(prev => prev + 1);
          setLastUpdate(new Date());

          // Show toast for high-confidence signals
          if (newSignal.confidence_score >= 70) {
            toast.success(
              `New ${newSignal.confidence_score.toFixed(0)}% signal: ${newSignal.symbol} ${newSignal.side}`,
              {
                description: `Entry: $${newSignal.entry_price.toFixed(4)} | R:R ${newSignal.r_r_ratio}`,
                duration: 5000
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchSignals();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const markSignalsAsRead = useCallback(() => {
    setNewSignalsCount(0);
    setSignals(prev => prev.map(signal => ({ ...signal, isNew: false })));
  }, []);

  const refreshSignals = useCallback(async () => {
    setLoading(true);
    await fetchSignals();
  }, [fetchSignals]);

  return {
    signals,
    loading,
    error,
    newSignalsCount,
    lastUpdate,
    refreshSignals,
    markSignalsAsRead
  };
}