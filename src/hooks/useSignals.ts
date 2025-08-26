import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface Signal {
  id: string
  token: string
  direction: 'BUY' | 'SELL'
  signal_type: string
  timeframe: string
  entry_price: number
  exit_target?: number
  stop_loss?: number
  leverage: number
  confidence_score: number
  pms_score: number
  trend_projection: string
  volume_strength: number
  roi_projection: number
  signal_strength: string
  risk_level: string
  quantum_probability: number
  stels_max_leverage?: number
  stels_recommended_capital?: number
  stels_risk_score?: number
  status: string
  created_at: string
  expires_at?: string
}

export const useSignals = () => {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Use mock data when Supabase is not configured
      setSignals([
        {
          id: 'mock-1',
          token: 'BTC/USDT',
          direction: 'BUY' as const,
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
        }
      ]);
      setLoading(false);
      return;
    }
    
    fetchSignals()
    
    // Set up real-time subscription only if Supabase is configured
    if (isSupabaseConfigured) {
      const subscription = supabase
        .channel('signals')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'signals' }, 
          (payload) => {
            const newSignal = payload.new as Signal
            setSignals(prev => [newSignal, ...prev])
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'signals' },
          (payload) => {
            const updatedSignal = payload.new as Signal
            setSignals(prev => prev.map(signal => 
              signal.id === updatedSignal.id ? updatedSignal : signal
            ))
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [])

  const fetchSignals = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setSignals(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch signals')
    } finally {
      setLoading(false)
    }
  }

  const generateSignals = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-signals')
      if (error) throw error
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate signals')
      throw err
    }
  }

  return {
    signals,
    loading,
    error,
    generateSignals,
    refetch: fetchSignals
  }
}

export const useSpynxScores = () => {
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Use mock data when Supabase is not configured
      setScores([
        {
          token: 'BTC',
          score: 92,
          market_cap: 1800000000000,
          liquidity: 0.025,
          holder_distribution: 85000,
          whale_activity: 15,
          sentiment_score: 8.5,
          roi_forecast: 12.4,
          volume_24h: 35000000000,
          price_change_24h: 2.8
        },
        {
          token: 'ETH',
          score: 88,
          market_cap: 420000000000,
          liquidity: 0.032,
          holder_distribution: 120000,
          whale_activity: 12,
          sentiment_score: 7.8,
          roi_forecast: 15.2,
          volume_24h: 18000000000,
          price_change_24h: 4.1
        }
      ]);
      setLoading(false);
      return;
    }
    
    fetchSpynxScores()
  }, [])

  const fetchSpynxScores = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('spynx_scores')
        .select('*')
        .gte('score', 75)
        .order('score', { ascending: false })
        .limit(20)

      if (error) throw error
      setScores(data || [])
    } catch (err) {
      console.error('Failed to fetch Spynx scores:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateSpynxScores = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-spynx-scores')
      if (error) throw error
      await fetchSpynxScores() // Refresh after update
      return data
    } catch (err) {
      console.error('Failed to update Spynx scores:', err)
      throw err
    }
  }

  return {
    scores,
    loading,
    updateSpynxScores,
    refetch: fetchSpynxScores
  }
}