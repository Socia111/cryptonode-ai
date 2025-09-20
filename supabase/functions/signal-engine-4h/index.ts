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
  sma_50: number;
  sma_100: number;
  sma_200: number;
  ema_100: number;
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
  obv: number;
  williams_r: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 4h Signal Engine started');

    // Get comprehensive trading pairs for 4h long-term analysis
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 
      'SOLUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT',
      'ATOMUSDT', 'LTCUSDT', 'UNIUSDT', 'FILUSDT', 'APTUSDT',
      'NEARUSDT', 'ALGOUSDT', 'VETUSDT', 'ICPUSDT', 'HBARUSDT',
      'EGLDUSDT', 'AXSUSDT', 'SANDUSDT', 'MANAUSDT', 'FTMUSDT'
    ];

    const signals = [];

    for (const symbol of symbols) {
      try {
        // Fetch 4h OHLCV data from Bybit
        const klineUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=240&limit=200`;
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

        // Calculate comprehensive technical indicators for 4h timeframe
        const indicators = calculateIndicators4h(marketData);
        const latest = marketData[marketData.length - 1];

        // 4h macro trend signals - institutional-grade analysis
        const signal = analyzeMacroSignal(latest, indicators, marketData);

        if (signal) {
          signals.push({
            id: crypto.randomUUID(),
            symbol,
            timeframe: '4h',
            direction: signal.direction,
            side: signal.direction.toLowerCase(),
            price: latest.close,
            entry_price: latest.close,
            score: signal.score,
            confidence: signal.confidence,
            source: 'signal_engine_4h',
            algo: 'macro_trend',
            bar_time: new Date(latest.timestamp),
            created_at: new Date(),
            expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours expiry
            is_active: true,
            take_profit: signal.takeProfit,
            stop_loss: signal.stopLoss,
            metadata: {
              indicators,
              signal_type: 'macro_trend',
              timeframe_optimized: '4h',
              institutional_grade: true,
              multi_timeframe: true,
              cycle_analysis: signal.cycleAnalysis
            },
            diagnostics: {
              trend_strength: signal.trendStrength,
              market_regime: signal.marketRegime,
              momentum_divergence: signal.momentumDivergence,
              volume_confirmation: signal.volumeConfirmation,
              macro_structure: signal.macroStructure,
              risk_reward_ratio: signal.riskRewardRatio
            }
          });
        }

        await new Promise(resolve => setTimeout(resolve, 250)); // Rate limiting
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

      console.log(`✅ Generated ${signals.length} 4h signals`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timeframe: '4h',
        signals_generated: signals.length,
        symbols_processed: symbols.length,
        timestamp: new Date().toISOString(),
        engine_type: 'macro_trend'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ 4h Signal Engine error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timeframe: '4h',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function calculateIndicators4h(data: MarketData[]): TechnicalIndicators {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume);
  
  const macd = calculateMACD(closes);
  const bb = calculateBollingerBands(closes, 20);
  
  return {
    sma_50: calculateSMA(closes, 50),
    sma_100: calculateSMA(closes, 100),
    sma_200: calculateSMA(closes, 200),
    ema_100: calculateEMA(closes, 100),
    rsi: calculateRSI(closes, 14),
    macd: macd.macd,
    macd_signal: macd.signal,
    macd_histogram: macd.histogram,
    bb_upper: bb.upper,
    bb_middle: bb.middle,
    bb_lower: bb.lower,
    atr: calculateATR(highs, lows, closes, 14),
    volume_ma: calculateSMA(volumes, 50),
    adx: calculateADX(highs, lows, closes, 14),
    obv: calculateOBV(closes, volumes),
    williams_r: calculateWilliamsR(highs, lows, closes, 14)
  };
}

function analyzeMacroSignal(latest: MarketData, indicators: TechnicalIndicators, history: MarketData[]) {
  let score = 50;
  let confidence = 0.5;
  let direction = '';
  
  const trendStrength = calculateMacroTrendStrength(history, indicators);
  const marketRegime = identifyMarketRegime(indicators, history);
  const momentumDivergence = detectMomentumDivergence(indicators, history);
  const volumeConfirmation = analyzeVolumeConfirmation(indicators, history);
  const macroStructure = analyzeMacroStructure(history);
  const cycleAnalysis = performCycleAnalysis(history);
  
  // 4h macro trend criteria - institutional-grade filters
  const bullishSignals = [
    indicators.sma_50 > indicators.sma_100 && indicators.sma_100 > indicators.sma_200, // Major uptrend +20
    latest.close > indicators.ema_100, // Price above major EMA +12
    indicators.rsi > 55 && indicators.rsi < 80, // Strong but not overbought +12
    indicators.macd > indicators.macd_signal && indicators.macd > 0, // MACD strongly bullish +15
    indicators.macd_histogram > 0, // MACD accelerating +10
    latest.close > indicators.bb_middle, // Above BB middle +8
    indicators.adx > 30, // Very strong trend +12
    indicators.williams_r > -80 && indicators.williams_r < -20, // Healthy momentum +10
    volumeConfirmation.trend === 'bullish', // Volume supporting trend +15
    trendStrength > 0.7, // Very strong macro uptrend +18
    marketRegime === 'bull_market', // Bull market structure +15
    !momentumDivergence.bearish, // No bearish divergence +8
    macroStructure === 'higher_highs_lows', // Strong structure +12
    cycleAnalysis.phase === 'accumulation' || cycleAnalysis.phase === 'markup' // Good cycle phase +10
  ];
  
  const bearishSignals = [
    indicators.sma_50 < indicators.sma_100 && indicators.sma_100 < indicators.sma_200, // Major downtrend +20
    latest.close < indicators.ema_100, // Price below major EMA +12
    indicators.rsi < 45 && indicators.rsi > 20, // Weak but not oversold +12
    indicators.macd < indicators.macd_signal && indicators.macd < 0, // MACD strongly bearish +15
    indicators.macd_histogram < 0, // MACD accelerating down +10
    latest.close < indicators.bb_middle, // Below BB middle +8
    indicators.adx > 30, // Very strong trend +12
    indicators.williams_r < -20 && indicators.williams_r > -80, // Healthy momentum +10
    volumeConfirmation.trend === 'bearish', // Volume supporting trend +15
    trendStrength < -0.7, // Very strong macro downtrend +18
    marketRegime === 'bear_market', // Bear market structure +15
    !momentumDivergence.bullish, // No bullish divergence +8
    macroStructure === 'lower_highs_lows', // Weak structure +12
    cycleAnalysis.phase === 'distribution' || cycleAnalysis.phase === 'markdown' // Bad cycle phase +10
  ];
  
  const weights = [20, 12, 12, 15, 10, 8, 12, 10, 15, 18, 15, 8, 12, 10];
  
  const bullishScore = bullishSignals.reduce((sum, signal, index) => {
    return sum + (signal ? weights[index] : 0);
  }, 0);
  
  const bearishScore = bearishSignals.reduce((sum, signal, index) => {
    return sum + (signal ? weights[index] : 0);
  }, 0);
  
  let takeProfit = null;
  let stopLoss = null;
  let riskRewardRatio = 0;
  
  if (bullishScore >= 100) {
    direction = 'LONG';
    score = Math.min(50 + bullishScore * 0.8, 99);
    confidence = Math.min(bullishScore / 160, 0.95);
    takeProfit = latest.close * 1.04; // 4% target
    stopLoss = latest.close * 0.975; // 2.5% stop
    riskRewardRatio = 1.6; // 1.6:1 ratio
  } else if (bearishScore >= 100) {
    direction = 'SHORT';
    score = Math.min(50 + bearishScore * 0.8, 99);
    confidence = Math.min(bearishScore / 160, 0.95);
    takeProfit = latest.close * 0.96; // 4% target
    stopLoss = latest.close * 1.025; // 2.5% stop
    riskRewardRatio = 1.6; // 1.6:1 ratio
  }
  
  // Only return institutional-grade macro signals
  if (score >= 80 && confidence >= 0.7) {
    return {
      direction,
      score,
      confidence,
      trendStrength,
      marketRegime,
      momentumDivergence,
      volumeConfirmation,
      macroStructure,
      cycleAnalysis,
      takeProfit,
      stopLoss,
      riskRewardRatio
    };
  }
  
  return null;
}

function calculateMacroTrendStrength(data: MarketData[], indicators: TechnicalIndicators): number {
  if (data.length < 100) return 0;
  
  const recent = data.slice(-100);
  const closes = recent.map(d => d.close);
  
  // Long-term moving average alignment
  const maAlignment = (indicators.sma_50 > indicators.sma_100 ? 1 : -1) +
                     (indicators.sma_100 > indicators.sma_200 ? 1 : -1);
  
  // Price position relative to long-term MAs
  const currentPrice = closes[closes.length - 1];
  const pricePosition = (currentPrice > indicators.sma_50 ? 1 : -1) +
                       (currentPrice > indicators.sma_100 ? 1 : -1) +
                       (currentPrice > indicators.sma_200 ? 1 : -1);
  
  // Long-term trend consistency (50 periods)
  let consistencyScore = 0;
  for (let i = recent.length - 50; i < recent.length; i++) {
    if (i > 0) {
      const change = closes[i] - closes[i - 1];
      consistencyScore += change > 0 ? 1 : -1;
    }
  }
  
  // Volume trend confirmation
  const volumeTrend = calculateVolumeTrend(recent);
  
  const totalScore = maAlignment + pricePosition + (consistencyScore / 50) + volumeTrend;
  return totalScore / 8; // Normalize to -1 to 1
}

function identifyMarketRegime(indicators: TechnicalIndicators, history: MarketData[]): string {
  const trend = indicators.sma_50 > indicators.sma_100 && indicators.sma_100 > indicators.sma_200;
  const strongTrend = indicators.adx > 25;
  const momentum = indicators.rsi;
  
  if (trend && strongTrend && momentum > 50) return 'bull_market';
  if (!trend && strongTrend && momentum < 50) return 'bear_market';
  if (!strongTrend) return 'sideways_market';
  return 'transitional';
}

function detectMomentumDivergence(indicators: TechnicalIndicators, history: MarketData[]) {
  // Simplified divergence detection
  if (history.length < 20) return { bullish: false, bearish: false };
  
  const recent = history.slice(-20);
  const prices = recent.map(d => d.close);
  const rsiValues = prices.map(() => indicators.rsi); // Simplified
  
  const priceDirection = prices[prices.length - 1] > prices[0];
  const rsiDirection = rsiValues[rsiValues.length - 1] > rsiValues[0];
  
  return {
    bullish: !priceDirection && rsiDirection, // Price down, RSI up
    bearish: priceDirection && !rsiDirection  // Price up, RSI down
  };
}

function analyzeVolumeConfirmation(indicators: TechnicalIndicators, history: MarketData[]) {
  if (history.length < 10) return { trend: 'neutral', strength: 0 };
  
  const recent = history.slice(-10);
  const avgVolume = recent.reduce((sum, d) => sum + d.volume, 0) / 10;
  const currentVolume = recent[recent.length - 1].volume;
  
  const volumeRatio = currentVolume / indicators.volume_ma;
  const priceChange = recent[recent.length - 1].close - recent[0].close;
  
  let trend = 'neutral';
  if (volumeRatio > 1.2 && priceChange > 0) trend = 'bullish';
  if (volumeRatio > 1.2 && priceChange < 0) trend = 'bearish';
  
  return { trend, strength: volumeRatio };
}

function analyzeMacroStructure(data: MarketData[]): string {
  if (data.length < 50) return 'insufficient_data';
  
  const recent = data.slice(-50);
  const highs = recent.map(d => d.high);
  const lows = recent.map(d => d.low);
  
  // Analyze swing highs and lows
  const recentHighs = highs.slice(-10);
  const recentLows = lows.slice(-10);
  
  const maxHigh = Math.max(...recentHighs);
  const minLow = Math.min(...recentLows);
  const prevMaxHigh = Math.max(...highs.slice(-20, -10));
  const prevMinLow = Math.min(...lows.slice(-20, -10));
  
  if (maxHigh > prevMaxHigh && minLow > prevMinLow) return 'higher_highs_lows';
  if (maxHigh < prevMaxHigh && minLow < prevMinLow) return 'lower_highs_lows';
  return 'sideways_structure';
}

function performCycleAnalysis(data: MarketData[]) {
  if (data.length < 100) return { phase: 'unknown', strength: 0 };
  
  const recent = data.slice(-100);
  const closes = recent.map(d => d.close);
  const volumes = recent.map(d => d.volume);
  
  const priceVolatility = calculateVolatility(closes);
  const volumeTrend = calculateVolumeTrend(recent);
  const pricePerformance = (closes[closes.length - 1] - closes[0]) / closes[0];
  
  let phase = 'unknown';
  if (pricePerformance > 0.1 && volumeTrend > 0) phase = 'markup';
  else if (pricePerformance < -0.1 && volumeTrend > 0) phase = 'markdown';
  else if (priceVolatility < 0.02 && volumeTrend < 0) phase = 'accumulation';
  else if (priceVolatility > 0.05 && volumeTrend > 0) phase = 'distribution';
  
  return { phase, strength: Math.abs(pricePerformance) };
}

function calculateVolumeTrend(data: MarketData[]): number {
  if (data.length < 20) return 0;
  
  const volumes = data.map(d => d.volume);
  const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
  const secondHalf = volumes.slice(Math.floor(volumes.length / 2));
  
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  return (avgSecond - avgFirst) / avgFirst;
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  const returns = prices.slice(1).map((price, i) => 
    Math.log(price / prices[i])
  );
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => 
    sum + Math.pow(ret - avgReturn, 2), 0
  ) / returns.length;
  
  return Math.sqrt(variance);
}

function calculateOBV(closes: number[], volumes: number[]): number {
  if (closes.length < 2) return 0;
  
  let obv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
  }
  
  return obv;
}

function calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period) return -50;
  
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const currentClose = closes[closes.length - 1];
  
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  
  return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
}

// Technical indicator calculations
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

function calculateADX(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 20;
  
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
  return dx || 20;
}