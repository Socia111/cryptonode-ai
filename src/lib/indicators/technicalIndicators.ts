// Type definitions for candles and technical indicators
export interface Candle {
  time: number;         // UNIX timestamp (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ADXResult {
  ADX: number;
  plusDI: number;
  minusDI: number;
}

export interface StochasticResult {
  K: number;
  D: number;
}

// Helper: Simple Moving Average of last N closes
export function calculateSMA(candles: Candle[], period: number): number | null {
  if (candles.length < period) return null;
  const sum = candles.slice(-period).reduce((acc, c) => acc + c.close, 0);
  return sum / period;
}

// Helper: Exponential Moving Average of last N closes
export function calculateEMA(candles: Candle[], period: number): number | null {
  const k = 2 / (period + 1);
  if (candles.length < period) return null;
  
  // Start with SMA for first EMA value
  let ema = calculateSMA(candles.slice(0, period), period) as number;
  
  // Apply EMA formula iteratively
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return ema;
}

// Helper: Average True Range
export function calculateATR(candles: Candle[], period: number): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i], prev = candles[i-1];
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    trs.push(tr);
  }
  
  // ATR = SMA of TRs over 'period'
  const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  return atr;
}

// Helper: Calculate +DI, -DI, ADX (Wilder's method)
export function calculateADX(candles: Candle[], period: number): ADXResult | null {
  if (candles.length < period + 1) return null;
  
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trArr: number[] = [];
  
  // Compute directional movements and TR
  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i-1].high;
    const downMove = candles[i-1].low - candles[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    
    const curr = candles[i], prev = candles[i-1];
    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );
    trArr.push(tr);
  }
  
  // Smooth +DM, -DM, TR by Wilder's method
  let sumPlus = plusDM.slice(0, period).reduce((a,b) => a+b,0);
  let sumMinus = minusDM.slice(0, period).reduce((a,b) => a+b,0);
  let sumTR = trArr.slice(0, period).reduce((a,b) => a+b,0);
  
  // Wilder smoothing for remaining bars
  for (let i = period; i < plusDM.length; i++) {
    sumPlus = sumPlus - (sumPlus / period) + plusDM[i];
    sumMinus = sumMinus - (sumMinus / period) + minusDM[i];
    sumTR = sumTR - (sumTR / period) + trArr[i];
  }
  
  if (sumTR === 0) return null;
  const plusDI = (sumPlus / sumTR) * 100;
  const minusDI = (sumMinus / sumTR) * 100;
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  
  // ADX is smoothed average of DX; approximate by using final DX here
  const adx = dx; 
  return { ADX: adx, plusDI, minusDI };
}

// Helper: Stochastic oscillator (%K and %D)
export function calculateStochastic(candles: Candle[], kPeriod: number, dPeriod: number): StochasticResult | null {
  if (candles.length < kPeriod) return null;
  
  // %K of last bar
  const slice = candles.slice(-kPeriod);
  const highestHigh = Math.max(...slice.map(c => c.high));
  const lowestLow = Math.min(...slice.map(c => c.low));
  const lastClose = slice[slice.length - 1].close;
  
  if (highestHigh === lowestLow) return null;
  const K = ((lastClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  
  // Compute %D as SMA of last dPeriod of %K
  const rawKs: number[] = [];
  for (let i = 0; i < dPeriod && (candles.length - kPeriod - i >= 0); i++) {
    const startIdx = Math.max(0, candles.length - kPeriod - i);
    const endIdx = candles.length - i;
    const window = candles.slice(startIdx, endIdx);
    
    if (window.length >= kPeriod) {
      const hh = Math.max(...window.map(c => c.high));
      const ll = Math.min(...window.map(c => c.low));
      const cl = window[window.length - 1].close;
      rawKs.push((hh === ll) ? 50 : ((cl - ll)/(hh - ll))*100);
    }
  }
  
  const D = rawKs.length > 0 ? rawKs.reduce((a,b) => a+b, 0) / rawKs.length : K;
  return { K, D };
}

// Helper: Volume Spike Detection
export function detectVolumeSpike(candles: Candle[], lookbackPeriod: number = 21, multiplier: number = 1.5): boolean {
  if (candles.length < lookbackPeriod + 1) return false;
  
  const lastCandle = candles[candles.length - 1];
  const avgVolume = candles.slice(-lookbackPeriod - 1, -1).reduce((a, b) => a + b.volume, 0) / lookbackPeriod;
  
  return lastCandle.volume > avgVolume * multiplier;
}

// Helper: Historical Volatility Percentage (annualized)
export function calculateHVP(candles: Candle[], period: number = 21): number | null {
  if (candles.length < period + 1) return null;
  
  const returns: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const logReturn = Math.log(candles[i].close / candles[i-1].close);
    returns.push(logReturn);
  }
  
  const recentReturns = returns.slice(-period);
  const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
  const variance = recentReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentReturns.length;
  const stdDev = Math.sqrt(variance);
  
  // Annualize (assuming 252 trading days per year)
  return stdDev * Math.sqrt(252) * 100;
}