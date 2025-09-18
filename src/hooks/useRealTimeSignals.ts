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
    minScore = 70, // Lowered from 75 to 70 for more signals
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

      console.log('[RealTimeSignals] Loading real trading signals...');

      // Fetch REAL signals with correct source names from database
      let signalsQuery = supabase
        .from('signals')
        .select('*')
        .in('source', ['aitradex1_real_enhanced', 'real_market_data', 'enhanced_signal_generation', 'live_market_data', 'complete_algorithm_live', 'technical_indicators_real'])
        .gte('score', minScore)
        .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // Last 6 hours for more recent signals
        .order('created_at', { ascending: false })
        .limit(100); // Focus on quality over quantity

      // Apply additional filters
      if (!includeExpired) {
        signalsQuery = signalsQuery.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      }

      if (symbols.length > 0) {
        signalsQuery = signalsQuery.in('symbol', symbols);
      }

      if (timeframes.length > 0) {
        signalsQuery = signalsQuery.in('timeframe', timeframes);
      }

      const signalsResult = await signalsQuery;
      
      if (signalsResult.error) {
        console.error('[RealTimeSignals] Error loading real signals:', signalsResult.error);
        
        // Fallback to basic query
        const fallbackResult = await supabase
          .from('signals')
          .select('*')
          .limit(50)
          .order('created_at', { ascending: false });
          
        if (fallbackResult.error) {
          throw new Error(`Database connection failed: ${fallbackResult.error.message}`);
        }
        
        // Filter for real signals from fallback using correct source names
        const realSignals = (fallbackResult.data || []).filter(signal => 
          signal.source === 'aitradex1_real_enhanced' ||
          signal.source === 'real_market_data' ||
          signal.source === 'enhanced_signal_generation' ||
          signal.source === 'live_market_data' ||
          signal.source === 'complete_algorithm_live' ||
          signal.source === 'technical_indicators_real' ||
          (signal.source && 
           signal.source !== 'demo' && 
           signal.source !== 'mock' && 
           signal.source !== 'system' &&
           !signal.source.includes('mock') &&
           !signal.source.includes('demo'))
        );
        
        setSignals(realSignals);
        console.log(`[RealTimeSignals] Fallback: ${realSignals.length}/${fallbackResult.data?.length || 0} real signals`);
      } else {
        setSignals(signalsResult.data || []);
        console.log(`[RealTimeSignals] Loaded ${signalsResult.data?.length || 0} real signals`);
      }

      setRecentTrades([]); // Skip trades for now
      setLastUpdate(new Date());

    } catch (err: any) {
      console.error('[RealTimeSignals] Failed to load signals:', err);
      setError(err.message || 'Failed to load real trading signals');
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
      
      // Use a simpler, more stable subscription approach
      const signalsChannel = supabase
        .channel('public:signals')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'signals'
          },
          (payload: any) => {
            console.log('[RealTimeSignals] 📡 New signal received:', payload.new);
            
            if (payload.new && payload.new.score >= minScore) {
              // Only accept real data signals using correct source names
              const isRealSignal = payload.new.source === 'aitradex1_real_enhanced' ||
                payload.new.source === 'real_market_data' ||
                payload.new.source === 'enhanced_signal_generation' ||
                payload.new.source === 'live_market_data' ||
                payload.new.source === 'complete_algorithm_live' ||
                payload.new.source === 'technical_indicators_real' ||
                (payload.new.source && 
                 payload.new.source !== 'demo' && 
                 payload.new.source !== 'mock' && 
                 payload.new.source !== 'system' &&
                 !payload.new.source.includes('mock') &&
                 !payload.new.source.includes('demo'));
              
              if (!isRealSignal) {
                console.log('[RealTimeSignals] Skipping non-real signal:', payload.new.source, payload.new.algo);
                return;
              }
              
              // Apply filters
              if (symbols.length > 0 && !symbols.includes(payload.new.symbol)) return;
              if (timeframes.length > 0 && !timeframes.includes(payload.new.timeframe)) return;

              setSignals(prev => [payload.new as Signal, ...prev].slice(0, 100));
              setLastUpdate(new Date());
              console.log('[RealTimeSignals] ✅ Added real signal:', payload.new.symbol);
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
          (payload: any) => {
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
        .subscribe((status: string) => {
          console.log('[RealTimeSignals] Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('[RealTimeSignals] ✅ Successfully subscribed to signals');
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[RealTimeSignals] ❌ Channel error - setting up polling fallback');
            setupPollingFallback();
          } else if (status === 'TIMED_OUT') {
            console.warn('[RealTimeSignals] ⏰ Subscription timed out - using polling fallback');
            setupPollingFallback();
          } else if (status === 'CLOSED') {
            console.warn('[RealTimeSignals] 🔌 Connection closed - using polling fallback');
            setupPollingFallback();
          }
        });

      // Store channel reference for cleanup
      (window as any).__signalsChannel = signalsChannel;
      
    } catch (error) {
      console.error('[RealTimeSignals] Failed to setup realtime:', error);
      // Fall back to polling immediately on error
      setupPollingFallback();
    }
  };

  const setupPollingFallback = () => {
    console.log('[RealTimeSignals] Setting up polling fallback...');
    
    // Clear any existing polling interval
    if ((window as any).__pollInterval) {
      clearInterval((window as any).__pollInterval);
    }
    
    const pollInterval = setInterval(() => {
      if (!loading) {
        console.log('[RealTimeSignals] 🔄 Polling for new signals...');
        loadInitialData();
      }
    }, 15000); // Poll every 15 seconds for better responsiveness

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