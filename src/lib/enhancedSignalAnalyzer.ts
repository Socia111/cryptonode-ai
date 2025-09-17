// Enhanced Trading Signal Algorithm Implementation
// Comprehensive trend reversal detection with multiple confirmation layers

export interface TechnicalIndicators {
  // Moving Averages
  ema21: number;
  sma200: number;
  
  // Volume Analysis
  volume: number;
  volumeSma20: number;
  volumeRatio: number;
  
  // Volatility
  atr14: number;
  hvp: number; // Historical Volatility Percentile
  hvpSma20: number;
  
  // Momentum Oscillators
  stochK: number;
  stochD: number;
  prevStochK: number;
  prevStochD: number;
  
  // Trend Strength
  plusDI: number;
  minusDI: number;
  adx: number;
  
  // Price Data
  close: number;
  prevClose: number;
  high: number;
  low: number;
}

export interface PrimarySignalConditions {
  trendCrossover: boolean;
  volumeSurge: boolean;
  highVolatility: boolean;
}

export interface OptionalConfirmations {
  stochasticConfirm: boolean;
  dmiConfirm: boolean;
}

export interface RiskManagement {
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  atrMultiplierSL: number;
  atrMultiplierTP: number;
}

export interface SignalConfidence {
  baseConfidence: number;
  volumeBonus: number;
  volatilityBonus: number;
  stochasticBonus: number;
  dmiBonus: number;
  totalConfidence: number;
}

export interface EnhancedSignal {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  timeframe: string;
  
  // Entry/Exit
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  
  // Scoring
  confidence: number;
  grade: 'A+' | 'A' | 'B' | 'C';
  riskRewardRatio: number;
  
  // Conditions Met
  primaryConditions: PrimarySignalConditions;
  optionalConfirmations: OptionalConfirmations;
  
  // Risk Management
  riskManagement: RiskManagement;
  
  // Metadata
  createdAt: string;
  expiresAt: string;
  
  // Technical Data
  indicators: TechnicalIndicators;
  confidenceBreakdown: SignalConfidence;
}

export interface SignalFilters {
  useStochasticFilter: boolean;
  useDmiFilter: boolean;
  cooldownPeriodHours: number;
  minConfidence: number;
  minRiskReward: number;
}

// Default configuration
export const DEFAULT_SIGNAL_CONFIG: SignalFilters = {
  useStochasticFilter: true,
  useDmiFilter: true,
  cooldownPeriodHours: 2,
  minConfidence: 70,
  minRiskReward: 1.3
};

export const ATR_CONFIG = {
  stopLossMultiplier: 2.0,
  takeProfitMultiplier: 3.0,
  period: 14
};

// Signal cooldown tracking
const signalCooldowns = new Map<string, number>();

/**
 * Primary Signal Conditions (Mandatory)
 */
export function checkPrimaryConditions(
  indicators: TechnicalIndicators,
  prevIndicators: TechnicalIndicators
): { long: PrimarySignalConditions; short: PrimarySignalConditions } {
  
  // 1. Trend Crossover Detection (Golden Cross / Death Cross)
  const goldenCross = 
    indicators.ema21 > indicators.sma200 && 
    prevIndicators.ema21 <= prevIndicators.sma200;
    
  const deathCross = 
    indicators.ema21 < indicators.sma200 && 
    prevIndicators.ema21 >= prevIndicators.sma200;
  
  // 2. Volume Surge Confirmation (1.5x average)
  const volumeSurge = indicators.volumeRatio > 1.5;
  
  // 3. High Volatility Regime
  const highVolatility = 
    indicators.hvp > 50 || 
    indicators.hvp > indicators.hvpSma20;
  
  return {
    long: {
      trendCrossover: goldenCross,
      volumeSurge,
      highVolatility
    },
    short: {
      trendCrossover: deathCross,
      volumeSurge,
      highVolatility
    }
  };
}

/**
 * Optional Confirmation Filters
 */
export function checkOptionalConfirmations(
  indicators: TechnicalIndicators,
  config: SignalFilters
): { long: OptionalConfirmations; short: OptionalConfirmations } {
  
  let longStochastic = true;
  let shortStochastic = true;
  let longDmi = true;
  let shortDmi = true;
  
  // Stochastic Momentum Filter
  if (config.useStochasticFilter) {
    // Long: %K crosses above %D while %K < 80 (not overbought)
    longStochastic = 
      indicators.stochK > indicators.stochD && 
      indicators.prevStochK <= indicators.prevStochD && 
      indicators.stochK < 80;
      
    // Short: %K crosses below %D while %K > 20 (not oversold)
    shortStochastic = 
      indicators.stochK < indicators.stochD && 
      indicators.prevStochK >= indicators.prevStochD && 
      indicators.stochK > 20;
  }
  
  // DMI/ADX Trend Strength Filter
  if (config.useDmiFilter) {
    // Long: +DI > -DI with ADX > 20 (trending market)
    longDmi = 
      indicators.plusDI > indicators.minusDI && 
      indicators.adx > 20;
      
    // Short: -DI > +DI with ADX > 20
    shortDmi = 
      indicators.minusDI > indicators.plusDI && 
      indicators.adx > 20;
  }
  
  return {
    long: {
      stochasticConfirm: longStochastic,
      dmiConfirm: longDmi
    },
    short: {
      stochasticConfirm: shortStochastic,
      dmiConfirm: shortDmi
    }
  };
}

/**
 * ATR-Based Risk Management
 */
export function calculateRiskManagement(
  entryPrice: number,
  direction: 'LONG' | 'SHORT',
  atr: number
): RiskManagement {
  const stopLossDistance = ATR_CONFIG.stopLossMultiplier * atr;
  const takeProfitDistance = ATR_CONFIG.takeProfitMultiplier * atr;
  
  let stopLoss: number;
  let takeProfit: number;
  
  if (direction === 'LONG') {
    stopLoss = entryPrice - stopLossDistance;
    takeProfit = entryPrice + takeProfitDistance;
  } else {
    stopLoss = entryPrice + stopLossDistance;
    takeProfit = entryPrice - takeProfitDistance;
  }
  
  const riskRewardRatio = takeProfitDistance / stopLossDistance;
  
  return {
    stopLoss,
    takeProfit,
    riskRewardRatio,
    atrMultiplierSL: ATR_CONFIG.stopLossMultiplier,
    atrMultiplierTP: ATR_CONFIG.takeProfitMultiplier
  };
}

/**
 * Confidence Score Calculation
 */
export function calculateConfidenceScore(
  indicators: TechnicalIndicators,
  confirmations: OptionalConfirmations,
  config: SignalFilters
): SignalConfidence {
  
  // Base confidence for meeting primary conditions
  const baseConfidence = 70;
  
  // Volume bonus: up to +15 points for exceptional volume
  const volumeBonus = Math.min(15, (indicators.volumeRatio - 1.5) * 10);
  
  // Volatility bonus: up to +10 points for extreme volatility
  const volatilityBonus = Math.min(10, Math.max(0, (indicators.hvp - 50) / 5));
  
  // Stochastic bonus: +3 points if confirmed
  const stochasticBonus = config.useStochasticFilter && confirmations.stochasticConfirm ? 3 : 0;
  
  // DMI bonus: +2 points if confirmed
  const dmiBonus = config.useDmiFilter && confirmations.dmiConfirm ? 2 : 0;
  
  // Total confidence (clamped between 70-95)
  const totalConfidence = Math.min(95, Math.max(70, Math.round(
    baseConfidence + volumeBonus + volatilityBonus + stochasticBonus + dmiBonus
  )));
  
  return {
    baseConfidence,
    volumeBonus,
    volatilityBonus,
    stochasticBonus,
    dmiBonus,
    totalConfidence
  };
}

/**
 * Signal Grading System
 */
export function calculateGrade(confidence: number, riskReward: number): 'A+' | 'A' | 'B' | 'C' {
  if (confidence >= 90 && riskReward >= 1.4) return 'A+';
  if (confidence >= 85 && riskReward >= 1.3) return 'A';
  if (confidence >= 80) return 'B';
  return 'C';
}

/**
 * Signal Cooldown Management
 */
export function checkCooldown(symbol: string, direction: 'LONG' | 'SHORT', cooldownHours: number): boolean {
  const key = `${symbol}_${direction}`;
  const now = Date.now();
  const lastSignal = signalCooldowns.get(key);
  
  if (!lastSignal) return true;
  
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  return (now - lastSignal) > cooldownMs;
}

export function setCooldown(symbol: string, direction: 'LONG' | 'SHORT'): void {
  const key = `${symbol}_${direction}`;
  signalCooldowns.set(key, Date.now());
}

/**
 * Signal Expiry Calculation
 */
export function calculateExpiry(timeframe: string): string {
  const now = new Date();
  let expiryMinutes: number;
  
  switch (timeframe) {
    case '5m': expiryMinutes = 5; break;
    case '15m': expiryMinutes = 15; break;
    case '30m': expiryMinutes = 30; break;
    case '1h': expiryMinutes = 60; break;
    case '2h': expiryMinutes = 120; break;
    case '4h': expiryMinutes = 240; break;
    default: expiryMinutes = 60;
  }
  
  return new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString();
}

/**
 * Main Signal Analysis Function
 */
export function analyzeSignal(
  symbol: string,
  timeframe: string,
  indicators: TechnicalIndicators,
  prevIndicators: TechnicalIndicators,
  config: SignalFilters = DEFAULT_SIGNAL_CONFIG
): EnhancedSignal | null {
  
  // Check primary conditions
  const primaryConditions = checkPrimaryConditions(indicators, prevIndicators);
  
  // Check which direction(s) have valid primary conditions
  const longValid = 
    primaryConditions.long.trendCrossover && 
    primaryConditions.long.volumeSurge && 
    primaryConditions.long.highVolatility;
    
  const shortValid = 
    primaryConditions.short.trendCrossover && 
    primaryConditions.short.volumeSurge && 
    primaryConditions.short.highVolatility;
  
  if (!longValid && !shortValid) return null;
  
  // Determine signal direction (prefer long if both valid)
  const direction: 'LONG' | 'SHORT' = longValid ? 'LONG' : 'SHORT';
  const relevantPrimary = direction === 'LONG' ? primaryConditions.long : primaryConditions.short;
  
  // Check cooldown
  if (!checkCooldown(symbol, direction, config.cooldownPeriodHours)) {
    return null;
  }
  
  // Check optional confirmations
  const confirmations = checkOptionalConfirmations(indicators, config);
  const relevantConfirmations = direction === 'LONG' ? confirmations.long : confirmations.short;
  
  // If optional filters are enabled, they must confirm
  if (config.useStochasticFilter && !relevantConfirmations.stochasticConfirm) return null;
  if (config.useDmiFilter && !relevantConfirmations.dmiConfirm) return null;
  
  // Calculate risk management
  const riskManagement = calculateRiskManagement(indicators.close, direction, indicators.atr14);
  
  // Check minimum risk/reward requirement
  if (riskManagement.riskRewardRatio < config.minRiskReward) return null;
  
  // Calculate confidence
  const confidenceBreakdown = calculateConfidenceScore(indicators, relevantConfirmations, config);
  
  // Check minimum confidence requirement
  if (confidenceBreakdown.totalConfidence < config.minConfidence) return null;
  
  // Calculate grade
  const grade = calculateGrade(confidenceBreakdown.totalConfidence, riskManagement.riskRewardRatio);
  
  // Set cooldown
  setCooldown(symbol, direction);
  
  // Create signal
  const signal: EnhancedSignal = {
    id: `${symbol}_${direction}_${Date.now()}`,
    symbol,
    direction,
    timeframe,
    entryPrice: indicators.close,
    stopLoss: riskManagement.stopLoss,
    takeProfit: riskManagement.takeProfit,
    confidence: confidenceBreakdown.totalConfidence,
    grade,
    riskRewardRatio: riskManagement.riskRewardRatio,
    primaryConditions: relevantPrimary,
    optionalConfirmations: relevantConfirmations,
    riskManagement,
    createdAt: new Date().toISOString(),
    expiresAt: calculateExpiry(timeframe),
    indicators,
    confidenceBreakdown
  };
  
  return signal;
}

/**
 * Batch Signal Analysis for Multiple Symbols
 */
export function analyzeMultipleSignals(
  symbolData: Array<{
    symbol: string;
    timeframe: string;
    indicators: TechnicalIndicators;
    prevIndicators: TechnicalIndicators;
  }>,
  config: SignalFilters = DEFAULT_SIGNAL_CONFIG
): EnhancedSignal[] {
  
  const signals: EnhancedSignal[] = [];
  
  for (const data of symbolData) {
    const signal = analyzeSignal(
      data.symbol,
      data.timeframe,
      data.indicators,
      data.prevIndicators,
      config
    );
    
    if (signal) {
      signals.push(signal);
    }
  }
  
  // Sort by confidence score (highest first)
  return signals.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Signal Quality Assessment
 */
export function assessSignalQuality(signal: EnhancedSignal): {
  qualityScore: number;
  strengths: string[];
  warnings: string[];
} {
  
  const strengths: string[] = [];
  const warnings: string[] = [];
  let qualityScore = 0;
  
  // Confidence assessment
  if (signal.confidence >= 90) {
    strengths.push('Exceptional confidence level');
    qualityScore += 30;
  } else if (signal.confidence >= 85) {
    strengths.push('High confidence level');
    qualityScore += 25;
  } else if (signal.confidence < 75) {
    warnings.push('Lower confidence signal');
    qualityScore += 10;
  } else {
    qualityScore += 20;
  }
  
  // Risk/Reward assessment
  if (signal.riskRewardRatio >= 2.0) {
    strengths.push('Excellent risk/reward ratio');
    qualityScore += 25;
  } else if (signal.riskRewardRatio >= 1.5) {
    strengths.push('Good risk/reward ratio');
    qualityScore += 20;
  } else {
    warnings.push('Marginal risk/reward ratio');
    qualityScore += 10;
  }
  
  // Volume confirmation
  if (signal.indicators.volumeRatio >= 2.0) {
    strengths.push('Strong volume confirmation');
    qualityScore += 20;
  } else if (signal.indicators.volumeRatio >= 1.5) {
    qualityScore += 15;
  }
  
  // Volatility assessment
  if (signal.indicators.hvp >= 80) {
    strengths.push('High volatility environment');
    qualityScore += 15;
  } else if (signal.indicators.hvp < 60) {
    warnings.push('Moderate volatility');
    qualityScore += 5;
  } else {
    qualityScore += 10;
  }
  
  // Optional confirmations
  if (signal.optionalConfirmations.stochasticConfirm) {
    strengths.push('Momentum confirmation');
    qualityScore += 5;
  }
  
  if (signal.optionalConfirmations.dmiConfirm) {
    strengths.push('Trend strength confirmation');
    qualityScore += 5;
  }
  
  return {
    qualityScore: Math.min(100, qualityScore),
    strengths,
    warnings
  };
}

/**
 * Export utilities for backwards compatibility
 */
export function convertToLegacySignal(enhancedSignal: EnhancedSignal): any {
  return {
    id: enhancedSignal.id,
    symbol: enhancedSignal.symbol,
    direction: enhancedSignal.direction,
    price: enhancedSignal.entryPrice,
    tp: enhancedSignal.takeProfit,
    sl: enhancedSignal.stopLoss,
    score: enhancedSignal.confidence,
    timeframe: enhancedSignal.timeframe,
    algo: 'EnhancedAItradeX1',
    created_at: enhancedSignal.createdAt,
    grade: enhancedSignal.grade,
    risk_reward_ratio: enhancedSignal.riskRewardRatio
  };
}