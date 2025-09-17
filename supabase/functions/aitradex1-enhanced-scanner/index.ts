import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AItradeX1Config {
  ema_short_length: number;
  sma_long_length: number;
  rsi_length: number;
  rsi_overbought: number;
  rsi_oversold: number;
  bb_length: number;
  bb_multiplier: number;
  volume_spike_multiplier: number;
  adx_length: number;
  adx_threshold: number;
  stoch_k: number;
  stoch_d_smooth: number;
  stoch_signal_smooth: number;
  atr_length: number;
  atr_stop_mult: number;
  atr_takeprofit_mult: number;
  enable_fallback_buy: boolean;
  use_hvp: boolean;
  hvp_lookbacks: number[];
  hvp_threshold: number;
}

const DEFAULT_CONFIG: AItradeX1Config = {
  ema_short_length: 21,
  sma_long_length: 200,
  rsi_length: 14,
  rsi_overbought: 70,
  rsi_oversold: 30,
  bb_length: 20,
  bb_multiplier: 2.5,
  volume_spike_multiplier: 1.5,
  adx_length: 14,
  adx_threshold: 25,
  stoch_k: 14,
  stoch_d_smooth: 3,
  stoch_signal_smooth: 3,
  atr_length: 14,
  atr_stop_mult: 1.5,
  atr_takeprofit_mult: 2.0,
  enable_fallback_buy: true,
  use_hvp: false,
  hvp_lookbacks: [4, 10, 100, 300],
  hvp_threshold: 50
};

// Technical Indicator Calculations
function EMA(data: number[], length: number): number[] {
  const alpha = 2 / (length + 1);
  const result: number[] = [];
  result[0] = data[0];
  
  for (let i = 1; i < data.length; i++) {
    result[i] = alpha * data[i] + (1 - alpha) * result[i - 1];
  }
  return result;
}

function SMA(data: number[], length: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      result[i] = data[i];
    } else {
      let sum = 0;
      for (let j = 0; j < length; j++) {
        sum += data[i - j];
      }
      result[i] = sum / length;
    }
  }
  return result;
}

function RSI(data: number[], length: number): number[] {
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  const avgGain = SMA(gains, length);
  const avgLoss = SMA(losses, length);
  const result: number[] = [50];
  
  for (let i = 0; i < avgGain.length; i++) {
    if (avgLoss[i] === 0) {
      result.push(100);
    } else {
      const rs = avgGain[i] / avgLoss[i];
      result.push(100 - (100 / (1 + rs)));
    }
  }
  
  return result;
}

function ATR(bars: OHLCV[], length: number): number[] {
  const tr: number[] = [];
  
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    tr.push(Math.max(tr1, tr2, tr3));
  }
  
  return [0, ...SMA(tr, length)];
}

function DMI_ADX(bars: OHLCV[], length: number): { 
  diPlus: number[], 
  diMinus: number[], 
  adx: number[] 
} {
  const dmPlus: number[] = [];
  const dmMinus: number[] = [];
  const tr: number[] = [];
  
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevHigh = bars[i - 1].high;
    const prevLow = bars[i - 1].low;
    const prevClose = bars[i - 1].close;
    
    const moveUp = high - prevHigh;
    const moveDown = prevLow - low;
    
    dmPlus.push((moveUp > moveDown && moveUp > 0) ? moveUp : 0);
    dmMinus.push((moveDown > moveUp && moveDown > 0) ? moveDown : 0);
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    tr.push(Math.max(tr1, tr2, tr3));
  }
  
  const smaDMPlus = SMA(dmPlus, length);
  const smaDMMinus = SMA(dmMinus, length);
  const smaTR = SMA(tr, length);
  
  const diPlus = smaDMPlus.map((dm, i) => 100 * dm / smaTR[i]);
  const diMinus = smaDMMinus.map((dm, i) => 100 * dm / smaTR[i]);
  
  const dx = diPlus.map((plus, i) => {
    const sum = plus + diMinus[i];
    return sum === 0 ? 0 : 100 * Math.abs(plus - diMinus[i]) / sum;
  });
  
  const adx = SMA(dx, length);
  
  return {
    diPlus: [0, ...diPlus],
    diMinus: [0, ...diMinus],
    adx: [0, ...adx]
  };
}

function Stochastic(bars: OHLCV[], kLength: number, kSmooth: number, dSmooth: number): {
  k: number[],
  d: number[]
} {
  const kRaw: number[] = [];
  
  for (let i = kLength - 1; i < bars.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = 0; j < kLength; j++) {
      const idx = i - j;
      highestHigh = Math.max(highestHigh, bars[idx].high);
      lowestLow = Math.min(lowestLow, bars[idx].low);
    }
    
    const range = highestHigh - lowestLow;
    kRaw.push(range === 0 ? 50 : 100 * (bars[i].close - lowestLow) / range);
  }
  
  const k = SMA(kRaw, kSmooth);
  const d = SMA(k, dSmooth);
  
  // Pad with zeros for missing values
  const paddedK = Array(kLength - 1).fill(50).concat(k);
  const paddedD = Array(kLength - 1).fill(50).concat(d);
  
  return { k: paddedK, d: paddedD };
}

function BollingerBands(data: number[], length: number, multiplier: number): {
  upper: number[],
  middle: number[],
  lower: number[]
} {
  const middle = SMA(data, length);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < length - 1) {
      upper[i] = data[i];
      lower[i] = data[i];
    } else {
      let sum = 0;
      let sumSq = 0;
      
      for (let j = 0; j < length; j++) {
        const val = data[i - j];
        sum += val;
        sumSq += val * val;
      }
      
      const mean = sum / length;
      const variance = (sumSq / length) - (mean * mean);
      const stdDev = Math.sqrt(variance);
      
      upper[i] = mean + multiplier * stdDev;
      lower[i] = mean - multiplier * stdDev;
    }
  }
  
  return { upper, middle, lower };
}

function HVP(bars: OHLCV[], lookbacks: number[]): number[] {
  const atr = ATR(bars, 14);
  const hvpValues: number[] = [];
  
  for (let i = 0; i < bars.length; i++) {
    let maxHVP = 0;
    
    for (const lookback of lookbacks) {
      if (i >= lookback - 1) {
        const slice = atr.slice(Math.max(0, i - lookback + 1), i + 1);
        const minATR = Math.min(...slice);
        const maxATR = Math.max(...slice);
        const range = maxATR - minATR;
        
        if (range > 0) {
          const hvp = 100 * (atr[i] - minATR) / range;
          maxHVP = Math.max(maxHVP, hvp);
        }
      }
    }
    
    hvpValues.push(maxHVP);
  }
  
  return hvpValues;
}

function crossOver(a: number[], b: number[], index: number): boolean {
  if (index < 1) return false;
  return a[index] > b[index] && a[index - 1] <= b[index - 1];
}

function crossUnder(a: number[], b: number[], index: number): boolean {
  if (index < 1) return false;
  return a[index] < b[index] && a[index - 1] >= b[index - 1];
}

async function fetchCryptoData(symbol: string): Promise<OHLCV[]> {
  try {
    const response = await fetch(
      `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=60&limit=300`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.result?.list) {
      throw new Error('Invalid response structure');
    }
    
    return data.result.list
      .map((item: string[]) => ({
        time: parseInt(item[0]),
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5])
      }))
      .reverse()
      .slice(-250); // Keep last 250 bars
      
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return [];
  }
}

function evaluateAItradeX1Enhanced(bars: OHLCV[], config = DEFAULT_CONFIG) {
  const t = bars.length - 1;
  const t3 = t - 3;
  
  if (t < Math.max(config.sma_long_length, config.ema_short_length, config.adx_length, config.stoch_k) + 5) {
    return null;
  }
  
  // Calculate indicators
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  
  const ema21 = EMA(closes, config.ema_short_length);
  const sma200 = SMA(closes, config.sma_long_length);
  const rsi = RSI(closes, config.rsi_length);
  const { diPlus, diMinus, adx } = DMI_ADX(bars, config.adx_length);
  const { k, d } = Stochastic(bars, config.stoch_k, config.stoch_d_smooth, config.stoch_signal_smooth);
  const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = BollingerBands(closes, config.bb_length, config.bb_multiplier);
  const volSma21 = SMA(volumes, 21);
  const atr = ATR(bars, config.atr_length);
  
  // Volume spike check
  const volSpike = bars[t].volume > config.volume_spike_multiplier * volSma21[t];
  
  // HVP check (optional)
  let hvpOK = true;
  if (config.use_hvp) {
    const hvp = HVP(bars, config.hvp_lookbacks);
    hvpOK = hvp[t] >= config.hvp_threshold;
  }
  
  // Signal conditions
  const longConditions = {
    emaCross: crossOver(ema21, sma200, t),
    rsiOversold: rsi[t] < 40 || crossOver(rsi, [config.rsi_oversold], t),
    dmiPositive: diPlus[t] > diMinus[t] && adx[t] > config.adx_threshold,
    stochLow: k[t] < 20 && crossOver(k, d, t),
    volumeSpike: volSpike,
    hvpValid: hvpOK
  };
  
  const shortConditions = {
    emaCross: crossUnder(ema21, sma200, t),
    rsiOverbought: rsi[t] > config.rsi_overbought,
    dmiNegative: diMinus[t] > diPlus[t] && adx[t] > config.adx_threshold,
    stochHigh: k[t] > 80 && crossUnder(k, d, t),
    volumeSpike: volSpike,
    hvpValid: hvpOK
  };
  
  const fallbackBuyConditions = {
    emaCross: crossOver(ema21, sma200, t),
    dmiPositive: diPlus[t] > diMinus[t]
  };
  
  // Evaluate signals
  const longValid = Object.values(longConditions).every(Boolean);
  const shortValid = Object.values(shortConditions).every(Boolean);
  const fallbackBuyValid = config.enable_fallback_buy && 
    Object.values(fallbackBuyConditions).every(Boolean) && 
    !longValid;
  
  // Calculate confidence score
  let score = 0;
  if (ema21[t] > sma200[t]) score += 1; else score -= 1;
  if (adx[t] > config.adx_threshold) score += 1;
  if (diPlus[t] > diMinus[t]) score += 1; else score -= 1;
  if ((longValid && rsi[t] < 40) || (shortValid && rsi[t] > 70)) score += 1;
  if (volSpike) score += 1;
  if (config.use_hvp && hvpOK) score += 1;
  
  if (!longValid && !shortValid && !fallbackBuyValid) return null;
  if (score < 4) return null; // Minimum confidence threshold
  
  const close = bars[t].close;
  const currentATR = atr[t];
  
  let signal = '';
  let direction = '';
  
  if (longValid) {
    signal = 'BUY';
    direction = 'LONG';
  } else if (shortValid) {
    signal = 'SELL';
    direction = 'SHORT';
  } else if (fallbackBuyValid) {
    signal = 'FALLBACK_BUY';
    direction = 'LONG';
  }
  
  const stopLoss = direction === 'LONG' 
    ? close - config.atr_stop_mult * currentATR
    : close + config.atr_stop_mult * currentATR;
    
  const takeProfit = direction === 'LONG'
    ? close + config.atr_takeprofit_mult * currentATR
    : close - config.atr_takeprofit_mult * currentATR;
  
  return {
    algo: 'AItradeX1-Enhanced',
    signal,
    direction,
    price: close,
    confidence: Math.min(100, score * 14.3), // Scale to 0-100
    risk: {
      stopLoss,
      takeProfit,
      atr: currentATR
    },
    indicators: {
      ema21: ema21[t],
      sma200: sma200[t],
      rsi: rsi[t],
      adx: adx[t],
      diPlus: diPlus[t],
      diMinus: diMinus[t],
      stochK: k[t],
      stochD: d[t],
      bbUpper: bbUpper[t],
      bbLower: bbLower[t],
      volume: bars[t].volume,
      volSpike
    },
    conditions: longValid ? longConditions : shortValid ? shortConditions : fallbackBuyConditions
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT'];
    const signals = [];
    
    console.log(`[AItradeX1-Enhanced] Scanning ${symbols.length} symbols...`);
    
    for (const symbol of symbols) {
      try {
        const bars = await fetchCryptoData(symbol);
        
        if (bars.length < 250) {
          console.log(`[${symbol}] Insufficient data: ${bars.length} bars`);
          continue;
        }
        
        const signal = evaluateAItradeX1Enhanced(bars);
        
        if (signal) {
          const signalData = {
            ...signal,
            symbol,
            exchange: 'bybit',
            timeframe: '1h',
            timestamp: new Date().toISOString(),
            bar_time: new Date(bars[bars.length - 1].time).toISOString()
          };
          
          signals.push(signalData);
          console.log(`[${symbol}] Signal generated: ${signal.signal} at ${signal.price} (confidence: ${signal.confidence}%)`);
        }
      } catch (error) {
        console.error(`[${symbol}] Error:`, error);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        signalsGenerated: signals.length,
        signals,
        timestamp: new Date().toISOString(),
        strategy: 'AItradeX1-Enhanced'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('[AItradeX1-Enhanced] Scanner error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});