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

      console.log('[RealTimeSignals] Loading initial data...');

      // Use proper error handling and retry logic
      let signalsResult;
      try {
        // Build signals query with proper client
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

        signalsResult = await signalsQuery;
        
        if (signalsResult.error) {
          console.error('[RealTimeSignals] Signals query error:', signalsResult.error);
          throw signalsResult.error;
        }

        console.log(`[RealTimeSignals] Loaded ${signalsResult.data?.length || 0} signals`);
        
      } catch (queryError) {
        console.error('[RealTimeSignals] Direct query failed, using fallback:', queryError);
        
        // Fallback: Try with minimal query
        const fallbackResult = await supabase
          .from('signals')
          .select('*')
          .limit(20)
          .order('created_at', { ascending: false });
          
        if (fallbackResult.error) {
          throw new Error(`Database connection failed: ${fallbackResult.error.message}`);
        }
        
        signalsResult = fallbackResult;
        console.log(`[RealTimeSignals] Fallback loaded ${signalsResult.data?.length || 0} signals`);
      }

      // Skip trades query for now - focus on signals
      const tradesResult = { data: [], error: null };

      setSignals(signalsResult.data || []);
      setRecentTrades(tradesResult?.data || []);
      setLastUpdate(new Date());

    } catch (err: any) {
      console.error('[RealTimeSignals] Failed to load signals data:', err);
      setError(err.message || 'Failed to load data');
      
      // Set empty arrays on error
      setSignals([]);
      setRecentTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscriptions = () => {
    // Clean up any existing subscriptions first
    cleanup();
    
    try {
      console.log('[RealTimeSignals] Setting up realtime subscriptions...');
      
      // Create unique channel name to avoid conflicts
      const channelName = `live-signals-${Date.now()}`;
      
      // Subscribe to new signals with proper error handling
      const signalsChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'signals'
          },
          (payload: RealTimeUpdate<Signal>) => {
            console.log('[RealTimeSignals] 📡 New signal received:', payload.new);
            
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
            console.log('[RealTimeSignals] 📡 Signal updated:', payload.new);
            
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
        .subscribe((status, err) => {
          console.log('[RealTimeSignals] Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[RealTimeSignals] ✅ Successfully subscribed to signals');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[RealTimeSignals] ❌ Channel error:', err);
            // Retry subscription after a delay
            setTimeout(() => {
              console.log('[RealTimeSignals] Retrying subscription...');
              setupRealTimeSubscriptions();
            }, 5000);
          } else if (status === 'TIMED_OUT') {
            console.warn('[RealTimeSignals] ⏰ Subscription timed out, retrying...');
            setTimeout(() => {
              setupRealTimeSubscriptions();
            }, 3000);
          } else if (status === 'CLOSED') {
            console.warn('[RealTimeSignals] 🔌 Connection closed, will retry on next component mount');
          }
        });

      // Store channel reference for cleanup
      (window as any).__signalsChannel = signalsChannel;
      
    } catch (error) {
      console.error('[RealTimeSignals] Failed to setup realtime:', error);
      // Set up polling fallback
      setupPollingFallback();
    }
  };

  const setupPollingFallback = () => {
    console.log('[RealTimeSignals] Setting up polling fallback...');
    const pollInterval = setInterval(() => {
      if (!loading) {
        loadInitialData();
      }
    }, 30000); // Poll every 30 seconds

    (window as any).__pollInterval = pollInterval;
  };

  const cleanup = () => {
    try {
      if ((window as any).__signalsChannel) {
        supabase.removeChannel((window as any).__signalsChannel);
        delete (window as any).__signalsChannel;
        console.log('[RealTimeSignals] Cleaned up signals channel');
      }
      
      if ((window as any).__pollInterval) {
        clearInterval((window as any).__pollInterval);
        delete (window as any).__pollInterval;
        console.log('[RealTimeSignals] Cleaned up polling interval');
      }
    } catch (error) {
      console.error('[RealTimeSignals] Cleanup error:', error);
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