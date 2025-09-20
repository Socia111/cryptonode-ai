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
  sma_10: number;
  sma_20: number;
  sma_50: number;
  ema_21: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  stoch_k: number;
  stoch_d: number;
  atr: number;
  volume_ma: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚀 15m Signal Engine started');

    // Get major trading pairs
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 
      'SOLUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT',
      'ATOMUSDT', 'LTCUSDT', 'UNIUSDT', 'FILUSDT', 'APTUSDT'
    ];

    const signals = [];

    for (const symbol of symbols) {
      try {
        // Fetch 15m OHLCV data from Bybit
        const klineUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=15&limit=100`;
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

        // Calculate technical indicators optimized for 15m timeframe
        const indicators = calculateIndicators15m(marketData);
        const latest = marketData[marketData.length - 1];

        // 15m swing trading signals - balanced approach
        const signal = analyzeSwingSignal(latest, indicators, marketData);

        if (signal) {
          signals.push({
            id: crypto.randomUUID(),
            symbol,
            timeframe: '15m',
            direction: signal.direction,
            side: signal.direction.toLowerCase(),
            price: latest.close,
            entry_price: latest.close,
            score: signal.score,
            confidence: signal.confidence,
            source: 'signal_engine_15m',
            algo: 'swing_momentum',
            bar_time: new Date(latest.timestamp),
            created_at: new Date(),
            expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
            is_active: true,
            take_profit: signal.takeProfit,
            stop_loss: signal.stopLoss,
            metadata: {
              indicators,
              signal_type: 'swing_trading',
              timeframe_optimized: '15m',
              trend_following: true,
              multi_indicator: true
            },
            diagnostics: {
              trend_strength: signal.trendStrength,
              volatility: indicators.atr,
              volume_profile: signal.volumeProfile,
              support_resistance: signal.supportResistance
            }
          });
        }

        await new Promise(resolve => setTimeout(resolve, 150)); // Rate limiting
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

      console.log(`✅ Generated ${signals.length} 15m signals`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timeframe: '15m',
        signals_generated: signals.length,
        symbols_processed: symbols.length,
        timestamp: new Date().toISOString(),
        engine_type: 'swing_momentum'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ 15m Signal Engine error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timeframe: '15m',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function calculateIndicators15m(data: MarketData[]): TechnicalIndicators {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume);
  
  return {
    sma_10: calculateSMA(closes, 10),
    sma_20: calculateSMA(closes, 20),
    sma_50: calculateSMA(closes, 50),
    ema_21: calculateEMA(closes, 21),
    rsi: calculateRSI(closes, 14),
    macd: calculateMACD(closes).macd,
    macd_signal: calculateMACD(closes).signal,
    stoch_k: calculateStochastic(highs, lows, closes, 14).k,
    stoch_d: calculateStochastic(highs, lows, closes, 14).d,
    atr: calculateATR(highs, lows, closes, 14),
    volume_ma: calculateSMA(volumes, 20)
  };
}

function analyzeSwingSignal(latest: MarketData, indicators: TechnicalIndicators, history: MarketData[]) {
  let score = 50;
  let confidence = 0.5;
  let direction = '';
  
  const trendStrength = calculateTrendStrength(history);
  const volumeProfile = latest.volume / indicators.volume_ma;
  const supportResistance = findSupportResistance(history);
  
  // 15m swing trading criteria - trend following with confirmation
  const bullishSignals = [
    indicators.sma_20 > indicators.sma_50, // Uptrend +12
    latest.close > indicators.ema_21, // Price above EMA +10
    indicators.rsi > 45 && indicators.rsi < 70, // Healthy momentum +8
    indicators.macd > indicators.macd_signal, // MACD bullish +10
    indicators.stoch_k > indicators.stoch_d, // Stochastic bullish +8
    volumeProfile > 1.2, // Volume confirmation +10
    trendStrength > 0.3, // Strong uptrend +15
    latest.close > supportResistance.resistance * 0.999, // Breaking resistance +12
    indicators.atr > calculateSMA(history.slice(-20).map(d => d.high - d.low), 20) // Increasing volatility +5
  ];
  
  const bearishSignals = [
    indicators.sma_20 < indicators.sma_50, // Downtrend +12
    latest.close < indicators.ema_21, // Price below EMA +10
    indicators.rsi < 55 && indicators.rsi > 30, // Healthy momentum +8
    indicators.macd < indicators.macd_signal, // MACD bearish +10
    indicators.stoch_k < indicators.stoch_d, // Stochastic bearish +8
    volumeProfile > 1.2, // Volume confirmation +10
    trendStrength < -0.3, // Strong downtrend +15
    latest.close < supportResistance.support * 1.001, // Breaking support +12
    indicators.atr > calculateSMA(history.slice(-20).map(d => d.high - d.low), 20) // Increasing volatility +5
  ];
  
  const weights = [12, 10, 8, 10, 8, 10, 15, 12, 5];
  
  const bullishScore = bullishSignals.reduce((sum, signal, index) => {
    return sum + (signal ? weights[index] : 0);
  }, 0);
  
  const bearishScore = bearishSignals.reduce((sum, signal, index) => {
    return sum + (signal ? weights[index] : 0);
  }, 0);
  
  let takeProfit = null;
  let stopLoss = null;
  
  if (bullishScore >= 50) {
    direction = 'LONG';
    score = Math.min(50 + bullishScore, 95);
    confidence = bullishScore / 90;
    takeProfit = latest.close * 1.015; // 1.5% target
    stopLoss = latest.close * 0.992; // 0.8% stop
  } else if (bearishScore >= 50) {
    direction = 'SHORT';
    score = Math.min(50 + bearishScore, 95);
    confidence = bearishScore / 90;
    takeProfit = latest.close * 0.985; // 1.5% target
    stopLoss = latest.close * 1.008; // 0.8% stop
  }
  
  // Only return quality swing signals
  if (score >= 65 && confidence >= 0.55) {
    return {
      direction,
      score,
      confidence,
      trendStrength,
      volumeProfile,
      supportResistance,
      takeProfit,
      stopLoss
    };
  }
  
  return null;
}

function calculateTrendStrength(data: MarketData[]): number {
  if (data.length < 20) return 0;
  
  const recent = data.slice(-20);
  const closes = recent.map(d => d.close);
  const sma20 = calculateSMA(closes, 20);
  
  // Calculate how consistently price is above/below SMA
  let trendScore = 0;
  for (let i = recent.length - 10; i < recent.length; i++) {
    if (closes[i] > sma20) trendScore += 1;
    else trendScore -= 1;
  }
  
  return trendScore / 10; // Normalize to -1 to 1
}

function findSupportResistance(data: MarketData[]) {
  if (data.length < 20) {
    const latest = data[data.length - 1];
    return { support: latest.low, resistance: latest.high };
  }
  
  const recent = data.slice(-20);
  const lows = recent.map(d => d.low);
  const highs = recent.map(d => d.high);
  
  // Find recent support and resistance levels
  const support = Math.min(...lows.slice(-10));
  const resistance = Math.max(...highs.slice(-10));
  
  return { support, resistance };
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], period: number) {
  if (highs.length < period) {
    return { k: 50, d: 50 };
  }
  
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  const currentClose = closes[closes.length - 1];
  
  const highestHigh = Math.max(...recentHighs);
  const lowestLow = Math.min(...recentLows);
  
  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  
  // Simplified D calculation (should use SMA of K values)
  const d = k * 0.9; // Approximation
  
  return { k, d };
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
  
  // For signal line, we'd need historical MACD values
  // Simplified version
  const signal = macd * 0.9; // Approximation
  
  return { macd, signal };
}