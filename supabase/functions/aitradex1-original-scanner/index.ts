import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Canonical AItradeX1 Configuration
const CANONICAL_CONFIG = {
  name: "AItradeX1",
  emaLen: 21,
  smaLen: 200,
  atrLen: 14,
  adxThreshold: 28,
  stochLength: 14,
  stochSmoothK: 3,
  stochSmoothD: 3,
  obvEmaLen: 21,
  volSpikeMult: 1.7,
  hvpLower: 55,
  hvpUpper: 85,
  breakoutLen: 5,
  spreadMaxPct: 0.10,
  useDailyTrendFilter: true,
  risk: {
    stopATR: 1.5,
    tpATR_by_HVP: [
      { minHVP: 76, tpATR: 3.5 },
      { minHVP: 66, tpATR: 3.0 },
      { minHVP: 0, tpATR: 2.5 }
    ],
    trailATR_low: 1.3,
    trailATR_high: 1.8,
    trailSwitchHVP: 70,
    exitBars: 18,
    stochProfitExit: { longCrossUnder: 85, shortCrossOver: 15 }
  }
};

const RELAXED_CONFIG = {
  ...CANONICAL_CONFIG,
  adxThreshold: 22,
  volSpikeMult: 1.4,
  hvpLower: 50,
  hvpUpper: 90,
  breakoutLen: 3,
  useDailyTrendFilter: false
};

interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Technical Indicators Implementation
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
      const sum = data.slice(i - length + 1, i + 1).reduce((a, b) => a + b, 0);
      result[i] = sum / length;
    }
  }
  return result;
}

function RMA(data: number[], length: number): number[] {
  const alpha = 1 / length;
  const result: number[] = [];
  result[0] = data[0];
  
  for (let i = 1; i < data.length; i++) {
    result[i] = alpha * data[i] + (1 - alpha) * result[i - 1];
  }
  return result;
}

function ATR(bars: OHLCV[], length: number): number[] {
  const tr: number[] = [];
  
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      tr[i] = bars[i].high - bars[i].low;
    } else {
      const hl = bars[i].high - bars[i].low;
      const hc = Math.abs(bars[i].high - bars[i - 1].close);
      const lc = Math.abs(bars[i].low - bars[i - 1].close);
      tr[i] = Math.max(hl, hc, lc);
    }
  }
  
  return RMA(tr, length);
}

function DMI_ADX(bars: OHLCV[], length: number): { adx: number[], diPlus: number[], diMinus: number[] } {
  const dmPlus: number[] = [];
  const dmMinus: number[] = [];
  
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      dmPlus[i] = 0;
      dmMinus[i] = 0;
    } else {
      const upMove = bars[i].high - bars[i - 1].high;
      const downMove = bars[i - 1].low - bars[i].low;
      
      dmPlus[i] = (upMove > downMove && upMove > 0) ? upMove : 0;
      dmMinus[i] = (downMove > upMove && downMove > 0) ? downMove : 0;
    }
  }
  
  const atr = ATR(bars, length);
  const smoothedDMPlus = RMA(dmPlus, length);
  const smoothedDMMinus = RMA(dmMinus, length);
  
  const diPlus = smoothedDMPlus.map((dm, i) => 100 * dm / atr[i]);
  const diMinus = smoothedDMMinus.map((dm, i) => 100 * dm / atr[i]);
  
  const dx = diPlus.map((dip, i) => {
    const sum = dip + diMinus[i];
    return sum === 0 ? 0 : 100 * Math.abs(dip - diMinus[i]) / sum;
  });
  
  const adx = RMA(dx, length);
  
  return { adx, diPlus, diMinus };
}

function STOCH(bars: OHLCV[], length: number, smoothK: number, smoothD: number): { k: number[], d: number[] } {
  const rsv: number[] = [];
  
  for (let i = 0; i < bars.length; i++) {
    if (i < length - 1) {
      rsv[i] = 50;
    } else {
      const period = bars.slice(i - length + 1, i + 1);
      const highest = Math.max(...period.map(b => b.high));
      const lowest = Math.min(...period.map(b => b.low));
      
      if (highest === lowest) {
        rsv[i] = 50;
      } else {
        rsv[i] = 100 * (bars[i].close - lowest) / (highest - lowest);
      }
    }
  }
  
  const k = SMA(rsv, smoothK);
  const d = SMA(k, smoothD);
  
  return { k, d };
}

function OBV(bars: OHLCV[]): number[] {
  const obv: number[] = [];
  obv[0] = 0;
  
  for (let i = 1; i < bars.length; i++) {
    const sign = bars[i].close > bars[i - 1].close ? 1 : 
                 bars[i].close < bars[i - 1].close ? -1 : 0;
    obv[i] = obv[i - 1] + bars[i].volume * sign;
  }
  
  return obv;
}

function HVP(bars: OHLCV[]): number[] {
  const returns = bars.slice(1).map((bar, i) => Math.log(bar.close / bars[i].close));
  const hvp: number[] = [];
  
  for (let i = 0; i < bars.length; i++) {
    if (i < 21) {
      hvp[i] = 50;
      continue;
    }
    
    const periodReturns = returns.slice(Math.max(0, i - 21), i);
    const mean = periodReturns.reduce((a, b) => a + b, 0) / periodReturns.length;
    const variance = periodReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / periodReturns.length;
    const volatility = Math.sqrt(variance * 252);
    
    const lookback = Math.min(252, i);
    const historicalVols: number[] = [];
    
    for (let j = 21; j <= lookback; j++) {
      const histReturns = returns.slice(Math.max(0, i - j), i - j + 21);
      const histMean = histReturns.reduce((a, b) => a + b, 0) / histReturns.length;
      const histVar = histReturns.reduce((a, b) => a + Math.pow(b - histMean, 2), 0) / histReturns.length;
      historicalVols.push(Math.sqrt(histVar * 252));
    }
    
    const maxHistVol = Math.max(...historicalVols);
    hvp[i] = maxHistVol > 0 ? 100 * (volatility / maxHistVol) : 50;
  }
  
  return hvp;
}

function highest(bars: OHLCV[], field: 'high' | 'low', length: number, endIndex: number): number {
  const start = Math.max(0, endIndex - length + 1);
  const period = bars.slice(start, endIndex + 1);
  return Math.max(...period.map(b => b[field]));
}

function lowest(bars: OHLCV[], field: 'high' | 'low', length: number, endIndex: number): number {
  const start = Math.max(0, endIndex - length + 1);
  const period = bars.slice(start, endIndex + 1);
  return Math.min(...period.map(b => b[field]));
}

// Main AItradeX1 Evaluation Function
function evaluateAItradeX1(bars: OHLCV[], cfg = CANONICAL_CONFIG, relaxedMode = false) {
  const config = relaxedMode ? RELAXED_CONFIG : cfg;
  const t = bars.length - 1;
  const t3 = t - 3;
  
  if (t < Math.max(config.smaLen, config.emaLen, config.atrLen, config.stochLength) + 5) {
    return null;
  }
  
  // Compute all indicators
  const ema21 = EMA(bars.map(b => b.close), config.emaLen);
  const sma200 = SMA(bars.map(b => b.close), config.smaLen);
  const { adx, diPlus, diMinus } = DMI_ADX(bars, config.atrLen);
  const { k, d } = STOCH(bars, config.stochLength, config.stochSmoothK, config.stochSmoothD);
  const volSma21 = SMA(bars.map(b => b.volume), 21);
  const obv = OBV(bars);
  const obvEma21 = EMA(obv, config.obvEmaLen);
  const hvp = HVP(bars);
  const atr = ATR(bars, config.atrLen);
  
  const spreadPct = Math.abs(bars[t].close - bars[t].open) / bars[t].open * 100;
  const hh = highest(bars, 'high', config.breakoutLen, t - 1);
  const ll = lowest(bars, 'low', config.breakoutLen, t - 1);
  
  // Define filters for LONG and SHORT
  const longFilters = {
    trend: ema21[t] > sma200[t] && ema21[t] > ema21[t3],
    adx: adx[t] >= config.adxThreshold,
    dmi: diPlus[t] > diMinus[t] && diPlus[t] > diPlus[t3],
    stoch: k[t] > d[t] && k[t] < 35 && d[t] < 40,
    volume: bars[t].volume > config.volSpikeMult * volSma21[t],
    obv: obv[t] > obvEma21[t] && obv[t] > obv[t3],
    hvp: hvp[t] >= config.hvpLower && hvp[t] <= config.hvpUpper,
    spread: spreadPct < config.spreadMaxPct
  };
  
  const shortFilters = {
    trend: ema21[t] < sma200[t] && ema21[t] < ema21[t3],
    adx: adx[t] >= config.adxThreshold,
    dmi: diMinus[t] > diPlus[t] && diMinus[t] > diMinus[t3],
    stoch: k[t] < d[t] && k[t] > 65 && d[t] > 60,
    volume: bars[t].volume > config.volSpikeMult * volSma21[t],
    obv: obv[t] < obvEma21[t] && obv[t] < obv[t3],
    hvp: hvp[t] >= config.hvpLower && hvp[t] <= config.hvpUpper,
    spread: spreadPct < config.spreadMaxPct
  };
  
  const longBreakout = bars[t].close > hh;
  const shortBreakout = bars[t].close < ll;
  
  // Check if all filters pass
  const longPass = Object.values(longFilters).every(Boolean) && longBreakout;
  const shortPass = Object.values(shortFilters).every(Boolean) && shortBreakout;
  
  if (!longPass && !shortPass) {
    return null;
  }
  
  // Calculate confidence score (8 buckets, 12.5 points each)
  const bucketsLong = Object.values(longFilters).filter(Boolean).length;
  const bucketsShort = Object.values(shortFilters).filter(Boolean).length;
  const scoreLong = Math.min(100, bucketsLong * 12.5);
  const scoreShort = Math.min(100, bucketsShort * 12.5);
  
  // Determine risk parameters
  const hv = hvp[t];
  const tpATR = hv >= 76 ? 3.5 : hv >= 66 ? 3.0 : 2.5;
  
  const close = bars[t].close;
  const atrValue = atr[t];
  const side = longPass ? 'LONG' : 'SHORT';
  const score = longPass ? scoreLong : scoreShort;
  
  const sl = side === 'LONG' ? close - config.risk.stopATR * atrValue : close + config.risk.stopATR * atrValue;
  const tp = side === 'LONG' ? close + tpATR * atrValue : close - tpATR * atrValue;
  
  return {
    algo: 'AItradeX1_ORIGINAL',
    side,
    price: close,
    score,
    filters: longPass ? longFilters : shortFilters,
    gates: { 
      breakout: longPass ? longBreakout : shortBreakout, 
      dailyOk: true 
    },
    indicators: { 
      adx: adx[t], 
      diPlus: diPlus[t], 
      diMinus: diMinus[t], 
      k: k[t], 
      d: d[t], 
      hvp: hv, 
      obv: obv[t], 
      atr: atrValue 
    },
    risk: {
      sl,
      tp,
      exitBars: config.risk.exitBars,
      trail: (hv >= config.risk.trailSwitchHVP) ? config.risk.trailATR_high : config.risk.trailATR_low,
      stochProfitExit: config.risk.stochProfitExit
    },
    relaxed_mode: relaxedMode
  };
}

// Fetch OHLCV data from Bybit
async function fetchBybitOHLCV(symbol: string, timeframe: string, limit = 100): Promise<OHLCV[]> {
  const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${timeframe}&limit=${limit}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.retCode !== 0) {
    throw new Error(`Bybit API error: ${data.retMsg}`);
  }
  
  return data.result.list.reverse().map((candle: any) => ({
    time: parseInt(candle[0]),
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5])
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { symbols, timeframes, relaxed_filters } = await req.json();
    
    const targetSymbols = symbols || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'MATICUSDT', 'AVAXUSDT'];
    const targetTimeframes = timeframes || ['1h', '4h'];
    const relaxedMode = relaxed_filters || false;
    
    const signals: any[] = [];
    let processed = 0;
    
    console.log(`🔍 AItradeX1 ORIGINAL Scanner: Processing ${targetSymbols.length} symbols across ${targetTimeframes.length} timeframes`);
    
    for (const symbol of targetSymbols) {
      for (const tf of targetTimeframes) {
        try {
          const ohlcv = await fetchBybitOHLCV(symbol, tf, 300);
          
          if (ohlcv.length < 200) {
            console.log(`⚠️ Insufficient data for ${symbol} ${tf}: ${ohlcv.length} bars`);
            continue;
          }
          
          const result = evaluateAItradeX1(ohlcv, CANONICAL_CONFIG, relaxedMode);
          
          if (result && result.score >= 75) {
            const signal = {
              exchange: 'bybit',
              symbol,
              timeframe: tf,
              direction: result.side === 'LONG' ? 'BUY' : 'SELL',
              bar_time: new Date(ohlcv[ohlcv.length - 1].time).toISOString(),
              entry_price: result.price,
              stop_loss: result.risk.sl,
              take_profit: result.risk.tp,
              confidence_score: result.score,
              signal_strength: result.score >= 87.5 ? 'VERY_STRONG' : result.score >= 75 ? 'STRONG' : 'MODERATE',
              risk_level: result.indicators.hvp >= 70 ? 'HIGH' : result.indicators.hvp >= 50 ? 'MEDIUM' : 'LOW',
              metadata: {
                algo: result.algo,
                filters: result.filters,
                gates: result.gates,
                indicators: result.indicators,
                risk: result.risk,
                relaxed_mode: result.relaxed_mode,
                hvp: result.indicators.hvp,
                atr: result.indicators.atr,
                adx: result.indicators.adx
              }
            };
            
            signals.push(signal);
            
            console.log(`🎯 SIGNAL: ${symbol} ${tf} ${result.side} @ ${result.price.toFixed(4)} (Score: ${result.score.toFixed(1)}%)`);
            
            // Store in database
            const { error } = await supabaseClient
              .from('signals')
              .upsert(signal, {
                onConflict: 'exchange,symbol,timeframe,direction,bar_time'
              });
            
            if (error) {
              console.error(`❌ Database error for ${symbol}:`, error);
            }
          }
          
          processed++;
          
          // Small delay to avoid rate limits
          if (processed % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${symbol} ${tf}:`, error);
        }
      }
    }
    
    console.log(`✅ AItradeX1 ORIGINAL scan complete: ${signals.length} signals from ${processed} processed`);
    
    return new Response(JSON.stringify({
      success: true,
      signals_generated: signals.length,
      symbols_processed: processed,
      algorithm: 'AItradeX1_ORIGINAL',
      relaxed_mode: relaxedMode,
      timestamp: new Date().toISOString(),
      signals: signals.slice(0, 10) // Return top 10 signals
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ AItradeX1 Original Scanner error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});