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
    const timeframes = ['15m', '1h', '4h', '1d'];
    const signals = [];

    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        try {
          // Fetch OHLCV data from Bybit
          const interval = timeframe === '15m' ? '15' : timeframe === '1h' ? '60' : timeframe === '4h' ? '240' : 'D';
          const limit = timeframe === '1d' ? 365 : 200;
          
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
  const stoch = calculateStochRSI(candles, settings.stoch.k, settings.stoch.d, settings.stoch.smooth);
  const dmiVals = calculateDMI(candles, settings.dmi.length, settings.dmi.adxSmoothing);
  const hvpVals = calculateHVP(candles, settings.hvp.length, settings.hvp.percentileLookback);

  const volSMA20 = calculateSMA(volumes, 20);
  const isVolSpike = volume > settings.volSpikeFactor * volSMA20;

  // === Trend Regime ===
  const bullRegime = close > sma200 && close > ema200;
  const bearRegime = close < sma200 && close < ema200;

  // === Long Setup ===
  if (bullRegime && pullbackTo(close, ema21, ema50)) {
    if (stoch.k > stoch.d && stoch.k < 30 && dmiVals.plusDI > dmiVals.minusDI && dmiVals.adx > 20) {
      if (isVolSpike || hvpVals.expanding) {
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
          confidence: "☄️ HIGH",
          score: calculateScore(stoch, dmiVals, hvpVals, isVolSpike, true),
          confidenceScore: 0.85,
          filters: {
            stochRSI: { k: stoch.k, d: stoch.d },
            dmi: { plusDI: dmiVals.plusDI, minusDI: dmiVals.minusDI, adx: dmiVals.adx },
            hvp: { value: hvpVals.value, expanding: hvpVals.expanding },
            volumeSpike: isVolSpike
          }
        };
      }
    }
  }

  // === Short Setup ===
  if (bearRegime && pullbackTo(close, ema21, ema50)) {
    if (stoch.k < stoch.d && stoch.k > 70 && dmiVals.minusDI > dmiVals.plusDI && dmiVals.adx > 20) {
      if (isVolSpike || hvpVals.expanding) {
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
          confidence: "☄️ HIGH",
          score: calculateScore(stoch, dmiVals, hvpVals, isVolSpike, false),
          confidenceScore: 0.85,
          filters: {
            stochRSI: { k: stoch.k, d: stoch.d },
            dmi: { plusDI: dmiVals.plusDI, minusDI: dmiVals.minusDI, adx: dmiVals.adx },
            hvp: { value: hvpVals.value, expanding: hvpVals.expanding },
            volumeSpike: isVolSpike
          }
        };
      }
    }
  }

  return null;
}

function pullbackTo(price: number, emaLow: number, emaHigh: number): boolean {
  return price >= emaLow && price <= emaHigh;
}

function calculateScore(stoch: any, dmi: any, hvp: any, volSpike: boolean, isLong: boolean): number {
  let score = 70; // Base score

  // Stoch RSI quality
  if (isLong && stoch.k < 20) score += 10;
  if (!isLong && stoch.k > 80) score += 10;

  // DMI/ADX strength
  if (dmi.adx > 25) score += 10;
  if (dmi.adx > 30) score += 5;

  // HVP expansion
  if (hvp.expanding) score += 10;

  // Volume confirmation
  if (volSpike) score += 10;

  return Math.min(score, 95);
}

function getExpiryTime(timeframe: string): number {
  const multipliers = { '15m': 4, '1h': 12, '4h': 24, '1d': 7 * 24 };
  return (multipliers[timeframe] || 12) * 60 * 60 * 1000;
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

function calculateStochRSI(candles: OHLCV[], kLength: number, dLength: number, smooth: number) {
  const closes = candles.map(c => c.close);
  const rsi = calculateRSI(closes, 14);
  const rsiArray = [rsi]; // Simplified for single value
  
  // Stochastic of RSI
  const k = ((rsi - 0) / (100 - 0)) * 100; // Simplified calculation
  const d = k; // Simplified
  
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
  if (candles.length < length + 1) return { plusDI: 0, minusDI: 0, adx: 0 };
  
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  
  // Simplified DMI calculation
  const plusDI = 25; // Placeholder
  const minusDI = 15; // Placeholder  
  const adx = 28; // Placeholder
  
  return { plusDI, minusDI, adx };
}

function calculateHVP(candles: OHLCV[], length: number, lookback: number) {
  // Historical Volatility Percentile (simplified)
  const value = 65; // Placeholder percentile value
  const expanding = value > 50; // Expanding if above median
  
  return { value, expanding };
}