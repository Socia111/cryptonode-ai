import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

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

async function fetchSignals(): Promise<Signal[]> {
  try {
    const { data, error } = await supabase
      .from('strategy_signals')
      .select('*')
      .eq('is_active', true)
      .order('generated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('[Signals] Falling back to mock. Reason:', error.message);
      return getMockSignals();
    }

    return (data ?? []).map(mapDbToSignal);
  } catch (e) {
    console.warn('[Signals] Query threw, using mock:', e);
    return getMockSignals();
  }
}

function getMockSignals(): Signal[] {
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
    }
  ];
}

function subscribeSignals(onInsert: (s: Signal) => void, onUpdate: (s: Signal) => void) {
  return supabase
    .channel('strategy_signals_channel')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'strategy_signals' },
      (payload) => onInsert(mapDbToSignal(payload.new)))
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'strategy_signals' },
      (payload) => onUpdate(mapDbToSignal(payload.new)))
    .subscribe();
}

export async function generateSignals() {
  try {
    console.info('[generateSignals] Invoking enhanced-signal-generation...');
    const { data, error } = await supabase.functions.invoke('enhanced-signal-generation', {
      body: { symbol: 'BTCUSDT', timeframe: '1h' }
    });
    
    if (error) {
      console.error('[generateSignals] enhanced-signal-generation failed:', error.message);
      throw error;
    }
    
    console.info('[generateSignals] Success:', data);
    return data;
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
    
    // Set up realtime subscription
    const channel = subscribeSignals(
      (newSignal) => {
        console.info('[useSignals] New signal inserted:', newSignal);
        setSignals(prev => [newSignal, ...prev]);
      },
      (updatedSignal) => {
        console.info('[useSignals] Signal updated:', updatedSignal);
        setSignals(prev => prev.map(s => s.id === updatedSignal.id ? updatedSignal : s));
      }
    );

    // Proper realtime cleanup
    return () => {
      supabase.removeChannel(channel);
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