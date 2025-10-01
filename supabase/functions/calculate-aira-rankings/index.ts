import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOP_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'LINKUSDT', 'UNIUSDT',
  'AVAXUSDT', 'ATOMUSDT', 'DOTUSDT', 'LTCUSDT', 'ARBUSDT',
  'OPUSDT', 'APTUSDT', 'INJUSDT', 'SUIUSDT', 'TIAUSDT'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[AIRA Rankings] Starting AIRA calculation for top tokens');

    const rankings = [];

    for (const symbol of TOP_SYMBOLS) {
      try {
        // Fetch ticker data
        const tickerUrl = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`;
        const tickerResp = await fetch(tickerUrl);
        const tickerData = await tickerResp.json();

        if (tickerData.retCode !== 0) continue;

        const ticker = tickerData.result.list[0];
        const price = parseFloat(ticker.lastPrice);
        const volume24h = parseFloat(ticker.volume24h);
        const turnover24h = parseFloat(ticker.turnover24h);
        const priceChange = parseFloat(ticker.price24hPcnt) * 100;

        // Fetch kline data for technical analysis
        const klineUrl = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=60&limit=100`;
        const klineResp = await fetch(klineUrl);
        const klineData = await klineResp.json();

        if (klineData.retCode !== 0) continue;

        const candles = klineData.result.list.reverse();
        const closes = candles.map((c: any) => parseFloat(c[4]));
        const volumes = candles.map((c: any) => parseFloat(c[5]));

        // Calculate AIRA components
        const momentum = calculateMomentumScore(closes);
        const volatility = calculateVolatilityScore(closes);
        const volume = calculateVolumeScore(volumes, volume24h);
        const trend = calculateTrendScore(closes);
        const strength = calculateStrengthScore(closes, volumes);

        // AIRA Score = weighted average of components
        const airaScore = Math.round(
          momentum * 0.25 +
          trend * 0.25 +
          strength * 0.20 +
          volume * 0.20 +
          volatility * 0.10
        );

        rankings.push({
          symbol,
          score: airaScore,
          volume_24h: turnover24h,
          price_change_24h: priceChange,
          aira_indicators: {
            momentum,
            volatility,
            volume,
            trend,
            strength,
            price
          }
        });

        console.log(`[AIRA] ${symbol}: Score ${airaScore} (M:${momentum} T:${trend} S:${strength})`);

      } catch (error) {
        console.error(`[AIRA] Error calculating ${symbol}:`, error.message);
      }
    }

    // Sort by score and assign ranks
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((r, i) => r.rank = i + 1);

    // Insert into database
    if (rankings.length > 0) {
      const { error } = await supabase
        .from('aira_rankings')
        .insert(rankings);

      if (error) {
        console.error('[AIRA] Failed to insert rankings:', error);
      } else {
        console.log(`[AIRA] ✅ Inserted ${rankings.length} AIRA rankings`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rankings_count: rankings.length,
        top_10: rankings.slice(0, 10)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AIRA Rankings] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateMomentumScore(closes: number[]): number {
  const period = 14;
  const currentPrice = closes[closes.length - 1];
  const pastPrice = closes[closes.length - period];
  const change = ((currentPrice - pastPrice) / pastPrice) * 100;
  return Math.max(0, Math.min(100, 50 + change * 5));
}

function calculateVolatilityScore(closes: number[]): number {
  const returns = closes.slice(1).map((price, i) => (price - closes[i]) / closes[i]);
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * 100;
  // Lower volatility = higher score (for stability)
  return Math.max(0, Math.min(100, 100 - volatility * 20));
}

function calculateVolumeScore(volumes: number[], volume24h: number): number {
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const recentVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const volumeTrend = (recentVolume / avgVolume) * 100;
  return Math.min(100, volumeTrend);
}

function calculateTrendScore(closes: number[]): number {
  // Linear regression slope
  const n = closes.length;
  const xSum = (n * (n - 1)) / 2;
  const ySum = closes.reduce((a, b) => a + b, 0);
  const xySum = closes.reduce((sum, y, x) => sum + x * y, 0);
  const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  const avgPrice = ySum / n;
  const trendStrength = (slope / avgPrice) * 100 * n;
  
  return Math.max(0, Math.min(100, 50 + trendStrength));
}

function calculateStrengthScore(closes: number[], volumes: number[]): number {
  // Volume-weighted price momentum
  const recentPeriod = 14;
  const recentCloses = closes.slice(-recentPeriod);
  const recentVolumes = volumes.slice(-recentPeriod);
  
  const vwap = recentCloses.reduce((sum, price, i) => sum + price * recentVolumes[i], 0) / 
                recentVolumes.reduce((a, b) => a + b, 0);
  
  const currentPrice = closes[closes.length - 1];
  const strength = ((currentPrice - vwap) / vwap) * 100;
  
  return Math.max(0, Math.min(100, 50 + strength * 10));
}
