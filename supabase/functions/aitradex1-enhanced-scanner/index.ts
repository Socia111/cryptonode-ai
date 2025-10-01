import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'LINKUSDT', 'UNIUSDT'];
const TIMEFRAMES = ['5m', '15m', '30m', '1h', '4h'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { timeframes = TIMEFRAMES, symbols = SYMBOLS, minScore = 70 } = await req.json().catch(() => ({}));

    console.log(`[Enhanced Scanner] Starting enhanced scan for ${symbols.length} symbols across ${timeframes.length} timeframes`);

    const signals = [];

    for (const timeframe of timeframes) {
      for (const symbol of symbols) {
        try {
          // Fetch comprehensive market data
          const tickerUrl = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`;
          const tickerResp = await fetch(tickerUrl);
          const tickerData = await tickerResp.json();

          if (tickerData.retCode !== 0) continue;

          const ticker = tickerData.result.list[0];
          const price = parseFloat(ticker.lastPrice);
          const volume24h = parseFloat(ticker.volume24h);
          const priceChange = parseFloat(ticker.price24hPcnt) * 100;

          // Fetch kline data with more candles for better analysis
          const intervalMap: Record<string, string> = { '5m': '5', '15m': '15', '30m': '30', '1h': '60', '4h': '240' };
          const klineUrl = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${intervalMap[timeframe]}&limit=100`;
          const klineResp = await fetch(klineUrl);
          const klineData = await klineResp.json();

          if (klineData.retCode !== 0) continue;

          const candles = klineData.result.list.reverse();
          const closes = candles.map((c: any) => parseFloat(c[4]));
          const highs = candles.map((c: any) => parseFloat(c[2]));
          const lows = candles.map((c: any) => parseFloat(c[3]));
          const volumes = candles.map((c: any) => parseFloat(c[5]));

          // Enhanced technical indicators
          const ema21 = calculateEMA(closes, 21);
          const ema50 = calculateEMA(closes, 50);
          const rsi = calculateRSI(closes, 14);
          const macd = calculateMACD(closes);
          const atr = calculateATR(candles, 14);
          const volumeAvg = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
          const volumeRatio = volumes[volumes.length - 1] / volumeAvg;
          
          // Bollinger Bands
          const bb = calculateBollingerBands(closes, 20, 2);
          
          // Trend strength
          const trendStrength = Math.abs((ema21 - ema50) / ema50) * 100;

          // Enhanced signal logic with multiple confirmations
          const bullishSignals = [
            ema21 > ema50,
            closes[closes.length - 1] > ema21,
            rsi > 30 && rsi < 70,
            macd.histogram > 0,
            volumeRatio > 1.3,
            closes[closes.length - 1] > bb.lower && closes[closes.length - 1] < bb.upper,
            priceChange > 0
          ];

          const bearishSignals = [
            ema21 < ema50,
            closes[closes.length - 1] < ema21,
            rsi > 30 && rsi < 70,
            macd.histogram < 0,
            volumeRatio > 1.3,
            closes[closes.length - 1] < bb.upper && closes[closes.length - 1] > bb.lower,
            priceChange < 0
          ];

          const bullishCount = bullishSignals.filter(Boolean).length;
          const bearishCount = bearishSignals.filter(Boolean).length;

          const shouldSignal = bullishCount >= 5 || bearishCount >= 5;

          if (shouldSignal && volumeRatio > 1.2) {
            const direction = bullishCount > bearishCount ? 'LONG' : 'SHORT';
            const confirmationScore = Math.max(bullishCount, bearishCount);
            
            const score = Math.min(95, Math.floor(
              50 + 
              (confirmationScore * 5) +
              (volumeRatio > 2 ? 15 : volumeRatio > 1.5 ? 10 : 5) +
              (trendStrength > 2 ? 10 : 5)
            ));

            if (score >= minScore) {
              const stopLoss = direction === 'LONG' 
                ? price - (atr * 2)
                : price + (atr * 2);
              const takeProfit = direction === 'LONG'
                ? price + (atr * 3)
                : price - (atr * 3);

              signals.push({
                symbol,
                direction,
                side: direction === 'LONG' ? 'BUY' : 'SELL',
                timeframe,
                price,
                entry_price: price,
                stop_loss: stopLoss,
                take_profit: takeProfit,
                score,
                confidence: score / 100,
                atr,
                volume_ratio: volumeRatio,
                algo: 'enhanced_scanner_v2',
                algorithm_version: 'v2.0',
                exchange: 'bybit',
                is_active: true,
                bar_time: new Date().toISOString(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                indicators: {
                  rsi,
                  ema21,
                  ema50,
                  macd: macd.value,
                  macd_signal: macd.signal,
                  macd_histogram: macd.histogram,
                  volume_ratio: volumeRatio,
                  price_change_24h: priceChange,
                  bollinger_upper: bb.upper,
                  bollinger_middle: bb.middle,
                  bollinger_lower: bb.lower,
                  trend_strength: trendStrength,
                  confirmations: direction === 'LONG' ? bullishCount : bearishCount
                },
                metadata: {
                  scanner: 'enhanced_production',
                  version: '2.0',
                  signal_quality: score >= 85 ? 'premium' : score >= 75 ? 'high' : 'standard'
                }
              });

              console.log(`[Enhanced Scanner] ✅ ${symbol} ${direction} @ ${price} (Score: ${score}, Confirmations: ${direction === 'LONG' ? bullishCount : bearishCount})`);
            }
          }

        } catch (error) {
          console.error(`[Enhanced Scanner] Error scanning ${symbol} ${timeframe}:`, error.message);
        }
      }
    }

    // Insert signals into database
    if (signals.length > 0) {
      const { data, error } = await supabase
        .from('signals')
        .insert(signals)
        .select();

      if (error) {
        console.error('[Enhanced Scanner] Failed to insert signals:', error);
      } else {
        console.log(`[Enhanced Scanner] ✅ Inserted ${signals.length} high-quality signals`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: signals.length,
        timeframes_scanned: timeframes.length,
        symbols_scanned: symbols.length,
        signals: signals.slice(0, 5) // Return sample
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Enhanced Scanner] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateEMA(data: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateRSI(data: number[], period: number): number {
  const changes = data.slice(1).map((val, i) => val - data[i]);
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? -c : 0);
  
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(data: number[]) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine = ema12 - ema26;
  
  // Simple signal line (would need full EMA calculation for accuracy)
  const signalLine = macdLine * 0.9;
  const histogram = macdLine - signalLine;
  
  return {
    value: macdLine,
    signal: signalLine,
    histogram
  };
}

function calculateBollingerBands(data: number[], period: number, stdDev: number) {
  const sma = data.slice(-period).reduce((a, b) => a + b, 0) / period;
  const squaredDiffs = data.slice(-period).map(val => Math.pow(val - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(variance);
  
  return {
    upper: sma + (std * stdDev),
    middle: sma,
    lower: sma - (std * stdDev)
  };
}

function calculateATR(candles: any[], period: number): number {
  const trs = candles.slice(1).map((candle, i) => {
    const high = parseFloat(candle[2]);
    const low = parseFloat(candle[3]);
    const prevClose = parseFloat(candles[i][4]);
    return Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
  });
  
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}
