import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

interface TechnicalIndicators {
  sma_20: number;
  sma_50: number;
  sma_100: number;
  sma_200: number;
  ema_50: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  bb_upper: number;
  bb_middle: number;
  bb_lower: number;
  atr: number;
  volume_ma: number;
  adx: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 1h Signal Engine started');

    // Get comprehensive trading pairs for 1h analysis
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 
      'SOLUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT',
      'ATOMUSDT', 'LTCUSDT', 'UNIUSDT', 'FILUSDT', 'APTUSDT',
      'NEARUSDT', 'ALGOUSDT', 'VETUSDT', 'ICPUSDT', 'HBARUSDT'
    ];

    const signals = [];

    for (const symbol of symbols) {
      try {
        // Fetch 1h OHLCV data from Bybit
        const klineUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=60&limit=200`;
        const response = await fetch(klineUrl);
        const data = await response.json();

        if (!data.result?.list || data.result.list.length === 0) {
          console.log(`⚠️ No data for ${symbol}`);
          continue;
        }

        const klines = data.result.list.reverse(); // Bybit returns newest first
        const marketData: MarketData[] = klines.map((k: any) => ({
          symbol,
          timestamp: parseInt(k[0]),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));

        // Calculate comprehensive technical indicators for 1h timeframe
        const indicators = calculateIndicators1h(marketData);
        const latest = marketData[marketData.length - 1];

        // 1h position trading signals - comprehensive analysis
        const signal = analyzePositionSignal(latest, indicators, marketData);

        if (signal) {
          signals.push({
            id: crypto.randomUUID(),
            symbol,
            timeframe: '1h',
            direction: signal.direction,
            side: signal.direction.toLowerCase(),
            price: latest.close,
            entry_price: latest.close,
            score: signal.score,
            confidence: signal.confidence,
            source: 'signal_engine_1h',
            algo: 'position_trend',
            bar_time: new Date(latest.timestamp),
            created_at: new Date(),
            expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours expiry
            is_active: true,
            take_profit: signal.takeProfit,
            stop_loss: signal.stopLoss,
            metadata: {
              indicators,
              signal_type: 'position_trading',
              timeframe_optimized: '1h',
              trend_analysis: true,
              comprehensive_filters: true,
              market_structure: signal.marketStructure
            },
            diagnostics: {
              trend_strength: signal.trendStrength,
              market_phase: signal.marketPhase,
              volatility_regime: signal.volatilityRegime,
              volume_analysis: signal.volumeAnalysis,
              momentum_quality: signal.momentumQuality
            }
          });
        }

        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
      }
    }

    // Store signals in database
    if (signals.length > 0) {
      const { error } = await supabase
        .from('signals')
        .insert(signals);

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log(`✅ Generated ${signals.length} 1h signals`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timeframe: '1h',
        signals_generated: signals.length,
        symbols_processed: symbols.length,
        timestamp: new Date().toISOString(),
        engine_type: 'position_trend'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ 1h Signal Engine error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timeframe: '1h',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function calculateIndicators1h(data: MarketData[]): TechnicalIndicators {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume);
  
  const macd = calculateMACD(closes);
  const bb = calculateBollingerBands(closes, 20);
  
  return {
    sma_20: calculateSMA(closes, 20),
    sma_50: calculateSMA(closes, 50),
    sma_100: calculateSMA(closes, 100),
    sma_200: calculateSMA(closes, 200),
    ema_50: calculateEMA(closes, 50),
    rsi: calculateRSI(closes, 14),
    macd: macd.macd,
    macd_signal: macd.signal,
    macd_histogram: macd.histogram,
    bb_upper: bb.upper,
    bb_middle: bb.middle,
    bb_lower: bb.lower,
    atr: calculateATR(highs, lows, closes, 14),
    volume_ma: calculateSMA(volumes, 50),
    adx: calculateADX(highs, lows, closes, 14)
  };
}

function analyzePositionSignal(latest: MarketData, indicators: TechnicalIndicators, history: MarketData[]) {
  let score = 50;
  let confidence = 0.5;
  let direction = '';
  
  const trendStrength = calculateTrendStrength1h(history, indicators);
  const marketPhase = identifyMarketPhase(indicators);
  const volatilityRegime = classifyVolatility(indicators.atr, history);
  const volumeAnalysis = analyzeVolumeProfile(latest.volume, indicators.volume_ma, history);
  const momentumQuality = assessMomentumQuality(indicators);
  const marketStructure = analyzeMarketStructure(history);
  
  // 1h position trading criteria - comprehensive trend analysis
  const bullishSignals = [
    indicators.sma_20 > indicators.sma_50 && indicators.sma_50 > indicators.sma_100, // Strong uptrend +15
    latest.close > indicators.ema_50, // Price above EMA +10
    indicators.rsi > 50 && indicators.rsi < 75, // Healthy bullish momentum +10
    indicators.macd > indicators.macd_signal && indicators.macd > 0, // MACD bullish +12
    indicators.macd_histogram > 0, // MACD histogram rising +8
    latest.close > indicators.bb_middle, // Above BB middle +8
    indicators.adx > 25, // Strong trend +10
    volumeAnalysis.profile === 'bullish', // Volume supporting move +12
    trendStrength > 0.6, // Very strong uptrend +15
    marketPhase === 'trending_up', // Market structure bullish +10
    volatilityRegime === 'normal' || volatilityRegime === 'low', // Stable conditions +5
    momentumQuality > 0.7 // High quality momentum +10
  ];
  
  const bearishSignals = [
    indicators.sma_20 < indicators.sma_50 && indicators.sma_50 < indicators.sma_100, // Strong downtrend +15
    latest.close < indicators.ema_50, // Price below EMA +10
    indicators.rsi < 50 && indicators.rsi > 25, // Healthy bearish momentum +10
    indicators.macd < indicators.macd_signal && indicators.macd < 0, // MACD bearish +12
    indicators.macd_histogram < 0, // MACD histogram falling +8
    latest.close < indicators.bb_middle, // Below BB middle +8
    indicators.adx > 25, // Strong trend +10
    volumeAnalysis.profile === 'bearish', // Volume supporting move +12
    trendStrength < -0.6, // Very strong downtrend +15
    marketPhase === 'trending_down', // Market structure bearish +10
    volatilityRegime === 'normal' || volatilityRegime === 'low', // Stable conditions +5
    momentumQuality > 0.7 // High quality momentum +10
  ];
  
  const weights = [15, 10, 10, 12, 8, 8, 10, 12, 15, 10, 5, 10];
  
  const bullishScore = bullishSignals.reduce((sum, signal, index) => {
    return sum + (signal ? weights[index] : 0);
  }, 0);
  
  const bearishScore = bearishSignals.reduce((sum, signal, index) => {
    return sum + (signal ? weights[index] : 0);
  }, 0);
  
  let takeProfit = null;
  let stopLoss = null;
  
  if (bullishScore >= 70) {
    direction = 'LONG';
    score = Math.min(50 + bullishScore, 98);
    confidence = bullishScore / 125;
    takeProfit = latest.close * 1.025; // 2.5% target
    stopLoss = latest.close * 0.985; // 1.5% stop
  } else if (bearishScore >= 70) {
    direction = 'SHORT';
    score = Math.min(50 + bearishScore, 98);
    confidence = bearishScore / 125;
    takeProfit = latest.close * 0.975; // 2.5% target
    stopLoss = latest.close * 1.015; // 1.5% stop
  }
  
  // Only return high-quality position signals
  if (score >= 75 && confidence >= 0.65) {
    return {
      direction,
      score,
      confidence,
      trendStrength,
      marketPhase,
      volatilityRegime,
      volumeAnalysis,
      momentumQuality,
      marketStructure,
      takeProfit,
      stopLoss
    };
  }
  
  return null;
}

function calculateTrendStrength1h(data: MarketData[], indicators: TechnicalIndicators): number {
  if (data.length < 50) return 0;
  
  const recent = data.slice(-50);
  const closes = recent.map(d => d.close);
  
  // Multi-timeframe trend alignment
  const smaAlignment = (indicators.sma_20 > indicators.sma_50 ? 1 : -1) +
                      (indicators.sma_50 > indicators.sma_100 ? 1 : -1) +
                      (indicators.sma_100 > indicators.sma_200 ? 1 : -1);
  
  // Price position relative to moving averages
  const currentPrice = closes[closes.length - 1];
  const pricePosition = (currentPrice > indicators.sma_20 ? 1 : -1) +
                       (currentPrice > indicators.sma_50 ? 1 : -1) +
                       (currentPrice > indicators.sma_100 ? 1 : -1);
  
  // Trend consistency over time
  let consistencyScore = 0;
  for (let i = recent.length - 20; i < recent.length; i++) {
    if (i > 0) {
      const change = closes[i] - closes[i - 1];
      consistencyScore += change > 0 ? 1 : -1;
    }
  }
  
  const totalScore = smaAlignment + pricePosition + (consistencyScore / 20);
  return totalScore / 9; // Normalize to -1 to 1
}

function identifyMarketPhase(indicators: TechnicalIndicators): string {
  const adxStrong = indicators.adx > 25;
  const macdBullish = indicators.macd > indicators.macd_signal;
  const trendUp = indicators.sma_20 > indicators.sma_50;
  
  if (adxStrong && macdBullish && trendUp) return 'trending_up';
  if (adxStrong && !macdBullish && !trendUp) return 'trending_down';
  if (!adxStrong) return 'ranging';
  return 'transitional';
}

function classifyVolatility(atr: number, history: MarketData[]): string {
  if (history.length < 20) return 'normal';
  
  const recent = history.slice(-20);
  const avgRange = recent.reduce((sum, d) => sum + (d.high - d.low), 0) / 20;
  
  if (atr > avgRange * 1.5) return 'high';
  if (atr < avgRange * 0.7) return 'low';
  return 'normal';
}

function analyzeVolumeProfile(currentVolume: number, volumeMA: number, history: MarketData[]) {
  const volumeRatio = currentVolume / volumeMA;
  const recentTrend = history.slice(-5);
  
  let profile = 'neutral';
  if (volumeRatio > 1.5) {
    const priceDirection = recentTrend[recentTrend.length - 1].close > recentTrend[0].close;
    profile = priceDirection ? 'bullish' : 'bearish';
  }
  
  return { profile, ratio: volumeRatio };
}

function assessMomentumQuality(indicators: TechnicalIndicators): number {
  let quality = 0;
  
  // RSI in healthy range
  if (indicators.rsi > 40 && indicators.rsi < 70) quality += 0.3;
  
  // MACD alignment
  if (indicators.macd > indicators.macd_signal) quality += 0.3;
  if (indicators.macd_histogram > 0) quality += 0.2;
  
  // ADX strength
  if (indicators.adx > 25) quality += 0.2;
  
  return quality;
}

function analyzeMarketStructure(data: MarketData[]) {
  if (data.length < 20) return 'insufficient_data';
  
  const recent = data.slice(-20);
  const highs = recent.map(d => d.high);
  const lows = recent.map(d => d.low);
  
  // Look for higher highs/higher lows or lower highs/lower lows
  const highPattern = highs.slice(-3);
  const lowPattern = lows.slice(-3);
  
  const higherHighs = highPattern[2] > highPattern[1] && highPattern[1] > highPattern[0];
  const higherLows = lowPattern[2] > lowPattern[1] && lowPattern[1] > lowPattern[0];
  const lowerHighs = highPattern[2] < highPattern[1] && highPattern[1] < highPattern[0];
  const lowerLows = lowPattern[2] < lowPattern[1] && lowPattern[1] < lowPattern[0];
  
  if (higherHighs && higherLows) return 'uptrend_structure';
  if (lowerHighs && lowerLows) return 'downtrend_structure';
  return 'sideways_structure';
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 20;
  
  // Simplified ADX calculation
  const trueRanges = [];
  const plusDMs = [];
  const minusDMs = [];
  
  for (let i = 1; i < Math.min(highs.length, period + 10); i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
    
    const plusDM = highs[i] - highs[i - 1] > lows[i - 1] - lows[i] ? 
                   Math.max(highs[i] - highs[i - 1], 0) : 0;
    const minusDM = lows[i - 1] - lows[i] > highs[i] - highs[i - 1] ? 
                    Math.max(lows[i - 1] - lows[i], 0) : 0;
    
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }
  
  const avgTR = calculateSMA(trueRanges, period);
  const avgPlusDM = calculateSMA(plusDMs, period);
  const avgMinusDM = calculateSMA(minusDMs, period);
  
  const plusDI = (avgPlusDM / avgTR) * 100;
  const minusDI = (avgMinusDM / avgTR) * 100;
  
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  return dx || 20; // Return default if calculation fails
}

// Additional technical indicator calculations
function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const sum = data.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(data.slice(0, period), period);
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateRSI(data: number[], period: number): number {
  if (data.length < period + 1) return 50;
  
  const changes = data.slice(1).map((price, i) => price - data[i]);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? -change : 0);
  
  const avgGain = calculateSMA(gains.slice(-period), period);
  const avgLoss = calculateSMA(losses.slice(-period), period);
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(data: number[]) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macd = ema12 - ema26;
  const signal = macd * 0.9; // Simplified signal line
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

function calculateBollingerBands(data: number[], period: number) {
  const sma = calculateSMA(data, period);
  const squaredDiffs = data.slice(-period).map(price => Math.pow(price - sma, 2));
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
  
  return {
    upper: sma + (stdDev * 2),
    middle: sma,
    lower: sma - (stdDev * 2)
  };
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 0;
  
  const trueRanges = [];
  for (let i = 1; i < highs.length; i++) {
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return calculateSMA(trueRanges.slice(-period), period);
}