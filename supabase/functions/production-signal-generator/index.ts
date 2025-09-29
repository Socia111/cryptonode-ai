import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Real trading pairs from Bybit
const TRADING_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
  'DOGEUSDT', 'MATICUSDT', 'LTCUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT'
];

// Algorithm configuration matching the strategy specification
const CONFIG = {
  ATR_MULT: 1.5,        // ATR multiplier for stop loss
  TP_R_MULT: 2.0,       // Take profit R-multiple
  ADX_THRESHOLD: 25,    // Minimum ADX for trend strength
  VOL_EXPANSION: 1.2,   // Volatility expansion threshold
  STOCH_OVERSOLD: 0.20, // StochRSI oversold level
  STOCH_OVERBOUGHT: 0.80, // StochRSI overbought level
  RISK_PER_TRADE: 0.01, // 1% risk per trade
  LEVERAGE: 5           // Default leverage
};

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  ema21: number;
  sma200: number;
  stoch_k: number;
  adx: number;
  vol30: number;
  atr14: number;
}

async function fetchCandles(symbol: string, interval = '60', limit = 200): Promise<CandleData[]> {
  try {
    const response = await fetch(
      `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    const data = await response.json();
    
    if (!data.result?.list) {
      throw new Error(`Invalid Bybit kline response for ${symbol}`);
    }
    
    // Convert and sort chronologically
    return data.result.list
      .map((candle: string[]) => ({
        timestamp: parseInt(candle[0]),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }))
      .reverse(); // Bybit returns newest first, we need oldest first
      
  } catch (error) {
    console.error(`❌ Error fetching candles for ${symbol}:`, error);
    throw error;
  }
}

// Technical Indicator Calculations - Matching Strategy Specification
function calculateEMA(values: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = values[0];
  
  for (let i = 1; i < values.length; i++) {
    ema = (values[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateSMA(values: number[], period: number): number {
  const slice = values.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / slice.length;
}

function calculateStochRSI(candles: CandleData[], period = 14, smoothK = 3, smoothD = 3): number {
  // Calculate RSI first
  const changes = [];
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }
  
  const gains = changes.slice(-period).filter(c => c > 0);
  const losses = changes.slice(-period).filter(c => c < 0).map(Math.abs);
  
  const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
  const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;
  
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // Convert RSI to StochRSI (simplified version)
  return rsi / 100; // Return as 0-1 range
}

function calculateADX(candles: CandleData[], period = 14): number {
  const trs = [];
  const plusDMs = [];
  const minusDMs = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;
    
    // True Range
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trs.push(tr);
    
    // Directional Movement
    const plusDM = (high - prevHigh) > (prevLow - low) ? Math.max(high - prevHigh, 0) : 0;
    const minusDM = (prevLow - low) > (high - prevHigh) ? Math.max(prevLow - low, 0) : 0;
    
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }
  
  // Simplified ADX calculation (using averages)
  const avgTR = trs.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
  const avgPlusDM = plusDMs.slice(-period).reduce((sum, dm) => sum + dm, 0) / period;
  const avgMinusDM = minusDMs.slice(-period).reduce((sum, dm) => sum + dm, 0) / period;
  
  const plusDI = (avgPlusDM / avgTR) * 100;
  const minusDI = (avgMinusDM / avgTR) * 100;
  
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  return dx; // Simplified ADX
}

function calculateVolatilityExpansion(candles: CandleData[], period = 30): { current: number; previous: number } {
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
  }
  
  const currentPeriod = returns.slice(-period);
  const previousPeriod = returns.slice(-(period + 1), -1);
  
  const currentVol = Math.sqrt(currentPeriod.reduce((sum, ret) => sum + ret * ret, 0) / period) * Math.sqrt(period);
  const previousVol = Math.sqrt(previousPeriod.reduce((sum, ret) => sum + ret * ret, 0) / period) * Math.sqrt(period);
  
  return { current: currentVol, previous: previousVol };
}

function calculateATR(candles: CandleData[], period = 14): number {
  const trs = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    trs.push(tr);
  }
  
  return trs.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
}

function calculateIndicators(candles: CandleData[]): TechnicalIndicators {
  const closes = candles.map(c => c.close);
  
  const ema21 = calculateEMA(closes, 21);
  const sma200 = calculateSMA(closes, 200);
  const stoch_k = calculateStochRSI(candles, 14, 3, 3);
  const adx = calculateADX(candles, 14);
  const vol = calculateVolatilityExpansion(candles, 30);
  const atr14 = calculateATR(candles, 14);
  
  return {
    ema21,
    sma200,
    stoch_k,
    adx,
    vol30: vol.current / vol.previous, // Volatility expansion ratio
    atr14
  };
}

// Signal Generation with Proper Strategy Rules
function evaluateSignal(symbol: string, candles: CandleData[], indicators: TechnicalIndicators): any | null {
  const currentCandle = candles[candles.length - 1];
  const { ema21, sma200, stoch_k, adx, vol30, atr14 } = indicators;
  
  // Rule evaluation based on strategy specification
  let signal = null;
  
  // BUY Signal Rules
  if (
    ema21 > sma200 &&                    // Bullish trend
    vol30 > CONFIG.VOL_EXPANSION &&      // Volatility expansion
    stoch_k < CONFIG.STOCH_OVERSOLD &&   // Oversold turning up
    adx > CONFIG.ADX_THRESHOLD           // Trend strength
  ) {
    signal = 'BUY';
  }
  
  // SELL Signal Rules
  else if (
    ema21 < sma200 &&                     // Bearish trend
    vol30 > CONFIG.VOL_EXPANSION &&       // Volatility expansion  
    stoch_k > CONFIG.STOCH_OVERBOUGHT &&  // Overbought turning down
    adx > CONFIG.ADX_THRESHOLD            // Trend strength
  ) {
    signal = 'SELL';
  }
  
  if (!signal) return null;
  
  // Calculate risk management levels
  const entryPrice = currentCandle.close;
  const stopDistance = Math.max(CONFIG.ATR_MULT * atr14, entryPrice * 0.003); // Min 0.3% stop
  
  const stopLoss = signal === 'BUY' ? 
    entryPrice - stopDistance : 
    entryPrice + stopDistance;
    
  const takeProfit = signal === 'BUY' ? 
    entryPrice + (stopDistance * CONFIG.TP_R_MULT) : 
    entryPrice - (stopDistance * CONFIG.TP_R_MULT);
  
  // Calculate confidence grade based on rule confluence
  let grade = 'C';
  let score = 60;
  
  if (adx > 30) {
    grade = 'A';
    score = 85;
  } else if (adx > CONFIG.ADX_THRESHOLD) {
    grade = 'B';  
    score = 75;
  }
  
  return {
    symbol,
    direction: signal === 'BUY' ? 'LONG' : 'SHORT',
    timeframe: '1h',
    price: entryPrice,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    score,
    confidence: score / 100,
    source: 'aitradex1_rule_based',
    algo: 'ema21_sma200_stochrsi_adx',
    bar_time: new Date(currentCandle.timestamp).toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    diagnostics: {
      ema21,
      sma200,
      stoch_k,
      adx,
      vol30,
      atr14,
      stop_distance: stopDistance,
      r_multiple: CONFIG.TP_R_MULT
    },
    metadata: {
      grade,
      algorithm_version: 'v2.0_rule_based',
      trend: ema21 > sma200 ? 'bullish' : 'bearish',
      volatility_expansion: vol30 > CONFIG.VOL_EXPANSION,
      momentum: signal === 'BUY' ? 'oversold_recovery' : 'overbought_decline',
      trend_strength: adx,
      risk_reward_ratio: CONFIG.TP_R_MULT,
      data_source: 'bybit_klines',
      generated_at: new Date().toISOString()
    },
    is_active: true
  };
}

async function generateSignalsFromMarketData(supabase: any) {
  try {
    console.log('📊 Analyzing market with EMA21/SMA200 + StochRSI + ADX strategy...');
    
    const signals = [];
    const errors = [];
    
    for (const symbol of TRADING_PAIRS) {
      try {
        // Fetch candle data for technical analysis
        const candles = await fetchCandles(symbol, '60', 200);
        
        if (candles.length < 200) {
          console.log(`⚠️ Insufficient candle data for ${symbol}: ${candles.length}`);
          continue;
        }
        
        // Calculate technical indicators
        const indicators = calculateIndicators(candles);
        
        // Evaluate signal based on strategy rules
        const signal = evaluateSignal(symbol, candles, indicators);
        
        if (signal) {
          signals.push(signal);
          console.log(`✅ Signal: ${symbol} ${signal.direction} (Grade: ${signal.metadata.grade}, Score: ${signal.score})`);
        } else {
          console.log(`⚪ No signal: ${symbol} (rules not met)`);
        }
        
      } catch (error) {
        console.error(`❌ Error analyzing ${symbol}:`, error.message);
        errors.push({ symbol, error: error.message });
      }
    }
    
    if (signals.length > 0) {
      console.log(`🔄 Inserting ${signals.length} strategy-based signals...`);
      
      const { data: insertedSignals, error } = await supabase
        .from('signals')
        .insert(signals)
        .select();
      
      if (error) {
        console.error('❌ Database insert error:', error);
        throw error;
      }
      
      console.log(`✅ Successfully inserted ${insertedSignals?.length || 0} signals`);
      return insertedSignals;
    } else {
      console.log('⚠️ No signals generated - strategy rules not met for any symbols');
      return [];
    }
  } catch (error) {
    console.error('❌ Signal generation error:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting production signal generation...');
    
    // Clean up old signals (older than 4 hours)
    const { error: cleanupError } = await supabase
      .from('signals')
      .delete()
      .lt('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString());
    
    if (cleanupError) {
      console.warn('⚠️ Cleanup error (non-fatal):', cleanupError);
    } else {
      console.log('🧹 Cleaned up old signals');
    }
    
    // Generate new signals from real market data
    const newSignals = await generateSignalsFromMarketData(supabase);
    
    const response = {
      success: true,
      signals_generated: newSignals.length,
      signals: newSignals,
      source: 'production_live_bybit',
      timestamp: new Date().toISOString(),
      market_pairs_analyzed: TRADING_PAIRS.length
    };
    
    console.log('🎉 Signal generation complete:', response);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Production signal generation failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});