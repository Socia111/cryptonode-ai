import { useMemo } from 'react';

export type RankedSignal = {
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
  // Enhanced fields
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C';
  spread?: number;
  edgeScore: number;
};

const calculateSpread = (signal: any): number => {
  // Simulate spread calculation (in basis points)
  // In real implementation, this would be calculated from bid/ask data
  const baseSpread = Math.random() * 30; // 0-30 bps
  
  // Adjust spread based on signal properties
  if (signal.volume_strength > 2) return baseSpread * 0.5; // High volume = lower spread
  if (signal.confidence_score > 90) return baseSpread * 0.7; // High confidence = better execution
  
  return baseSpread;
};

const calculateEdgeScore = (signal: any): number => {
  // Composite edge score: model confidence + R:R + symbol quality
  const confidence = signal.confidence_score || 0;
  
  // Calculate R:R ratio
  const riskReward = signal.exit_target && signal.stop_loss && signal.entry_price 
    ? Math.abs((signal.exit_target - signal.entry_price) / (signal.entry_price - signal.stop_loss))
    : 1;
  
  // Symbol edge (simplified - based on volume and timeframe)
  const volumeEdge = Math.min(signal.volume_strength * 10, 20); // 0-20 points
  const timeframeEdge = signal.timeframe === '1h' || signal.timeframe === '4h' ? 10 : 5; // Prefer swing timeframes
  
  // Penalties
  const liquidityPenalty = signal.volume_strength < 1 ? -10 : 0;
  const spreadPenalty = signal.spread && signal.spread > 20 ? -5 : 0;
  
  return Math.max(0, Math.min(100, 
    confidence * 0.6 + // 60% weight on model confidence
    Math.min(riskReward * 10, 20) + // 20% weight on R:R (capped)
    volumeEdge + 
    timeframeEdge + 
    liquidityPenalty + 
    spreadPenalty
  ));
};

const calculateGrade = (score: number): 'A+' | 'A' | 'B' | 'C' => {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  return 'C';
};

export const useRankedSignals = (signals: any[], showAllSpreads = false) => {
  return useMemo(() => {
    if (!signals || signals.length === 0) return [];

    const ranked: RankedSignal[] = signals.map(signal => {
      const spread = calculateSpread(signal);
      const edgeScore = calculateEdgeScore({ ...signal, spread });
      const score = edgeScore;
      const grade = calculateGrade(score);

      return {
        ...signal,
        score,
        grade,
        spread,
        edgeScore
      };
    });

    // Sort by score (highest first) and filter by spread if needed
    const sorted = ranked.sort((a, b) => b.score - a.score);
    
    if (showAllSpreads) {
      return sorted;
    }
    
    // Filter out high spread signals unless showAll is true
    return sorted.filter(signal => (signal.spread || 0) <= 20);
  }, [signals, showAllSpreads]);
};