// Complete Trading Signal Scoring System
// Implements the advanced confidence scoring and grading system per specifications

export type UISignal = {
  id: string;
  token: string;
  direction: 'Buy' | 'Sell' | 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  source?: string;
  score?: number;
  confidence_score?: number;
  rr?: number;
  risk_reward_ratio?: number;
  spread_bps?: number;
  entry_price?: number;
  take_profit?: number;
  stop_loss?: number;
  exit_target?: number;
  ts?: string | number;
  created_at?: string;
  timeframe?: string;
  spread?: number;
  edgeScore?: number;
  grade?: 'A+' | 'A' | 'B' | 'C';
  signal_grade?: 'A+' | 'A' | 'B' | 'C';
  
  // Complete Algorithm specific fields
  golden_cross?: boolean;
  death_cross?: boolean;
  volume_surge?: boolean;
  volume_ratio?: number;
  high_volatility?: boolean;
  hvp_value?: number;
  stochastic_confirmed?: boolean;
  dmi_confirmed?: boolean;
  atr_value?: number;
  algorithm?: string;
  version?: string;
};

// ===================== CORE SCORING FUNCTIONS =====================

export function to0to1(v: number | undefined | null, fallback = 0): number {
  if (v == null || Number.isNaN(Number(v))) return fallback;
  const n = Number(v);
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function pickScore(s: UISignal): number {
  // For complete algorithm signals, use confidence_score (0-100) normalized to 0-1
  if (typeof s.confidence_score === 'number') {
    return s.confidence_score > 1 ? s.confidence_score / 100 : s.confidence_score;
  }
  // Fallback to score field
  if (typeof s.score === 'number') {
    return s.score > 1 ? s.score / 100 : s.score;
  }
  return 0;
}

export function pickRR(s: UISignal): number {
  const rr = (typeof s.rr === 'number') ? s.rr : 
             (typeof s.risk_reward_ratio === 'number' ? s.risk_reward_ratio : 1.5);
  return Math.max(0, rr);
}

// ===================== COMPLETE ALGORITHM CONFIDENCE SCORING =====================

export function calculateCompleteAlgorithmConfidence(signal: UISignal): number {
  let confidence = 70; // Base confidence for meeting primary conditions
  
  // Volume Bonus: up to +15 points
  if (signal.volume_ratio && signal.volume_ratio > 1.5) {
    const volumeBonus = Math.min(15, (signal.volume_ratio - 1.5) * 10);
    confidence += volumeBonus;
  }
  
  // Volatility Bonus: up to +10 points  
  if (signal.hvp_value && signal.hvp_value > 50) {
    const volatilityBonus = Math.min(10, (signal.hvp_value - 50) / 5);
    confidence += volatilityBonus;
  }
  
  // Stochastic Bonus: +3 points if confirmed
  if (signal.stochastic_confirmed) {
    confidence += 3;
  }
  
  // DMI Bonus: +2 points if confirmed
  if (signal.dmi_confirmed) {
    confidence += 2;
  }
  
  // Clamp between 70-95
  return Math.max(70, Math.min(95, Math.round(confidence)));
}

// ===================== SIGNAL GRADING SYSTEM =====================

export function gradeFromConfidenceAndRR(confidence: number, riskReward: number): 'A+' | 'A' | 'B' | 'C' {
  // Complete Algorithm Grading System
  if (confidence >= 90 && riskReward >= 1.4) return 'A+';
  if (confidence >= 85 && riskReward >= 1.3) return 'A';
  if (confidence >= 80) return 'B';
  return 'C';
}

export function gradeFromComposite(x: number): 'A+' | 'A' | 'B' | 'C' {
  // Legacy grading for composite scores (0-1 scale)
  if (x >= 0.90) return 'A+';
  if (x >= 0.80) return 'A';
  if (x >= 0.65) return 'B';
  return 'C';
}

// ===================== COMPOSITE SCORING =====================

/**
 * Enhanced composite score for Complete Trading Signal Algorithm
 * Weights: 60% confidence + 30% risk-reward + 10% volume confirmation - spread penalty
 */
export function compositeScore(s: UISignal): number {
  // Use algorithm-specific scoring if available
  if (s.algorithm === 'complete_signal_algorithm' || s.algorithm === 'complete_signal_v1') {
    const confidence = s.confidence_score ? (s.confidence_score > 1 ? s.confidence_score / 100 : s.confidence_score) : 0;
    const rr = Math.min(pickRR(s) / 3, 1); // normalize R:R to 0-1 (cap at 3)
    const volumeBonus = s.volume_ratio && s.volume_ratio > 1.5 ? Math.min(0.1, (s.volume_ratio - 1.5) / 10) : 0;
    const spreadPenalty = (s.spread_bps ?? 0) / 1000; // Reduced penalty for high-quality signals
    
    const raw = 0.60 * confidence + 0.30 * rr + 0.10 * volumeBonus - spreadPenalty;
    return Math.max(0, Math.min(1, raw));
  }
  
  // Legacy composite scoring for other algorithms
  const conf = pickScore(s);
  const rr = Math.min(pickRR(s) / 3, 1);
  const spr = (s.spread_bps ?? 0) / 100;
  const raw = 0.70 * conf + 0.25 * rr - 0.05 * spr;
  return Math.max(0, Math.min(1, raw));
}

// ===================== SIGNAL QUALITY ASSESSMENT =====================

export function assessSignalQuality(signal: UISignal): {
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  score: number;
  factors: string[];
} {
  const factors: string[] = [];
  let quality: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Poor';
  
  const confidence = pickScore(signal) * 100;
  const riskReward = pickRR(signal);
  const grade = signal.grade || signal.signal_grade;
  
  // Assess individual factors
  if (signal.golden_cross || signal.death_cross) {
    factors.push('✅ Golden/Death Cross Confirmed');
  }
  
  if (signal.volume_surge && signal.volume_ratio && signal.volume_ratio >= 1.5) {
    factors.push(`✅ Volume Surge (${signal.volume_ratio.toFixed(1)}×)`);
  }
  
  if (signal.high_volatility && signal.hvp_value && signal.hvp_value > 50) {
    factors.push(`✅ High Volatility Regime (${signal.hvp_value.toFixed(0)}th percentile)`);
  }
  
  if (signal.stochastic_confirmed) {
    factors.push('✅ Stochastic Momentum Aligned');
  }
  
  if (signal.dmi_confirmed) {
    factors.push('✅ DMI/ADX Trend Confirmed');
  }
  
  if (riskReward >= 1.5) {
    factors.push(`✅ Strong Risk:Reward (${riskReward.toFixed(1)}:1)`);
  }
  
  // Determine overall quality
  const compositeScoreValue = compositeScore(signal);
  
  if (compositeScoreValue >= 0.85 || grade === 'A+') {
    quality = 'Excellent';
  } else if (compositeScoreValue >= 0.75 || grade === 'A') {
    quality = 'Good';
  } else if (compositeScoreValue >= 0.60 || grade === 'B') {
    quality = 'Fair';
  }
  
  return {
    quality,
    score: compositeScoreValue,
    factors
  };
}

// ===================== SIGNAL FILTERING HELPERS =====================

export function filterByMinConfidence(signals: UISignal[], minConfidence: number): UISignal[] {
  return signals.filter(signal => {
    const confidence = pickScore(signal) * 100;
    return confidence >= minConfidence;
  });
}

export function filterByGrade(signals: UISignal[], minGrade: 'A+' | 'A' | 'B' | 'C'): UISignal[] {
  const gradeOrder = { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 };
  const minGradeValue = gradeOrder[minGrade];
  
  return signals.filter(signal => {
    const grade = signal.grade || signal.signal_grade || 'C';
    return gradeOrder[grade] >= minGradeValue;
  });
}

export function filterByAlgorithm(signals: UISignal[], algorithm: string): UISignal[] {
  return signals.filter(signal => 
    signal.algorithm === algorithm || 
    (algorithm === 'complete' && (signal.algorithm?.includes('complete') || signal.algorithm?.includes('v1')))
  );
}

// ===================== EXPORT ENHANCED SIGNAL OBJECT =====================

export function enhanceSignalWithScoring(signal: UISignal): UISignal & {
  enhancedScore: number;
  enhancedGrade: 'A+' | 'A' | 'B' | 'C';
  qualityAssessment: ReturnType<typeof assessSignalQuality>;
} {
  const enhancedScore = compositeScore(signal);
  const confidence = pickScore(signal) * 100;
  const riskReward = pickRR(signal);
  
  const enhancedGrade = signal.algorithm?.includes('complete') ? 
    gradeFromConfidenceAndRR(confidence, riskReward) : 
    gradeFromComposite(enhancedScore);
    
  const qualityAssessment = assessSignalQuality(signal);
  
  return {
    ...signal,
    enhancedScore,
    enhancedGrade,
    qualityAssessment
  };
}