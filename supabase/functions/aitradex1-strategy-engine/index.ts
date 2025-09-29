import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Strategy Configuration - EMA21/SMA200 + StochRSI + ADX + Volatility Expansion
const STRATEGY_CONFIG = {
  ATR_MULT: 1.5,        // ATR multiplier for stop loss
  TP_R_MULT: 2.0,       // Take profit R-multiple  
  ADX_THRESHOLD: 25,    // Minimum ADX for trend strength
  VOL_EXPANSION: 1.2,   // Volatility expansion threshold
  STOCH_OVERSOLD: 0.20, // StochRSI oversold level
  STOCH_OVERBOUGHT: 0.80, // StochRSI overbought level
  COOLDOWN_MINUTES: 30  // Cooldown between signals per symbol
};

const TRADING_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT',
  'DOGEUSDT', 'MATICUSDT', 'LTCUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT'
];

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 AItradeX1 Strategy Engine - EMA21/SMA200 + StochRSI + ADX');
    
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
    
    // Generate new signals using the strategy
    const newSignals = await generateStrategySignals(supabase);
    
    const response = {
      success: true,
      signals_generated: newSignals.length,
      signals: newSignals,
      strategy: 'ema21_sma200_stochrsi_adx_volatility',
      timestamp: new Date().toISOString(),
      pairs_analyzed: TRADING_PAIRS.length
    };
    
    console.log('🎉 Strategy execution complete:', response);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Strategy engine error:', error);
    
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

async function fetchCandles(symbol: string, interval = '60', limit = 200): Promise<CandleData[]> {
  try {
    const response = await fetch(
      `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    const data = await response.json();
    
    if (!data.result?.list) {
      throw new Error(`Invalid Bybit kline response for ${symbol}`);
    }
    
    return data.result.list
      .map((candle: string[]) => ({
        timestamp: parseInt(candle[0]),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }))
      .reverse();
      
  } catch (error) {
    console.error(`❌ Error fetching candles for ${symbol}:`, error);
    throw error;
  }
}

// Technical Indicator Calculations
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

function calculateStochRSI(candles: CandleData[], period = 14): number {
  // Calculate RSI first
  const changes = [];
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }
  
  const recentChanges = changes.slice(-period);
  const gains = recentChanges.filter(c => c > 0);
  const losses = recentChanges.filter(c => c < 0).map(Math.abs);
  
  const avgGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, loss) => sum + loss, 0) / period : 0;
  
  if (avgLoss === 0) return 1.0;
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  // Convert RSI to StochRSI (0-1 range)
  return rsi / 100;
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
    const upMove = high - prevHigh;
    const downMove = prevLow - low;
    
    const plusDM = (upMove > downMove && upMove > 0) ? upMove : 0;
    const minusDM = (downMove > upMove && downMove > 0) ? downMove : 0;
    
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }
  
  // Calculate averages
  const avgTR = trs.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
  const avgPlusDM = plusDMs.slice(-period).reduce((sum, dm) => sum + dm, 0) / period;
  const avgMinusDM = minusDMs.slice(-period).reduce((sum, dm) => sum + dm, 0) / period;
  
  const plusDI = (avgPlusDM / avgTR) * 100;
  const minusDI = (avgMinusDM / avgTR) * 100;
  
  if ((plusDI + minusDI) === 0) return 0;
  
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  return dx;
}

function calculateVolatilityExpansion(candles: CandleData[], period = 30): number {
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    const ret = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
    returns.push(ret);
  }
  
  if (returns.length < period + 1) return 1.0;
  
  const currentPeriod = returns.slice(-period);
  const previousPeriod = returns.slice(-(period + 1), -1);
  
  const currentVol = Math.sqrt(currentPeriod.reduce((sum, ret) => sum + ret * ret, 0) / period);
  const previousVol = Math.sqrt(previousPeriod.reduce((sum, ret) => sum + ret * ret, 0) / period);
  
  return previousVol === 0 ? 1.0 : currentVol / previousVol;
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

// Strategy Signal Evaluation
async function evaluateSignal(symbol: string, candles: CandleData[], supabase: any): Promise<any | null> {
  if (candles.length < 200) {
    console.log(`⚠️ Insufficient data for ${symbol}: ${candles.length} candles`);
    return null;
  }
  
  const closes = candles.map(c => c.close);
  const currentCandle = candles[candles.length - 1];
  
  // Calculate indicators
  const ema21 = calculateEMA(closes, 21);
  const sma200 = calculateSMA(closes, 200);
  const stochRSI = calculateStochRSI(candles, 14);
  const adx = calculateADX(candles, 14);
  const volExpansion = calculateVolatilityExpansion(candles, 30);
  const atr14 = calculateATR(candles, 14);
  
  console.log(`📊 ${symbol}: EMA21=${ema21.toFixed(2)}, SMA200=${sma200.toFixed(2)}, StochRSI=${stochRSI.toFixed(3)}, ADX=${adx.toFixed(1)}, Vol=${volExpansion.toFixed(2)}`);
  
  // Check for existing recent signals (cooldown)
  const { data: recentSignals } = await supabase
    .from('signals')
    .select('id')
    .eq('symbol', symbol)
    .eq('timeframe', '1h')
    .gte('created_at', new Date(Date.now() - STRATEGY_CONFIG.COOLDOWN_MINUTES * 60 * 1000).toISOString());
  
  if (recentSignals && recentSignals.length > 0) {
    console.log(`⏳ ${symbol}: Cooldown active (${recentSignals.length} recent signals)`);
    return null;
  }
  
  let signal = null;
  let reason = '';
  
  // BUY Signal Rules (as specified in strategy)
  if (
    ema21 > sma200 &&                              // Bullish trend
    volExpansion > STRATEGY_CONFIG.VOL_EXPANSION && // Volatility expansion
    stochRSI < STRATEGY_CONFIG.STOCH_OVERSOLD &&    // Oversold turning up
    adx > STRATEGY_CONFIG.ADX_THRESHOLD            // Trend strength
  ) {
    signal = 'LONG';
    reason = 'BUY: Bullish trend + volatility expansion + oversold + strong trend';
  }
  
  // SELL Signal Rules (as specified in strategy)
  else if (
    ema21 < sma200 &&                               // Bearish trend
    volExpansion > STRATEGY_CONFIG.VOL_EXPANSION && // Volatility expansion  
    stochRSI > STRATEGY_CONFIG.STOCH_OVERBOUGHT &&  // Overbought turning down
    adx > STRATEGY_CONFIG.ADX_THRESHOLD             // Trend strength
  ) {
    signal = 'SHORT';
    reason = 'SELL: Bearish trend + volatility expansion + overbought + strong trend';
  }
  
  if (!signal) {
    console.log(`⚪ ${symbol}: No signal (rules not met)`);
    return null;
  }
  
  // Calculate risk management levels
  const entryPrice = currentCandle.close;
  const stopDistance = Math.max(STRATEGY_CONFIG.ATR_MULT * atr14, entryPrice * 0.003);
  
  const stopLoss = signal === 'LONG' ? 
    entryPrice - stopDistance : 
    entryPrice + stopDistance;
    
  const takeProfit = signal === 'LONG' ? 
    entryPrice + (stopDistance * STRATEGY_CONFIG.TP_R_MULT) : 
    entryPrice - (stopDistance * STRATEGY_CONFIG.TP_R_MULT);
  
  // Grade based on ADX strength
  let grade = 'C';
  let score = 65;
  
  if (adx > 35) {
    grade = 'A';
    score = 85;
  } else if (adx > 30) {
    grade = 'B';
    score = 75;
  }
  
  console.log(`✅ ${symbol}: ${signal} signal (Grade: ${grade}, Score: ${score}) - ${reason}`);
  
  return {
    symbol,
    direction: signal,
    timeframe: '1h',
    price: entryPrice,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    score,
    confidence: score / 100,
    source: 'aitradex1_strategy_engine',
    algo: 'ema21_sma200_stochrsi_adx_volatility',
    bar_time: new Date(currentCandle.timestamp).toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    diagnostics: {
      ema21,
      sma200,
      stoch_rsi: stochRSI,
      adx,
      volatility_expansion: volExpansion,
      atr14,
      stop_distance: stopDistance,
      r_multiple: STRATEGY_CONFIG.TP_R_MULT
    },
    metadata: {
      grade,
      algorithm_version: 'v2.0_rule_based',
      trend: ema21 > sma200 ? 'bullish' : 'bearish',
      volatility_expanded: volExpansion > STRATEGY_CONFIG.VOL_EXPANSION,
      momentum: signal === 'LONG' ? 'oversold_recovery' : 'overbought_decline',
      trend_strength: adx,
      risk_reward_ratio: STRATEGY_CONFIG.TP_R_MULT,
      entry_reason: reason,
      data_source: 'bybit_klines',
      generated_at: new Date().toISOString()
    },
    is_active: true
  };
}

async function generateStrategySignals(supabase: any) {
  try {
    console.log('📊 Running strategy analysis on trading pairs...');
    
    const signals = [];
    const errors = [];
    
    for (const symbol of TRADING_PAIRS) {
      try {
        // Fetch 1-hour candles for analysis
        const candles = await fetchCandles(symbol, '60', 200);
        
        // Evaluate signal based on strategy rules
        const signal = await evaluateSignal(symbol, candles, supabase);
        
        if (signal) {
          signals.push(signal);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
      console.log('⚠️ No signals generated - strategy conditions not met');
      return [];
    }
  } catch (error) {
    console.error('❌ Strategy signal generation error:', error);
    throw error;
  }
}