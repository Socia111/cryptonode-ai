import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Signal, TradeExecution, RealTimeUpdate } from '@/types/trading';

interface UseRealTimeSignalsOptions {
  includeExpired?: boolean;
  minScore?: number;
  symbols?: string[];
  timeframes?: string[];
}

interface RealTimeSignalsData {
  signals: Signal[];
  recentTrades: TradeExecution[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  stats: {
    totalSignals: number;
    activeSignals: number;
    avgScore: number;
    successRate: number;
  };
}

export function useRealTimeSignals(options: UseRealTimeSignalsOptions = {}): RealTimeSignalsData {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const {
    includeExpired = false,
    minScore = 75,
    symbols = [],
    timeframes = []
  } = options;

  useEffect(() => {
    loadInitialData();
    setupRealTimeSubscriptions();

    return () => {
      cleanup();
    };
  }, [includeExpired, minScore, symbols, timeframes]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First trigger live signal generation if no recent signals exist
      const { data: recentSignals } = await supabase
        .from('signals')
        .select('id')
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .limit(1);

      if (!recentSignals || recentSignals.length === 0) {
        console.log('No recent signals found, triggering live signal orchestrator...')
        try {
          await supabase.functions.invoke('live-signal-orchestrator', {
            body: { initialize: true }
          });
        } catch (error) {
          console.log('Error triggering live signals:', error);
        }
      }

      // Build signals query
      let signalsQuery = supabase
        .from('signals')
        .select('*')
        .gte('score', minScore)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (!includeExpired) {
        signalsQuery = signalsQuery.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      }

      if (symbols.length > 0) {
        signalsQuery = signalsQuery.in('symbol', symbols);
      }

      if (timeframes.length > 0) {
        signalsQuery = signalsQuery.in('timeframe', timeframes);
      }

      // Skip trades query entirely to avoid permissions issues for now
      // Focus only on signals which are working
      const tradesResult = { data: [], error: null };
      
      // Execute signals query
      const signalsResult = await signalsQuery;
      
      if (signalsResult.error) throw signalsResult.error;

      setSignals(signalsResult.data || []);
      setRecentTrades(tradesResult?.data || []);
      setLastUpdate(new Date());

    } catch (err) {
      console.error('Failed to load signals data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscriptions = () => {
    // Subscribe to new signals
    const signalsChannel = supabase
      .channel('live-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload: RealTimeUpdate<Signal>) => {
          console.log('📡 New signal received:', payload.new);
          
          if (payload.new && payload.new.score >= minScore) {
            // Apply filters
            if (symbols.length > 0 && !symbols.includes(payload.new.symbol)) return;
            if (timeframes.length > 0 && !timeframes.includes(payload.new.timeframe)) return;

            setSignals(prev => [payload.new as Signal, ...prev].slice(0, 100));
            setLastUpdate(new Date());
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
        (payload: RealTimeUpdate<Signal>) => {
          console.log('📡 Signal updated:', payload.new);
          
          if (payload.new) {
            setSignals(prev => 
              prev.map(signal => 
                signal.id === payload.new?.id ? payload.new as Signal : signal
              )
            );
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe();

    // Subscribe to new trades
    const tradesChannel = supabase
      .channel('live-trades')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'execution_orders'
        },
        (payload: RealTimeUpdate<TradeExecution>) => {
          console.log('📡 New trade executed:', payload.new);
          
          if (payload.new) {
            setRecentTrades(prev => [payload.new as TradeExecution, ...prev].slice(0, 50));
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe();

    // Store channel references for cleanup
    (window as any).__signalsChannel = signalsChannel;
    (window as any).__tradesChannel = tradesChannel;
  };

  const cleanup = () => {
    if ((window as any).__signalsChannel) {
      supabase.removeChannel((window as any).__signalsChannel);
      delete (window as any).__signalsChannel;
    }
    
    if ((window as any).__tradesChannel) {
      supabase.removeChannel((window as any).__tradesChannel);
      delete (window as any).__tradesChannel;
    }
  };

  // Calculate stats
  const stats = {
    totalSignals: signals.length,
    activeSignals: signals.filter(s => 
      s.is_active && (!s.expires_at || new Date(s.expires_at) > new Date())
    ).length,
    avgScore: signals.length > 0 
      ? Math.round(signals.reduce((sum, s) => sum + s.score, 0) / signals.length)
      : 0,
    successRate: recentTrades.length > 0
      ? Math.round((recentTrades.filter(t => t.status === 'executed').length / recentTrades.length) * 100)
      : 0
  };

  return {
    signals,
    recentTrades,
    loading,
    error,
    lastUpdate,
    stats
  };
}

// Utility hook for signal filtering and sorting
export function useSignalFilters(signals: Signal[]) {
  const [filters, setFilters] = useState({
    symbol: '',
    direction: '' as '' | 'LONG' | 'SHORT',
    timeframe: '',
    minScore: 75,
    sortBy: 'created_at' as 'created_at' | 'score' | 'symbol',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  const filteredSignals = signals.filter(signal => {
    if (filters.symbol && !signal.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) {
      return false;
    }
    if (filters.direction && signal.direction !== filters.direction) {
      return false;
    }
    if (filters.timeframe && signal.timeframe !== filters.timeframe) {
      return false;
    }
    if (signal.score < filters.minScore) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    const multiplier = filters.sortOrder === 'asc' ? 1 : -1;
    
    switch (filters.sortBy) {
      case 'score':
        return (a.score - b.score) * multiplier;
      case 'symbol':
        return a.symbol.localeCompare(b.symbol) * multiplier;
      case 'created_at':
      default:
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return (aTime - bTime) * multiplier;
    }
  });

  return {
    filters,
    setFilters,
    filteredSignals,
    count: filteredSignals.length
  };
}