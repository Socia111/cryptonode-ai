import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ScanRequest {
  exchange?: string;
  timeframe?: string;
  symbols?: string[];
  relaxed_filters?: boolean;
  min_score?: number;
  scan_all_coins?: boolean;
}

interface Signal {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  timeframe: string;
  entry_price: number;
  stop_loss?: number;
  take_profit?: number;
  score: number;
  confidence: number;
  source: string;
  algo: string;
  bar_time: string;
  meta: any;
}

// Technical indicators calculation functions
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  
  const k = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * k) + (ema * (1 - k));
  }
  
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period + 1) return 0;
  
  const trueRanges = [];
  for (let i = 1; i < highs.length; i++) {
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return calculateSMA(trueRanges, period);
}

// UNIRELI CORE Algorithm - Sept 14th Version
function analyzeWithUnireliCore(marketData: any): Signal | null {
  const { symbol, prices, volumes, highs, lows, closes, timeframe } = marketData;
  
  if (!prices || prices.length < 50) return null;
  
  const currentPrice = prices[prices.length - 1];
  const ema21 = calculateEMA(prices, 21);
  const ema50 = calculateEMA(prices, 50);
  const sma200 = calculateSMA(prices, 200);
  const rsi = calculateRSI(prices);
  const atr = calculateATR(highs, lows, closes);
  
  // Volume analysis
  const avgVolume = calculateSMA(volumes.slice(-20), 20);
  const currentVolume = volumes[volumes.length - 1];
  const volumeRatio = currentVolume / avgVolume;
  
  // Trend detection
  const trendUp = ema21 > ema50 && ema50 > sma200;
  const trendDown = ema21 < ema50 && ema50 < sma200;
  
  // Momentum checks
  const bullishMomentum = rsi > 45 && rsi < 75 && currentPrice > ema21;
  const bearishMomentum = rsi < 55 && rsi > 25 && currentPrice < ema21;
  
  // Signal strength calculation
  let score = 50;
  let confidence = 0.5;
  let direction: 'LONG' | 'SHORT' | null = null;
  
  // LONG signal conditions
  if (trendUp && bullishMomentum && volumeRatio > 1.2) {
    direction = 'LONG';
    score += 20; // Trend alignment
    score += Math.min(15, (rsi - 50) * 0.5); // RSI momentum
    score += Math.min(10, (volumeRatio - 1) * 10); // Volume boost
    confidence = Math.min(0.95, 0.6 + (score - 70) * 0.01);
  }
  
  // SHORT signal conditions
  if (trendDown && bearishMomentum && volumeRatio > 1.2) {
    direction = 'SHORT';
    score += 20; // Trend alignment
    score += Math.min(15, (50 - rsi) * 0.5); // RSI momentum
    score += Math.min(10, (volumeRatio - 1) * 10); // Volume boost
    confidence = Math.min(0.95, 0.6 + (score - 70) * 0.01);
  }
  
  // Enhanced scoring for strong patterns
  if (direction) {
    // Price action confirmation
    const priceNearEMA = Math.abs(currentPrice - ema21) / currentPrice < 0.02;
    if (priceNearEMA) score += 5;
    
    // ATR-based volatility boost
    const atrPercent = (atr / currentPrice) * 100;
    if (atrPercent > 1 && atrPercent < 5) score += 5;
    
    // Time-based scoring (higher scores for longer timeframes)
    const timeframeMultiplier = {
      '1m': 0.8,
      '5m': 1.0,
      '15m': 1.2,
      '1h': 1.5,
      '4h': 1.8
    }[timeframe] || 1.0;
    
    score = Math.round(score * timeframeMultiplier);
    score = Math.min(100, Math.max(0, score));
  }
  
  if (!direction || score < 75) return null;
  
  // Calculate targets
  const stopLossDistance = atr * 2;
  const takeProfitDistance = atr * 3;
  
  const stopLoss = direction === 'LONG' 
    ? currentPrice - stopLossDistance 
    : currentPrice + stopLossDistance;
    
  const takeProfit = direction === 'LONG' 
    ? currentPrice + takeProfitDistance 
    : currentPrice - takeProfitDistance;
  
  return {
    symbol,
    direction,
    timeframe,
    entry_price: currentPrice,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    score,
    confidence,
    source: 'live_scanner_production',
    algo: 'unirail_core',
    bar_time: new Date().toISOString(),
    meta: {
      ema21,
      ema50,
      sma200,
      rsi,
      atr,
      volumeRatio,
      trendUp,
      trendDown,
      timeframeMultiplier: timeframe
    }
  };
}

async function fetchMarketData(symbol: string, timeframe: string): Promise<any> {
  try {
    // Fetch from Bybit API
    const response = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${timeframe}&limit=200`);
    const data = await response.json();
    
    if (data.retCode !== 0 || !data.result.list) {
      throw new Error(`Failed to fetch data for ${symbol}: ${data.retMsg}`);
    }
    
    const klines = data.result.list.reverse(); // Bybit returns newest first
    
    return {
      symbol,
      timeframe,
      prices: klines.map((k: any) => parseFloat(k[4])), // Close prices
      volumes: klines.map((k: any) => parseFloat(k[5])),
      highs: klines.map((k: any) => parseFloat(k[2])),
      lows: klines.map((k: any) => parseFloat(k[3])),
      closes: klines.map((k: any) => parseFloat(k[4])),
      timestamps: klines.map((k: any) => parseInt(k[0]))
    };
  } catch (error) {
    console.error(`Failed to fetch market data for ${symbol}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const scanRequest: ScanRequest = await req.json();
    
    console.log('🔍 Starting live scanner with params:', scanRequest);
    
    const {
      exchange = 'bybit',
      timeframe = '15m',
      symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT'],
      relaxed_filters = false,
      min_score = 80,
      scan_all_coins = false
    } = scanRequest;

    let symbolsToScan = symbols;
    
    // If scan_all_coins is true, get symbols from markets table
    if (scan_all_coins) {
      const { data: markets } = await supabase
        .from('markets')
        .select('symbol')
        .eq('enabled', true)
        .eq('exchange', exchange)
        .limit(50);
        
      if (markets && markets.length > 0) {
        symbolsToScan = markets.map(m => m.symbol);
      }
    }

    console.log(`📊 Scanning ${symbolsToScan.length} symbols on ${timeframe} timeframe`);

    const signals: Signal[] = [];
    const scanPromises = symbolsToScan.map(async (symbol) => {
      try {
        const marketData = await fetchMarketData(symbol, timeframe);
        if (!marketData) return null;

        const signal = analyzeWithUnireliCore(marketData);
        if (!signal) return null;

        // Apply score filtering
        const scoreThreshold = relaxed_filters ? min_score - 10 : min_score;
        if (signal.score >= scoreThreshold) {
          return signal;
        }
        
        return null;
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error);
        return null;
      }
    });

    const scanResults = await Promise.allSettled(scanPromises);
    
    // Collect successful signals
    scanResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        signals.push(result.value);
      }
    });

    console.log(`✅ Found ${signals.length} signals meeting criteria`);

    // Store signals in database if any found
    if (signals.length > 0) {
      const { error: insertError } = await supabase.functions.invoke('signals-api', {
        body: {
          action: 'insert',
          signals: signals
        }
      });

      if (insertError) {
        console.error('Failed to store signals:', insertError);
      } else {
        console.log(`💾 Stored ${signals.length} signals in database`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      signals_found: signals.length,
      signals: signals,
      scan_params: {
        exchange,
        timeframe,
        symbols_scanned: symbolsToScan.length,
        min_score: min_score,
        relaxed_filters
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in live scanner:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      signals_found: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});