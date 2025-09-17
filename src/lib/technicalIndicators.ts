// Technical Indicators Library for Enhanced Signal Analysis

export interface OHLCVData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

/**
 * Simple Moving Average
 */
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  
  return sma;
}

/**
 * Exponential Moving Average
 */
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first value
  const smaFirst = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(smaFirst);
  
  for (let i = period; i < data.length; i++) {
    const currentEma = (data[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
    ema.push(currentEma);
  }
  
  return ema;
}

/**
 * Average True Range (ATR)
 */
export function calculateATR(ohlcData: OHLCVData[], period: number = 14): number[] {
  const trueRanges: number[] = [];
  
  for (let i = 1; i < ohlcData.length; i++) {
    const current = ohlcData[i];
    const previous = ohlcData[i - 1];
    
    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return calculateSMA(trueRanges, period);
}

/**
 * Historical Volatility Percentile
 */
export function calculateHVP(ohlcData: OHLCVData[], lookbackPeriod: number = 252): number[] {
  const hvp: number[] = [];
  const returns: number[] = [];
  
  // Calculate daily returns
  for (let i = 1; i < ohlcData.length; i++) {
    const dailyReturn = Math.log(ohlcData[i].close / ohlcData[i - 1].close);
    returns.push(dailyReturn);
  }
  
  // Calculate rolling volatility and percentiles
  for (let i = lookbackPeriod; i < returns.length; i++) {
    const periodReturns = returns.slice(i - lookbackPeriod, i);
    
    // Calculate current volatility (annualized)
    const currentReturns = returns.slice(i - 20, i); // 20-day window
    const mean = currentReturns.reduce((a, b) => a + b, 0) / currentReturns.length;
    const variance = currentReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / currentReturns.length;
    const currentVol = Math.sqrt(variance * 252); // Annualized
    
    // Calculate historical volatilities for ranking
    const historicalVols: number[] = [];
    for (let j = 20; j <= lookbackPeriod; j += 20) {
      if (j <= periodReturns.length) {
        const histReturns = periodReturns.slice(-j);
        const histMean = histReturns.reduce((a, b) => a + b, 0) / histReturns.length;
        const histVariance = histReturns.reduce((sum, ret) => sum + Math.pow(ret - histMean, 2), 0) / histReturns.length;
        historicalVols.push(Math.sqrt(histVariance * 252));
      }
    }
    
    // Calculate percentile
    const lowerCount = historicalVols.filter(vol => vol < currentVol).length;
    const percentile = (lowerCount / historicalVols.length) * 100;
    
    hvp.push(percentile);
  }
  
  return hvp;
}

/**
 * Stochastic Oscillator
 */
export function calculateStochastic(
  ohlcData: OHLCVData[], 
  kPeriod: number = 14, 
  dPeriod: number = 3
): { k: number[], d: number[] } {
  
  const kValues: number[] = [];
  
  for (let i = kPeriod - 1; i < ohlcData.length; i++) {
    const periodData = ohlcData.slice(i - kPeriod + 1, i + 1);
    const lowestLow = Math.min(...periodData.map(d => d.low));
    const highestHigh = Math.max(...periodData.map(d => d.high));
    const currentClose = ohlcData[i].close;
    
    const kValue = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(kValue);
  }
  
  const dValues = calculateSMA(kValues, dPeriod);
  
  return { k: kValues, d: dValues };
}

/**
 * Directional Movement Index (DMI) and ADX
 */
export function calculateDMI(ohlcData: OHLCVData[], period: number = 13): {
  plusDI: number[];
  minusDI: number[];
  adx: number[];
} {
  
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trueRanges: number[] = [];
  
  // Calculate +DM, -DM, and TR
  for (let i = 1; i < ohlcData.length; i++) {
    const current = ohlcData[i];
    const previous = ohlcData[i - 1];
    
    const highDiff = current.high - previous.high;
    const lowDiff = previous.low - current.low;
    
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    
    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  // Smooth the values using Wilder's smoothing
  const smoothedPlusDM = wilderSmoothing(plusDM, period);
  const smoothedMinusDM = wilderSmoothing(minusDM, period);
  const smoothedTR = wilderSmoothing(trueRanges, period);
  
  // Calculate DI values
  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];
  
  for (let i = 0; i < smoothedTR.length; i++) {
    const plusDIValue = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
    const minusDIValue = (smoothedMinusDM[i] / smoothedTR[i]) * 100;
    
    plusDI.push(plusDIValue);
    minusDI.push(minusDIValue);
    
    const dxValue = Math.abs(plusDIValue - minusDIValue) / (plusDIValue + minusDIValue) * 100;
    dx.push(dxValue);
  }
  
  // Calculate ADX
  const adx = wilderSmoothing(dx, period);
  
  return { plusDI, minusDI, adx };
}

/**
 * Wilder's Smoothing (used in DMI/ADX calculation)
 */
function wilderSmoothing(data: number[], period: number): number[] {
  const smoothed: number[] = [];
  
  // First value is simple average
  const firstSum = data.slice(0, period).reduce((a, b) => a + b, 0);
  smoothed.push(firstSum / period);
  
  // Subsequent values use Wilder's formula
  for (let i = period; i < data.length; i++) {
    const newValue = (smoothed[smoothed.length - 1] * (period - 1) + data[i]) / period;
    smoothed.push(newValue);
  }
  
  return smoothed;
}

/**
 * Volume Analysis
 */
export function calculateVolumeMetrics(
  volumeData: number[], 
  period: number = 20
): { sma: number[], ratio: number[] } {
  
  const volumeSMA = calculateSMA(volumeData, period);
  const volumeRatio: number[] = [];
  
  for (let i = 0; i < volumeSMA.length; i++) {
    const currentVolume = volumeData[i + period - 1];
    const ratio = currentVolume / volumeSMA[i];
    volumeRatio.push(ratio);
  }
  
  return { sma: volumeSMA, ratio: volumeRatio };
}

/**
 * Comprehensive Technical Analysis
 */
export function calculateAllIndicators(
  ohlcData: OHLCVData[],
  config: {
    emaFast?: number;
    smaSlow?: number;
    atrPeriod?: number;
    hvpLookback?: number;
    stochK?: number;
    stochD?: number;
    dmiPeriod?: number;
    volumePeriod?: number;
  } = {}
): {
  ema21: number[];
  sma200: number[];
  atr: number[];
  hvp: number[];
  stochastic: { k: number[]; d: number[] };
  dmi: { plusDI: number[]; minusDI: number[]; adx: number[] };
  volume: { sma: number[]; ratio: number[] };
} {
  
  const {
    emaFast = 21,
    smaSlow = 200,
    atrPeriod = 14,
    hvpLookback = 252,
    stochK = 14,
    stochD = 3,
    dmiPeriod = 13,
    volumePeriod = 20
  } = config;
  
  const closePrices = ohlcData.map(d => d.close);
  const volumeData = ohlcData.map(d => d.volume);
  
  return {
    ema21: calculateEMA(closePrices, emaFast),
    sma200: calculateSMA(closePrices, smaSlow),
    atr: calculateATR(ohlcData, atrPeriod),
    hvp: calculateHVP(ohlcData, hvpLookback),
    stochastic: calculateStochastic(ohlcData, stochK, stochD),
    dmi: calculateDMI(ohlcData, dmiPeriod),
    volume: calculateVolumeMetrics(volumeData, volumePeriod)
  };
}

/**
 * Get Latest Indicator Values
 */
export function getLatestIndicators(
  indicators: ReturnType<typeof calculateAllIndicators>,
  ohlcData: OHLCVData[]
): {
  current: any;
  previous: any;
} {
  
  const currentIndex = indicators.ema21.length - 1;
  const prevIndex = currentIndex - 1;
  
  if (currentIndex < 0 || prevIndex < 0) {
    throw new Error('Insufficient data for indicator calculation');
  }
  
  const current = {
    ema21: indicators.ema21[currentIndex],
    sma200: indicators.sma200[currentIndex - (indicators.sma200.length - indicators.ema21.length)],
    atr14: indicators.atr[currentIndex - (indicators.atr.length - indicators.ema21.length)],
    hvp: indicators.hvp[currentIndex - (indicators.hvp.length - indicators.ema21.length)],
    hvpSma20: calculateSMA(indicators.hvp, 20).slice(-1)[0],
    stochK: indicators.stochastic.k[currentIndex - (indicators.stochastic.k.length - indicators.ema21.length)],
    stochD: indicators.stochastic.d[currentIndex - (indicators.stochastic.d.length - indicators.ema21.length)],
    plusDI: indicators.dmi.plusDI[currentIndex - (indicators.dmi.plusDI.length - indicators.ema21.length)],
    minusDI: indicators.dmi.minusDI[currentIndex - (indicators.dmi.minusDI.length - indicators.ema21.length)],
    adx: indicators.dmi.adx[currentIndex - (indicators.dmi.adx.length - indicators.ema21.length)],
    volume: ohlcData[ohlcData.length - 1].volume,
    volumeSma20: indicators.volume.sma[indicators.volume.sma.length - 1],
    volumeRatio: indicators.volume.ratio[indicators.volume.ratio.length - 1],
    close: ohlcData[ohlcData.length - 1].close,
    high: ohlcData[ohlcData.length - 1].high,
    low: ohlcData[ohlcData.length - 1].low
  };
  
  const previous = {
    ema21: indicators.ema21[prevIndex],
    sma200: indicators.sma200[prevIndex - (indicators.sma200.length - indicators.ema21.length)],
    stochK: indicators.stochastic.k[prevIndex - (indicators.stochastic.k.length - indicators.ema21.length)],
    stochD: indicators.stochastic.d[prevIndex - (indicators.stochastic.d.length - indicators.ema21.length)],
    close: ohlcData[ohlcData.length - 2].close
  };
  
  return { current, previous };
}