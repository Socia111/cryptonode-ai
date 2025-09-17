// Enhanced Signal Scoring System
// Integrates with comprehensive trading algorithm and maintains backwards compatibility

import { EnhancedSignal } from './enhancedSignalAnalyzer';

export type UISignal = {
  id: string;
  token: string;          // e.g. "BTCUSDT"
  direction: 'Buy' | 'Sell' | 'BUY' | 'SELL';
  score?: number;         // model confidence 0..1 (if available)
  confidence_score?: number; // alt naming 0..1 (if available)
  rr?: number;            // risk:reward, e.g. 2.0
  risk_reward_ratio?: number;
  spread_bps?: number;    // optional
  entry_price?: number;
  take_profit?: number;
  stop_loss?: number;
  exit_target?: number;   // support for existing signals
  ts?: string | number;
  created_at?: string;    // support for existing signals
  timeframe?: string;     // support for existing signals
  spread?: number;        // support for existing signals
  edgeScore?: number;     // support for existing signals
  grade?: 'A+' | 'A' | 'B' | 'C'; // support for existing signals
  
  // Enhanced signal properties
  enhanced?: boolean;
  volumeConfirmation?: number;
  volatilityLevel?: number;
  trendStrength?: number;
  momentumAlignment?: boolean;
};

export function to0to1(v: number | undefined | null, fallback = 0): number {
  if (v == null || Number.isNaN(Number(v))) return fallback;
  const n = Number(v);
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function pickScore(s: UISignal): number {
  // prefer score, then confidence_score; assume already 0..1 if present
  if (typeof s.score === 'number') return to0to1(s.score);
  if (typeof s.confidence_score === 'number') return to0to1(s.confidence_score);
  return 0;
}

export function pickRR(s: UISignal): number {
  const rr = (typeof s.rr === 'number') ? s.rr : (typeof s.risk_reward_ratio === 'number' ? s.risk_reward_ratio : 1);
  return Math.max(0, rr);
}

export function gradeFromComposite(x: number): 'A+'|'A'|'B'|'C' {
  if (x >= 0.90) return 'A+';
  if (x >= 0.80) return 'A';
  if (x >= 0.65) return 'B';
  return 'C';
}

/**
 * Enhanced composite score calculation
 * Integrates with comprehensive algorithm while maintaining backwards compatibility
 */
export function compositeScore(s: UISignal): number {
  // Check if this is an enhanced signal
  if (s.enhanced) {
    return enhancedCompositeScore(s);
  }
  
  // Legacy scoring for backwards compatibility
  const conf = pickScore(s);               // 0..1
  const rr   = Math.min(pickRR(s) / 3, 1); // normalize R:R into 0..1 (cap at 3)
  const spr  = (s.spread_bps ?? 0) / 100;  // 100 bps = 1%
  const raw  = 0.70 * conf + 0.25 * rr - 0.05 * spr;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Enhanced scoring for signals from the comprehensive algorithm
 */
export function enhancedCompositeScore(s: UISignal): number {
  let score = 0;
  
  // Base confidence (40% weight)
  const confidence = pickScore(s);
  score += 0.40 * confidence;
  
  // Risk/Reward ratio (25% weight) 
  const rr = Math.min(pickRR(s) / 3, 1);
  score += 0.25 * rr;
  
  // Volume confirmation (15% weight)
  if (s.volumeConfirmation) {
    score += 0.15 * Math.min(s.volumeConfirmation / 2.0, 1); // Cap at 2x volume
  }
  
  // Volatility level (10% weight)
  if (s.volatilityLevel) {
    score += 0.10 * Math.min(s.volatilityLevel / 100, 1); // Percentile-based
  }
  
  // Momentum alignment bonus (5% weight)
  if (s.momentumAlignment) {
    score += 0.05;
  }
  
  // Trend strength (5% weight)
  if (s.trendStrength) {
    score += 0.05 * Math.min(s.trendStrength / 50, 1); // ADX-based, cap at 50
  }
  
  // Spread penalty (small)
  const spr = (s.spread_bps ?? 0) / 100;
  score -= 0.02 * spr;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Convert enhanced signal to UI signal format
 */
export function convertEnhancedToUISignal(enhanced: any): UISignal {
  return {
    id: enhanced.id,
    token: enhanced.symbol,
    direction: enhanced.direction === 'LONG' ? 'BUY' : 'SELL',
    score: enhanced.confidence / 100,
    confidence_score: enhanced.confidence / 100,
    rr: enhanced.riskRewardRatio,
    risk_reward_ratio: enhanced.riskRewardRatio,
    entry_price: enhanced.entryPrice,
    take_profit: enhanced.takeProfit,
    stop_loss: enhanced.stopLoss,
    created_at: enhanced.createdAt,
    timeframe: enhanced.timeframe,
    grade: enhanced.grade,
    enhanced: true,
    volumeConfirmation: enhanced.indicators?.volumeRatio,
    volatilityLevel: enhanced.indicators?.hvp,
    trendStrength: enhanced.indicators?.adx,
    momentumAlignment: enhanced.optionalConfirmations?.stochasticConfirm && enhanced.optionalConfirmations?.dmiConfirm
  };
}