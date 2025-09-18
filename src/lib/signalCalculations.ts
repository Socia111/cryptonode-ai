// Trading Signal Calculation Logic
// Auto-calculates SL/TP levels based on volatility and risk management

export interface SignalLevels {
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  r_r_ratio: number;
}

export interface VolatilityParams {
  percentSL: number;
  percentTP: number;
  percentTP2?: number;
}

// Default volatility-based parameters
const VOLATILITY_PARAMS: Record<string, VolatilityParams> = {
  'Low': { percentSL: 0.8, percentTP: 1.8, percentTP2: 2.8 },
  'Medium': { percentSL: 1.2, percentTP: 2.5, percentTP2: 4.0 },
  'High': { percentSL: 1.8, percentTP: 3.5, percentTP2: 6.0 }
};

export const calculateSignalLevels = (
  price: number, 
  direction: 'LONG' | 'SHORT',
  volatility: 'Low' | 'Medium' | 'High' = 'Medium'
): SignalLevels => {
  const params = VOLATILITY_PARAMS[volatility];
  
  const sl = direction === 'LONG' 
    ? price * (1 - params.percentSL / 100)
    : price * (1 + params.percentSL / 100);

  const tp1 = direction === 'LONG'
    ? price * (1 + params.percentTP / 100)
    : price * (1 - params.percentTP / 100);

  const tp2 = direction === 'LONG'
    ? price * (1 + (params.percentTP2 || params.percentTP * 1.5) / 100)
    : price * (1 - (params.percentTP2 || params.percentTP * 1.5) / 100);

  const rr = Math.abs((tp1 - price) / (price - sl));

  return { 
    stop_loss: Number(sl.toFixed(6)), 
    take_profit_1: Number(tp1.toFixed(6)), 
    take_profit_2: Number(tp2.toFixed(6)), 
    r_r_ratio: Number(rr.toFixed(2)) 
  };
};

// Determine volatility based on market indicators
export const determineVolatility = (
  atr?: number,
  volume_ratio?: number,
  price_change_24h?: number
): 'Low' | 'Medium' | 'High' => {
  let volatilityScore = 0;
  
  // ATR-based volatility
  if (atr) {
    if (atr > 0.05) volatilityScore += 2;
    else if (atr > 0.02) volatilityScore += 1;
  }
  
  // Volume-based volatility
  if (volume_ratio) {
    if (volume_ratio > 2.0) volatilityScore += 2;
    else if (volume_ratio > 1.2) volatilityScore += 1;
  }
  
  // Price change volatility
  if (price_change_24h) {
    const absChange = Math.abs(price_change_24h);
    if (absChange > 10) volatilityScore += 2;
    else if (absChange > 5) volatilityScore += 1;
  }
  
  if (volatilityScore >= 4) return 'High';
  if (volatilityScore >= 2) return 'Medium';
  return 'Low';
};

// Determine trend strength
export const determineTrendStrength = (
  rsi?: number,
  adx?: number,
  volume_ratio?: number
): 'Weak' | 'Moderate' | 'Strong' => {
  let strengthScore = 0;
  
  // RSI momentum
  if (rsi) {
    if (rsi > 70 || rsi < 30) strengthScore += 2;
    else if (rsi > 60 || rsi < 40) strengthScore += 1;
  }
  
  // ADX trend strength
  if (adx) {
    if (adx > 50) strengthScore += 2;
    else if (adx > 25) strengthScore += 1;
  }
  
  // Volume confirmation
  if (volume_ratio && volume_ratio > 1.5) strengthScore += 1;
  
  if (strengthScore >= 4) return 'Strong';
  if (strengthScore >= 2) return 'Moderate';
  return 'Weak';
};

// Convert legacy Signal to enhanced TradingSignal with UISignal compatibility
export const enhanceSignal = (signal: any): any => {
  const volatility = determineVolatility(
    signal.atr,
    signal.volume_ratio,
    signal.change_24h_percent
  );
  
  const trendStrength = determineTrendStrength(
    signal.rsi_14,
    signal.adx,
    signal.volume_ratio
  );
  
  const levels = calculateSignalLevels(
    signal.entry_price || signal.price,
    signal.direction,
    volatility
  );
  
  return {
    ...signal,
    // Ensure UISignal compatibility
    token: signal.symbol,
    direction: signal.side || signal.direction,
    entry_price: signal.entry_price || signal.price,
    ...levels,
    volatility,
    trend_strength: trendStrength,
    confidence_score: signal.confidence || signal.score || 0,
    generated_at: signal.created_at || new Date().toISOString()
  };
};