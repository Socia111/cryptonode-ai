import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

// CCXT-like helper functions for fetching market data
interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  ema21: number;
  sma200: number;
  adx: number;
  di_plus: number;
  di_minus: number;
  stoch_k: number;
  stoch_d: number;
  rsi: number;
  hvp: number;
  vol_spike: boolean;
  spread_pct: number;
}

interface ScanSignal {
  symbol: string;
  exchange: string;
  timeframe: string;
  direction: 'LONG' | 'SHORT';
  confidence_score: number;
  price: number;
  indicators: TechnicalIndicators;
  generated_at: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const DEFAULT_EXCHANGE = 'bybit';
const DEFAULT_TIMEFRAME = '1h';
const MAX_SYMBOLS = 60;
const HVP_LOWER = 55;
const HVP_UPPER = 85;
const ADX_MIN = 28;
const VOL_SPIKE_MULT = 1.7;

function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return NaN;
  const slice = values.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

function calculateEMA(values: number[], period: number): number {
  if (values.length < period) return NaN;
  const multiplier = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = (values[i] * multiplier) + (ema * (1 - multiplier));
  }
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return NaN;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number = 14): { k: number; d: number } {
  if (highs.length < kPeriod) return { k: NaN, d: NaN };
  
  const highestHigh = Math.max(...highs.slice(-kPeriod));
  const lowestLow = Math.min(...lows.slice(-kPeriod));
  const currentClose = closes[closes.length - 1];
  
  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  const d = k; // Simplified - would need more data points for proper %D
  
  return { k, d };
}

function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): { adx: number; diPlus: number; diMinus: number } {
  if (highs.length < period + 1) return { adx: NaN, diPlus: NaN, diMinus: NaN };
  
  // Simplified ADX calculation
  let trSum = 0;
  let dmPlusSum = 0;
  let dmMinusSum = 0;
  
  for (let i = 1; i < Math.min(period + 1, highs.length); i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    
    const dmPlus = highs[i] - highs[i - 1] > lows[i - 1] - lows[i] ? Math.max(highs[i] - highs[i - 1], 0) : 0;
    const dmMinus = lows[i - 1] - lows[i] > highs[i] - highs[i - 1] ? Math.max(lows[i - 1] - lows[i], 0) : 0;
    
    trSum += tr;
    dmPlusSum += dmPlus;
    dmMinusSum += dmMinus;
  }
  
  const diPlus = (dmPlusSum / trSum) * 100;
  const diMinus = (dmMinusSum / trSum) * 100;
  const adx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
  
  return { adx, diPlus, diMinus };
}

async function fetchMarketData(symbol: string): Promise<OHLCVData[]> {
  // Mock data for demonstration - in real implementation, would fetch from exchange APIs
  // This simulates OHLCV data for the last 300 bars
  const mockData: OHLCVData[] = [];
  const basePrice = 50000 + Math.random() * 20000;
  
  for (let i = 299; i >= 0; i--) {
    const timestamp = Date.now() - (i * 3600000); // 1 hour intervals
    const volatility = 0.02;
    const change = (Math.random() - 0.5) * volatility * 2;
    
    const price = basePrice * (1 + change);
    mockData.push({
      timestamp,
      open: price,
      high: price * (1 + Math.random() * 0.02),
      low: price * (1 - Math.random() * 0.02),
      close: price * (1 + (Math.random() - 0.5) * 0.01),
      volume: 1000000 + Math.random() * 5000000
    });
  }
  
  return mockData;
}

function computeIndicators(ohlcv: OHLCVData[]): TechnicalIndicators | null {
  if (ohlcv.length < 210) return null;
  
  const closes = ohlcv.map(d => d.close);
  const highs = ohlcv.map(d => d.high);
  const lows = ohlcv.map(d => d.low);
  const volumes = ohlcv.map(d => d.volume);
  const opens = ohlcv.map(d => d.open);
  
  const ema21 = calculateEMA(closes, 21);
  const sma200 = calculateSMA(closes, 200);
  const rsi = calculateRSI(closes);
  const stoch = calculateStochastic(highs, lows, closes);
  const adxData = calculateADX(highs, lows, closes);
  
  // Volume spike calculation
  const volSma21 = calculateSMA(volumes, 21);
  const currentVolume = volumes[volumes.length - 1];
  const volSpike = currentVolume > VOL_SPIKE_MULT * volSma21;
  
  // HVP-lite calculation (simplified volatility percentile)
  const returns = closes.slice(1).map((price, i) => (price - closes[i]) / closes[i]);
  const recentReturns = returns.slice(-21);
  const volatility = Math.sqrt(recentReturns.reduce((sum, r) => sum + r * r, 0) / recentReturns.length) * Math.sqrt(252);
  const maxVol = Math.max(...returns.slice(-252).map(r => Math.abs(r))) * Math.sqrt(252);
  const hvp = Math.min(100, (volatility / maxVol) * 100);
  
  // Spread calculation
  const lastBar = ohlcv[ohlcv.length - 1];
  const spreadPct = Math.abs(lastBar.close - lastBar.open) / lastBar.open * 100;
  
  return {
    ema21,
    sma200,
    adx: adxData.adx,
    di_plus: adxData.diPlus,
    di_minus: adxData.diMinus,
    stoch_k: stoch.k,
    stoch_d: stoch.d,
    rsi,
    hvp,
    vol_spike: volSpike,
    spread_pct: spreadPct
  };
}

function evaluateAITradeX1Rules(ohlcv: OHLCVData[], indicators: TechnicalIndicators): { long: boolean; short: boolean; score: number } {
  if (!indicators) return { long: false, short: false, score: 0 };
  
  const lastPrices = ohlcv.slice(-10).map(d => d.close);
  const recentHighs = ohlcv.slice(-5).map(d => d.high);
  const recentLows = ohlcv.slice(-5).map(d => d.low);
  const currentPrice = lastPrices[lastPrices.length - 1];
  
  // Trend conditions
  const bullTrend = indicators.ema21 > indicators.sma200;
  const bearTrend = indicators.ema21 < indicators.sma200;
  
  // HVP window
  const hvpOk = indicators.hvp >= HVP_LOWER && indicators.hvp <= HVP_UPPER;
  
  // ADX/DMI conditions
  const adxOk = indicators.adx >= ADX_MIN;
  const bullDmi = indicators.di_plus > indicators.di_minus;
  const bearDmi = indicators.di_minus > indicators.di_plus;
  
  // Stochastic conditions
  const stochBull = indicators.stoch_k > indicators.stoch_d && indicators.stoch_k < 35;
  const stochBear = indicators.stoch_k < indicators.stoch_d && indicators.stoch_k > 65;
  
  // Volume and spread conditions
  const volSpike = indicators.vol_spike;
  const lowSpread = indicators.spread_pct < 0.1;
  
  // Breakout conditions
  const breakoutLong = currentPrice > Math.max(...recentHighs.slice(0, -1));
  const breakoutShort = currentPrice < Math.min(...recentLows.slice(0, -1));
  
  // Combine conditions
  const longSignal = bullTrend && adxOk && bullDmi && stochBull && volSpike && hvpOk && breakoutLong && lowSpread;
  const shortSignal = bearTrend && adxOk && bearDmi && stochBear && volSpike && hvpOk && breakoutShort && lowSpread;
  
  // Calculate confidence score
  const conditions = [bullTrend || bearTrend, adxOk, bullDmi || bearDmi, stochBull || stochBear, volSpike, hvpOk, lowSpread];
  const score = conditions.filter(Boolean).length * 12.5;
  
  return {
    long: longSignal,
    short: shortSignal,
    score: Math.min(100, score)
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Mock symbols for demonstration
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT', 
      'LINKUSDT', 'UNIUSDT', 'LTCUSDT', 'BCHUSDT', 'XLMUSDT',
      'VETUSDT', 'EOSUSDT', 'TRXUSDT', 'ETCUSDT', 'DASHUSDT'
    ];

    const signals: ScanSignal[] = [];

    // Process each symbol
    for (const symbol of symbols.slice(0, 15)) {
      try {
        const ohlcv = await fetchMarketData(symbol);
        const indicators = computeIndicators(ohlcv);
        
        if (!indicators) continue;
        
        const evaluation = evaluateAITradeX1Rules(ohlcv, indicators);
        
        if (evaluation.long || evaluation.short) {
          const lastPrice = ohlcv[ohlcv.length - 1].close;
          
          signals.push({
            symbol,
            exchange: DEFAULT_EXCHANGE,
            timeframe: DEFAULT_TIMEFRAME,
            direction: evaluation.long ? 'LONG' : 'SHORT',
            confidence_score: evaluation.score,
            price: lastPrice,
            indicators,
            generated_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
      }
    }

    // Sort by confidence score
    signals.sort((a, b) => b.confidence_score - a.confidence_score);

    // Store signals in database
    if (signals.length > 0) {
      // First, mark old signals as inactive
      await supabase
        .from('scanner_signals')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new signals
      const { error: insertError } = await supabase
        .from('scanner_signals')
        .insert(
          signals.map(signal => ({
            symbol: signal.symbol,
            exchange: signal.exchange,
            timeframe: signal.timeframe,
            direction: signal.direction,
            confidence_score: signal.confidence_score,
            price: signal.price,
            indicators: signal.indicators,
            is_active: true,
            generated_at: signal.generated_at,
            expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // Expires in 4 hours
          }))
        );

      if (insertError) {
        console.error('Error inserting signals:', insertError);
      } else {
        // Send high-confidence signals to Telegram
        for (const signal of signals) {
          if (signal.confidence_score >= 75) {
            try {
              const telegramSignal = {
                signal_id: `${signal.exchange}_${signal.symbol}_${Date.now()}`,
                token: signal.symbol.replace('USDT', '').replace('USD', ''),
                direction: signal.direction === 'LONG' ? 'BUY' : 'SELL',
                signal_type: `AITRADEX1_${signal.direction}`,
                entry_price: signal.price,
                exit_target: signal.direction === 'LONG' 
                  ? signal.price * 1.025 
                  : signal.price * 0.975,
                stop_loss: signal.direction === 'LONG'
                  ? signal.price * 0.98
                  : signal.price * 1.02,
                leverage: signal.confidence_score >= 85 ? 3 : 2,
                confidence_score: signal.confidence_score,
                roi_projection: 2.5,
                quantum_probability: signal.confidence_score / 100,
                risk_level: signal.confidence_score >= 85 ? 'LOW' : 'MEDIUM',
                signal_strength: signal.confidence_score >= 85 ? 'VERY_STRONG' : 'STRONG',
                trend_projection: signal.direction === 'LONG' ? 'BULLISH_MOMENTUM' : 'BEARISH_MOMENTUM',
                is_premium: signal.confidence_score >= 85
              };

              // Send to Telegram bot
              const { error: telegramError } = await supabase.functions.invoke('telegram-bot', {
                body: { signal: telegramSignal }
              });

              if (telegramError) {
                console.error('Error sending to Telegram:', telegramError);
              } else {
                console.log(`Sent ${signal.confidence_score}% confidence signal for ${signal.symbol} to Telegram`);
                
                // Mark signal as sent to Telegram
                await supabase
                  .from('scanner_signals')
                  .update({ telegram_sent: true })
                  .eq('symbol', signal.symbol)
                  .eq('exchange', signal.exchange)
                  .eq('generated_at', signal.generated_at);
              }
            } catch (error) {
              console.error('Error processing Telegram signal:', error);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signals_count: signals.length,
        updated_at: new Date().toISOString(),
        exchange: DEFAULT_EXCHANGE,
        timeframe: DEFAULT_TIMEFRAME,
        signals: signals.slice(0, 10) // Return top 10 signals
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Scanner engine error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});