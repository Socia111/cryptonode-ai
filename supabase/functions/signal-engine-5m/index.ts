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
  sma_5: number;
  sma_20: number;
  ema_9: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  bb_upper: number;
  bb_lower: number;
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

    console.log('🚀 5m Signal Engine started');

    // Get major trading pairs
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 
      'SOLUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT'
    ];

    const signals = [];

    for (const symbol of symbols) {
      try {
        // Fetch 5m OHLCV data from Bybit
        const klineUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=5&limit=50`;
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

        // Calculate technical indicators optimized for 5m timeframe
        const indicators = calculateIndicators5m(marketData);
        const latest = marketData[marketData.length - 1];

        // 5m scalping signals - focus on quick momentum
        const signal = analyzeScalpingSignal(latest, indicators, marketData);

        if (signal) {
          signals.push({
            id: crypto.randomUUID(),
            symbol,
            timeframe: '5m',
            direction: signal.direction,
            side: signal.direction.toLowerCase(),
            price: latest.close,
            entry_price: latest.close,
            score: signal.score,
            confidence: signal.confidence,
            source: 'signal_engine_5m',
            algo: 'scalping_momentum',
            bar_time: new Date(latest.timestamp),
            created_at: new Date(),
            expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry for scalping
            is_active: true,
            metadata: {
              indicators,
              signal_type: 'scalping',
              timeframe_optimized: '5m',
              quick_entry: true,
              momentum_based: true
            },
            diagnostics: {
              volume_spike: signal.volumeSpike,
              momentum_strength: signal.momentum,
              rsi_level: indicators.rsi,
              price_action: signal.priceAction
            }
          });
        }

        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
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

      console.log(`✅ Generated ${signals.length} 5m signals`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timeframe: '5m',
        signals_generated: signals.length,
        symbols_processed: symbols.length,
        timestamp: new Date().toISOString(),
        engine_type: 'scalping_momentum'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ 5m Signal Engine error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timeframe: '5m',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function calculateIndicators5m(data: MarketData[]): TechnicalIndicators {
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume);
  
  return {
    sma_5: calculateSMA(closes, 5),
    sma_20: calculateSMA(closes, 20),
    ema_9: calculateEMA(closes, 9),
    rsi: calculateRSI(closes, 14),
    macd: calculateMACD(closes).macd,
    macd_signal: calculateMACD(closes).signal,
    bb_upper: calculateBollingerBands(closes, 20).upper,
    bb_lower: calculateBollingerBands(closes, 20).lower,
    volume_ma: calculateSMA(volumes, 10)
  };
}

function analyzeScalpingSignal(latest: MarketData, indicators: TechnicalIndicators, history: MarketData[]) {
  let score = 50;
  let confidence = 0.5;
  let direction = '';
  
  const volumeSpike = latest.volume > indicators.volume_ma * 1.5;
  const momentum = calculateMomentum(history);
  const priceAction = analyzePriceAction5m(history);
  
  // 5m scalping criteria - quick momentum reversals
  const bullishSignals = [
    indicators.ema_9 > indicators.sma_20, // +15
    indicators.rsi < 40 && indicators.rsi > 25, // Oversold but not extreme +10
    indicators.macd > indicators.macd_signal, // MACD bullish +10
    latest.close > indicators.bb_lower * 1.002, // Above lower BB +8
    volumeSpike, // Volume confirmation +12
    momentum > 0.5, // Strong upward momentum +15
    priceAction === 'bullish_reversal' // +20
  ];
  
  const bearishSignals = [
    indicators.ema_9 < indicators.sma_20, // +15
    indicators.rsi > 60 && indicators.rsi < 75, // Overbought but not extreme +10
    indicators.macd < indicators.macd_signal, // MACD bearish +10
    latest.close < indicators.bb_upper * 0.998, // Below upper BB +8
    volumeSpike, // Volume confirmation +12
    momentum < -0.5, // Strong downward momentum +15
    priceAction === 'bearish_reversal' // +20
  ];
  
  const bullishScore = bullishSignals.reduce((sum, signal, index) => {
    const weights = [15, 10, 10, 8, 12, 15, 20];
    return sum + (signal ? weights[index] : 0);
  }, 0);
  
  const bearishScore = bearishSignals.reduce((sum, signal, index) => {
    const weights = [15, 10, 10, 8, 12, 15, 20];
    return sum + (signal ? weights[index] : 0);
  }, 0);
  
  if (bullishScore >= 45) {
    direction = 'LONG';
    score = Math.min(50 + bullishScore, 95);
    confidence = bullishScore / 90;
  } else if (bearishScore >= 45) {
    direction = 'SHORT';
    score = Math.min(50 + bearishScore, 95);
    confidence = bearishScore / 90;
  }
  
  // Only return high-confidence scalping signals
  if (score >= 70 && confidence >= 0.6) {
    return {
      direction,
      score,
      confidence,
      volumeSpike,
      momentum,
      priceAction
    };
  }
  
  return null;
}

function calculateMomentum(data: MarketData[]): number {
  if (data.length < 5) return 0;
  
  const recent = data.slice(-5);
  const changes = recent.map((d, i) => {
    if (i === 0) return 0;
    return (d.close - recent[i-1].close) / recent[i-1].close;
  });
  
  return changes.reduce((sum, change) => sum + change, 0) / changes.length;
}

function analyzePriceAction5m(data: MarketData[]): string {
  if (data.length < 3) return 'neutral';
  
  const last3 = data.slice(-3);
  const closes = last3.map(d => d.close);
  const highs = last3.map(d => d.high);
  const lows = last3.map(d => d.low);
  
  // Look for reversal patterns in 5m timeframe
  const isUptrend = closes[2] > closes[1] && closes[1] > closes[0];
  const isDowntrend = closes[2] < closes[1] && closes[1] < closes[0];
  const hasHigherLows = lows[2] > lows[1] && lows[1] > lows[0];
  const hasLowerHighs = highs[2] < highs[1] && highs[1] < highs[0];
  
  if (hasHigherLows && !isDowntrend) return 'bullish_reversal';
  if (hasLowerHighs && !isUptrend) return 'bearish_reversal';
  if (isUptrend) return 'bullish';
  if (isDowntrend) return 'bearish';
  
  return 'neutral';
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

function calculateBollingerBands(data: number[], period: number) {
  const sma = calculateSMA(data, period);
  const squaredDiffs = data.slice(-period).map(price => Math.pow(price - sma, 2));
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
  
  return {
    upper: sma + (stdDev * 2),
    lower: sma - (stdDev * 2),
    middle: sma
  };
}