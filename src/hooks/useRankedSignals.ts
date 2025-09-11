import { useMemo } from 'react';

interface Signal {
  id: string;
  token: string;
  direction: 'BUY' | 'SELL';
  confidence_score: number;
  entry_price: number;
  stop_loss?: number | null;
  exit_target?: number | null;
  created_at: string;
  timeframe: string;
  signal_type: string;
  leverage: number;
  pms_score: number;
  trend_projection: '⬆️' | '⬇️';
  volume_strength: number;
  roi_projection: number;
  signal_strength: 'WEAK' | 'MEDIUM' | 'STRONG';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  quantum_probability: number;
  status: 'active' | 'inactive';
}

interface RankedSignal extends Signal {
  grade: 'A+' | 'A' | 'B' | 'C';
  score: number;
  edgeScore: number;
  spreadBps?: number;
}

// Edge scoring helper (composite score)
function calculateEdgeScore(signal: Signal): number {
  const modelConfidence = (signal.confidence_score || 0) / 100;
  
  // Calculate risk-reward ratio - add safety checks
  const entryPrice = signal.entry_price || 1;
  const exitTarget = signal.exit_target || entryPrice * 1.05;
  const stopLoss = signal.stop_loss || entryPrice * 0.95;
  const rrRatio = Math.abs(exitTarget - entryPrice) / Math.abs(entryPrice - stopLoss);
  
  // Symbol edge based on volume and timeframe - add safety check
  const volumeStrength = signal.volume_strength || 1.0;
  const symbolEdge = volumeStrength > 1.5 ? 1.0 : volumeStrength < 0.8 ? 0.7 : 0.85;
  
  // Penalties for low-liquidity or weird ticks - add safety checks
  let liquidityPenalty = 1.0;
  if (volumeStrength < 0.5) liquidityPenalty = 0.8;
  if (entryPrice < 0.001 || entryPrice > 100000) liquidityPenalty *= 0.9;
  
  // Blend the scores
  const compositeScore = (
    modelConfidence * 0.4 +
    Math.min(rrRatio / 3, 1) * 0.3 +
    symbolEdge * 0.3
  ) * liquidityPenalty;
  
  return Math.min(compositeScore, 1.0);
}

// Calculate spread in basis points (mock implementation)
function calculateSpreadBps(signal: Signal): number {
  // Mock spread calculation - in real implementation this would come from orderbook data
  const priceLevel = signal.entry_price || 1;
  if (priceLevel < 1) return 25; // Higher spread for low-price tokens
  if (priceLevel > 1000) return 8; // Lower spread for high-price tokens
  return 15; // Default spread
}

function getGrade(score: number): 'A+' | 'A' | 'B' | 'C' {
  if (score >= 0.9) return 'A+';
  if (score >= 0.8) return 'A';
  if (score >= 0.7) return 'B';
  return 'C';
}

export function useRankedSignals(signals: Signal[], showAll: boolean = false): RankedSignal[] {
  return useMemo(() => {
    if (!signals || signals.length === 0) return [];
    
    // Add ranking data to each signal
    const rankedSignals: RankedSignal[] = signals.map(signal => {
      const edgeScore = calculateEdgeScore(signal);
      const spreadBps = calculateSpreadBps(signal);
      
      return {
        ...signal,
        score: edgeScore,
        edgeScore,
        spreadBps,
        grade: getGrade(edgeScore)
      };
    });
    
    // Apply spread filter (hide signals with spread > 20 bps unless showAll is true)
    const filteredSignals = showAll 
      ? rankedSignals 
      : rankedSignals.filter(signal => (signal.spreadBps || 0) <= 20);
    
    // Sort by composite score (⭐ Priority score as default)
    return filteredSignals.sort((a, b) => b.score - a.score);
  }, [signals, showAll]);
}