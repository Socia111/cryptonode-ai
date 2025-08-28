import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { openSignalsChannel } from '@/lib/realtime';

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
  const side = (row.side ?? 'LONG').toUpperCase(); // LONG|SHORT
  return {
    id: row.id,
    token: row.market_symbol ?? `${row.strategy ?? 'AI'}/USDT`,
    direction: side === 'LONG' ? 'BUY' : 'SELL',
    signal_type: row.strategy ?? 'Unknown',
    timeframe: row.meta?.timeframe ?? '1h',
    entry_price: Number(row.entry_hint ?? 0),
    exit_target: row.tp_hint != null ? Number(row.tp_hint) : null,
    stop_loss: row.sl_hint != null ? Number(row.sl_hint) : null,
    leverage: Number(row.meta?.leverage ?? 1),
    confidence_score: Number((row.confidence ?? 0) * 100),
    pms_score: Number(row.score ?? 0),
    trend_projection: side === 'LONG' ? '⬆️' : '⬇️',
    volume_strength: Number(row.meta?.volume_strength ?? 1.0),
    roi_projection: Number(row.meta?.roi_projection ?? 10),
    signal_strength: (row.meta?.signal_strength ?? 'MEDIUM').toUpperCase() as 'WEAK' | 'MEDIUM' | 'STRONG',
    risk_level: (row.meta?.risk_level ?? 'MEDIUM').toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH',
    quantum_probability: Number(row.confidence ?? 0.5),
    status: row.is_active ? 'active' : 'inactive',
    created_at: row.generated_at ?? new Date().toISOString(),
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
    
    // Always trigger fresh signal generation first to ensure we have live data
    console.log('[Signals] Auto-triggering fresh signal scan...');
    
    try {
      // Trigger multiple timeframes for comprehensive coverage
      const promises = ['5m', '15m', '1h'].map(timeframe => 
        supabase.functions.invoke('live-scanner-production', {
          body: { 
            exchange: 'bybit',
            timeframe: timeframe,
            relaxed_filters: true,
            symbols: [] // Empty to scan all available USDT pairs
          }
        }).catch(error => {
          console.warn(`[Signals] ${timeframe} scan failed:`, error);
          return null;
        })
      );
      
      // Execute all scans in parallel
      await Promise.allSettled(promises);
      
      // Wait for signals to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (scannerError) {
      console.warn('[Signals] Auto-scanner failed:', scannerError);
    }

    // Now fetch only high-quality signals (score >= 75%) from last 24 hours
    const { data: allSignals, error: signalsError } = await supabase
      .from('signals')
      .select('*')
      .gte('score', 75) // Only high ROI signals
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(100);

    if (signalsError) {
      console.error('[Signals] Signals query failed:', signalsError.message);
      return [];
    }

    if (allSignals && allSignals.length > 0) {
      console.log(`[Signals] Found ${allSignals.length} total signals`);
      return mapSignalsToInterface(allSignals);
    }

    // No live signals available - return empty array
    console.log('[Signals] No live signals found in database');
    return [];

  } catch (e) {
    console.error('[Signals] Failed to fetch signals:', e);
    return [];
  }
}

function mapSignalsToInterface(signals: any[]): Signal[] {
  const validTimeframes = ['5m', '15m', '30m', '1h', '2h', '4h'];
  
  return signals
    .filter(item => validTimeframes.includes(item.timeframe))
    .map((item: any): Signal => ({
      id: item.id.toString(),
      token: item.symbol.replace('USDT', '/USDT'),
      direction: item.direction === 'LONG' ? 'BUY' : 'SELL',
      signal_type: `${item.algo} ${item.timeframe}`,
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
      signal_strength: item.score > 80 ? 'STRONG' : item.score > 60 ? 'MEDIUM' : 'WEAK',
      risk_level: item.score > 80 ? 'LOW' : item.score > 60 ? 'MEDIUM' : 'HIGH',
      quantum_probability: Number(item.score) / 100,
      status: 'active',
      created_at: item.created_at || new Date().toISOString(),
    }));
}

function getMockSignals(): Signal[] {
  const timeframes = ['5m', '15m', '30m', '1h', '2h', '4h'];
  const tokens = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'DOT/USDT'];
  
  return [
    {
      id: 'mock-1',
      token: 'BTC/USDT',
      direction: 'BUY',
      signal_type: 'Golden Cross + RSI Oversold',
      timeframe: '15m',
      entry_price: 96420,
      exit_target: 110883,
      stop_loss: 89710,
      leverage: 25,
      confidence_score: 94.2,
      pms_score: 2.1,
      trend_projection: '⬆️',
      volume_strength: 2.3,
      roi_projection: 15,
      signal_strength: 'STRONG',
      risk_level: 'MEDIUM',
      quantum_probability: 0.84,
      status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock-2',
      token: 'ETH/USDT', 
      direction: 'SELL',
      signal_type: 'Death Cross + Volume Divergence',
      timeframe: '1h',
      entry_price: 3542,
      exit_target: 3180,
      stop_loss: 3680,
      leverage: 20,
      confidence_score: 87.5,
      pms_score: 1.8,
      trend_projection: '⬇️',
      volume_strength: 1.7,
      roi_projection: 10.2,
      signal_strength: 'STRONG',
      risk_level: 'HIGH',
      quantum_probability: 0.78,
      status: 'active',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-3',
      token: 'SOL/USDT',
      direction: 'BUY',
      signal_type: 'Breakout + Volume Surge',
      timeframe: '5m',
      entry_price: 245.67,
      exit_target: 268.24,
      stop_loss: 235.89,
      leverage: 15,
      confidence_score: 91.3,
      pms_score: 2.5,
      trend_projection: '⬆️',
      volume_strength: 3.1,
      roi_projection: 9.2,
      signal_strength: 'STRONG',
      risk_level: 'LOW',
      quantum_probability: 0.91,
      status: 'active',
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-4',
      token: 'ADA/USDT',
      direction: 'SELL',
      signal_type: 'Bear Flag + RSI Overbought',
      timeframe: '30m',
      entry_price: 1.123,
      exit_target: 0.987,
      stop_loss: 1.189,
      leverage: 10,
      confidence_score: 82.7,
      pms_score: 1.9,
      trend_projection: '⬇️',
      volume_strength: 1.8,
      roi_projection: 12.1,
      signal_strength: 'MEDIUM',
      risk_level: 'MEDIUM',
      quantum_probability: 0.83,
      status: 'active',
      created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-5',
      token: 'DOT/USDT',
      direction: 'BUY',
      signal_type: 'Support Bounce + MACD Cross',
      timeframe: '2h',
      entry_price: 8.45,
      exit_target: 9.78,
      stop_loss: 7.89,
      leverage: 12,
      confidence_score: 88.9,
      pms_score: 2.2,
      trend_projection: '⬆️',
      volume_strength: 2.1,
      roi_projection: 15.7,
      signal_strength: 'STRONG',
      risk_level: 'LOW',
      quantum_probability: 0.89,
      status: 'active',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-6',
      token: 'BTC/USDT',
      direction: 'SELL',
      signal_type: 'Resistance Rejection + Divergence',
      timeframe: '4h',
      entry_price: 96850,
      exit_target: 89200,
      stop_loss: 99450,
      leverage: 8,
      confidence_score: 85.4,
      pms_score: 2.0,
      trend_projection: '⬇️',
      volume_strength: 1.9,
      roi_projection: 7.9,
      signal_strength: 'MEDIUM',
      risk_level: 'HIGH',
      quantum_probability: 0.85,
      status: 'active',
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    }
  ];
}

function subscribeSignals(onInsert: (s: Signal) => void, onUpdate: (s: Signal) => void) {
  console.log('[Signals] Setting up real-time subscription...');
  
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
        console.log('[Signals] New signal received via realtime:', payload.new);
        const newSignal = mapSignalsToInterface([payload.new])[0];
        if (newSignal) {
          onInsert(newSignal);
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
        console.log('[Signals] Signal updated via realtime:', payload.new);
        const updatedSignal = mapSignalsToInterface([payload.new])[0];
        if (updatedSignal) {
          onUpdate(updatedSignal);
        }
      }
    )
    .subscribe((status) => {
      console.log('[Signals] Subscription status:', status);
    });
    
  return channel;
}

export async function generateSignals() {
  try {
    console.info('[generateSignals] Triggering comprehensive live signal generation...');
    
    const symbols: string[] = []; // Empty to scan all available USDT pairs
    
    // Run multiple timeframes in parallel for faster execution
    const scanPromises = [
      // 5-minute scan for quick opportunities  
      supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit',
          timeframe: '5m',
          relaxed_filters: true,
          symbols: symbols
        }
      }),
      // 15-minute scan for balanced signals
      supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit', 
          timeframe: '15m',
          relaxed_filters: true,
          symbols: symbols
        }
      }),
      // 1-hour scan for higher confidence signals
      supabase.functions.invoke('live-scanner-production', {
        body: {
          exchange: 'bybit',
          timeframe: '1h', 
          relaxed_filters: false, // Use canonical settings for higher timeframe
          symbols: symbols
        }
      })
    ];

    // Wait for all scans to complete
    const results = await Promise.allSettled(scanPromises);
    
    let totalSignals = 0;
    const timeframes = ['5m', '15m', '1h'];
    
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
          symbols: [...symbols, 'LINKUSDT', 'LTCUSDT', 'DOGEUSDT', 'NEARUSDT']
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
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSignals();
      setSignals(data);
    } catch (err: any) {
      console.error('[useSignals] refreshSignals failed:', err);
      setError(err.message || 'Failed to fetch signals');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSignals = async () => {
    try {
      await generateSignals();
      await refreshSignals();
      toast({
        title: "Signals Generated",
        description: "New trading signals have been generated successfully."
      });
    } catch (e: any) {
      console.error('[useSignals] Generate signals failed:', e);
      toast({
        title: "Generation Failed",
        description: e?.message ?? 'Failed to generate signals',
        variant: "destructive"
      });
    }
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
    refreshSignals();
    
    // Set up realtime subscription for live signal updates
    const channel = subscribeSignals(
      (newSignal) => {
        console.info('[useSignals] New signal inserted:', newSignal);
        setSignals(prev => [newSignal, ...prev.slice(0, 49)]); // Keep max 50 signals
        
        // Show toast notification for new signal
        toast({
          title: "🚨 New Signal Generated",
          description: `${newSignal.direction} ${newSignal.token} - ${newSignal.confidence_score.toFixed(1)}% confidence`,
          duration: 5000,
        });
      },
      (updatedSignal) => {
        console.info('[useSignals] Signal updated:', updatedSignal);
        setSignals(prev => prev.map(s => s.id === updatedSignal.id ? updatedSignal : s));
      }
    );

    // Auto-refresh signals every 60 seconds to catch any missed updates
    const refreshInterval = setInterval(() => {
      console.log('[useSignals] Auto-refreshing signals...');
      refreshSignals();
    }, 60000);

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
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

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    try {
      // Mock Spynx scores for now since we don't have the data yet
      const mockScores = [
        { token: 'BTC', score: 95, market_cap: 580000000000, price_change_24h: 2.3, roi_forecast: 15.8 },
        { token: 'ETH', score: 92, market_cap: 220000000000, price_change_24h: 3.1, roi_forecast: 18.2 },
        { token: 'SOL', score: 88, market_cap: 45000000000, price_change_24h: 5.2, roi_forecast: 22.1 },
        { token: 'ADA', score: 85, market_cap: 15000000000, price_change_24h: -1.2, roi_forecast: 12.5 },
        { token: 'DOT', score: 82, market_cap: 8000000000, price_change_24h: 1.8, roi_forecast: 14.3 }
      ];
      setScores(mockScores);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const updateSpynxScores = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-spynx-scores');
      if (error) throw error;
      
      // Refresh scores after calculation
      fetchScores();
      return data;
    } catch (err) {
      throw err;
    }
  };

  return {
    scores,
    loading,
    updateSpynxScores
  };
};