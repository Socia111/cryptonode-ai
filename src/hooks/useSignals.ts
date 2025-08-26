import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
  }, [])

  const fetchSignals = async () => {
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
    fetchSpynxScores()
  }, [])

  const fetchSpynxScores = async () => {
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