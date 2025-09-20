import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to get symbols dynamically from whitelist settings
async function getSymbolsForScanning(supabase: any): Promise<string[]> {
  try {
    const { data: symbols } = await supabase.rpc('get_symbols_for_scanning');
    if (symbols && symbols.length > 0) {
      console.log(`🎯 Using whitelist: ${symbols.length} symbols`);
      return symbols;
    }
  } catch (error) {
    console.log('⚠️ Whitelist unavailable, using defaults');
  }
  
  // Fallback to major pairs
  return [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 
    'DOGEUSDT', 'SOLUSDT', 'DOTUSDT', 'MATICUSDT', 'AVAXUSDT',
    'LTCUSDT', 'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'FILUSDT'
  ];
}

const TIMEFRAMES = ['5m', '15m', '30m', '1h', '4h'];

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
  ohlcv?: OHLCData[];
}

interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Technical Analysis Functions
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return NaN;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return NaN;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  let avgGain = 0;
  let avgLoss = 0;
  
  // Calculate initial averages
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;
  
  // Calculate smoothed averages
  for (let i = period; i < changes.length; i++) {
    if (changes[i] > 0) {
      avgGain = (avgGain * (period - 1) + changes[i]) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(changes[i])) / period;
    }
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]): { macd: number, signal: number, histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  
  // Simplified signal line (in real implementation, should be EMA of MACD)
  const signal = macd * 0.8;
  
  return {
    macd,
    signal,
    histogram: macd - signal
  };
}

async function fetchRealMarketData(symbol: string): Promise<MarketData | null> {
  try {
    console.log(`📊 Fetching real market data for ${symbol}...`);
    
    // Fetch ticker data
    const tickerResponse = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`);
    const tickerData = await tickerResponse.json();
    
    // Fetch OHLCV data for technical analysis
    const klineResponse = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=1&limit=100`);
    const klineData = await klineResponse.json();
    
    if (tickerData.result?.list?.[0] && klineData.result?.list) {
      const ticker = tickerData.result.list[0];
      const klines = klineData.result.list.reverse(); // Bybit returns newest first
      
      const ohlcv: OHLCData[] = klines.map((k: any) => ({
        timestamp: parseInt(k[0]),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));
      
      return {
        symbol: ticker.symbol,
        price: parseFloat(ticker.lastPrice),
        change24h: parseFloat(ticker.price24hPcnt) * 100,
        volume24h: parseFloat(ticker.volume24h),
        high24h: parseFloat(ticker.highPrice24h),
        low24h: parseFloat(ticker.lowPrice24h),
        timestamp: Date.now(),
        ohlcv
      };
    }
    return null;
  } catch (error) {
    console.error(`❌ Failed to fetch data for ${symbol}:`, error);
    return null;
  }
}

function generateAdvancedTechnicalSignal(marketData: MarketData, timeframe: string): any {
  const { symbol, price, change24h, volume24h, ohlcv } = marketData;
  
  if (!ohlcv || ohlcv.length < 50) {
    console.log(`⚠️ Insufficient OHLCV data for ${symbol}`);
    return null;
  }
  
  // Extract price data for indicators
  const closes = ohlcv.map(d => d.close);
  const highs = ohlcv.map(d => d.high);
  const lows = ohlcv.map(d => d.low);
  const volumes = ohlcv.map(d => d.volume);
  
  // Calculate real technical indicators
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const macdData = calculateMACD(closes);
  
  // Volume analysis
  const avgVolume = calculateSMA(volumes, 21);
  const volumeRatio = avgVolume > 0 ? volume24h / avgVolume : 1;
  
  // Price action analysis
  const currentClose = closes[closes.length - 1];
  const priceAboveEMA21 = currentClose > ema21;
  const priceAboveEMA50 = currentClose > ema50;
  const priceAboveSMA200 = currentClose > sma200;
  
  // Trend analysis
  const isBullishTrend = ema21 > ema50 && ema50 > sma200;
  const isBearishTrend = ema21 < ema50 && ema50 < sma200;
  
  // Momentum analysis
  const isRSIOversold = rsi < 30;
  const isRSIOverbought = rsi > 70;
  const isRSINeutral = rsi >= 40 && rsi <= 60;
  const isMACDBullish = macdData.macd > macdData.signal && macdData.histogram > 0;
  const isMACDBearish = macdData.macd < macdData.signal && macdData.histogram < 0;
  
  // Volume confirmation
  const isVolumeStrong = volumeRatio > 1.5;
  const isVolumeWeak = volumeRatio < 0.8;
  
  // Calculate signal strength based on confluence
  let bullishScore = 0;
  let bearishScore = 0;
  
  // Trend factors (40% weight)
  if (isBullishTrend) bullishScore += 25;
  if (isBearishTrend) bearishScore += 25;
  if (priceAboveEMA21) bullishScore += 10;
  if (!priceAboveEMA21) bearishScore += 10;
  if (priceAboveSMA200) bullishScore += 5;
  if (!priceAboveSMA200) bearishScore += 5;
  
  // Momentum factors (30% weight)
  if (isRSIOversold) bullishScore += 15;
  if (isRSIOverbought) bearishScore += 15;
  if (isMACDBullish) bullishScore += 15;
  if (isMACDBearish) bearishScore += 15;
  
  // Volume factors (20% weight)
  if (isVolumeStrong) {
    bullishScore += 10;
    bearishScore += 10; // Volume confirms both directions
  }
  if (isVolumeWeak) {
    bullishScore -= 5;
    bearishScore -= 5;
  }
  
  // Market sentiment (10% weight)
  if (change24h > 2) bullishScore += 10;
  if (change24h < -2) bearishScore += 10;
  
  // Timeframe adjustment
  const timeframeFactor = {
    '5m': 0.8,   // Lower confidence for shorter timeframes
    '15m': 1.0,
    '30m': 1.1,
    '1h': 1.2,
    '4h': 1.3
  }[timeframe] || 1.0;
  
  bullishScore *= timeframeFactor;
  bearishScore *= timeframeFactor;
  
  // Determine final signal
  const maxScore = Math.max(bullishScore, bearishScore);
  
  // Lower threshold for more signals (>= 50%)
  if (maxScore < 50) {
    console.log(`⚠️ ${symbol} signal below threshold: bull=${bullishScore.toFixed(1)}, bear=${bearishScore.toFixed(1)} (required: 50)`);
    return null;
  }
  
  const direction = bullishScore > bearishScore ? 'LONG' : 'SHORT';
  const score = Math.min(95, maxScore);
  
  // Calculate realistic stop loss and take profit based on volatility
  const volatility = Math.abs(change24h) / 100;
  const riskPercent = Math.max(0.02, Math.min(0.05, volatility)); // 2-5% risk
  const rewardRatio = score > 80 ? 2.5 : score > 70 ? 2.0 : 1.5; // Higher reward for higher confidence
  
  const stopLoss = direction === 'LONG' ? 
    price * (1 - riskPercent) : 
    price * (1 + riskPercent);
  
  const takeProfit = direction === 'LONG' ? 
    price * (1 + riskPercent * rewardRatio) : 
    price * (1 - riskPercent * rewardRatio);
  
  const signal = {
    symbol,
    timeframe,
    direction,
    price,
    entry_price: price,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    score: Math.round(score),
    confidence: score / 100,
    source: 'live_signals_generator',
    algo: 'aitradex1_real',
    atr: price * riskPercent, // Approximate ATR
    exchange: 'bybit',
    exchange_source: 'bybit',
    is_active: true,
    risk: 1.0,
    algorithm_version: 'v2.0',
    execution_priority: Math.round(score),
    metadata: {
      grade: score > 85 ? 'A' : score > 75 ? 'B' : 'C',
      data_source: 'live_market',
      verified_real_data: true,
      technical_indicators: {
        rsi: rsi,
        macd: macdData.macd,
        macd_signal: macdData.signal,
        ema21: ema21,
        ema50: ema50,
        sma200: sma200,
        volume_ratio: volumeRatio
      },
      market_conditions: {
        trend: isBullishTrend ? 'bullish' : isBearishTrend ? 'bearish' : 'sideways',
        momentum: isRSIOverbought ? 'overbought' : isRSIOversold ? 'oversold' : 'neutral',
        volume: isVolumeStrong ? 'high' : isVolumeWeak ? 'low' : 'normal',
        volatility: volatility > 0.03 ? 'high' : volatility > 0.015 ? 'medium' : 'low'
      }
    },
    market_conditions: {
      trend: change24h > 0 ? 'bullish' : 'bearish',
      volatility: volatility > 0.03 ? 'high' : volatility > 0.015 ? 'medium' : 'low',
      volume: isVolumeStrong ? 'high' : isVolumeWeak ? 'low' : 'medium'
    },
    indicators: {
      rsi: rsi,
      macd: macdData.macd,
      macd_signal: macdData.signal,
      macd_histogram: macdData.histogram,
      ema21: ema21,
      ema50: ema50,
      sma200: sma200,
      volume_ratio: volumeRatio,
      price_vs_ema21: ((price - ema21) / ema21) * 100,
      price_vs_sma200: sma200 > 0 ? ((price - sma200) / sma200) * 100 : 0
    },
    diagnostics: {
      signal_quality: score > 85 ? 'excellent' : score > 75 ? 'good' : 'acceptable',
      confluence_score: Math.round(score / 10),
      market_phase: isBullishTrend || isBearishTrend ? 'trending' : 'ranging',
      risk_reward_ratio: rewardRatio.toFixed(1),
      execution_window: timeframe,
      data_points: ohlcv.length
    }
  };
  
  console.log(`✅ Generated ${direction} signal for ${symbol}: score=${score.toFixed(1)}%, RSI=${rsi.toFixed(1)}, MACD=${isMACDBullish ? 'Bull' : 'Bear'}`);
  return signal;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 [live-signals-generator] Starting advanced signal generation...');

    // Get dynamic symbol list
    const availableSymbols = await getSymbolsForScanning(supabase);
    const symbolsToProcess = availableSymbols; // Process ALL available symbols
    
    console.log(`🎯 Processing ALL ${symbolsToProcess.length} symbols available`);

    const signals = [];
    
    // Process symbols in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < symbolsToProcess.length; i += batchSize) {
      const batch = symbolsToProcess.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          const marketData = await fetchRealMarketData(symbol);
          if (!marketData) return [];

          // Generate signals for 1-2 timeframes per symbol
          const selectedTimeframes = ['15m', '1h'].slice(0, Math.random() > 0.6 ? 2 : 1);
          const symbolSignals = [];
          
          for (const timeframe of selectedTimeframes) {
            const signal = generateAdvancedTechnicalSignal(marketData, timeframe);
            
            // Only accept high-quality signals (score >= 70)
            if (signal && signal.score >= 70) {
              symbolSignals.push(signal);
            }
          }
          return symbolSignals;
        } catch (error) {
          console.error(`❌ Error processing ${symbol}:`, error);
          return [];
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          signals.push(...result.value);
        }
      });
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < symbolsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (signals.length === 0) {
      console.log('⚠️ No qualifying high-confidence signals generated');
      return new Response(JSON.stringify({
        success: true,
        message: 'No high-confidence signals generated',
        signals_created: 0,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert signals into database
    const { data, error } = await supabase
      .from('signals')
      .insert(signals.map(signal => ({
        ...signal,
        created_at: new Date().toISOString(),
        bar_time: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })));

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    const avgScore = signals.reduce((sum, s) => sum + s.score, 0) / signals.length;
    console.log(`✅ Successfully created ${signals.length} high-quality signals (avg score: ${avgScore.toFixed(1)}%)`);

    return new Response(JSON.stringify({
      success: true,
      signals_created: signals.length,
      symbols_processed: symbolsToProcess.length,
      total_symbols_available: availableSymbols.length,
      average_score: avgScore.toFixed(1),
      signals: signals.map(s => ({
        symbol: s.symbol,
        timeframe: s.timeframe,
        direction: s.direction,
        score: s.score,
        price: s.price,
        rsi: s.indicators.rsi.toFixed(1)
      })),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ [live-signals-generator] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});