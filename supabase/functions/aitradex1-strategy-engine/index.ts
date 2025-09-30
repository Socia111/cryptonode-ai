import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Signal {
  symbol: string
  timeframe: string
  direction: 'LONG' | 'SHORT'
  price: number
  score: number
  confidence: number
  metadata: any
  indicators: any
  source: string
  algo: string
  bar_time: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 AItradeX1 Strategy Engine started')
    
    const { symbols, timeframe = '1h', action = 'generate_signals', force_refresh = false } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Status action for health checks
    if (action === 'status') {
      return new Response(
        JSON.stringify({
          status: 'operational',
          engine: 'aitradex1',
          version: '2.0.0',
          capabilities: ['technical_analysis', 'multi_timeframe', 'risk_scoring'],
          supported_symbols: symbols || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const targetSymbols = symbols || ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT']
    const generatedSignals: Signal[] = []
    let signalsInserted = 0

    console.log(`📊 Processing ${targetSymbols.length} symbols for timeframe ${timeframe}`)

    // Generate signals for each symbol
    for (const symbol of targetSymbols) {
      try {
        // Fetch market data from Bybit
        const marketDataUrl = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${timeframe}&limit=200`
        const marketResponse = await fetch(marketDataUrl)
        
        if (!marketResponse.ok) {
          console.warn(`⚠️ Failed to fetch data for ${symbol}:`, marketResponse.status)
          continue
        }

        const marketData = await marketResponse.json()
        const candles = marketData.result?.list || []
        
        if (candles.length < 50) {
          console.warn(`⚠️ Insufficient data for ${symbol} (${candles.length} candles)`)
          continue
        }

        // Analyze with AItradeX1 algorithm
        const signal = await analyzeWithAItradeX1(symbol, timeframe, candles)
        
        if (signal && signal.score >= 65) {
          generatedSignals.push(signal)
          
          // Insert high-quality signals into database
          const { error: insertError } = await supabaseClient
            .from('signals')
            .insert({
              symbol: signal.symbol,
              timeframe: signal.timeframe,
              direction: signal.direction,
              price: signal.price,
              score: signal.score,
              confidence: signal.confidence,
              metadata: signal.metadata,
              indicators: signal.indicators,
              source: signal.source,
              algo: signal.algo,
              bar_time: signal.bar_time,
              is_active: true,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })

          if (!insertError) {
            signalsInserted++
            console.log(`✅ Generated ${signal.direction} signal for ${symbol} (Score: ${signal.score})`)
          } else {
            console.error(`❌ Failed to insert signal for ${symbol}:`, insertError.message)
          }
        } else {
          console.log(`📉 No signal generated for ${symbol} (Score: ${signal?.score || 0})`)
        }
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error.message)
      }
    }

    // Log generation statistics
    await supabaseClient
      .from('edge_event_log')
      .insert({
        fn: 'aitradex1_strategy_engine',
        stage: 'completed',
        payload: {
          timeframe,
          symbols_processed: targetSymbols.length,
          signals_generated: generatedSignals.length,
          signals_inserted: signalsInserted,
          timestamp: new Date().toISOString()
        }
      })

    console.log(`✅ AItradeX1 Engine completed: ${signalsInserted}/${targetSymbols.length} signals generated`)

    return new Response(
      JSON.stringify({
        success: true,
        signals_generated: generatedSignals.length,
        signals_inserted: signalsInserted,
        symbols_processed: targetSymbols.length,
        timeframe,
        signals: generatedSignals,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ AItradeX1 Strategy Engine error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function analyzeWithAItradeX1(symbol: string, timeframe: string, candles: any[]): Promise<Signal | null> {
  try {
    // Convert candle data (Bybit format: [startTime, open, high, low, close, volume, turnover])
    const closes = candles.map(c => parseFloat(c[4])).reverse()
    const highs = candles.map(c => parseFloat(c[2])).reverse()
    const lows = candles.map(c => parseFloat(c[3])).reverse()
    const volumes = candles.map(c => parseFloat(c[5])).reverse()
    
    if (closes.length < 50) return null

    // Calculate technical indicators
    const ema12 = calculateEMA(closes, 12)
    const ema26 = calculateEMA(closes, 26)
    const ema50 = calculateEMA(closes, 50)
    const ema200 = calculateEMA(closes, 200)
    const rsi = calculateRSI(closes, 14)
    const macd = calculateMACD(closes)
    const bb = calculateBollingerBands(closes, 20, 2)
    const atr = calculateATR(highs, lows, closes, 14)
    const sma20 = calculateSMA(closes, 20)
    const volumeAvg = calculateSMA(volumes, 20)
    const momentum = calculateMomentum(closes, 10)

    const currentPrice = closes[closes.length - 1]
    let score = 0
    let direction: 'LONG' | 'SHORT' = 'LONG'

    // Price action analysis (30 points max)
    if (currentPrice > ema12 && ema12 > ema26 && ema26 > ema50) score += 15
    if (currentPrice > ema200) score += 10
    if (currentPrice > sma20) score += 5

    // RSI analysis (20 points max)
    if (rsi > 30 && rsi < 70) score += 10
    if (rsi > 50) score += 5
    if (rsi > 40 && rsi < 60) score += 5

    // MACD analysis (20 points max)
    if (macd.macd > macd.signal) score += 10
    if (macd.histogram > 0) score += 5
    if (Math.abs(macd.macd) > Math.abs(macd.signal) * 0.5) score += 5

    // Bollinger Bands analysis (15 points max)
    if (currentPrice > bb.middle) score += 5
    if (currentPrice < bb.upper && currentPrice > bb.lower) score += 5
    if (currentPrice > bb.lower * 1.01) score += 5

    // Volume confirmation (10 points max)
    const currentVolume = volumes[volumes.length - 1]
    if (currentVolume > volumeAvg * 1.2) score += 5
    if (currentVolume > volumeAvg) score += 3
    if (currentVolume > volumeAvg * 0.8) score += 2

    // Momentum analysis (10 points max)
    if (momentum > 0) score += 5
    if (Math.abs(momentum) > currentPrice * 0.02) score += 5

    // Determine direction
    if (currentPrice < ema12 || rsi < 50 || macd.macd < macd.signal) {
      direction = 'SHORT'
      // Adjust score for short signals
      score = Math.max(0, score - 10)
    }

    // Volatility adjustment
    const volatility = atr / currentPrice
    if (volatility > 0.05) score -= 10
    if (volatility < 0.02) score += 5

    // Risk adjustment for overbought/oversold
    if (rsi > 80 || rsi < 20) score -= 15
    if (currentPrice > bb.upper * 1.02 || currentPrice < bb.lower * 0.98) score -= 10

    // Calculate confidence based on indicator confluence
    let confidence = Math.min(95, Math.max(10, score))
    
    // Only return signals with score >= 65
    if (score < 65) return null

    return {
      symbol,
      timeframe,
      direction,
      price: currentPrice,
      score: Math.round(score),
      confidence: Math.round(confidence),
      metadata: {
        atr,
        volatility: volatility * 100,
        volume_ratio: currentVolume / volumeAvg,
        momentum_pct: (momentum / currentPrice) * 100,
        trend_strength: ema12 > ema26 ? 'bullish' : 'bearish'
      },
      indicators: {
        ema12, ema26, ema50, ema200,
        rsi, macd, bollinger_bands: bb,
        atr, sma20, volume_avg: volumeAvg
      },
      source: 'aitradex1_strategy_engine',
      algo: 'AITRADEX1',
      bar_time: new Date(parseInt(candles[candles.length - 1][0])).toISOString()
    }
  } catch (error) {
    console.error(`❌ Analysis error for ${symbol}:`, error)
    return null
  }
}

// Technical indicator calculations
function calculateEMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0
  const multiplier = 2 / (period + 1)
  let ema = values[0]
  for (let i = 1; i < values.length; i++) {
    ema = (values[i] * multiplier) + (ema * (1 - multiplier))
  }
  return ema
}

function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return 0
  const slice = values.slice(-period)
  return slice.reduce((sum, val) => sum + val, 0) / period
}

function calculateRSI(values: number[], period: number): number {
  if (values.length < period + 1) return 50
  
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }
  
  const avgGain = gains / period
  const avgLoss = losses / period
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateMACD(values: number[]): { macd: number, signal: number, histogram: number } {
  const ema12 = calculateEMA(values, 12)
  const ema26 = calculateEMA(values, 26)
  const macd = ema12 - ema26
  
  // Simplified signal line (would need more history for proper EMA of MACD)
  const signal = macd * 0.8
  const histogram = macd - signal
  
  return { macd, signal, histogram }
}

function calculateBollingerBands(values: number[], period: number, stdDev: number): { upper: number, middle: number, lower: number } {
  const sma = calculateSMA(values, period)
  const slice = values.slice(-period)
  const variance = slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period
  const std = Math.sqrt(variance)
  
  return {
    upper: sma + (std * stdDev),
    middle: sma,
    lower: sma - (std * stdDev)
  }
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 0
  
  const trueRanges = []
  for (let i = 1; i < highs.length; i++) {
    const tr1 = highs[i] - lows[i]
    const tr2 = Math.abs(highs[i] - closes[i - 1])
    const tr3 = Math.abs(lows[i] - closes[i - 1])
    trueRanges.push(Math.max(tr1, tr2, tr3))
  }
  
  return calculateSMA(trueRanges, period)
}

function calculateMomentum(values: number[], period: number): number {
  if (values.length < period + 1) return 0
  return values[values.length - 1] - values[values.length - period - 1]
}