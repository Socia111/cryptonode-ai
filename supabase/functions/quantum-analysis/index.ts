import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], timeframe = '1h' } = await req.json().catch(() => ({}));

    console.log(`[Quantum Analysis] Starting quantum analysis for ${symbols.length} symbols`);

    const analyses = [];

    for (const symbol of symbols) {
      try {
        // Fetch market data with error handling
        const tickerUrl = `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`;
        const tickerResp = await fetch(tickerUrl);
        
        if (!tickerResp.ok) {
          console.error(`[Quantum Analysis] HTTP ${tickerResp.status} for ${symbol}`);
          continue;
        }
        
        const contentType = tickerResp.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error(`[Quantum Analysis] Invalid response type for ${symbol}`);
          continue;
        }
        
        const tickerData = await tickerResp.json();

        if (tickerData.retCode !== 0) {
          console.error(`[Quantum Analysis] API error for ${symbol}: ${tickerData.retMsg}`);
          continue;
        }

        const ticker = tickerData.result.list[0];
        const price = parseFloat(ticker.lastPrice);
        const volume24h = parseFloat(ticker.volume24h);
        const priceChange = parseFloat(ticker.price24hPcnt) * 100;

        // Fetch kline data with error handling
        const intervalMap: Record<string, string> = { '5m': '5', '15m': '15', '30m': '30', '1h': '60', '4h': '240' };
        const klineUrl = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${intervalMap[timeframe]}&limit=200`;
        const klineResp = await fetch(klineUrl);
        
        if (!klineResp.ok) {
          console.error(`[Quantum Analysis] HTTP ${klineResp.status} for kline ${symbol}`);
          continue;
        }
        
        const klineData = await klineResp.json();

        if (klineData.retCode !== 0) {
          console.error(`[Quantum Analysis] Kline API error for ${symbol}: ${klineData.retMsg}`);
          continue;
        }

        const candles = klineData.result.list.reverse();
        const closes = candles.map((c: any) => parseFloat(c[4]));
        const highs = candles.map((c: any) => parseFloat(c[2]));
        const lows = candles.map((c: any) => parseFloat(c[3]));
        const volumes = candles.map((c: any) => parseFloat(c[5]));

        // Quantum Analysis: Multi-dimensional probability scoring
        const momentum = calculateMomentum(closes, 14);
        const volatility = calculateVolatility(closes, 20);
        const volumeProfile = calculateVolumeProfile(volumes, closes);
        const trendStrength = calculateTrendStrength(closes, highs, lows);
        const marketPhase = detectMarketPhase(closes, volumes);
        
        // Wave pattern detection
        const wavePattern = detectWavePattern(closes, highs, lows);
        
        // Quantum probability score (0-100)
        const quantumScore = calculateQuantumScore({
          momentum,
          volatility,
          volumeProfile,
          trendStrength,
          marketPhase,
          wavePattern
        });

        const analysis = {
          symbol,
          timeframe,
          quantum_score: quantumScore,
          momentum,
          volatility,
          volume_profile: volumeProfile,
          trend_strength: trendStrength,
          market_phase: marketPhase,
          wave_pattern: wavePattern,
          price,
          price_change_24h: priceChange,
          volume_24h: volume24h,
          recommendation: quantumScore >= 75 ? 'STRONG_BUY' : quantumScore >= 60 ? 'BUY' : quantumScore >= 40 ? 'HOLD' : quantumScore >= 25 ? 'SELL' : 'STRONG_SELL',
          confidence: Math.min(95, quantumScore) / 100,
          analyzed_at: new Date().toISOString()
        };

        analyses.push(analysis);

        console.log(`[Quantum Analysis] ✅ ${symbol}: Quantum Score ${quantumScore}, Phase: ${marketPhase}, Recommendation: ${analysis.recommendation}`);

      } catch (error) {
        console.error(`[Quantum Analysis] Error analyzing ${symbol}:`, error.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analyses_count: analyses.length,
        analyses
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Quantum Analysis] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateMomentum(closes: number[], period: number): number {
  if (closes.length < period) return 50;
  const recentAvg = closes.slice(-period / 2).reduce((a, b) => a + b, 0) / (period / 2);
  const olderAvg = closes.slice(-period, -period / 2).reduce((a, b) => a + b, 0) / (period / 2);
  const momentum = ((recentAvg - olderAvg) / olderAvg) * 100;
  return Math.max(0, Math.min(100, 50 + momentum * 5));
}

function calculateVolatility(closes: number[], period: number): number {
  const returns = closes.slice(1).map((price, i) => (price - closes[i]) / closes[i]);
  const variance = returns.slice(-period).reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / period;
  const volatility = Math.sqrt(variance) * 100;
  return Math.min(100, volatility * 10);
}

function calculateVolumeProfile(volumes: number[], closes: number[]): number {
  const recentVolumes = volumes.slice(-20);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const currentVolume = volumes[volumes.length - 1];
  const volumeRatio = currentVolume / avgVolume;
  
  // Higher volume with price increase = bullish
  const priceChange = closes[closes.length - 1] - closes[closes.length - 2];
  const volumeScore = volumeRatio * (priceChange > 0 ? 1.2 : 0.8);
  
  return Math.min(100, volumeScore * 30);
}

function calculateTrendStrength(closes: number[], highs: number[], lows: number[]): number {
  // ADX-like calculation
  const period = 14;
  const priceDiffs = closes.slice(1).map((price, i) => price - closes[i]);
  const positiveMoves = priceDiffs.map(d => d > 0 ? d : 0);
  const negativeMoves = priceDiffs.map(d => d < 0 ? -d : 0);
  
  const plusDM = positiveMoves.slice(-period).reduce((a, b) => a + b, 0) / period;
  const minusDM = negativeMoves.slice(-period).reduce((a, b) => a + b, 0) / period;
  
  const trueRange = highs.slice(-period).reduce((sum, high, i) => {
    const low = lows[lows.length - period + i];
    const prevClose = closes[closes.length - period + i - 1] || closes[0];
    return sum + Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }, 0) / period;
  
  const plusDI = (plusDM / trueRange) * 100;
  const minusDI = (minusDM / trueRange) * 100;
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  
  return Math.min(100, dx);
}

function detectMarketPhase(closes: number[], volumes: number[]): string {
  const recentPriceChange = ((closes[closes.length - 1] - closes[closes.length - 10]) / closes[closes.length - 10]) * 100;
  const recentVolumes = volumes.slice(-10);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const volumeRatio = volumes[volumes.length - 1] / avgVolume;
  
  if (recentPriceChange > 5 && volumeRatio > 1.5) return 'ACCUMULATION';
  if (recentPriceChange > 2 && volumeRatio > 1.2) return 'MARKUP';
  if (recentPriceChange < -5 && volumeRatio > 1.5) return 'DISTRIBUTION';
  if (recentPriceChange < -2 && volumeRatio > 1.2) return 'MARKDOWN';
  return 'CONSOLIDATION';
}

function detectWavePattern(closes: number[], highs: number[], lows: number[]): string {
  const swings = [];
  
  for (let i = 1; i < closes.length - 1; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
      swings.push({ type: 'high', price: highs[i], index: i });
    } else if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
      swings.push({ type: 'low', price: lows[i], index: i });
    }
  }
  
  if (swings.length < 3) return 'FORMING';
  
  const recentSwings = swings.slice(-5);
  const higherHighs = recentSwings.filter(s => s.type === 'high').length >= 2;
  const higherLows = recentSwings.filter(s => s.type === 'low').length >= 2;
  const lowerHighs = recentSwings.filter(s => s.type === 'high').length >= 2;
  const lowerLows = recentSwings.filter(s => s.type === 'low').length >= 2;
  
  if (higherHighs && higherLows) return 'IMPULSE_UP';
  if (lowerHighs && lowerLows) return 'IMPULSE_DOWN';
  return 'CORRECTIVE';
}

function calculateQuantumScore(metrics: {
  momentum: number;
  volatility: number;
  volumeProfile: number;
  trendStrength: number;
  marketPhase: string;
  wavePattern: string;
}): number {
  const phaseScore = {
    'ACCUMULATION': 80,
    'MARKUP': 70,
    'DISTRIBUTION': 40,
    'MARKDOWN': 30,
    'CONSOLIDATION': 50
  }[metrics.marketPhase] || 50;
  
  const waveScore = {
    'IMPULSE_UP': 75,
    'IMPULSE_DOWN': 25,
    'CORRECTIVE': 45,
    'FORMING': 50
  }[metrics.wavePattern] || 50;
  
  // Weighted quantum score
  const score = (
    metrics.momentum * 0.25 +
    (100 - metrics.volatility * 0.5) * 0.15 +
    metrics.volumeProfile * 0.20 +
    metrics.trendStrength * 0.15 +
    phaseScore * 0.15 +
    waveScore * 0.10
  );
  
  return Math.round(Math.max(0, Math.min(100, score)));
}
