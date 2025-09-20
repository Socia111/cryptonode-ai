import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

interface TechnicalIndicators {
  rsi: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  ema21: number;
  ema50: number;
  ema200: number;
  bb_upper: number;
  bb_middle: number;
  bb_lower: number;
  stoch_k: number;
  stoch_d: number;
  atr: number;
  adx: number;
  volume_ratio: number;
}

// Enhanced technical analysis functions
function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(0);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let ema = data[0];
  result.push(ema);
  
  for (let i = 1; i < data.length; i++) {
    ema = (data[i] * multiplier) + (ema * (1 - multiplier));
    result.push(ema);
  }
  return result;
}

function calculateRSI(data: number[], period: number = 14): number {
  if (data.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = data[data.length - i] - data[data.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(data: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  
  const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
  const macdHistory = [];
  
  for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
    macdHistory.push(ema12[i] - ema26[i]);
  }
  
  const signalLine = calculateEMA(macdHistory, 9);
  const signal = signalLine[signalLine.length - 1];
  const histogram = macdLine - signal;
  
  return { macd: macdLine, signal, histogram };
}

function calculateBollingerBands(data: number[], period: number = 20, multiplier: number = 2) {
  const sma = calculateSMA(data, period);
  const currentSMA = sma[sma.length - 1];
  
  const recentData = data.slice(-period);
  const variance = recentData.reduce((sum, price) => sum + Math.pow(price - currentSMA, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: currentSMA + (stdDev * multiplier),
    middle: currentSMA,
    lower: currentSMA - (stdDev * multiplier)
  };
}

function calculateStochastic(bars: OHLCV[], kPeriod: number = 14, dPeriod: number = 3): { k: number; d: number } {
  const recentBars = bars.slice(-kPeriod);
  const currentClose = bars[bars.length - 1].close;
  const lowestLow = Math.min(...recentBars.map(b => b.low));
  const highestHigh = Math.max(...recentBars.map(b => b.high));
  
  const k = highestHigh === lowestLow ? 50 : ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  
  // Simple approximation for %D
  const d = k; // In practice, you'd calculate SMA of recent %K values
  
  return { k, d };
}

function calculateATR(bars: OHLCV[], period: number = 14): number {
  if (bars.length < period + 1) return 0;
  
  const trueRanges = [];
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  const recentTRs = trueRanges.slice(-period);
  return recentTRs.reduce((sum, tr) => sum + tr, 0) / period;
}

async function fetchCryptoData(symbol: string): Promise<OHLCV[]> {
  const bybitUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=15&limit=200`;
  
  try {
    const response = await fetch(bybitUrl);
    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.result?.list) {
      throw new Error('Invalid Bybit response format');
    }
    
    return data.result.list.map((item: any) => ({
      time: parseInt(item[0]),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5])
    })).reverse(); // Reverse to get chronological order
    
  } catch (error) {
    console.error(`❌ Failed to fetch data for ${symbol}:`, error);
    throw error;
  }
}

function calculateTechnicalIndicators(bars: OHLCV[]): TechnicalIndicators {
  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const bb = calculateBollingerBands(closes);
  const stoch = calculateStochastic(bars);
  const atr = calculateATR(bars);
  
  // Simple ADX approximation
  const adx = Math.abs(ema21[ema21.length - 1] - ema50[ema50.length - 1]) / atr * 100;
  
  // Volume ratio (current vs average)
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const currentVolume = volumes[volumes.length - 1];
  const volume_ratio = currentVolume / avgVolume;
  
  return {
    rsi,
    macd: macd.macd,
    macd_signal: macd.signal,
    macd_histogram: macd.histogram,
    ema21: ema21[ema21.length - 1],
    ema50: ema50[ema50.length - 1],
    ema200: ema200[ema200.length - 1],
    bb_upper: bb.upper,
    bb_middle: bb.middle,
    bb_lower: bb.lower,
    stoch_k: stoch.k,
    stoch_d: stoch.d,
    atr,
    adx: Math.min(100, Math.max(0, adx)),
    volume_ratio
  };
}

function generateProfessionalSignal(symbol: string, bars: OHLCV[], indicators: TechnicalIndicators) {
  const currentPrice = bars[bars.length - 1].close;
  
  // Advanced signal scoring system
  let bullScore = 0;
  let bearScore = 0;
  
  // RSI Analysis
  if (indicators.rsi < 30) bullScore += 25;
  else if (indicators.rsi > 70) bearScore += 25;
  else if (indicators.rsi < 45) bullScore += 10;
  else if (indicators.rsi > 55) bearScore += 10;
  
  // MACD Analysis
  if (indicators.macd > indicators.macd_signal && indicators.macd_histogram > 0) bullScore += 20;
  else if (indicators.macd < indicators.macd_signal && indicators.macd_histogram < 0) bearScore += 20;
  
  // EMA Trend Analysis
  if (currentPrice > indicators.ema21 && indicators.ema21 > indicators.ema50) bullScore += 20;
  else if (currentPrice < indicators.ema21 && indicators.ema21 < indicators.ema50) bearScore += 20;
  
  // Bollinger Bands
  if (currentPrice < indicators.bb_lower) bullScore += 15;
  else if (currentPrice > indicators.bb_upper) bearScore += 15;
  
  // Stochastic
  if (indicators.stoch_k < 20 && indicators.stoch_d < 20) bullScore += 10;
  else if (indicators.stoch_k > 80 && indicators.stoch_d > 80) bearScore += 10;
  
  // Volume confirmation
  if (indicators.volume_ratio > 1.5) {
    bullScore += 10;
    bearScore += 10; // Volume confirms both directions
  }
  
  // ADX strength filter
  if (indicators.adx > 25) {
    bullScore += 5;
    bearScore += 5;
  }
  
  const totalScore = Math.max(bullScore, bearScore);
  const direction = bullScore > bearScore ? 'LONG' : 'SHORT';
  const confidence = Math.min(100, totalScore) / 100;
  
  // Only generate signals with score >= 70
  if (totalScore < 70) {
    console.log(`⚠️ ${symbol} signal too weak: bull=${bullScore}, bear=${bearScore}, total=${totalScore}`);
    return null;
  }
  
  // Calculate stop loss and take profit using ATR
  const atrMultiplier = 2.0;
  const stopLoss = direction === 'LONG' 
    ? currentPrice - (indicators.atr * atrMultiplier)
    : currentPrice + (indicators.atr * atrMultiplier);
  
  const takeProfitMultiplier = 3.0;
  const takeProfit = direction === 'LONG'
    ? currentPrice + (indicators.atr * takeProfitMultiplier)
    : currentPrice - (indicators.atr * takeProfitMultiplier);
  
  return {
    symbol,
    timeframe: '15m',
    direction,
    price: currentPrice,
    entry_price: currentPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    score: Math.round(totalScore),
    confidence,
    source: 'real_time_scanner',
    algo: 'professional_v1',
    bar_time: new Date(bars[bars.length - 1].time).toISOString(),
    exchange: 'bybit',
    atr: indicators.atr,
    metadata: {
      grade: totalScore >= 85 ? 'A' : totalScore >= 75 ? 'B' : 'C',
      data_source: 'live_market',
      verified_real_data: true,
      technical_indicators: {
        rsi: indicators.rsi,
        macd: indicators.macd,
        adx: indicators.adx,
        stoch_k: indicators.stoch_k,
        volume_ratio: indicators.volume_ratio
      }
    },
    indicators: {
      rsi: indicators.rsi,
      macd: indicators.macd,
      adx: indicators.adx,
      atr: indicators.atr,
      ema21: indicators.ema21,
      ema200: indicators.ema200,
      stoch_k: indicators.stoch_k,
      stoch_d: indicators.stoch_d,
      volume_ratio: indicators.volume_ratio
    },
    market_conditions: {
      trend: indicators.ema21 > indicators.ema200 ? 'bullish' : 'bearish',
      volume: indicators.volume_ratio > 1.5 ? 'high' : 'normal',
      momentum: indicators.adx > 25 ? 'strong' : 'weak'
    },
    diagnostics: {
      market_phase: indicators.adx > 25 ? 'trending' : 'ranging',
      signal_quality: totalScore >= 85 ? 'excellent' : totalScore >= 75 ? 'good' : 'acceptable',
      confluence_factors: Math.round((bullScore + bearScore) / 10)
    },
    risk: 1.0,
    algorithm_version: 'v1.0',
    execution_priority: Math.round(totalScore),
    is_active: true,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🚀 [real-time-scanner] Starting professional signal scanning...')

    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT', 'LINKUSDT'];
    const generatedSignals = [];
    let processedCount = 0;
    let failedCount = 0;

    for (const symbol of symbols) {
      try {
        console.log(`📊 Analyzing ${symbol} with professional indicators...`);
        
        const bars = await fetchCryptoData(symbol);
        if (bars.length < 50) {
          console.log(`⚠️ Insufficient data for ${symbol}, skipping...`);
          continue;
        }
        
        const indicators = calculateTechnicalIndicators(bars);
        const signal = generateProfessionalSignal(symbol, bars, indicators);
        
        if (signal) {
          console.log(`✅ Generated ${signal.direction} signal for ${symbol} (score: ${signal.score})`);
          generatedSignals.push(signal);
        }
        
        processedCount++;
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
        failedCount++;
      }
    }

    // Insert high-quality signals into database
    if (generatedSignals.length > 0) {
      const { error: insertError } = await supabase
        .from('signals')
        .insert(generatedSignals);

      if (insertError) {
        console.error('❌ Error inserting signals:', insertError);
        throw insertError;
      }

      console.log(`✅ [real-time-scanner] Successfully inserted ${generatedSignals.length} professional signals`);
    } else {
      console.log('⚠️ No high-quality signals generated this scan');
    }

    return new Response(JSON.stringify({
      success: true,
      signals_generated: generatedSignals.length,
      symbols_processed: processedCount,
      symbols_failed: failedCount,
      total_symbols: symbols.length,
      scanner_type: 'professional_real_time',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [real-time-scanner] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      scanner_type: 'professional_real_time',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})