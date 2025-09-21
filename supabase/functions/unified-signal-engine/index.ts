import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Algorithm Settings (from screenshot specification)
const settings = {
  emaPeriods: [21, 34, 50, 89, 100, 200, 377],
  smaPeriods: [100, 200, 900],
  stoch: { k: 14, d: 3, smooth: 14 },
  dmi: { length: 14, adxSmoothing: 6 },
  hvp: { length: 100, percentileLookback: 200 },
  volSpikeFactor: 1.5,
  riskReward: { tp1: 1.5, tp2: 2.5 }
};

interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 Unified Signal Engine started');

    // Major crypto pairs for comprehensive scanning
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT', 'LINKUSDT'];
    const timeframes = ['1h']; // Only 1-hour signals
    const signals = [];

    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        try {
          // Fetch OHLCV data from Bybit - 1h interval
          const interval = '60';  // 1 hour
          const limit = 200;
          
          const klineUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`;
          const response = await fetch(klineUrl);
          const data = await response.json();

          if (!data.result?.list?.length) continue;

          const klines = data.result.list.reverse();
          const candles: OHLCV[] = klines.map((k: any) => ({
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            timestamp: parseInt(k[0])
          }));

          // Generate signal using unified algorithm
          const signal = generateSignal(candles, symbol, timeframe);
          
          if (signal) {
            signals.push({
              id: crypto.randomUUID(),
              symbol,
              timeframe,
              direction: signal.side,
              side: signal.side.toLowerCase(),
              price: signal.entry,
              entry_price: signal.entry,
              score: signal.score,
              confidence: signal.confidenceScore,
              source: 'unified_signal_engine',
              algo: 'unified_ema_stoch_dmi_hvp',
              bar_time: new Date(candles[candles.length - 1].timestamp),
              created_at: new Date(),
              expires_at: new Date(Date.now() + getExpiryTime(timeframe)),
              is_active: true,
              take_profit: signal.takeProfits[0],
              stop_loss: signal.stopLoss,
              metadata: {
                signal_type: 'unified_algorithm',
                timeframe_optimized: timeframe,
                confidence_level: signal.confidence,
                filters: signal.filters,
                take_profit_2: signal.takeProfits[1],
                risk_reward_ratio: settings.riskReward
              }
            });
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Error processing ${symbol} ${timeframe}:`, error);
        }
      }
    }

    if (signals.length > 0) {
      await supabase.from('signals').insert(signals);
    }

    return new Response(
      JSON.stringify({
        success: true,
        algorithm: 'unified_ema_stoch_dmi_hvp',
        signals_generated: signals.length,
        timeframes: timeframes,
        symbols_scanned: symbols.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unified Signal Engine error:', error);
    return new Response(
      JSON.stringify({ error: error.message, algorithm: 'unified' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateSignal(candles: OHLCV[], symbol: string, timeframe: string) {
  if (candles.length < 200) return null;

  const close = candles[candles.length - 1].close;
  const volume = candles[candles.length - 1].volume;
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);

  // === Moving Averages ===
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema200 = calculateEMA(closes, 200);

  // === Indicators ===
  const stoch = calculateStochRSI(candles, 14, 14, 3, 3);
  const dmiVals = calculateDMI(candles, settings.dmi.length, settings.dmi.adxSmoothing);
  const hvpVals = calculateHVP(candles, settings.hvp.length, settings.hvp.percentileLookback);

  const volSMA20 = calculateSMA(volumes, 20);
  const volSpike = volume > settings.volSpikeFactor * volSMA20;

  // === Trend Regime ===
  const bull = close > sma200 && close > ema200;
  const bear = close < sma200 && close < ema200;

  // === Pullback Zone ===
  const inPullback = close >= Math.min(ema21, ema50) && close <= Math.max(ema21, ema50);

  // === Scoring System ===
  let score = 70;

  // === LONG Setup ===
  if (bull && inPullback && stoch.k > stoch.d && stoch.k < 30 && dmiVals.plusDI > dmiVals.minusDI && dmiVals.adx > 20) {
    if (stoch.k < 20) score += 10;
    if (dmiVals.adx > 25) score += 10;
    if (dmiVals.adx > 30) score += 5;
    if (hvpVals.expanding) score += 10;
    if (volSpike) score += 10;

    if (score >= 75) {
      const entry = close;
      const stopLoss = Math.min(sma200, ema200);
      const risk = entry - stopLoss;
      const tp1 = entry + risk * settings.riskReward.tp1;
      const tp2 = entry + risk * settings.riskReward.tp2;

      return {
        side: "LONG",
        entry,
        stopLoss,
        takeProfits: [tp1, tp2],
        confidence: score >= 85 ? "☄️ HIGH" : score >= 75 ? "☢️ MEDIUM" : "🦾 CONSERVATIVE",
        score,
        confidenceScore: score / 100,
        filters: {
          stochRSI: { k: stoch.k, d: stoch.d },
          dmi: { plusDI: dmiVals.plusDI, minusDI: dmiVals.minusDI, adx: dmiVals.adx },
          hvp: hvpVals,
          volumeSpike: volSpike
        }
      };
    }
  }

  // === SHORT Setup ===
  if (bear && inPullback && stoch.k < stoch.d && stoch.k > 70 && dmiVals.minusDI > dmiVals.plusDI && dmiVals.adx > 20) {
    if (stoch.k > 80) score += 10;
    if (dmiVals.adx > 25) score += 10;
    if (dmiVals.adx > 30) score += 5;
    if (hvpVals.expanding) score += 10;
    if (volSpike) score += 10;

    if (score >= 75) {
      const entry = close;
      const stopLoss = Math.max(sma200, ema200);
      const risk = stopLoss - entry;
      const tp1 = entry - risk * settings.riskReward.tp1;
      const tp2 = entry - risk * settings.riskReward.tp2;

      return {
        side: "SHORT",
        entry,
        stopLoss,
        takeProfits: [tp1, tp2],
        confidence: score >= 85 ? "☄️ HIGH" : score >= 75 ? "☢️ MEDIUM" : "🦾 CONSERVATIVE",
        score,
        confidenceScore: score / 100,
        filters: {
          stochRSI: { k: stoch.k, d: stoch.d },
          dmi: { plusDI: dmiVals.plusDI, minusDI: dmiVals.minusDI, adx: dmiVals.adx },
          hvp: hvpVals,
          volumeSpike: volSpike
        }
      };
    }
  }

  return null;
}

function calculateTrueRange(candles: OHLCV[], index: number): number {
  if (index === 0) return candles[index].high - candles[index].low;
  
  const current = candles[index];
  const previous = candles[index - 1];
  
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previous.close),
    Math.abs(current.low - previous.close)
  );
}

function calculateATR(candles: OHLCV[], period: number): number {
  if (candles.length < period) return 0;
  
  const trValues = [];
  for (let i = 1; i < candles.length; i++) {
    trValues.push(calculateTrueRange(candles, i));
  }
  
  return calculateSMA(trValues.slice(-period), period);
}

function getExpiryTime(timeframe: string): number {
  // 1h signals expire after 4 hours
  return 4 * 60 * 60 * 1000;
}

function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateStochRSI(candles: OHLCV[], rsiLength: number, stochLength: number, kSmooth: number, dSmooth: number) {
  const closes = candles.map(c => c.close);
  
  // Calculate RSI values for the last 'stochLength' periods
  const rsiValues = [];
  for (let i = rsiLength; i < closes.length; i++) {
    const rsi = calculateRSI(closes.slice(0, i + 1), rsiLength);
    rsiValues.push(rsi);
  }
  
  if (rsiValues.length < stochLength) {
    return { k: 50, d: 50 }; // Default values
  }
  
  // Get the last 'stochLength' RSI values
  const recentRSI = rsiValues.slice(-stochLength);
  const minRSI = Math.min(...recentRSI);
  const maxRSI = Math.max(...recentRSI);
  const currentRSI = rsiValues[rsiValues.length - 1];
  
  // Calculate Stochastic of RSI
  const k = maxRSI !== minRSI ? ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100 : 50;
  
  // Smooth %K to get %D (simple average for now)
  const d = k; // Simplified - in practice you'd smooth this
  
  return { k, d };
}

function calculateRSI(data: number[], period: number): number {
  if (data.length < period + 1) return 50;
  const changes = data.slice(1).map((price, i) => price - data[i]);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);
  
  const avgGain = calculateSMA(gains.slice(-period), period);
  const avgLoss = calculateSMA(losses.slice(-period), period);
  
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
}

function calculateDMI(candles: OHLCV[], length: number, adxSmoothing: number) {
  if (candles.length < length + 1) return { plusDI: 20, minusDI: 20, adx: 25 };
  
  const trueRanges = [];
  const plusDMs = [];
  const minusDMs = [];
  
  // Calculate True Range, +DM, and -DM
  for (let i = 1; i < candles.length; i++) {
    const tr = calculateTrueRange(candles, i);
    trueRanges.push(tr);
    
    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;
    
    const plusDM = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
    const minusDM = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;
    
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }
  
  // Calculate smoothed averages
  const atrSmoothed = calculateSMA(trueRanges.slice(-length), length);
  const plusDMSmoothed = calculateSMA(plusDMs.slice(-length), length);
  const minusDMSmoothed = calculateSMA(minusDMs.slice(-length), length);
  
  // Calculate DI values
  const plusDI = atrSmoothed !== 0 ? (plusDMSmoothed / atrSmoothed) * 100 : 0;
  const minusDI = atrSmoothed !== 0 ? (minusDMSmoothed / atrSmoothed) * 100 : 0;
  
  // Calculate ADX
  const dx = (plusDI + minusDI) !== 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0;
  const adx = dx; // Simplified - should be smoothed
  
  return { plusDI, minusDI, adx };
}

function calculateHVP(candles: OHLCV[], length: number, lookback: number) {
  if (candles.length < lookback) return { value: 50, expanding: false };
  
  // Calculate historical volatility using ATR
  const atrValues = [];
  for (let i = length; i < candles.length; i++) {
    const atr = calculateATR(candles.slice(i - length, i + 1), length);
    atrValues.push(atr);
  }
  
  if (atrValues.length < lookback) return { value: 50, expanding: false };
  
  // Get recent ATR values for percentile calculation
  const recentATRs = atrValues.slice(-lookback);
  const currentATR = atrValues[atrValues.length - 1];
  
  // Calculate percentile rank
  const sortedATRs = [...recentATRs].sort((a, b) => a - b);
  const rank = sortedATRs.findIndex(val => val >= currentATR);
  const percentile = (rank / sortedATRs.length) * 100;
  
  // Determine if volatility is expanding (above 70th percentile)
  const expanding = percentile > 70;
  
  return { value: percentile, expanding };
}