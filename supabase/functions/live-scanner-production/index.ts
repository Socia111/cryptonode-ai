import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT'];
const TIMEFRAMES = ['5m', '15m', '1h'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { timeframe = '15m', symbols = SYMBOLS } = await req.json().catch(() => ({}));

    console.log(`[Live Scanner] Starting scan for ${timeframe} timeframe`);

    const signals = [];

    for (const symbol of symbols) {
      try {
        // Fetch market data from Bybit
        const tickerUrl = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`;
        const tickerResp = await fetch(tickerUrl);
        const tickerData = await tickerResp.json();

        if (tickerData.retCode !== 0) continue;

        const ticker = tickerData.result.list[0];
        const price = parseFloat(ticker.lastPrice);
        const volume24h = parseFloat(ticker.volume24h);
        const priceChange = parseFloat(ticker.price24hPcnt) * 100;

        // Fetch kline data for technical analysis
        const klineUrl = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${timeframe === '5m' ? '5' : timeframe === '15m' ? '15' : '60'}&limit=50`;
        const klineResp = await fetch(klineUrl);
        const klineData = await klineResp.json();

        if (klineData.retCode !== 0) continue;

        const candles = klineData.result.list.reverse();
        const closes = candles.map((c: any) => parseFloat(c[4]));
        const volumes = candles.map((c: any) => parseFloat(c[5]));

        // Calculate indicators
        const ema21 = calculateEMA(closes, 21);
        const rsi = calculateRSI(closes, 14);
        const volumeAvg = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const volumeRatio = volumes[volumes.length - 1] / volumeAvg;

        // Generate signal logic
        const bullish = ema21 < price && rsi > 30 && rsi < 70 && volumeRatio > 1.2;
        const bearish = ema21 > price && rsi > 30 && rsi < 70 && volumeRatio > 1.2;

        if (bullish || bearish) {
          const direction = bullish ? 'LONG' : 'SHORT';
          const score = Math.min(95, Math.floor(
            50 + 
            (volumeRatio > 1.5 ? 15 : 10) +
            (Math.abs(rsi - 50) < 20 ? 15 : 10) +
            (Math.abs(priceChange) > 2 ? 10 : 5) +
            10
          ));

          const atrValue = calculateATR(candles, 14);
          const stopLoss = direction === 'LONG' 
            ? price - (atrValue * 1.5)
            : price + (atrValue * 1.5);
          const takeProfit = direction === 'LONG'
            ? price + (atrValue * 2.5)
            : price - (atrValue * 2.5);

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
            atr: atrValue,
            volume_ratio: volumeRatio,
            algo: 'live_scanner_v1',
            exchange: 'bybit',
            is_active: true,
            bar_time: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            indicators: {
              rsi,
              ema21,
              volume_ratio: volumeRatio,
              price_change_24h: priceChange,
            },
            metadata: {
              scanner: 'live_production',
              version: '1.0',
            }
          });

          console.log(`[Live Scanner] ✅ Signal: ${symbol} ${direction} @ ${price} (Score: ${score})`);
        }

      } catch (error) {
        console.error(`[Live Scanner] Error scanning ${symbol}:`, error.message);
      }
    }

    // Insert signals into database
    if (signals.length > 0) {
      const { data, error } = await supabase
        .from('signals')
        .insert(signals)
        .select();

      if (error) {
        console.error('[Live Scanner] Failed to insert signals:', error);
      } else {
        console.log(`[Live Scanner] ✅ Inserted ${signals.length} signals`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timeframe,
        signals_generated: signals.length,
        signals,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Live Scanner] Error:', error);
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
