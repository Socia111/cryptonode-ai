import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT'];
const TIMEFRAMES = ['15m', '1h', '4h'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { symbols = SYMBOLS, timeframes = TIMEFRAMES } = await req.json().catch(() => ({}));

    console.log(`[Spynx] Calculating Spynx scores for ${symbols.length} symbols across ${timeframes.length} timeframes`);

    const scores = [];

    for (const timeframe of timeframes) {
      for (const symbol of symbols) {
        try {
          // Fetch kline data
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

          // Spynx Score Components
          const momentum = calculateSpynxMomentum(closes);
          const volatility = calculateSpynxVolatility(closes);
          const volumeProfile = calculateSpynxVolume(volumes);
          const trendStrength = calculateSpynxTrend(closes, highs, lows);

          // Spynx Score = Performance prediction score (0-100)
          const spynxScore = Math.round(
            momentum * 0.35 +
            trendStrength * 0.30 +
            volumeProfile * 0.20 +
            (100 - volatility) * 0.15
          );

          // Confidence based on consistency of indicators
          const indicatorVariance = calculateVariance([momentum, trendStrength, volumeProfile, (100 - volatility)]);
          const confidence = Math.max(0.5, Math.min(0.95, 1 - (indicatorVariance / 100)));

          scores.push({
            symbol,
            timeframe,
            score: spynxScore,
            confidence,
            momentum,
            volatility,
            volume_profile: volumeProfile,
            trend_strength: trendStrength,
            indicators: {
              momentum_raw: momentum,
              volatility_raw: volatility,
              volume_raw: volumeProfile,
              trend_raw: trendStrength,
              consistency: 100 - indicatorVariance
            }
          });

          console.log(`[Spynx] ${symbol} ${timeframe}: Score ${spynxScore} (Conf: ${(confidence * 100).toFixed(0)}%)`);

        } catch (error) {
          console.error(`[Spynx] Error calculating ${symbol} ${timeframe}:`, error.message);
        }
      }
    }

    // Insert into database
    if (scores.length > 0) {
      const { error } = await supabase
        .from('spynx_scores')
        .insert(scores);

      if (error) {
        console.error('[Spynx] Failed to insert scores:', error);
      } else {
        console.log(`[Spynx] ✅ Inserted ${scores.length} Spynx scores`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scores_generated: scores.length,
        top_performers: scores.filter(s => s.score >= 75).slice(0, 10)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Spynx] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateSpynxMomentum(closes: number[]): number {
  const periods = [7, 14, 21];
  const momentumScores = periods.map(period => {
    if (closes.length < period) return 50;
    const currentPrice = closes[closes.length - 1];
    const pastPrice = closes[closes.length - period];
    const change = ((currentPrice - pastPrice) / pastPrice) * 100;
    return Math.max(0, Math.min(100, 50 + change * 3));
  });
  
  return momentumScores.reduce((a, b) => a + b, 0) / momentumScores.length;
}

function calculateSpynxVolatility(closes: number[]): number {
  const returns = closes.slice(1).map((price, i) => (price - closes[i]) / closes[i]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const volatilityScore = Math.min(100, stdDev * 1000);
  return volatilityScore;
}

function calculateSpynxVolume(volumes: number[]): number {
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const recentVolumes = volumes.slice(-10);
  const recentAvg = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  
  // Volume trend and strength
  const volumeTrend = (recentAvg / avgVolume - 1) * 100;
  const volumeConsistency = 100 - (calculateVariance(recentVolumes) / recentAvg * 100);
  
  return Math.max(0, Math.min(100, 50 + volumeTrend + volumeConsistency * 0.3));
}

function calculateSpynxTrend(closes: number[], highs: number[], lows: number[]): number {
  // Multi-period trend analysis
  const shortTrend = calculateTrendSlope(closes.slice(-20));
  const mediumTrend = calculateTrendSlope(closes.slice(-50));
  const longTrend = calculateTrendSlope(closes);
  
  // Trend alignment bonus
  const alignment = (shortTrend > 0 && mediumTrend > 0 && longTrend > 0) ? 20 : 
                    (shortTrend < 0 && mediumTrend < 0 && longTrend < 0) ? 20 : 0;
  
  const avgTrend = (shortTrend + mediumTrend + longTrend) / 3;
  
  return Math.max(0, Math.min(100, 50 + avgTrend + alignment));
}

function calculateTrendSlope(data: number[]): number {
  const n = data.length;
  const xSum = (n * (n - 1)) / 2;
  const ySum = data.reduce((a, b) => a + b, 0);
  const xySum = data.reduce((sum, y, x) => sum + x * y, 0);
  const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  const avgPrice = ySum / n;
  
  return (slope / avgPrice) * 100 * n;
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}
