import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { subscribeSignals as subscribeSignalsRealtime } from '@/lib/realtime';

type Signal = {
  id: string;
  token: string;
  direction: 'BUY' | 'SELL';
  signal_type: string;
  timeframe: string;
  entry_price: number;
  exit_target?: number | null;
  stop_loss?: number | null;
  leverage: number;
  confidence_score: number;
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

function mapDbToSignal(row: any): Signal {
  // Handle both old format and new realtime format
  const direction = (row.direction ?? row.side ?? 'LONG').toUpperCase();
  const symbol = row.symbol ?? row.market_symbol ?? 'UNKNOWN';
  const formattedSymbol = symbol.includes('/') ? symbol : symbol.replace('USDT', '/USDT');
  
  return {
    id: row.id?.toString() ?? '',
    token: formattedSymbol,
    direction: direction === 'LONG' ? 'BUY' : 'SELL',
    signal_type: `${row.algo ?? row.strategy ?? 'AItradeX1'} ${row.timeframe ?? '1h'}`,
    timeframe: row.timeframe ?? row.meta?.timeframe ?? '1h',
    entry_price: Number(row.price ?? row.entry_hint ?? 0),
    exit_target: (row.tp ?? row.tp_hint) != null ? Number(row.tp ?? row.tp_hint) : null,
    stop_loss: (row.sl ?? row.sl_hint) != null ? Number(row.sl ?? row.sl_hint) : null,
    leverage: Number(row.leverage ?? row.meta?.leverage ?? 1),
    confidence_score: Number(row.score ?? row.confidence ?? 0),
    pms_score: Number(row.score ?? 0),
    trend_projection: direction === 'LONG' ? '⬆️' : '⬇️',
    volume_strength: Number(row.volume_strength ?? row.meta?.volume_strength ?? 1.0),
    roi_projection: (row.tp ?? row.tp_hint) && (row.price ?? row.entry_hint) ? 
      Math.abs((Number(row.tp ?? row.tp_hint) - Number(row.price ?? row.entry_hint)) / Number(row.price ?? row.entry_hint) * 100) : 10,
    signal_strength: row.score > 85 ? 'STRONG' : row.score > 75 ? 'MEDIUM' : 'WEAK',
    risk_level: row.score > 85 ? 'LOW' : row.score > 75 ? 'MEDIUM' : 'HIGH',
    quantum_probability: Number(row.score ?? row.confidence ?? 0) / 100,
    status: 'active',
    created_at: row.created_at ?? row.generated_at ?? new Date().toISOString(),
  };
}

function mapDbSignal(row: any): Signal {
  const direction = (row.direction ?? 'LONG').toUpperCase();
  return {
    id: row.id,
    token: row.symbol ?? 'BTC/USDT',
    direction: direction === 'LONG' ? 'BUY' : 'SELL',
    signal_type: row.signal_type ?? 'AI Strategy',
    timeframe: row.timeframe ?? '1h',
    entry_price: Number(row.entry_price ?? 0),
    exit_target: row.tp_price != null ? Number(row.tp_price) : null,
    stop_loss: row.sl_price != null ? Number(row.sl_price) : null,
    leverage: Number(row.leverage ?? 1),
    confidence_score: Number(row.confidence_score ?? 0),
    pms_score: Number(row.score ?? 0),
    trend_projection: direction === 'LONG' ? '⬆️' : '⬇️',
    volume_strength: Number(row.volume_strength ?? 1.0),
    roi_projection: Number(row.roi_projection ?? 10),
    signal_strength: (row.signal_strength ?? 'MEDIUM').toUpperCase() as 'WEAK' | 'MEDIUM' | 'STRONG',
    risk_level: (row.risk_level ?? 'MEDIUM').toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH',
    quantum_probability: Number(row.confidence_score ?? 0) / 100,
    status: row.is_active ? 'active' : 'inactive',
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

async function fetchSignals(): Promise<Signal[]> {
  try {
    console.log('[Signals] Fetching live signals from database...');
    console.log('[Signals] Supabase client configured:', !!supabase);
    
    // Direct database query with fresh timeframe
    const { data: allSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .gte('score', 80) // Score 80+ signals only (high confidence)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours (more recent)
      .order('created_at', { ascending: false })
      .limit(50);

    if (signalsError) {
      console.error('[Signals] Signals query failed:', signalsError);
      console.error('[Signals] Error details:', JSON.stringify(signalsError, null, 2));
      return [];
    }

    if (allSignals && allSignals.length > 0) {
      console.log(`[Signals] Found ${allSignals.length} total signals`);
      return mapSignalsToInterface(allSignals);
    }

    // No signals available
    console.log('[Signals] No live signals found in database');
    return [];

  } catch (e) {
    console.error('[Signals] Failed to fetch signals:', e);
    return [];
  }
}

function mapSignalsToInterface(signals: any[]): Signal[] {
  const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '2h', '4h'];
  
  return signals
    .filter(item => validTimeframes.includes(item.timeframe) && item.score >= 80)
    .map((item: any): Signal => ({
      id: item.id.toString(),
      token: item.symbol.replace('USDT', '/USDT'),
      direction: item.direction === 'LONG' ? 'BUY' : 'SELL',
      signal_type: `${item.algo || 'AItradeX1'} ${item.timeframe}`,
      timeframe: item.timeframe,
      entry_price: Number(item.price),
      exit_target: item.tp ? Number(item.tp) : null,
      stop_loss: item.sl ? Number(item.sl) : null,
      leverage: 1,
      confidence_score: Number(item.score),
      pms_score: Number(item.score),
      trend_projection: item.direction === 'LONG' ? '⬆️' : '⬇️',
      volume_strength: item.indicators?.volSma21 ? Number(item.indicators.volSma21) / 1000000 : 1.0,
      roi_projection: Math.abs((Number(item.tp || item.price * 1.1) - Number(item.price)) / Number(item.price) * 100),
      signal_strength: item.score > 85 ? 'STRONG' : item.score > 75 ? 'MEDIUM' : 'WEAK',
      risk_level: item.score > 85 ? 'LOW' : item.score > 75 ? 'MEDIUM' : 'HIGH',
      quantum_probability: Number(item.score) / 100,
      status: 'active',
      created_at: item.created_at || new Date().toISOString(),
    }))
    .slice(0, 20); // Limit to 20 most recent signals
}

function getMockSignals(): Signal[] {
  // REAL DATA ONLY - No mock signals
  console.log('[Signals] Mock signals disabled - only real market data');
  return [];
}

// Function removed - now using subscribeSignalsRealtime from @/lib/realtime

export async function generateSignals() {
  try {
    console.info('[generateSignals] Triggering comprehensive live signal generation...');
    
    const symbols: string[] = []; // Empty array means scan ALL available USDT pairs on Bybit
    
    // Run multiple timeframes in parallel for faster execution
    const scanPromises = [
      // 5-minute comprehensive scan - all coins
      supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit',
          timeframe: '5m',
          relaxed_filters: true,
          symbols: symbols, // Scan ALL USDT pairs
          scan_all_coins: true
        }
      }),
      // 15-minute comprehensive scan - all coins
      supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit', 
          timeframe: '15m',
          relaxed_filters: true,
          symbols: symbols, // Scan ALL USDT pairs
          scan_all_coins: true
        }
      }),
      // 1-hour comprehensive scan - all coins
      supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit',
          timeframe: '1h', 
          relaxed_filters: false, // Use canonical settings for higher timeframe
          symbols: symbols, // Scan ALL USDT pairs
          scan_all_coins: true
        }
      }),
      // 4-hour comprehensive scan - all coins for swing trades
      supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit',
          timeframe: '4h', 
          relaxed_filters: false,
          symbols: symbols, // Scan ALL USDT pairs
          scan_all_coins: true
        }
      })
    ];

    // Wait for all scans to complete
    const results = await Promise.allSettled(scanPromises);
    
    let totalSignals = 0;
    const timeframes = ['5m', '15m', '1h', '4h'];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.data) {
        const signalsFound = result.value.data.signals_found || 0;
        totalSignals += signalsFound;
        console.log(`[generateSignals] ${timeframes[index]} scan: ${signalsFound} signals generated`);
        if (result.value.error) {
          console.warn(`[generateSignals] ${timeframes[index]} scan had errors:`, result.value.error);
        }
      } else if (result.status === 'rejected') {
        console.error(`[generateSignals] ${timeframes[index]} scan failed:`, result.reason);
      }
    });

    if (totalSignals === 0) {
      // Fallback to regular scanner with even more relaxed settings
      console.log('[generateSignals] No signals found, trying fallback scanner...');
      
      const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('live-scanner', {
        body: { 
          exchange: 'bybit',
          timeframe: '1h',
          relaxed_filters: true,
          symbols: [], // Empty = scan ALL USDT pairs as fallback
          scan_all_coins: true
        }
      });

      if (fallbackError) {
        throw fallbackError;
      }

      totalSignals = fallbackData?.signals_found || 0;
    }
    
    console.info(`[generateSignals] Success: ${totalSignals} signals generated`);
    return { signals_created: totalSignals, success: true };
  } catch (e: any) {
    console.error('[generateSignals] Exception:', e);
    throw e;
  }
}

export async function updateSpynxScores() {
  try {
    console.info('[updateSpynxScores] Invoking calculate-spynx-scores...');
    const { data, error } = await supabase.functions.invoke('calculate-spynx-scores');
    
    if (error) {
      console.error('[updateSpynxScores] calculate-spynx-scores failed:', error.message);
      throw error;
    }
    
    console.info('[updateSpynxScores] Success:', data);
    return data;
  } catch (e: any) {
    console.error('[updateSpynxScores] Exception:', e);
    throw e;
  }
}

export const useSignals = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const refreshSignals = async () => {
    setLoading(true);
    try {
      setError(null);
      const { data, error } = await supabase.from('signals')
        .select('*')
        .gte('score', 70) // Show signals with score 70+ 
        .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // Last 6 hours
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      const mappedSignals = (data || []).map(mapDbToSignal);
      setSignals(mappedSignals);
      console.log(`[useSignals] Loaded ${mappedSignals.length} signals from database`);
    } catch (err: any) {
      console.error('[useSignals] refreshSignals failed:', err);
      setError(err.message || 'Failed to fetch signals');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSignals = async () => {
    setLoading(true);
    
    try {
      toast({
        title: "🔄 Generating Signals",
        description: "Scanning markets for new trading opportunities..."
      });
      
      const result = await generateSignals();
      
      // Force refresh signals after generation
      await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds for signals to save
      await refreshSignals();
      
      toast({
        title: "✅ Signals Generated",
        description: `Successfully generated ${result.signals_created || 'new'} trading signals`
      });
    } catch (e: any) {
      console.error('[useSignals] Generate signals failed:', e);
      toast({
        title: "❌ Generation Failed",
        description: e?.message ?? 'Failed to generate signals',
        variant: "destructive"
      });
    }
    
    // Always clear loading state
    setLoading(false);
  };

  const handleUpdateSpynx = async () => {
    try {
      await updateSpynxScores();
      toast({
        title: "Spynx Scores Updated",
        description: "Spynx scores have been recalculated successfully."
      });
    } catch (e: any) {
      console.error('[useSignals] Update Spynx failed:', e);
      toast({
        title: "Update Failed",
        description: e?.message ?? 'Failed to update Spynx scores',
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    let channel: any = null;
    let pollId: number | null = null;
    const POLL_MS = 30000;

    const boot = async () => {
      try {
        await refreshSignals();
      } catch (e) {
        console.warn('[signals] initial load failed', e);
      }

      try {
        channel = subscribeSignalsRealtime(
          (newSignal) => { 
            if (mounted) {
              setSignals(prev => [newSignal, ...prev].slice(0, 50));
              
              // Show toast notification for new signal
              toast({
                title: "🚨 New Signal Generated",
                description: `${newSignal.direction} ${newSignal.token} - ${newSignal.confidence_score.toFixed(1)}% confidence`,
                duration: 5000,
              });
            }
          },
          (updatedSignal) => { 
            if (mounted) {
              setSignals(prev => prev.map(s => s.id === updatedSignal.id ? updatedSignal : s));
            }
          },
        );
      } catch (e) {
        console.warn('[signals] realtime subscribe failed, fallback to polling', e);
      }

      pollId = window.setInterval(() => {
        if (mounted) {
          refreshSignals().catch(() => {});
        }
      }, POLL_MS);
    };

    boot();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      if (pollId) clearInterval(pollId);
    };
  }, []);

  return {
    signals,
    loading, 
    error,
    refreshSignals,
    generateSignals: handleGenerateSignals,
    updateSpynxScores: handleUpdateSpynx
  };
};

export const useSpynxScores = () => {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[SPYNX] Fetching scores from spynx_scores table...');
      
      // Fetch from the correct spynx_scores table
      const { data: scores, error } = await supabase
        .from('spynx_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[SPYNX] Error fetching scores:', error);
        setError(error.message);
        setScores([]);
        setLoading(false);
        return;
      }

      console.log('[SPYNX] Fetched scores:', scores);
      setScores(scores || []);
      setLoading(false);
    } catch (err) {
      console.error('[SPYNX] Fetch error:', err);
      setError('Failed to fetch Spynx scores');
      setScores([]);
      setLoading(false);
    }
  };

  const updateSpynxScores = async () => {
    try {
      console.log('[SPYNX] Calling calculate-spynx-scores function...');
      const { data, error } = await supabase.functions.invoke('calculate-spynx-scores');
      if (error) throw error;
      
      console.log('[SPYNX] Scores updated successfully:', data);
      
      // Refresh scores after calculation
      await fetchScores();
      return data;
    } catch (err) {
      console.error('[SPYNX] Update error:', err);
      throw err;
    }
  };

  return {
    scores,
    loading,
    error,
    updateSpynxScores
  };
};