import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

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
    fetchSignals()
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('strategy_signals_channel')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'strategy_signals' }, 
        (payload) => {
          const newSignal = payload.new as Signal
          setSignals(prev => [newSignal, ...prev])
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'strategy_signals' },
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
  }, [])

  const fetchSignals = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('strategy_signals')
        .select('*')
        .eq('is_active', true)
        .order('generated_at', { ascending: false })
        .limit(10)

      if (error) {
        console.log('Database query error, using mock data:', error.message)
        // Use mock data when database tables don't exist yet
        const mockSignals: Signal[] = [
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
            signal_type: 'Bearish Divergence',
            timeframe: '1h',
            entry_price: 3240,
            exit_target: 2890,
            stop_loss: 3420,
            leverage: 15,
            confidence_score: 87.5,
            pms_score: 1.8,
            trend_projection: '⬇️',
            volume_strength: 1.9,
            roi_projection: 10.8,
            signal_strength: 'MEDIUM',
            risk_level: 'LOW',
            quantum_probability: 0.76,
            status: 'active',
            created_at: new Date(Date.now() - 300000).toISOString(),
          }
        ]
        setSignals(mockSignals)
        return
      }

      // Transform database data to Signal interface if we have real data
      const transformedSignals: Signal[] = (data || []).map(signal => ({
        id: signal.id,
        token: `${signal.strategy}/USDT`, // Use strategy as token for now
        direction: signal.side as 'BUY' | 'SELL',
        signal_type: signal.strategy,
        timeframe: '1h',
        entry_price: signal.entry_hint || 0,
        exit_target: signal.tp_hint,
        stop_loss: signal.sl_hint,
        leverage: 1,
        confidence_score: (signal.confidence || 0) * 100,
        pms_score: signal.score || 0,
        trend_projection: signal.side === 'LONG' ? '⬆️' : '⬇️',
        volume_strength: 2.0,
        roi_projection: 12,
        signal_strength: 'MEDIUM',
        risk_level: 'MEDIUM',
        quantum_probability: signal.confidence || 0.5,
        status: signal.is_active ? 'active' : 'inactive',
        created_at: signal.generated_at,
      }))

      setSignals(transformedSignals.length > 0 ? transformedSignals : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch signals')
    } finally {
      setLoading(false)
    }
  }

  const generateSignals = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-signal-generation', {
        body: { symbol: 'BTCUSDT', timeframe: '1h' }
      })
      if (error) throw error
      
      // Refresh the signals list after generation
      fetchSignals()
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
    fetchScores()
  }, [])

  const fetchScores = async () => {
    try {
      // Mock Spynx scores for now since we don't have the data yet
      const mockScores = [
        { token: 'BTC', score: 95, market_cap: 580000000000, price_change_24h: 2.3, roi_forecast: 15.8 },
        { token: 'ETH', score: 92, market_cap: 220000000000, price_change_24h: 3.1, roi_forecast: 18.2 },
        { token: 'SOL', score: 88, market_cap: 45000000000, price_change_24h: 5.2, roi_forecast: 22.1 },
        { token: 'ADA', score: 85, market_cap: 15000000000, price_change_24h: -1.2, roi_forecast: 12.5 },
        { token: 'DOT', score: 82, market_cap: 8000000000, price_change_24h: 1.8, roi_forecast: 14.3 }
      ]
      setScores(mockScores)
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const updateSpynxScores = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-spynx-scores')
      if (error) throw error
      
      // Refresh scores after calculation
      fetchScores()
      return data
    } catch (err) {
      throw err
    }
  }

  return {
    scores,
    loading,
    updateSpynxScores
  }
}