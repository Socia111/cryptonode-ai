// Profit-Optimized Trading System
// Implements tight risk management for maximum ROI

export type ProfitOptimizedSignal = {
  id: string;
  token: string;
  direction: 'Buy' | 'Sell' | 'BUY' | 'SELL';
  _score: number;
  _grade: 'A+' | 'A' | 'B' | 'C';
  spread_bps?: number;
  rr?: number;
  risk_reward_ratio?: number;
  timeframe?: string;
  entry_price?: number;
};

export type RiskManagementParams = {
  stopLossPercent: number;   // Default: 2% (-0.02)
  takeProfitPercent: number; // Default: 4% (+0.04) for 2:1 R:R
  maxSpreadBps: number;      // Default: 20 bps
  minRiskReward: number;     // Default: 2.0
  minScore: number;          // Default: 0.8 (80%)
  allowedGrades: ('A+' | 'A' | 'B' | 'C')[];
};

export const DEFAULT_RISK_PARAMS: RiskManagementParams = {
  stopLossPercent: 0.02,     // 2% stop loss
  takeProfitPercent: 0.04,   // 4% take profit
  maxSpreadBps: 20,          // Max 20 bps spread
  minRiskReward: 2.0,        // Min 2:1 R:R
  minScore: 0.8,             // Min 80% confidence
  allowedGrades: ['A+', 'A'] // Only highest quality
};

/**
 * Filters signals for profit optimization
 * Returns only signals that meet strict profitability criteria
 */
export function filterProfitableSignals(
  signals: ProfitOptimizedSignal[], 
  params: RiskManagementParams = DEFAULT_RISK_PARAMS
): ProfitOptimizedSignal[] {
  return signals.filter(signal => {
    // Grade filter: Only allowed grades
    if (!params.allowedGrades.includes(signal._grade)) {
      console.log(`🚫 Filtered ${signal.token}: Grade ${signal._grade} not in allowed list`);
      return false;
    }

    // Timeframe filter: Exclude 1-minute signals (too noisy)
    const timeframe = signal.timeframe?.toLowerCase() || '';
    if (timeframe.includes('1m') || timeframe.includes('1min')) {
      console.log(`🚫 Filtered ${signal.token}: 1-minute timeframe too noisy`);
      return false;
    }

    // Spread filter: Skip wide spreads that eat profit
    const spread = signal.spread_bps || 0;
    if (spread > params.maxSpreadBps) {
      console.log(`🚫 Filtered ${signal.token}: Spread ${spread} bps > ${params.maxSpreadBps} bps`);
      return false;
    }

    // Risk:Reward filter: Only trade signals with good R:R
    const rr = signal.rr || signal.risk_reward_ratio || 0;
    if (rr < params.minRiskReward) {
      console.log(`🚫 Filtered ${signal.token}: R:R ${rr} < ${params.minRiskReward}`);
      return false;
    }

    // Score filter: Only trade high-confidence signals
    if (signal._score < params.minScore) {
      console.log(`🚫 Filtered ${signal.token}: Score ${(signal._score * 100).toFixed(1)}% < ${(params.minScore * 100)}%`);
      return false;
    }

    console.log(`✅ Approved ${signal.token}: Grade ${signal._grade}, Score ${(signal._score * 100).toFixed(1)}%, R:R ${rr}, Spread ${spread} bps`);
    return true;
  });
}

/**
 * Calculates risk management prices for a trade
 */
export function calculateRiskPrices(
  entryPrice: number,
  side: 'Buy' | 'Sell' | 'BUY' | 'SELL',
  params: RiskManagementParams = DEFAULT_RISK_PARAMS
) {
  const isBuy = side === 'Buy' || side === 'BUY';
  
  const stopLoss = isBuy 
    ? entryPrice * (1 - params.stopLossPercent)  // 2% below entry for long
    : entryPrice * (1 + params.stopLossPercent); // 2% above entry for short
    
  const takeProfit = isBuy
    ? entryPrice * (1 + params.takeProfitPercent) // 4% above entry for long
    : entryPrice * (1 - params.takeProfitPercent); // 4% below entry for short

  const actualStopPercent = Math.abs((stopLoss - entryPrice) / entryPrice * 100);
  const actualProfitPercent = Math.abs((takeProfit - entryPrice) / entryPrice * 100);
  const riskRewardRatio = actualProfitPercent / actualStopPercent;

  return {
    entryPrice,
    stopLoss,
    takeProfit,
    stopLossPercent: actualStopPercent,
    takeProfitPercent: actualProfitPercent,
    riskRewardRatio
  };
}

/**
 * Validates if a trade meets profit optimization criteria
 */
export function validateTradeQuality(signal: ProfitOptimizedSignal): {
  isValid: boolean;
  issues: string[];
  score: number;
} {
  const issues: string[] = [];
  let qualityScore = 0;

  // Grade quality (40% of score)
  if (signal._grade === 'A+') qualityScore += 40;
  else if (signal._grade === 'A') qualityScore += 35;
  else if (signal._grade === 'B') qualityScore += 20;
  else issues.push(`Low grade: ${signal._grade}`);

  // Confidence score (30% of score)
  const confidencePoints = signal._score * 30;
  qualityScore += confidencePoints;
  if (signal._score < 0.8) issues.push(`Low confidence: ${(signal._score * 100).toFixed(1)}%`);

  // Risk:Reward ratio (20% of score)
  const rr = signal.rr || signal.risk_reward_ratio || 0;
  if (rr >= 3) qualityScore += 20;
  else if (rr >= 2) qualityScore += 15;
  else if (rr >= 1.5) qualityScore += 10;
  else issues.push(`Poor R:R: ${rr}`);

  // Spread quality (10% of score)
  const spread = signal.spread_bps || 0;
  if (spread <= 10) qualityScore += 10;
  else if (spread <= 20) qualityScore += 5;
  else issues.push(`Wide spread: ${spread} bps`);

  return {
    isValid: issues.length === 0 && qualityScore >= 70,
    issues,
    score: qualityScore
  };
}

/**
 * Summary statistics for profit optimization
 */
export function getOptimizationStats(
  originalSignals: ProfitOptimizedSignal[],
  filteredSignals: ProfitOptimizedSignal[]
) {
  const originalCount = originalSignals.length;
  const filteredCount = filteredSignals.length;
  const filteredPercent = originalCount > 0 ? (filteredCount / originalCount * 100) : 0;

  const gradeBreakdown = filteredSignals.reduce((acc, signal) => {
    acc[signal._grade] = (acc[signal._grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgScore = filteredSignals.length > 0 
    ? filteredSignals.reduce((sum, s) => sum + s._score, 0) / filteredSignals.length 
    : 0;

  const avgRR = filteredSignals.length > 0
    ? filteredSignals.reduce((sum, s) => sum + (s.rr || s.risk_reward_ratio || 0), 0) / filteredSignals.length
    : 0;

  return {
    original: originalCount,
    filtered: filteredCount,
    filteredPercent: Math.round(filteredPercent),
    avgScore: Math.round(avgScore * 100),
    avgRiskReward: Math.round(avgRR * 100) / 100,
    gradeBreakdown
  };
}