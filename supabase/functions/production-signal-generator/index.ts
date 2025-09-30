import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🏭 Production Signal Generator started')
    
    const { 
      timeframes = ['1h'], 
      symbols,
      force_refresh = false,
      min_score = 70 
    } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get production symbols from database or use defaults
    const targetSymbols = symbols || await getProductionSymbols(supabaseClient)
    
    const productionSignals = []

    for (const timeframe of timeframes) {
      for (const symbol of targetSymbols) {
        try {
          const signal = await generateProductionSignal(symbol, timeframe, min_score)
          
          if (signal && signal.score >= min_score) {
            // Insert high-quality production signal
            const { data: insertedSignal, error } = await supabaseClient
              .from('signals')
              .insert({
                symbol: signal.symbol,
                timeframe: signal.timeframe,
                direction: signal.direction,
                price: signal.price,
                entry_price: signal.price,
                score: signal.score,
                algo: 'AITRADEX1_PRODUCTION',
                source: 'production_signal_generator',
                metadata: {
                  ...signal.metadata,
                  production_grade: 'A',
                  confidence_level: signal.confidence,
                  generated_at: new Date().toISOString(),
                  quality_score: signal.quality_score
                },
                expires_at: new Date(Date.now() + (4 * 60 * 60 * 1000)) // 4 hours expiry
              })
              .select()
              .single()

            if (!error) {
              productionSignals.push(insertedSignal)
              console.log(`🎯 Production signal: ${symbol} ${timeframe} ${signal.direction} (${signal.score})`)
            }
          }
        } catch (error) {
          console.error(`Error generating production signal for ${symbol}:`, error)
        }
      }
    }

    // Log production stats
    await supabaseClient
      .from('edge_event_log')
      .insert({
        fn: 'production_signal_generator',
        stage: 'completed',
        payload: {
          signals_generated: productionSignals.length,
          symbols_processed: targetSymbols.length,
          timeframes,
          min_score,
          force_refresh,
          timestamp: new Date().toISOString()
        }
      })

    console.log(`✅ Production Generator completed: ${productionSignals.length} signals`)

    return new Response(
      JSON.stringify({
        success: true,
        production_signals: productionSignals.length,
        signals: productionSignals,
        quality_threshold: min_score,
        symbols_scanned: targetSymbols.length,
        timeframes_processed: timeframes,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Production Signal Generator error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function getProductionSymbols(supabaseClient: any): Promise<string[]> {
  try {
    // Try to get whitelist symbols from database
    const { data } = await supabaseClient
      .from('whitelist_settings')
      .select('whitelist_pairs, whitelist_enabled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data?.whitelist_enabled && data?.whitelist_pairs?.length) {
      return data.whitelist_pairs
    }
  } catch (error) {
    console.log('Using default symbols')
  }

  // Default production symbols
  return [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 
    'XRPUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT'
  ]
}

async function generateProductionSignal(symbol: string, timeframe: string, minScore: number) {
  try {
    // Fetch enhanced market data
    const response = await fetch(
      `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${timeframe}&limit=200`
    )
    const data = await response.json()
    
    if (!data?.result?.list?.length) return null
    
    const candles = data.result.list.reverse()
    const closes = candles.map((c: any) => parseFloat(c[4]))
    const highs = candles.map((c: any) => parseFloat(c[2]))
    const lows = candles.map((c: any) => parseFloat(c[3]))
    const volumes = candles.map((c: any) => parseFloat(c[5]))
    
    if (closes.length < 50) return null
    
    const currentPrice = closes[closes.length - 1]
    
    // Advanced technical analysis
    const ema21 = calculateEMA(closes, 21)
    const ema50 = calculateEMA(closes, 50)
    const ema200 = calculateEMA(closes, 200)
    const rsi = calculateRSI(closes, 14)
    const macd = calculateMACD(closes)
    const bb = calculateBollingerBands(closes, 20, 2)
    const atr = calculateATR(highs, lows, closes, 14)
    const volumeMA = calculateSMA(volumes, 20)
    
    // Market structure analysis
    const trendStrength = calculateTrendStrength(closes, ema21, ema50)
    const volatility = atr / currentPrice * 100
    const momentum = calculateMomentum(closes, 10)
    const volumeConfirmation = volumes[volumes.length - 1] > volumeMA
    
    let score = 50
    let direction = null
    let confidence = 'low'
    let qualityScore = 0
    
    // Multi-timeframe trend alignment
    const longTermBullish = ema50 > ema200
    const mediumTermBullish = ema21 > ema50
    const shortTermBullish = currentPrice > ema21
    
    // Bullish setup
    if (shortTermBullish && mediumTermBullish) {
      score += 20
      direction = 'LONG'
      
      // Additional bullish confirmations
      if (longTermBullish) score += 15 // Strong trend alignment
      if (rsi > 45 && rsi < 75) score += 10 // Healthy RSI
      if (macd.histogram > 0) score += 10 // MACD momentum
      if (currentPrice > bb.middle) score += 5 // Above BB middle
      if (volumeConfirmation) score += 10 // Volume confirmation
      if (momentum > 0.01) score += 5 // Strong momentum
      
      // Quality adjustments
      if (volatility < 3 && volatility > 1) qualityScore += 10 // Good volatility
      if (trendStrength > 2) qualityScore += 15 // Strong trend
    }
    // Bearish setup
    else if (!shortTermBullish && !mediumTermBullish) {
      score += 20
      direction = 'SHORT'
      
      // Additional bearish confirmations
      if (!longTermBullish) score += 15 // Strong trend alignment
      if (rsi > 25 && rsi < 55) score += 10 // Healthy RSI
      if (macd.histogram < 0) score += 10 // MACD momentum
      if (currentPrice < bb.middle) score += 5 // Below BB middle
      if (volumeConfirmation) score += 10 // Volume confirmation
      if (momentum < -0.01) score += 5 // Strong momentum
      
      // Quality adjustments
      if (volatility < 3 && volatility > 1) qualityScore += 10 // Good volatility
      if (trendStrength > 2) qualityScore += 15 // Strong trend
    }
    
    // Risk management filters
    if (volatility > 5) score -= 15 // Too volatile
    if (rsi > 80 || rsi < 20) score -= 10 // Overbought/oversold
    
    // Set confidence levels
    if (score >= 85) confidence = 'very_high'
    else if (score >= 75) confidence = 'high'
    else if (score >= 65) confidence = 'medium'
    
    // Only return high-quality signals
    if (score >= minScore && direction && qualityScore >= 15) {
      return {
        symbol,
        timeframe,
        direction,
        price: currentPrice,
        score: Math.round(Math.min(score, 100)),
        confidence,
        quality_score: qualityScore,
        metadata: {
          ema21: ema21.toFixed(2),
          ema50: ema50.toFixed(2),
          ema200: ema200.toFixed(2),
          rsi: rsi.toFixed(2),
          macd_signal: macd.histogram > 0 ? 'bullish' : 'bearish',
          trend_strength: trendStrength.toFixed(2),
          volatility: volatility.toFixed(2),
          volume_confirmation: volumeConfirmation,
          momentum: momentum.toFixed(4),
          bb_position: ((currentPrice - bb.lower) / (bb.upper - bb.lower)).toFixed(3)
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Production signal analysis error:', error)
    return null
  }
}

// Technical Analysis Functions
function calculateEMA(values: number[], period: number): number {
  const multiplier = 2 / (period + 1)
  let ema = values[0]
  
  for (let i = 1; i < values.length; i++) {
    ema = (values[i] * multiplier) + (ema * (1 - multiplier))
  }
  
  return ema
}

function calculateSMA(values: number[], period: number): number {
  return values.slice(-period).reduce((a, b) => a + b, 0) / period
}

function calculateRSI(values: number[], period: number): number {
  const changes = []
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1])
  }
  
  const gains = changes.map(change => change > 0 ? change : 0)
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0)
  
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateMACD(values: number[]) {
  const ema12 = calculateEMA(values, 12)
  const ema26 = calculateEMA(values, 26)
  const macd = ema12 - ema26
  const signal = macd * 0.9 // Simplified signal line
  
  return {
    macd,
    signal,
    histogram: macd - signal
  }
}

function calculateBollingerBands(values: number[], period: number, stdDev: number) {
  const sma = calculateSMA(values, period)
  const recentValues = values.slice(-period)
  const squaredDiffs = recentValues.map(value => Math.pow(value - sma, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period
  const standardDeviation = Math.sqrt(variance)
  
  return {
    upper: sma + (standardDeviation * stdDev),
    middle: sma,
    lower: sma - (standardDeviation * stdDev)
  }
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  const trueRanges = []
  
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    )
    trueRanges.push(tr)
  }
  
  return calculateSMA(trueRanges, period)
}

function calculateTrendStrength(closes: number[], ema21: number, ema50: number): number {
  const currentPrice = closes[closes.length - 1]
  const priceToEma21 = Math.abs((currentPrice - ema21) / ema21) * 100
  const ema21ToEma50 = Math.abs((ema21 - ema50) / ema50) * 100
  return (priceToEma21 + ema21ToEma50) / 2
}

function calculateMomentum(values: number[], period: number): number {
  const current = values[values.length - 1]
  const previous = values[values.length - 1 - period]
  return (current - previous) / previous
}